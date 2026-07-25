import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';
import { getMessengerCTA } from './lib/messenger.mjs';
import { buildHead, buildBlogPostHead, buildBlogIndexHead, ACTIVE_LANGS, RTL_LANGS } from './lib/seo.mjs';
import { authorPageJsonLd } from './lib/jsonld.mjs';
import { buildSitemap } from './lib/sitemap.mjs';
import { fetchAllLangs } from './lib/fetch-contentflow-posts.mjs';
import { loadCachedPosts, renderPost, renderIndex } from './lib/blog.mjs';
import { loadPublishedBlogAll } from './lib/blog-supabase.mjs';
import { localizeProgramImages } from './lib/program-img.mjs';
import { lazifyImages } from './lib/img-attrs.mjs';
import { swapToWebp } from './lib/webp-swap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// vite 와 달리 순수 node 스크립트라 .env 자동 로드 안 됨 — 측정ID(VITE_GA_MEASUREMENT_ID)·
// CONTENTFLOW 등 빌드 env 를 .env 파일에서 로드(파일 없으면 graceful). Railway 는 레포에 커밋된
// .env.production 을 사용하므로 별도 env 설정 없이도 정적 페이지에 gtag 가 주입된다.
if (typeof process.loadEnvFile === 'function') {
  for (const f of ['.env.production', '.env.local']) {
    try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional — 파일 없으면 무시 */ }
  }
}
// ACTIVE_LANGS is the single source of truth (seo.mjs) so hreflang, sitemap, and the
// build loop never drift — adding a lang there lights it up everywhere at once.
const CACHE_DIR = join(ROOT, 'i18n/blog-cache');

function loadLocale(lang) {
  return yaml.load(readFileSync(join(ROOT, 'i18n/locales', `${lang}.yml`), 'utf8'));
}

function writeFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`  wrote ${path}`);
}

// 같은 글의 언어별 slug 묶음 — blog_published.article_id 기준.
// slug 는 언어마다 다르므로(en "adhd-medication-effect-on-height-children" ↔ th "adhd-med-child-height-growth")
// 이 매핑 없이 hreflang 을 만들면 "모든 언어가 같은 slug" 라고 잘못 가정하게 된다.
// 반환: altsByLang[lang][slug] = { ko: 'a', th: 'b', ... } (그 글이 실제로 존재하는 언어만)
function buildBlogClusters(publishedByLang) {
  const byArticle = new Map();
  for (const [lang, posts] of Object.entries(publishedByLang)) {
    for (const p of posts) {
      if (!p.article_id) continue;   // ContentFlow 캐시 글은 article_id 없음 → 번역 없음 취급
      if (!byArticle.has(p.article_id)) byArticle.set(p.article_id, {});
      byArticle.get(p.article_id)[lang] = p.slug;
    }
  }
  const altsByLang = {};
  for (const slugsByLang of byArticle.values()) {
    for (const [lang, slug] of Object.entries(slugsByLang)) {
      (altsByLang[lang] ??= {})[slug] = slugsByLang;
    }
  }
  return altsByLang;
}

// 계산기(도구) 페이지 → 예측 클러스터 블로그 내부링크. 도구 페이지(height calculator 110K)의
// 랭킹 레버 = 관련 글로 링크를 몰아 허브화. 앵커는 en slug, 언어별 실제 slug/제목은 클러스터로 자동 해석
// (언어마다 slug 가 다르므로 하드코딩하면 어긋난다 — [[블로그 hreflang]] 과 같은 함정).
const CALC_RELATED_EN = [
  'bone-age-x-ray-height-prediction-guide',
  'mid-parental-height-formula-accuracy',
  'child-height-percentile-explained-growth-chart',
  'low-predicted-height-how-reliable-is-it',
];
function relatedBlogLinks(lang, blogAlts, titleByLangSlug) {
  const enMap = blogAlts.en || {};
  const out = [];
  for (const enSlug of CALC_RELATED_EN) {
    const cluster = enMap[enSlug];        // { ko:'…', en:'…', th:'…', … } — 그 토픽이 있는 언어만
    const slug = cluster?.[lang];
    const title = slug && titleByLangSlug[lang]?.[slug];
    if (slug && title) out.push({ href: `/${lang}/blog/${slug}/`, title });
  }
  return out;
}

