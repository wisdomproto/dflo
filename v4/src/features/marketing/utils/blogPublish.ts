// 블로그 발행본 빌더(순수).
// SEO 위저드 blog[lang] 이 있으면 섹션/FAQ/참고문헌 HTML 조립,
// 없으면 기존 기본글 본문(언어별 TipTap HTML) 경로를 유지(하위 호환).
import type { MarketingArticle, BlogSeoLangCode } from '../types';
import { buildBlogHtmlBody } from './blogHtml';

export interface PublishedBlogDraft {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  htmlBody: string;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildPublishedBlog(article: MarketingArticle, language: string): PublishedBlogDraft {
  // ── SEO blog path ──────────────────────────────────────────────────────────
  // article.blog 는 BlogSeoMap = Partial<Record<BlogSeoLangCode, BlogSeoArticle>>
  const seo = article.blog?.[language as BlogSeoLangCode];
  if (seo && (seo.sections.length > 0 || seo.h1)) {
    const refs = article.blogReferences ?? [];
    const slugBase = slugify(seo.slug || seo.seoTitle || article.title) || 'post';
    const htmlBody = buildBlogHtmlBody(seo, refs, language);
    return {
      slug: `${slugBase}-${article.id.slice(0, 8)}`,
      seoTitle: seo.seoTitle || article.title,
      metaDescription: (seo.metaDescription || htmlToText(htmlBody)).slice(0, 155),
      htmlBody,
    };
  }

  // ── Plain-body fallback (기존 경로, 하위 호환) ──────────────────────────────
  const isMaster = language === 'ko';
  const t = isMaster ? { title: article.title, body: article.body } : article.translations?.[language];
  const title = (t?.title || article.title || '').trim();
  const body = (t?.body || '').trim();
  if (!body) throw new Error(`${language} 본문이 비어 있어 발행할 수 없습니다.`);
  const slugBase = slugify(title) || 'post';
  const slug = `${slugBase}-${article.id.slice(0, 8)}`;
  return {
    slug,
    seoTitle: title,
    metaDescription: htmlToText(body).slice(0, 155),
    htmlBody: body,
  };
}
