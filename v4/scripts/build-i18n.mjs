import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';
import { getMessengerCTA } from './lib/messenger.mjs';
import { buildHead, buildBlogPostHead, buildBlogIndexHead } from './lib/seo.mjs';
import { buildSitemap } from './lib/sitemap.mjs';
import { fetchAllLangs } from './lib/fetch-contentflow-posts.mjs';
import { loadCachedPosts, renderPost, renderIndex } from './lib/blog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en'];
const CACHE_DIR = join(ROOT, 'i18n/blog-cache');

function loadLocale(lang) {
  return yaml.load(readFileSync(join(ROOT, 'i18n/locales', `${lang}.yml`), 'utf8'));
}

function writeFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`  wrote ${path}`);
}

async function buildBlog({ lang, locale, messenger, postTemplate, indexTemplate }) {
  const posts = loadCachedPosts(CACHE_DIR, lang);

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

    // Non-Korean locales pull per-language program images from /programs/images/{lang}/{slug}/
    // and use the English-style logo. Korean keeps the original paths (legacy program HTML
    // pages and the existing logo.jpg masthead depend on them).
    const localizeProgramImg = (html) => {
      if (lang === 'ko') return html;
      return html
        .replaceAll('/programs/images/', `/programs/images/${lang}/`)
        .replaceAll('/images/logo.jpg', '/images/logo_en.png');
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

    if (blogSlugs[lang] && blogSlugs[lang].length > 0) {
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate });
      console.log(`  [blog] ${n} posts rendered for ${lang}`);
    }
  }

  const sitemap = buildSitemap({ activeLangs: ACTIVE_LANGS, blogSlugs });
  writeFile(join(ROOT, 'public/sitemap.xml'), sitemap);
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
