// Prerender blog routes after `vite build`.
// - Fetches ContentFlow API for active languages
// - Writes dist/<langPath>/<slug>/index.html using dist/index.html as template
// - Injects <title>, <meta description>, hreflang, OG, Article JSON-LD, inlined <article>
// - API failure → empty result for that language → no pages generated (idempotent fail)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const TEMPLATE = readFileSync(resolve(DIST, 'index.html'), 'utf8');

const API = process.env.CONTENTFLOW_API_URL || 'https://contentflow.vercel.app';
const PROJECT_ID = process.env.CONTENTFLOW_PROJECT_ID || '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
const SITE_BASE = process.env.SITE_BASE_URL || 'https://www.dr187growup.com';

const LANGS = [
  { code: 'ko', path: '/blog' },
  { code: 'th', path: '/th/blog' },
];

async function fetchPosts(lang) {
  const url = `${API}/api/blog/by-project/${PROJECT_ID}/posts?lang=${lang}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[build-blog] ${lang}: HTTP ${res.status} — skipping`);
      return [];
    }
    const json = await res.json();
    return json.posts || [];
  } catch (err) {
    console.warn(`[build-blog] ${lang}: fetch failed — ${err.message} — skipping`);
    return [];
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderPost({ post, lang, pathBase }) {
  const slug = post.slug;
  const title = escapeHtml(post.title);
  const desc = escapeHtml(post.meta_description || '').slice(0, 160);
  const canonical = `${SITE_BASE}${pathBase}/${slug}`;

  const hreflang = LANGS.map((l) =>
    `<link rel="alternate" hreflang="${l.code}" href="${SITE_BASE}${l.path}/${slug}" />`
  ).join('\n    ');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || '',
    datePublished: post.published_at,
    inLanguage: lang,
    author: { '@type': 'Organization', name: '187 성장클리닉' },
    publisher: { '@type': 'Organization', name: '연세새봄의원' },
    mainEntityOfPage: canonical,
  });

  let html = TEMPLATE;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  const headInjection = `
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${canonical}" />
    ${hreflang}
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${post.published_at}" />
    <script type="application/ld+json">${schema}</script>
  `;
  html = html.replace('</head>', `${headInjection}\n  </head>`);
  // Append article AFTER the root div (outside SPA root, for SEO bots)
  const articleHtml = `<article data-blog-prerendered data-slug="${slug}" data-lang="${lang}">${post.body_html || ''}</article>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, (match) => `${match}\n    ${articleHtml}`);
  return html;
}

async function main() {
  let total = 0;
  for (const { code, path: pathBase } of LANGS) {
    const posts = await fetchPosts(code);
    console.log(`[build-blog] ${code}: ${posts.length} posts`);
    for (const post of posts) {
      const html = renderPost({ post, lang: code, pathBase });
      const outDir = resolve(DIST, pathBase.replace(/^\//, ''), post.slug);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
      total++;
    }
  }
  console.log(`[build-blog] done — ${total} files`);
}

main().catch((err) => {
  console.error('[build-blog] fatal', err);
  process.exit(1);
});
