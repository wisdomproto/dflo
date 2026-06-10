import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';
import { getMessengerCTA } from './lib/messenger.mjs';
import { buildHead, buildBlogPostHead, buildBlogIndexHead, ACTIVE_LANGS } from './lib/seo.mjs';
import { buildSitemap } from './lib/sitemap.mjs';
import { fetchAllLangs } from './lib/fetch-contentflow-posts.mjs';
import { loadCachedPosts, renderPost, renderIndex } from './lib/blog.mjs';
import { loadPublishedBlogAll } from './lib/blog-supabase.mjs';
import { localizeProgramImages } from './lib/program-img.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
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

async function buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts }) {
  const indexHtml = renderIndex({
    posts, template: indexTemplate, locale,
    seoHead: buildBlogIndexHead(lang),
  });
  writeFile(join(ROOT, 'public', lang, 'blog/index.html'), indexHtml);

  for (const post of posts) {
    const html = renderPost({
      post, template: postTemplate, locale, messenger,
      seoHead: buildBlogPostHead({ post, lang }),
    });
    writeFile(join(ROOT, 'public', lang, 'blog', post.slug, 'index.html'), html);
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

  const homeTemplate = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const clinicTemplate = readFileSync(join(ROOT, 'i18n/template/clinic.html'), 'utf8');
  const casesTemplate = readFileSync(join(ROOT, 'i18n/template/cases.html'), 'utf8');
  const calculatorTemplate = readFileSync(join(ROOT, 'i18n/template/calculator.html'), 'utf8');
  const postTemplate = readFileSync(join(ROOT, 'i18n/template/blog-post.html'), 'utf8');
  const indexTemplate = readFileSync(join(ROOT, 'i18n/template/blog-index.html'), 'utf8');

  // Subpages share the brand SEO entry (description, OG image) but get their own title
  // from the locale yml so Google snippets and the browser tab read correctly.
  const SUBPAGES = [
    { name: 'clinic',     file: 'clinic.html',     template: clinicTemplate,     titlePath: 'clinic.page_title' },
    { name: 'cases',      file: 'cases.html',      template: casesTemplate,      titlePath: 'cases.page_title' },
    { name: 'calculator', file: 'calculator.html', template: calculatorTemplate, titlePath: 'calculator.page_title' },
  ];

  for (const lang of ACTIVE_LANGS) {
    console.log(`[i18n] building ${lang}`);
    const locale = loadLocale(lang);
    const messenger = getMessengerCTA(lang, { requireLiveUrl: true });
    locale.messenger = messenger;
    locale.messenger_json = JSON.stringify(messenger);
    locale.shell_json = JSON.stringify(locale.shell || {});

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
      return out;
    };

    // Home
    locale.seo_head = buildHead(lang, { path: '/' });
    writeFile(join(ROOT, 'public', lang, 'index.html'), localizeProgramImg(render(homeTemplate, locale)));

    // Subpages — re-bind seo_head per page so canonical/hreflang/title are correct
    for (const sub of SUBPAGES) {
      const titleParts = sub.titlePath.split('.');
      let title = locale;
      for (const p of titleParts) title = title?.[p];
      locale.seo_head = buildHead(lang, { path: `/${sub.file}`, title, skipJsonLd: true });
      writeFile(join(ROOT, 'public', lang, sub.file), localizeProgramImg(render(sub.template, locale)));
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
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts });
      console.log(`  [blog] ${n} posts rendered for ${lang} (cached ${cached.length} + published ${published.length})`);
    }
  }

  const sitemap = buildSitemap({ activeLangs: ACTIVE_LANGS, blogSlugs });
  writeFile(join(ROOT, 'public/sitemap.xml'), sitemap);
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
