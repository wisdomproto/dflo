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
// **핵심 전환 이벤트**: `kakao_consult_click` — 카카오톡 상담 버튼 클릭. GA4
// 어드민에서 "주요 이벤트(Key event)" 로 마크해야 전환으로 집계됨.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

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
  }
}

let scriptInjected = false;

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
  if (!GA_ID || typeof window === 'undefined') return;
  if (isPrivatePath(pathname)) return;
  if (!injectScriptOnce() || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: pathname + search,
    page_location: window.location.href,
    page_title: document.title,
    locale: getLocale(pathname),
  });
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

/**
 * 핵심 전환 이벤트 — 카카오톡 상담 버튼 클릭.
 * source 로 어느 위치에서 눌렸는지 구분 (header_drawer, bottom_tabbar,
 * height_calc_result, case_slider, case_modal, cases_slide, guide_section 등).
 */
export function trackKakaoConsult(source: string): void {
  trackEvent('kakao_consult_click', { source });
}
