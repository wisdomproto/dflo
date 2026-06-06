// src/features/marketing/services/marketingPublishService.ts
// 발행 큐 CRUD (supabase client-direct, anon RLS) + GA4 조회수 매칭(enrichWithViews).
// marketing_articles 글을 채널별로 큐에 올려 status/예약/published_url을 전이한다.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import {
  buildQueueRows,
  type PublishStatus,
  type PublishChannel,
  type ContentKind,
  type BuildQueueInput,
} from '../utils/publishRows';
export type { PublishStatus, PublishChannel, ContentKind } from '../utils/publishRows';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface PublishQueueItem {
  id: string;
  articleId: string | null;
  channel: PublishChannel;
  language: string;
  scheduledAt: string | null;
  status: PublishStatus;
  publishedUrl: string | null;
  publishedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  // joined / derived (not DB columns):
  articleTitle?: string;
  articleCategory?: string;
  channelId?: string | null;
  channelName?: string;
  contentKind?: ContentKind;
  viewCount?: number;
}

// Keep field lists in sync: 026 migration columns ↔ queueItemToRow ↔ rowToQueueItem ↔ PublishQueueItem.
type Row = Record<string, unknown>;

function rowToQueueItem(r: Row): PublishQueueItem {
  const article = (r.marketing_articles ?? null) as Row | null;
  const ch = (r.marketing_channels ?? null) as Row | null;
  return {
    id: r.id as string,
    articleId: (r.article_id as string | null) ?? null,
    channel: ((r.channel as PublishChannel) ?? 'naver_blog'),
    language: (r.language as string) ?? 'ko',
    scheduledAt: (r.scheduled_at as string | null) ?? null,
    status: ((r.status as PublishStatus) ?? 'draft'),
    publishedUrl: (r.published_url as string | null) ?? null,
    publishedAt: (r.published_at as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
    articleTitle: article ? ((article.title as string) ?? '') : undefined,
    articleCategory: article ? ((article.category as string) ?? '') : undefined,
    channelId: (r.channel_id as string | null) ?? null,
    channelName: ch ? ((ch.name as string) ?? '') : undefined,
    contentKind: (r.content_kind as ContentKind) ?? 'post',
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function queueItemToRow(p: Partial<PublishQueueItem>): Row {
  const row: Row = { updated_at: new Date().toISOString() };
  if (p.articleId !== undefined) row.article_id = p.articleId;
  if (p.channel !== undefined) row.channel = p.channel;
  if (p.language !== undefined) row.language = p.language;
  if (p.scheduledAt !== undefined) row.scheduled_at = p.scheduledAt;
  if (p.status !== undefined) row.status = p.status;
  if (p.publishedUrl !== undefined) row.published_url = p.publishedUrl;
  if (p.publishedAt !== undefined) row.published_at = p.publishedAt;
  if (p.note !== undefined) row.note = p.note;
  return row;
}

export async function fetchQueue(): Promise<PublishQueueItem[]> {
  // marketing_articles 조인으로 제목/카테고리 표시. 조인 실패(미적용/권한)면 빈 배열로 graceful.
  const { data, error } = await supabase
    .from('marketing_publish_queue')
    .select('*, marketing_articles(title, category), marketing_channels(name, platform, locale)')
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchQueue failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToQueueItem(r as Row));
}

// BuildQueueInput(순수 빌더)로 행 생성 후 insert. updated_at만 비순수로 부착.
export async function enqueue(input: BuildQueueInput): Promise<void> {
  if (!input.targets.length) return;
  const now = new Date().toISOString();
  const rows = buildQueueRows(input).map((r) => ({ ...r, updated_at: now }));
  const { error } = await supabase.from('marketing_publish_queue').insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateQueueItem(id: string, patch: Partial<PublishQueueItem>): Promise<void> {
  const { error } = await supabase
    .from('marketing_publish_queue')
    .update(queueItemToRow(patch))
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// 예약 시각 설정/해제. iso가 있으면 status='scheduled', 비우면 'draft'로 되돌린다.
export async function setSchedule(id: string, iso: string | null): Promise<void> {
  await updateQueueItem(id, {
    scheduledAt: iso,
    status: iso ? 'scheduled' : 'draft',
  });
}

// 수동 '발행됨' 표시: published_url 입력 + status='published' + published_at=now.
export async function markPublished(id: string, url: string): Promise<void> {
  await updateQueueItem(id, {
    publishedUrl: url,
    status: 'published',
    publishedAt: new Date().toISOString(),
  });
}

export async function deleteQueueItem(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_publish_queue').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// published 항목의 published_url 경로를 GA4 topPages.path와 매칭해 실제 조회수를 주입.
// OAuth 작동 중이라 키 없이 동작. 호출/매칭 실패 시 원본 items를 그대로 반환(graceful).
export async function enrichWithViews(items: PublishQueueItem[]): Promise<PublishQueueItem[]> {
  const hasPublished = items.some((it) => it.publishedUrl);
  if (!hasPublished) return items;
  try {
    const res = await fetch(`${BASE}/api/analytics/overview?days=90`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return items;
    const topPages = (body.data?.topPages ?? []) as Array<{ path: string; views: number }>;
    const viewsByPath = new Map<string, number>();
    for (const p of topPages) viewsByPath.set(normalizePath(p.path), p.views);
    return items.map((it) => {
      if (!it.publishedUrl) return it;
      const path = pathnameOf(it.publishedUrl);
      if (path === null) return it;
      const v = viewsByPath.get(path);
      return v === undefined ? it : { ...it, viewCount: v };
    });
  } catch (e) {
    logger.warn('[marketing] enrichWithViews failed:', e instanceof Error ? e.message : String(e));
    return items;
  }
}

// 전체 URL이면 pathname만, 이미 경로면 그대로. 끝 슬래시 정규화.
function pathnameOf(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    return normalizePath(new URL(raw).pathname);
  } catch {
    // 경로 조각만 들어온 경우
    return raw.startsWith('/') ? normalizePath(raw) : null;
  }
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}
