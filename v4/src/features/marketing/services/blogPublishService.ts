// src/features/marketing/services/blogPublishService.ts
// blog_published CRUD (supabase 직접, anon RLS). 본문은 buildPublishedBlog(순수)로 생성.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle } from '../types';
import { buildPublishedBlog } from '../utils/blogPublish';

export interface PublishedBlog {
  id: string;
  articleId: string;
  language: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  htmlBody: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
}

type Row = Record<string, unknown>;

function rowTo(r: Row): PublishedBlog {
  return {
    id: r.id as string,
    articleId: (r.article_id as string) ?? '',
    language: (r.language as string) ?? 'ko',
    slug: (r.slug as string) ?? '',
    seoTitle: (r.seo_title as string) ?? '',
    metaDescription: (r.meta_description as string) ?? '',
    htmlBody: (r.html_body as string) ?? '',
    status: ((r.status as 'draft' | 'published') ?? 'draft'),
    publishedAt: (r.published_at as string | null) ?? null,
  };
}

export async function fetchPublished(articleId: string): Promise<PublishedBlog[]> {
  const { data, error } = await supabase
    .from('blog_published')
    .select('*')
    .eq('article_id', articleId);
  if (error) {
    logger.warn('[marketing] fetchPublished failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowTo(r as Row));
}

// (article, language) upsert. status='published'면 published_at=now.
export async function upsertPublishedBlog(
  article: MarketingArticle,
  language: string,
  status: 'draft' | 'published',
): Promise<PublishedBlog> {
  const draft = buildPublishedBlog(article, language);
  const now = new Date().toISOString();
  const row = {
    article_id: article.id,
    language,
    slug: draft.slug,
    seo_title: draft.seoTitle,
    meta_description: draft.metaDescription,
    html_body: draft.htmlBody,
    status,
    published_at: status === 'published' ? now : null,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from('blog_published')
    .upsert(row, { onConflict: 'article_id,language' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowTo(data as Row);
}

// 동적 미리보기 경로(noindex). 정적 정식 경로는 /{lang}/blog/{slug}.
export function blogPreviewPath(articleId: string, language: string): string {
  return `/marketing/blog-preview/${articleId}?lang=${language}`;
}

export function blogStaticPath(language: string, slug: string): string {
  return `/${language}/blog/${slug}`;
}
