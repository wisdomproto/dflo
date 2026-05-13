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
  writeFile(join(ROOT, 'public/test', lang, 'blog/index.html'), indexHtml);

  for (const post of posts) {
    const html = renderPost({
      post, template: postTemplate, locale, messenger,
      seoHead: buildBlogPostHead({ post, lang }),
    });
    writeFile(join(ROOT, 'public/test', lang, 'blog', post.slug, 'index.html'), html);
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
  const postTemplate = readFileSync(join(ROOT, 'i18n/template/blog-post.html'), 'utf8');
  const indexTemplate = readFileSync(join(ROOT, 'i18n/template/blog-index.html'), 'utf8');

  for (const lang of ACTIVE_LANGS) {
    console.log(`[i18n] building ${lang}`);
    const locale = loadLocale(lang);
    const messenger = getMessengerCTA(lang, { requireLiveUrl: true });
    locale.messenger = messenger;
    locale.seo_head = buildHead(lang, { path: '/' });
    writeFile(join(ROOT, 'public/test', lang, 'index.html'), render(homeTemplate, locale));

    if (blogSlugs[lang] && blogSlugs[lang].length > 0) {
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate });
      console.log(`  [blog] ${n} posts rendered for ${lang}`);
    }
  }

  const sitemap = buildSitemap({ activeLangs: ACTIVE_LANGS, blogSlugs });
  writeFile(join(ROOT, 'public/test/sitemap.xml'), sitemap);
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
