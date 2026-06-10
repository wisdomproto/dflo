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

const REF_HEADINGS = {
  ko: '참고문헌', en: 'References', th: 'เอกสารอ้างอิง',
  vi: 'Tài liệu tham khảo', ch: '參考文獻', cn: '参考文献',
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 아티클 단위 참고문헌 → <section> HTML. 빈 배열·undefined 면 '' (캐시 렌더 경로에서 inert).
export function renderReferencesHtml(references, lang) {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = REF_HEADINGS[lang] || REF_HEADINGS.en;
  const items = references.map((r) => {
    const cite = [escapeHtml(r.title), [escapeHtml(r.journal), r.year ? escapeHtml(r.year) : ''].filter(Boolean).join('. ')]
      .filter(Boolean).join(' ');
    const links = [];
    if (r.url) links.push(`<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
    if (r.doi) links.push(`<a href="https://doi.org/${escapeHtml(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
    const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
    return `<li>${cite}.${tail}</li>`;
  }).join('');
  return `<section class="post-references"><h2 class="post-references-title">${escapeHtml(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}

export function renderPost({ post, template, locale, messenger, seoHead }) {
  const lang = locale.meta.lang;
  const data = {
    ...locale,
    messenger,
    seo_head: seoHead,
    post: {
      ...post,
      published_at_display: formatDate(post.published_at, lang),
      references_html: renderReferencesHtml(post.references, lang),
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