async function buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts, blogAlts, blogLangs }) {
  // RTL 언어(아랍어)는 블로그 템플릿의 <html> 에도 dir="rtl" 을 baked — 메인 페이지 루프와 동일.
  // (블로그는 별도 렌더 경로라 이 처리를 빠뜨리면 /ar/blog/ 만 LTR 로 나온다.)
  const rtlize = (html) =>
    RTL_LANGS.includes(lang)
      ? html.replace(`<html lang="${lang}">`, `<html lang="${lang}" dir="rtl">`)
      : html;

  const indexHtml = renderIndex({
    posts, template: indexTemplate, locale,
    // hreflang 은 블로그 인덱스가 실제로 존재하는 언어만 — 글 0인 언어(중국어)를 가리키면 soft-404.
    seoHead: buildBlogIndexHead(lang, blogLangs),
  });
  writeFile(join(ROOT, 'public', lang, 'blog/index.html'), rtlize(lazifyImages(indexHtml)));

  for (const post of posts) {
    const html = renderPost({
      post, template: postTemplate, locale, messenger,
      seoHead: buildBlogPostHead({ post, lang, altSlugs: blogAlts?.[lang]?.[post.slug] }),
    });
    writeFile(join(ROOT, 'public', lang, 'blog', post.slug, 'index.html'), rtlize(lazifyImages(html)));
  }
  return posts.length;
}

