import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { medicalClinicJsonLd, physicianJsonLd, faqPageJsonLd, blogPostingJsonLd, renderJsonLd } from './jsonld.mjs';
import { ORIGIN, PATH_PREFIX, ACTIVE_LANGS, HREFLANG_MAP, OG_LOCALE_MAP } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// 상수 정의는 constants.mjs(리프 모듈)에 있고 여기서 re-export 한다 — 기존 소비자·테스트가
// 전부 `from './seo.mjs'` 로 가져가므로 공개 표면은 그대로 유지.
export { ORIGIN, PATH_PREFIX, ACTIVE_LANGS, ALL_LANGS, HREFLANG_MAP, OG_LOCALE_MAP, RTL_LANGS } from './constants.mjs';

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

// 언어마다 경로가 다른 클러스터용(블로그: slug 가 언어별로 다름). pathsByLang = { ko: '/blog/x/', th: '/blog/y/' }.
// 여기 없는 언어는 그 번역이 존재하지 않는다는 뜻이라 아예 내보내지 않는다 — 없는 URL 을 hreflang 으로
// 가리키면(우리 호스팅은 404 도 아니고 200 + 한국어 SPA 셸이라 soft-404) 클러스터 자체가 무효가 된다.
export function buildHreflangPaths(pathsByLang) {
  const langs = ACTIVE_LANGS.filter((lang) => pathsByLang[lang]);
  const links = langs.map((lang) =>
    `<link rel="alternate" hreflang="${HREFLANG_MAP[lang]}" href="${ORIGIN}${PATH_PREFIX}/${lang}${pathsByLang[lang]}">`
  );
  // x-default 는 한국어판이 있을 때만 — 없는 글에 ko 를 가리키면 그것도 soft-404.
  if (pathsByLang.ko) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}${PATH_PREFIX}/ko${pathsByLang.ko}">`);
  }
  return links.join('\n  ');
}

// 전 언어가 같은 경로를 쓰는 페이지용(홈·clinic/cases/calculator 는 파일명이 언어 공통).
export function buildHreflang(path = '/') {
  return buildHreflangPaths(Object.fromEntries(ACTIVE_LANGS.map((lang) => [lang, path])));
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
// 언어별 전용 픽셀은 `VITE_META_PIXEL_ID_<LANG>` 하나만 채우면 켜진다(ko·en 사용 중, vi/th 는 미설정=기본).
// 전용 값이 없으면 기본 픽셀로 폴백하므로, 환경변수 없이도 항상 동작(graceful).
function metaPixelIds(lang) {
  // lang 은 옵션 — 없으면 기본 픽셀(호출부가 인자 없이 쓰는 경우가 있어 방어).
  const suffix = (lang || '').toUpperCase().replace(/-/g, '_');   // zh-tw → ZH_TW
  const langRaw = suffix
    ? (process.env[`META_PIXEL_ID_${suffix}`] || process.env[`VITE_META_PIXEL_ID_${suffix}`] || '')
    : '';
  const defRaw = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '';
  const raw = langRaw.trim() || defRaw;
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

// altSlugs = 같은 글의 언어별 slug ({ ko: 'a', th: 'b' }). build-i18n 이 blog_published.article_id 로 묶어 넘긴다.
// 없으면(ContentFlow 캐시 글 등 article_id 미보유) 자기 자신만 = 번역 없음으로 취급.
export function buildBlogPostHead({ post, lang, altSlugs }) {
  const path = `/blog/${post.slug}/`;
  const slugs = altSlugs && Object.keys(altSlugs).length ? altSlugs : { [lang]: post.slug };
  const altPaths = Object.fromEntries(Object.entries(slugs).map(([l, s]) => [l, `/blog/${s}/`]));
  const description = post.meta_description || '';
  const ga = gaSnippet();
  const head = [
    `<title>${post.title}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflangPaths(altPaths),
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

// blogLangs = 블로그 인덱스가 실제로 빌드되는 언어(글이 1편 이상 있는 언어)만.
// 안 주면 전 ACTIVE_LANGS(하위호환). ★중국어처럼 글 0인 언어를 넣으면 /zh-hant/blog/ 가
// 존재하지 않아 hreflang 이 허공(soft-404)을 가리켜 클러스터가 무효화된다 — sitemap 은
// blogSlugs[l]?.length 로 이미 제외하는데 이 HTML 헤드만 안 걸러져 audit 이 잡았다.
export function buildBlogIndexHead(lang, blogLangs = ACTIVE_LANGS) {
  const path = '/blog/';
  const ga = gaSnippet();
  const head = [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflangPaths(Object.fromEntries(blogLangs.map((l) => [l, path]))),
  ];
  return [ga, pixelSnippet(lang), ...head].filter(Boolean).join('\n  ');
}

// opts.altPaths — 일부 언어에만 있는 페이지(consult = th/vi/en)용. 주면 그 언어들만 hreflang 으로
// 나간다. 안 주면 전 언어가 같은 경로를 갖는다고 보고 기존 동작(홈·clinic/cases/calculator).
// ★없는 언어를 넣으면 그 URL 은 404 가 아니라 200 + 한국어 SPA 셸(soft-404)이라 클러스터가 무효화된다.
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
    opts.altPaths ? buildHreflangPaths(opts.altPaths) : buildHreflang(path),
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
  // opts.jsonLd — 페이지 전용 JSON-LD 배열(저자 페이지 = authorPageJsonLd). 주면 그것만,
  // 안 주고 skipJsonLd 도 아니면 홈 기본(clinic/physician/FAQ).
  if (opts.jsonLd && opts.jsonLd.length) {
    for (const obj of opts.jsonLd) head.push(renderJsonLd(obj));
  } else if (!opts.skipJsonLd) {
    head.push(
      renderJsonLd(medicalClinicJsonLd(lang)),
      renderJsonLd(physicianJsonLd(lang)),
      renderJsonLd(faqPageJsonLd(lang)),
    );
  }
  const ga = gaSnippet();
  return [ga, pixelSnippet(lang), ...head].filter(Boolean).join('\n  ');
}
