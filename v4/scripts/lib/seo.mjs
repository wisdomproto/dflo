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

export function buildBlogPostHead({ post, lang }) {
  const path = `/blog/${post.slug}/`;
  const description = post.meta_description || '';
  return [
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
  ].join('\n  ');
}

export function buildBlogIndexHead(lang) {
  const path = '/blog/';
  return [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
  ].join('\n  ');
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
  return head.join('\n  ');
}
