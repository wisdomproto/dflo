// src/features/marketing/services/marketingArticleService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle, ArticleStatus } from '../types';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// Keep field lists in sync: 021 migration columns ↔ articleToRow ↔ rowToArticle ↔ MarketingArticle.
type Row = Record<string, unknown>;

function rowToArticle(r: Row): MarketingArticle {
  return {
    id: r.id as string,
    topicId: (r.topic_id as string | null) ?? null,
    title: (r.title as string) ?? '',
    body: (r.body as string) ?? '',
    category: (r.category as string) ?? '',
    keywords: (r.keywords as string[]) ?? [],
    language: (r.language as string) ?? 'ko',
    status: ((r.status as ArticleStatus) ?? 'draft'),
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
    confirmed: (r.confirmed as boolean) ?? false,
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function articleToRow(a: Partial<MarketingArticle>): Row {
  return {
    topic_id: a.topicId ?? null,
    title: a.title ?? '',
    body: a.body ?? '',
    category: a.category ?? '',
    keywords: a.keywords ?? [],
    language: a.language ?? 'ko',
    status: a.status ?? 'draft',
    updated_at: new Date().toISOString(),
    confirmed: a.confirmed ?? false,
    sort_order: a.sortOrder ?? 0,
  };
}

export async function fetchArticles(): Promise<MarketingArticle[]> {
  const { data, error } = await supabase
    .from('marketing_articles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchArticles failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToArticle(r as Row));
}

export async function saveArticle(a: Partial<MarketingArticle> & { id?: string }): Promise<MarketingArticle> {
  const row = articleToRow(a);
  if (a.id) {
    const { data, error } = await supabase
      .from('marketing_articles')
      .update(row)
      .eq('id', a.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToArticle(data as Row);
  }
  const { data, error } = await supabase
    .from('marketing_articles')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToArticle(data as Row);
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_articles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface GenerateArticleReq {
  title: string;
  angle?: string;
  keywords?: string[];
  category?: string;
  topicId?: string;
  language?: string;
}

export async function generateArticle(req: GenerateArticleReq): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/generate-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `생성 실패: ${res.status}`);
  return body.content as string;
}

export async function generateBaseArticle(req: GenerateArticleReq): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/base-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `생성 실패: ${res.status}`);
  return b.html as string;
}

export interface TopicSuggestion {
  title: string;
  angle: string;
  keywords: string[];
}

export async function suggestTopics(
  p: { count?: number; category?: string; seed?: string }
): Promise<TopicSuggestion[]> {
  const res = await fetch(`${BASE}/api/marketing/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `추천 실패: ${res.status}`);
  return (b.topics ?? []) as TopicSuggestion[];
}

export async function rewriteSelection(p: {
  selection: string;
  instruction?: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `재작성 실패: ${res.status}`);
  return b.html as string;
}

export async function setConfirmed(id: string, confirmed: boolean): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ confirmed })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderArticles(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) =>
      supabase
        .from('marketing_articles')
        .update({ sort_order: i })
        .eq('id', id)
    )
  );
}
