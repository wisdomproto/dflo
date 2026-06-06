// 블로그 발행본 빌더(순수). 자체 사이트 블로그 본문 = 기본글 본문(언어별 TipTap HTML).
import type { MarketingArticle } from '../types';

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
