// src/features/marketing/services/marketingChannelService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// ── 타입 (ai-server 와 분리라 중앙 types.ts 미수정, 여기 co-locate) ──
export interface ChannelRow {
  label: string;
  sessions: number;
  users: number;
  percentage: number;
}

export interface ChannelBreakdown {
  channelGroups: ChannelRow[];
  sourceMedium: ChannelRow[];
  countries: ChannelRow[];
}

export interface MarketingChannel {
  id: string;
  platform: string;
  name: string;
  handle: string;
  url: string;
  followers: number;
  followerSnapshotAt: string | null;
  locale: string;
  note: string;
  sortOrder: number;
}

export interface YoutubeChannelStats {
  title: string;
  subscribers: number;
  viewCount: number;
  videoCount: number;
  avgViews: number;
  thumbnail: string;
}

// ── (A) GA4 유입 분해 — ai-server 프록시 (키 없이 동작) ──
export async function fetchChannelBreakdown(days: number): Promise<ChannelBreakdown> {
  const res = await fetch(`${BASE}/api/analytics/channels?days=${days}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `유입 분석 실패: ${res.status}`);
  return body.data as ChannelBreakdown;
}

// ── (B) 채널 레지스트리 CRUD — supabase 직접 (anon, RLS) ──
// Keep field lists in sync: 020 migration columns ↔ channelToRow ↔ rowToChannel ↔ MarketingChannel.
type Row = Record<string, unknown>;

function rowToChannel(r: Row): MarketingChannel {
  return {
    id: r.id as string,
    platform: (r.platform as string) ?? '',
    name: (r.name as string) ?? '',
    handle: (r.handle as string) ?? '',
    url: (r.url as string) ?? '',
    followers: (r.followers as number) ?? 0,
    followerSnapshotAt: (r.follower_snapshot_at as string | null) ?? null,
    locale: (r.locale as string) ?? 'ko',
    note: (r.note as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function channelToRow(c: Partial<MarketingChannel>): Row {
  return {
    platform: c.platform ?? '',
    name: c.name ?? '',
    handle: c.handle ?? '',
    url: c.url ?? '',
    followers: c.followers ?? 0,
    follower_snapshot_at: c.followerSnapshotAt ?? null,
    locale: c.locale ?? 'ko',
    note: c.note ?? '',
    sort_order: c.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchChannels(): Promise<MarketingChannel[]> {
  const { data, error } = await supabase
    .from('marketing_channels')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchChannels failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToChannel(r as Row));
}

export async function saveChannel(
  c: Partial<MarketingChannel> & { id?: string },
): Promise<MarketingChannel> {
  const row = channelToRow(c);
  if (c.id) {
    const { data, error } = await supabase
      .from('marketing_channels')
      .update(row)
      .eq('id', c.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToChannel(data as Row);
  }
  const { data, error } = await supabase
    .from('marketing_channels')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToChannel(data as Row);
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_channels').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── (C) YouTube 채널 통계 동기화 — ai-server 프록시 (YOUTUBE_API_KEY 게이트) ──
export async function syncYoutubeChannel(handle: string): Promise<YoutubeChannelStats> {
  const res = await fetch(`${BASE}/api/marketing/youtube-channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `동기화 실패: ${res.status}`);
  return body.stats as YoutubeChannelStats;
}
