// 블로그 발행본 빌더(순수).
// SEO 위저드 blog[lang] 이 있으면 섹션/FAQ/참고문헌 HTML 조립,
// 없으면 기존 기본글 본문(언어별 TipTap HTML) 경로를 유지(하위 호환).
import type { MarketingArticle, BlogSeoLangCode } from '../types';
import { buildBlogHtmlBody, buildBlogBodyHtml } from './blogHtml';

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
  if (seo && ((seo.sections?.length ?? 0) > 0 || seo.h1)) {
    const refs = article.blogReferences ?? [];
    const htmlBody = buildBlogHtmlBody(seo, refs, language);
    // SEO 위저드 slug 는 키워드 기반 — 그대로 사용해 미리보기 URL(article.slug)·sitemap 과 일치.
    // (비어 있을 때만 제목 기반 + id 접두로 폴백; 토픽 간 slug 충돌은 예약 스크립트가 검사)
    const slug = seo.slug?.trim()
      ? seo.slug.trim()
      : `${slugify(seo.seoTitle || article.title) || 'post'}-${article.id.slice(0, 8)}`;
    return {
      slug,
      seoTitle: seo.seoTitle || article.title,
      metaDescription: (seo.metaDescription?.trim() || htmlToText(buildBlogBodyHtml(seo, language))).slice(0, 155),
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