async function main() {
  const refetch = process.argv.includes('--refetch');
  let blogSlugs = {};

  if (refetch || !existsSync(CACHE_DIR)) {
    const apiUrl = process.env.CONTENTFLOW_API_URL;
    const projectId = process.env.CONTENTFLOW_PROJECT_ID;
    if (apiUrl && projectId) {
      blogSlugs = await fetchAllLangs({
        apiUrl, projectId, langs: ACTIVE_LANGS, cacheDir: CACHE_DIR,
      });
    } else {
      console.warn('[blog] CONTENTFLOW_API_URL or CONTENTFLOW_PROJECT_ID missing — skipping fetch (no blog content will be built)');
    }
  } else {
    for (const lang of ACTIVE_LANGS) {
      blogSlugs[lang] = loadCachedPosts(CACHE_DIR, lang).map((p) => p.slug);
    }
  }

  // 자체 사이트 published 블로그 (Supabase) — ContentFlow 캐시와 병합. published 우선.
  const publishedByLang = await loadPublishedBlogAll(ACTIVE_LANGS);
  const blogAlts = buildBlogClusters(publishedByLang);
  // 계산기 관련글 링크용 slug→제목 조회맵(언어별)
  const blogTitleByLangSlug = {};
  for (const [lang, posts] of Object.entries(publishedByLang)) {
    const m = {};
    for (const p of posts) m[p.slug] = p.title;
    blogTitleByLangSlug[lang] = m;
  }

  // 블로그 인덱스가 실제로 빌드되는 언어(글 1편 이상). 블로그 인덱스 hreflang 클러스터는
  // 이 집합으로만 만든다 — 글 0인 언어(중국어 등)를 넣으면 /{lang}/blog/ 가 없어 soft-404.
  const blogLangs = ACTIVE_LANGS.filter((l) =>
    loadCachedPosts(CACHE_DIR, l).length > 0 || (publishedByLang[l]?.length ?? 0) > 0);

  const homeTemplate = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const casesTemplate = readFileSync(join(ROOT, 'i18n/template/cases.html'), 'utf8');
  const calculatorTemplate = readFileSync(join(ROOT, 'i18n/template/calculator.html'), 'utf8');
  const consultTemplate = readFileSync(join(ROOT, 'i18n/template/consult.html'), 'utf8');
  const authorTemplate = readFileSync(join(ROOT, 'i18n/template/author.html'), 'utf8');
  const postTemplate = readFileSync(join(ROOT, 'i18n/template/blog-post.html'), 'utf8');
  const indexTemplate = readFileSync(join(ROOT, 'i18n/template/blog-index.html'), 'utf8');

  // Subpages share the brand SEO entry (description, OG image) but get their own title
  // from the locale yml so Google snippets and the browser tab read correctly.
  // consult 는 상담 채널이 여러 개인 언어(th/vi/en)만 — ko 는 카톡 직행 + 예약 폼 동선이라 페이지가 없다.
  const SUBPAGES = [
    { name: 'cases',      file: 'cases.html',      template: casesTemplate,      titlePath: 'cases.page_title' },
    { name: 'calculator', file: 'calculator.html', template: calculatorTemplate, titlePath: 'calculator.page_title', descPath: 'calculator.meta_description' },
    { name: 'consult',    file: 'consult.html',    template: consultTemplate,    titlePath: 'consult.page_title',
      langs: (l) => (getMessengerCTA(l).consult_channels?.length ?? 0) > 1 },
    // 저자(원장) 소개 — GEO/E-E-A-T 권위 페이지. 전 7언어(author: 블록 전부 존재). byline 이 이 페이지로 링크.
    { name: 'author',     file: 'author.html',     template: authorTemplate,     titlePath: 'author.page_title', descPath: 'author.meta_description',
      authorSchema: true },
  ];

  for (const lang of ACTIVE_LANGS) {
    console.log(`[i18n] building ${lang}`);
    const locale = loadLocale(lang);
    const messenger = getMessengerCTA(lang, { requireLiveUrl: true });
    locale.messenger = messenger;
    locale.messenger_json = JSON.stringify(messenger);
    locale.shell_json = JSON.stringify(locale.shell || {});
    // 1:1 상담 채널 시트(비한국어 = th/vi/en). ko 는 카카오 단일 채널이라 messenger.yml 에
    // consult_channels 가 없고 → 빈 배열 → _shell.js 가 기존 단일 링크 동작 유지(graceful).
    locale.consult_json = JSON.stringify(messenger.consult_channels || []);
    // consult.html 이 {{#each}} 로 도는 채널 목록(같은 데이터의 렌더용 뷰).
    locale.consult_channels_list = messenger.consult_channels || [];
    // 예약(콜백) 폼이 접수를 보낼 ai-server URL. Railway v4 서비스엔 VITE_AI_SERVER_URL 이 이미
    // 있으므로 그걸 재사용(SITE_AI_SERVER_URL 로 오버라이드 가능). 로컬/미설정이면 빈 문자열 →
    // _shell.js 가 http://localhost:4000 폴백. 정적 페이지에 window.__I18N__.aiServer 로 주입.
    locale.ai_server = process.env.SITE_AI_SERVER_URL || process.env.VITE_AI_SERVER_URL || '';

    // 프로그램 이미지: 언어 폴더 우선 → _common(한국어 기본본) 1단계 fallback (lib/program-img.mjs).
    // 로고: 비한국어는 영문 워드마크로 swap.
    const IMAGES_ROOT = join(ROOT, 'public/programs/images');
    const localizeProgramImg = (html) => {
      let out = localizeProgramImages(html, lang, IMAGES_ROOT);
      if (lang !== 'ko') {
        out = out.replaceAll('/images/logo.jpg', '/images/logo_en.png');
        out = out.replaceAll('/images/saebom-logo.png', '/images/saebom-logo-en.png');
        out = out.replaceAll('/images/logo-187-inline.png', '/images/logo-187-inline-en.png');
      }
      // RTL 언어(아랍어)는 <html> 에 dir="rtl" 을 baked → 정적 렌더부터 우측 정렬(크롤러·공유 프리뷰도 RTL).
      // _shell.css 의 html[dir="rtl"] 규칙이 셸 크롬을 미러링한다.
      if (RTL_LANGS.includes(lang)) {
        out = out.replace(`<html lang="${lang}">`, `<html lang="${lang}" dir="rtl">`);
      }
      out = swapToWebp(out, join(ROOT, 'public')); // jpg/png → webp(존재 시) — 모바일 LCP/전송량 개선
      return out;
    };

    // 하단 네비 '블로그' 노출 여부 — 글이 0편인 언어(ja/es)에 링크하면 우리 호스팅 특성상
    // 200 + 한국어 SPA 셸(soft-404)이 된다. 실제로 빌드되는 언어에만 메뉴를 띄운다.
    locale.has_blog = blogLangs.includes(lang) ? 'true' : 'false';

    // Home — 이미지 지연 로딩 후처리까지 거쳐 최종 산출 (첫 이미지=로고만 eager)
    locale.seo_head = buildHead(lang, { path: '/' });
    writeFile(join(ROOT, 'public', lang, 'index.html'), lazifyImages(localizeProgramImg(render(homeTemplate, locale))));

    // Subpages — re-bind seo_head per page so canonical/hreflang/title are correct
    for (const sub of SUBPAGES) {
      if (sub.langs && !sub.langs(lang)) continue;   // 언어 한정 서브페이지(consult = th/vi/en)
      // 계산기 도구 페이지 → 예측 클러스터 블로그 관련글(언어별 실제 slug/제목, 빌드 시점 해석)
      if (sub.name === 'calculator') locale.calculator.related_list = relatedBlogLinks(lang, blogAlts, blogTitleByLangSlug);
      const titleParts = sub.titlePath.split('.');
      let title = locale;
      for (const p of titleParts) title = title?.[p];
      // 페이지 전용 메타 설명(있으면). 없으면 buildHead 가 브랜드 기본 설명으로 폴백.
      let description;
      if (sub.descPath) {
        let d = locale;
        for (const p of sub.descPath.split('.')) d = d?.[p];
        description = d;
      }
      // 언어 한정 페이지는 hreflang 도 그 언어들만 — 없는 언어를 가리키면 soft-404 클러스터가 된다.
      const altPaths = sub.langs
        ? Object.fromEntries(ACTIVE_LANGS.filter(sub.langs).map((l) => [l, `/${sub.file}`]))
        : undefined;
      // 저자 페이지만 전용 Person(Physician) JSON-LD, 나머지 서브페이지는 홈 기본 스키마와 경쟁 안 하게 skip
      const jsonLd = sub.authorSchema ? [authorPageJsonLd(lang)] : undefined;
      locale.seo_head = buildHead(lang, { path: `/${sub.file}`, title, description, skipJsonLd: !jsonLd, jsonLd, altPaths });
      writeFile(join(ROOT, 'public', lang, sub.file), lazifyImages(localizeProgramImg(render(sub.template, locale))));
    }

    const cached = loadCachedPosts(CACHE_DIR, lang);
    const published = publishedByLang[lang] ?? [];
    // slug 기준 dedup, published 우선
    const bySlug = new Map();
    for (const p of cached) bySlug.set(p.slug, p);
    for (const p of published) bySlug.set(p.slug, p);
    const posts = [...bySlug.values()];
    blogSlugs[lang] = posts.map((p) => p.slug);
    if (posts.length > 0) {
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts, blogAlts, blogLangs });
      console.log(`  [blog] ${n} posts rendered for ${lang} (cached ${cached.length} + published ${published.length})`);
    }
  }

  const consultSub = SUBPAGES.find((s) => s.name === 'consult');
  const sitemap = buildSitemap({
    activeLangs: ACTIVE_LANGS, blogSlugs, blogAlts,
    consultLangs: ACTIVE_LANGS.filter(consultSub.langs),
  });
  writeFile(join(ROOT, 'public/sitemap.xml'), sitemap);

  await bakeCasesData();

  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

