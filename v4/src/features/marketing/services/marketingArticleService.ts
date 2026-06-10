// src/features/marketing/services/marketingArticleService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle, ArticleStatus, ArticleTranslation, BlogSeoMap, ReelsMap, ReelAssets, BlogReference } from '../types';

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
    translations: (r.translations as Record<string, ArticleTranslation>) ?? {},
    blog: (r.blog as BlogSeoMap) ?? {},
    reels: (r.reels as ReelsMap) ?? {},
    reelAssets: (r.reel_assets as ReelAssets) ?? {},
    blogReferences: (r.blog_references as BlogReference[]) ?? [],
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
    // Only write translations when explicitly provided, so partial saves don't wipe them.
    ...(a.translations !== undefined ? { translations: a.translations } : {}),
    ...(a.blog !== undefined ? { blog: a.blog } : {}),
    ...(a.reels !== undefined ? { reels: a.reels } : {}),
    // reel_assets(migration 050)는 전용 saveReelAssets 로만 기록 — 일반 저장이 미적용 컬럼을 건드려 깨지는 것 방지.
    ...(a.blogReferences !== undefined ? { blog_references: a.blogReferences } : {}),
  };
}

export async function fetchArticles(): Promise<MarketingArticle[]> {
  const { data, error } = await supabase
    .from('marketing_articles')
    .select('*')
    .order('sort_order', { ascending: true })
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

// Translate the master (Korean) title+body into a target language via Gemini.
export async function translateArticle(p: {
  title: string;
  body: string;
  targetLang: string;
}): Promise<{ title: string; body: string }> {
  const res = await fetch(`${BASE}/api/marketing/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `번역 실패: ${res.status}`);
  return { title: (b.title as string) ?? '', body: (b.body as string) ?? '' };
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

/** Partial update of just the SEO blog JSONB (migration 045) — does not touch title/body. */
export async function saveBlogSeo(id: string, blog: BlogSeoMap): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ blog, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Partial update of just the reels JSONB (migration 046) — does not touch title/body. */
export async function saveReels(id: string, reels: ReelsMap): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ reels, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Partial update of just the reel_assets JSONB (migration 050, 인포그래픽 언어공용 이미지). */
export async function saveReelAssets(id: string, reelAssets: ReelAssets): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ reel_assets: reelAssets, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 통합 블로그 위저드 (SEO blog) AI 생성 ─────────────────────────────────────
export interface BlogSeoOutline {
  seoTitle: string;
  slug: string;
  metaDescription: string;
  h1: string;
  sectionHeadings: string[];
  faqQuestions: string[];
}

export async function generateBlogSeoOutline(p: {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  topicTitle: string;
  baseBody?: string;
}): Promise<BlogSeoOutline> {
  const res = await fetch(`${BASE}/api/marketing/blog-seo-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `아웃라인 생성 실패: ${res.status}`);
  const o = (b.outline ?? {}) as Partial<BlogSeoOutline>;
  return {
    seoTitle: o.seoTitle ?? '',
    slug: o.slug ?? '',
    metaDescription: o.metaDescription ?? '',
    h1: o.h1 ?? '',
    sectionHeadings: Array.isArray(o.sectionHeadings) ? o.sectionHeadings : [],
    faqQuestions: Array.isArray(o.faqQuestions) ? o.faqQuestions : [],
  };
}

export async function generateBlogSeoBody(p: {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  h1: string;
  sectionHeadings: string[];
  faqQuestions: string[];
  baseBody?: string;
}): Promise<{ sections: { heading: string; html: string; imagePrompt: string }[]; faq: { q: string; a: string }[] }> {
  const res = await fetch(`${BASE}/api/marketing/blog-seo-body`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `본문 생성 실패: ${res.status}`);
  const sections = Array.isArray(b.sections) ? b.sections : [];
  const faq = Array.isArray(b.faq) ? b.faq : [];
  return {
    sections: sections.map((s: Record<string, unknown>) => ({
      heading: String(s.heading ?? ''), html: String(s.html ?? ''), imagePrompt: String(s.imagePrompt ?? ''),
    })),
    faq: faq.map((f: Record<string, unknown>) => ({ q: String(f.q ?? ''), a: String(f.a ?? '') })),
  };
}

/** Partial update of just blog_references (migration 049) — article-level, language-independent. */
export async function saveBlogReferences(id: string, refs: BlogReference[]): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ blog_references: refs, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** evidence_papers 제목 검색(수동 추가용). anon SELECT 허용(정책 evidence_all). */
export async function searchEvidencePapers(term: string): Promise<BlogReference[]> {
  const t = term.trim();
  if (!t) return [];
  const { data, error } = await supabase
    .from('evidence_papers')
    .select('pmid,title,journal,year,doi,url')
    .ilike('title', `%${t}%`)
    .limit(10);
  if (error) { logger.warn('[marketing] searchEvidencePapers failed:', error.message); return []; }
  return (data ?? []).map((r) => ({
    pmid: (r.pmid as string) ?? '', title: (r.title as string) ?? '', journal: (r.journal as string) ?? '',
    year: (r.year as number | null) ?? null, doi: (r.doi as string | null) ?? null,
    url: (r.url as string) ?? '', similarity: 1,
  }));
}
