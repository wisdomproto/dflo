// SEO 블로그(blog[lang])를 발행/미리보기 공용 본문 HTML로 조립하는 순수 함수.
// 결과는 blog_published.html_body 에 그대로 들어가는 "본문 조각"(페이지 <html> 래퍼 제외 —
// 래퍼·head·CSS·제목·CTA는 정적 빌드 blog-post.html 템플릿이 담당).
import type { BlogSeoArticle, BlogReference } from '../types';

const FAQ_HEADING: Record<string, string> = {
  ko: '자주 묻는 질문', en: 'FAQ', th: 'คำถามที่พบบ่อย', vi: 'Câu hỏi thường gặp', ch: '常見問題', cn: '常见问题',
};
// 발행 blog.mjs renderReferencesHtml 의 REF_HEADINGS 와 동일(6언어).
const REF_HEADING: Record<string, string> = {
  ko: '참고문헌', en: 'References', th: 'เอกสารอ้างอิง', vi: 'Tài liệu tham khảo', ch: '參考文獻', cn: '参考文献',
};

// 정적 빌드 blog.mjs 와 동일한 이스케이프(작은따옴표 포함) — 미리보기·발행·정적 렌더 마크업 일치.
export function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function buildBlogBodyHtml(a: BlogSeoArticle, lang: string): string {
  const sections = (a.sections ?? [])
    .map((s) => {
      const h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
      const img = s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.heading)}" loading="lazy">` : '';
      const body = s.html && s.html.trim() ? s.html : '<p class="post-empty">(본문 비어 있음)</p>';
      return `${h}${img}${body}`;
    })
    .join('\n');
  const faqItems = (a.faq ?? []).filter((f) => f.q?.trim());
  const faq = faqItems.length
    ? `<section class="post-faq"><h2>${esc(FAQ_HEADING[lang] ?? 'FAQ')}</h2>${faqItems
        .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
        .join('')}</section>`
    : '';
  return (sections || '<p class="post-empty">아직 본문이 없습니다.</p>') + faq;
}

export function buildBlogReferencesHtml(references: BlogReference[], lang: string): string {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = REF_HEADING[lang] ?? REF_HEADING.en;
  const items = references
    .map((r) => {
      const cite = [esc(r.title), [esc(r.journal), r.year ? esc(String(r.year)) : ''].filter(Boolean).join('. ')]
        .filter(Boolean)
        .join(' ');
      const links: string[] = [];
      if (r.url) links.push(`<a href="${esc(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
      if (r.doi) links.push(`<a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
      const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
      return `<li>${cite}.${tail}</li>`;
    })
    .join('');
  return `<section class="post-references"><h2 class="post-references-title">${esc(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}

// blog_published.html_body 에 그대로 들어갈 본문(섹션+FAQ+참고문헌).
export function buildBlogHtmlBody(a: BlogSeoArticle, references: BlogReference[], lang: string): string {
  return buildBlogBodyHtml(a, lang) + buildBlogReferencesHtml(references, lang);
}
