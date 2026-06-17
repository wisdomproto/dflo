// Google Analytics 4 (GA4) 통합.
//
// VITE_GA_MEASUREMENT_ID 가 설정되었을 때만 gtag.js 스크립트를 동적 로드하고
// 이벤트를 발사한다. 키 없으면 모든 트래킹 함수는 no-op.
//
// SPA 라우팅이라 GA4 의 자동 page_view 는 첫 로드 1번만 잡힘 → App.tsx 에서
// router.subscribe 로 경로 변경마다 trackPageView 를 호출.
//
// **추적 범위**: 공개 사이트만 (`/`, `/program/*`, `/guide/*`, `/diagnosis`,
// `/vn/*`, `/th/*` 등 다국어 prefix). 환자 앱(`/app/*`), 클리닉 어드민
// (`/admin/*`, `/banner-admin`, `/app-home-admin`), 로그인 페이지는 제외 —
// PHI 가능성 + GA 에 보낼 가치 없음.
//
// **로케일 차원**: URL prefix (`/vn/`, `/th/`, `/en/`, `/zh/`, `/ja/`) 자동 감지
// → 모든 이벤트에 `locale` 파라미터 부착. GA4 에서 커스텀 디멘션으로 등록하면
// 나라별 비교 리포트 가능.
//
// **핵심 전환 이벤트**: `consult_click` — 메신저 상담 버튼 클릭(channel=kakao/line).
// GA4 어드민에서 "주요 이벤트(Key event)" 로 마크해야 전환으로 집계됨.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
// Meta Pixel — 광고 전환 추적/리타게팅. 없으면 모든 픽셀 호출 no-op (GA4와 동일 패턴).
// 콤마로 여러 픽셀 ID 지원 (예: "111,222") — 전부 init, track 은 init된 모든 픽셀에 자동 발사.
const META_PIXEL_IDS = ((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PRIVATE_PREFIXES = [
  '/app',
  '/admin',
  '/banner-admin',
  '/app-home-admin',
  '/login',
];

const SUPPORTED_LOCALES = ['ko', 'vn', 'th', 'en', 'zh', 'ja'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let scriptInjected = false;
let pixelInjected = false;

function injectScriptOnce(): boolean {
  if (scriptInjected) return true;
  if (!GA_ID || typeof window === 'undefined') return false;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  // send_page_view: false — SPA 에서는 수동으로 trackPageView 호출.
  window.gtag('config', GA_ID, { send_page_view: false });

  scriptInjected = true;
  return true;
}

/** Meta Pixel base code 동적 로드 + init (1회). 측정ID 없으면 false. */
function injectPixelOnce(): boolean {
  if (pixelInjected) return true;
  if (!META_PIXEL_IDS.length || typeof window === 'undefined') return false;
  if (!window.fbq) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const n: any = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    n.queue = [];
    n.loaded = true;
    n.version = '2.0';
    window.fbq = n;
    window._fbq = n;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  META_PIXEL_IDS.forEach((id) => window.fbq!('init', id));
  pixelInjected = true;
  return true;
}

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** URL pathname 에서 locale 추출. `/vn/...` → 'vn', `/th/...` → 'th', 기본 'ko'. */
export function getLocale(pathname: string): Locale {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  if (m && (SUPPORTED_LOCALES as readonly string[]).includes(m[1])) {
    return m[1] as Locale;
  }
  return 'ko';
}

/** 라우트 변경 시 호출 — page_view 이벤트 발사. */
export function trackPageView(pathname: string, search = ''): void {
  if (typeof window === 'undefined' || isPrivatePath(pathname)) return;
  if (GA_ID && injectScriptOnce() && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
      locale: getLocale(pathname),
    });
  }
  if (injectPixelOnce() && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/** 일반 커스텀 이벤트 발사. 자동으로 locale 파라미터 부착. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (!GA_ID || typeof window === 'undefined') return;
  if (isPrivatePath(window.location.pathname)) return;
  if (!injectScriptOnce() || !window.gtag) return;
  window.gtag('event', name, {
    ...params,
    locale: getLocale(window.location.pathname),
  });
}

/** locale → 메신저 채널. 태국은 LINE, 그 외는 KakaoTalk. */
function channelForLocale(locale: Locale): 'kakao' | 'line' {
  return locale === 'th' ? 'line' : 'kakao';
}

/**
 * 핵심 전환 이벤트 — 메신저 상담 버튼 클릭.
 * 정적 사이트(_shell.js)의 consult_click 과 단일 이벤트로 통일한다.
 * 함수명은 기존 호출부 호환을 위해 유지(내부는 channel=kakao/line 자동 분기).
 * source 로 위치 구분(header_drawer, height_calc_result, case_slider 등).
 */
export function trackKakaoConsult(source: string): void {
  const locale = getLocale(window.location.pathname);
  const channel = channelForLocale(locale);
  trackEvent('consult_click', { source, channel });
  // Meta Pixel 핵심 전환 — 상담 문의 = Lead.
  if (!isPrivatePath(window.location.pathname) && injectPixelOnce() && window.fbq) {
    window.fbq('track', 'Lead', { source, channel, locale });
  }
}

/** 예측키 패널 열람 — 측정 시작 전 "패널을 봤다" 신호(열람→완료 퍼널용, 정적은 _shell.js 가 처리). */
export function trackCalcOpen(source = 'calc_modal'): void {
  trackEvent('calc_open', { source });
}

/** 예상키 측정 완료 — React(SPA) 컨텍스트에서 직접 발사(정적은 _shell.js 가 처리). */
export function trackHeightCalcComplete(source = 'calc_modal'): void {
  trackEvent('height_calc_complete', { source });
  // Meta Pixel 보조 전환 — 예측키 측정 완료(관심 강한 행동) = 커스텀 이벤트.
  if (!isPrivatePath(window.location.pathname) && injectPixelOnce() && window.fbq) {
    window.fbq('trackCustom', 'HeightCalcComplete', { source, locale: getLocale(window.location.pathname) });
  }
}