// 치료사례 뷰어 데이터를 빌드 때 R2 에서 한 번 읽어 정적 스냅샷(`public/cases-data.json`)으로 굽는다.
// 경량 엔트리(cases-embed)가 런타임 R2 왕복·캐시우회 없이 이걸 읽는다(우리 도메인 = Cloudflare 엣지 캐시).
// 치료사례는 거의 안 바뀌므로 안전. R2 URL 없거나 fetch 실패하면 스냅샷을 안 쓰고 넘어간다 → 뷰어가 R2 로 폴백.
async function bakeCasesData() {
  const base = (process.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base) { console.warn('  [cases] VITE_R2_PUBLIC_URL 없음 — 스냅샷 skip (런타임 R2 폴백)'); return; }
  try {
    const res = await fetch(`${base}/website.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();
    // cases 슬라이드를 포함한 섹션만 남긴다(뷰어가 쓰는 것만 = 페이로드 최소화). 공개 데이터라 유출 우려 없음.
    const rows = (Array.isArray(all) ? all : []).filter(
      (s) => Array.isArray(s.slides) && s.slides.some((sl) => sl && sl.template === 'cases'),
    );
    if (rows.length === 0) { console.warn('  [cases] R2 에 cases 섹션 없음 — 스냅샷 skip'); return; }
    writeFile(join(ROOT, 'public/cases-data.json'), JSON.stringify(rows));
    const n = rows.reduce((a, s) => a + s.slides.filter((sl) => sl.template === 'cases').length, 0);
    console.log(`  [cases] snapshot baked — ${n} case slide(s) → public/cases-data.json`);
  } catch (e) {
    console.warn(`  [cases] R2 fetch 실패 — 스냅샷 skip (런타임 R2 폴백): ${e.message}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
