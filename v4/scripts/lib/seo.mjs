import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { medicalClinicJsonLd, physicianJsonLd, faqPageJsonLd, blogPostingJsonLd, renderJsonLd } from './jsonld.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

export const ORIGIN = 'https://www.dr187growup.com';
export const PATH_PREFIX = process.env.SITE_PATH_PREFIX ?? '';  // promoted to root in Phase 6 (override with /test for staging)
// Languages we actually BUILD pages for. hreflang/sitemap must only point at these —
// emitting ja/zh-tw/id (planned but not yet built) creates 404 hreflang targets that
// invalidate the whole cluster in Search Console. Add a lang here only once its pages ship.
export const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en'];
export const ALL_LANGS = ['ko', 'th', 'vi', 'en', 'ja', 'zh-tw', 'id'];
export const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', ja: 'ja', 'zh-tw': 'zh-TW', id: 'id' };
export const OG_LOCALE_MAP = { ko: 'ko_KR', th: 'th_TH', vi: 'vi_VN', en: 'en_US', ja: 'ja_JP', 'zh-tw': 'zh_TW', id: 'id_ID' };

let cached = null;
function loadSeo() {
  if (!cached) cached = yaml.load(readFileSync(join(ROOT, 'i18n/seo.yml'), 'utf8'));
  return cached;
}

export function buildSeo(lang) {
  const data = loadSeo();
  const entry = data[lang];
  if (!entry) throw new Error(`no seo config for lang: ${lang}`);
  return entry;
}

export function buildHreflang(path = '/') {
  return ACTIVE_LANGS.map((lang) => {
    const hrefLang = HREFLANG_MAP[lang];
    return `<link rel="alternate" hreflang="${hrefLang}" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`;
  }).concat([
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${PATH_PREFIX}/ko${path}">`,
  ]).join('\n  ');
}

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// gtag.js 스니펫 — 빌드 env 의 측정ID(없으면 빈 문자열, graceful).
// 정적 사이트는 React 와 같은 VITE_GA_MEASUREMENT_ID 를 재사용해 단일 GA4 속성에 모인다.
export function gaSnippet() {
  const id = process.env.GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID;
  // 측정ID 형식(G-XXXX)만 허용 — 잘못된 값이 <script> 에 주입돼 HTML 깨지는 것 방지.
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return '';
  // ★ 표준 async 즉시 로드. requestIdleCallback 지연 로드(옛 3b3c029)는 gtag.js 가 page_view 후 한참 뒤
  // (모바일 메인스레드 busy → idle 안 옴 → 2초 timeout)에야 떠서 engagement_time 측정 윈도우가 ~0 이 됨
  // → userEngagementDuration·engagedSessions 전부 0 으로 깨졌음(빠른 이탈자는 gtag.js 로드 전 unload 라 page_view 도 누락).
  // async 라 HTML 파싱 비차단 + LCP 진짜 레버는 폰트 제거(d027b9c)였어서 LCP 영향 미미 → 측정 정확성 ≫ ~320ms.
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
}

// Meta Pixel base code — 빌드 env 의 픽셀ID(없으면 빈 문자열, graceful).
// 시장별 분리: 한국어(ko)는 VITE_META_PIXEL_ID_KO(한국 광고 전용 픽셀), 그 외 언어는 VITE_META_PIXEL_ID.
//   → ko 페이지엔 한국 픽셀만, th/vi/en 엔 기본 픽셀만 발사(전환 귀속 시장별 분리).
//   ko 전용 값이 없으면 기본 픽셀로 폴백(graceful). 콤마로 여러 픽셀 ID 지원 ("111,222").
//   React(analytics.ts)도 동일 로직(공개 SPA 는 한국어라 ko 픽셀).
function metaPixelIds(lang) {
  const koRaw = process.env.META_PIXEL_ID_KO || process.env.VITE_META_PIXEL_ID_KO || '';
  const defRaw = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '';
  const raw = lang === 'ko' && koRaw.trim() ? koRaw : defRaw;
  // 픽셀 ID = 숫자만 — 잘못된 값이 <script> 에 주입돼 HTML 깨지는 것 방지.
  return raw.split(',').map((s) => s.trim()).filter((s) => /^\d{5,20}$/.test(s));
}

export function pixelSnippet(lang) {
  const ids = metaPixelIds(lang);
  if (!ids.length) return '';
  const inits = ids.map((id) => `fbq('init','${id}');`).join('');
  // ★ 표준 즉시 로드 — gaSnippet 과 동일 이유. requestIdleCallback 지연 로드는 빠른 이탈자가 fbevents.js 로드 전 unload 시 PageView 누락 위험.
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${inits}fbq('track','PageView');</script>`;
}

export function buildBlogPostHead({ post, lang }) {
  const path = `/blog/${post.slug}/`;
  const description = post.meta_description || '';
  const ga = gaSnippet();
  const head = [
    `<title>${post.title}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
    `<meta property="og:type" content="article">`,
    `<meta property="og:locale" content="${OG_LOCALE_MAP[lang]}">`,
    `<meta property="og:title" content="${escapeAttr(post.title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(post.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    renderJsonLd(blogPostingJsonLd({ post, lang })),
  ];
  return [ga, pixelSnippet(lang), ...head].filter(Boolean).join('\n  ');
}

export function buildBlogIndexHead(lang) {
  const path = '/blog/';
  const ga = gaSnippet();
  const head = [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
  ];
  return [ga, pixelSnippet(lang), ...head].filter(Boolean).join('\n  ');
}

export function buildHead(lang, opts = {}) {
  const path = opts.path || '/';
  const seo = buildSeo(lang);
  const ogLocale = OG_LOCALE_MAP[lang];
  // Subpages (clinic/cases/calculator) override title via opts; description + og_image
  // stay on the same brand SEO entry. JSON-LD (clinic/physician/FAQ) is only emitted
  // on the home page — opts.skipJsonLd lets subpages drop them so they don't compete.
  const title = opts.title || seo.title;
  const description = opts.description || seo.description;
  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${ogLocale}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:image" content="${ORIGIN}${seo.og_image}">`,
    `<meta property="og:url" content="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    `<meta name="twitter:image" content="${ORIGIN}${seo.og_image}">`,
  ];
  if (!opts.skipJsonLd) {
    head.push(
      renderJsonLd(medicalClinicJsonLd(lang)),
      renderJsonLd(physicianJsonLd(lang)),
      renderJsonLd(faqPageJsonLd(lang)),
    );
  }
  const ga = gaSnippet();
  return [ga, pixelSnippet(lang), ...head].filter(Boolean).join('\n  ');
}
