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
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${id}');</script>`,
  ].join('\n  ');
}

// Meta Pixel base code — 빌드 env 의 픽셀ID(없으면 빈 문자열, graceful).
// React 와 같은 VITE_META_PIXEL_ID 를 재사용해 단일 픽셀에 모인다. init + PageView 자동.
export function pixelSnippet() {
  const id = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  // 픽셀 ID = 숫자만 — 잘못된 값이 <script> 에 주입돼 HTML 깨지는 것 방지.
  if (!id || !/^\d{5,20}$/.test(id)) return '';
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');</script>`;
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
  return [ga, pixelSnippet(), ...head].filter(Boolean).join('\n  ');
}

export function buildBlogIndexHead(lang) {
  const path = '/blog/';
  const ga = gaSnippet();
  const head = [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
  ];
  return [ga, pixelSnippet(), ...head].filter(Boolean).join('\n  ');
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
  return [ga, pixelSnippet(), ...head].filter(Boolean).join('\n  ');
}
