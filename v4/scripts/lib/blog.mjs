import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './render.mjs';

function formatDate(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : lang, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return fmt.format(d);
}

export function renderPost({ post, template, locale, messenger, seoHead }) {
  const data = {
    ...locale,
    messenger,
    seo_head: seoHead,
    post: {
      ...post,
      published_at_display: formatDate(post.published_at, locale.meta.lang),
    },
  };
  return render(template, data);
}

export function renderIndex({ posts, template, locale, seoHead }) {
  const data = {
    ...locale,
    seo_head: seoHead,
    lang: locale.meta.lang,
    posts: posts.map((p) => ({
      lang: locale.meta.lang,
      slug: p.slug,
      title: p.title,
      meta_description: p.meta_description || '',
      published_at_display: formatDate(p.published_at, locale.meta.lang),
    })),
  };
  return render(template, data);
}

export function loadCachedPosts(cacheDir, lang) {
  const dir = join(cacheDir, lang);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}
