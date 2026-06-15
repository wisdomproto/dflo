// src/features/marketing/services/adWorkspaceService.ts
// 광고 워크스페이스 계층 — 계정 → (캠페인) → 광고세트 → 광고.
// 캠페인 CRUD 는 marketingAdsService 에 있고, 여기는 그 위/아래 계층(계정·세트·광고).
// migration 047. 테이블이 아직 없으면 graceful — fetch 는 빈 배열, save/delete 는 throw.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { AdPlatform, AdStatus, BudgetType } from './marketingAdsService';

// ── 타입 ──────────────────────────────────────────────────────────
export type AccountStatus = 'active' | 'paused' | 'disabled';

export interface AdAccount {
  id: string;
  platform: AdPlatform;
  name: string;
  externalId: string; // act_1234… (Meta 광고계정 ID)
  currency: string;
  market: string; // 연결 시장(언어)
  status: AccountStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type Gender = 'male' | 'female';
// 해석된 Meta 지역 — key 가 있어야 실제 타게팅에 반영(없으면 라벨 보존만, 재검색 필요).
export interface GeoSpec {
  type: 'country' | 'region' | 'city' | 'zip';
  key: string; // Meta geo key (국가는 country_code)
  name: string;
  radius?: number; // city/zip 반경
  distanceUnit?: 'kilometer' | 'mile';
}
// 해석된 Meta 관심사 — id 가 있어야 실제 타게팅에 반영.
export interface InterestSpec {
  id: string;
  name: string;
}
// 맞춤 타겟(리타게팅 풀·유사타겟) — Meta custom audience id + 표시 이름.
export interface AudienceSpec {
  id: string;
  name: string;
}
export interface AdTargeting {
  geos: GeoSpec[];
  ageMin: number;
  ageMax: number;
  genders: Gender[]; // 빈 배열 = 전체
  interests: InterestSpec[];
  locales: string[]; // 사용 언어(locale id)
  customAudiences: AudienceSpec[]; // 포함(리타게팅)
  excludedAudiences: AudienceSpec[]; // 제외
}

export function defaultTargeting(): AdTargeting {
  return { geos: [], ageMin: 25, ageMax: 45, genders: [], interests: [], locales: [], customAudiences: [], excludedAudiences: [] };
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: AdStatus;
  targeting: AdTargeting;
  budget: number;
  budgetType: BudgetType;
  periodStart: string | null;
  periodEnd: string | null;
  placements: string[];
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  sortOrder: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type CreativeKind = 'cardnews' | 'reels' | 'image' | 'custom';
export interface Ad {
  id: string;
  adSetId: string;
  name: string;
  status: AdStatus;
  creativeKind: CreativeKind;
  articleId: string | null; // → marketing_articles.id (소재 출처)
  creativeLang: string;
  thumbnailUrl: string;
  mediaUrl: string;
  headline: string;
  primaryText: string;
  landingUrl: string;
  // 기존 게시물(boosting) 소재 — 채널 피드에서 골랐을 때만 채워진다 (migration 052).
  // Meta API 푸시 시 object_story_id = sourcePostId 로 1:1 매핑.
  sourcePostId: string;
  sourceChannel: string; // facebook | instagram
  sourceUrl: string; // 게시물 공개 URL(permalink)
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type Row = Record<string, unknown>;

// ── 광고 계정 ─────────────────────────────────────────────────────
function rowToAccount(r: Row): AdAccount {
  return {
    id: r.id as string,
    platform: ((r.platform as AdPlatform) ?? 'meta'),
    name: (r.name as string) ?? '',
    externalId: (r.external_id as string) ?? '',
    currency: (r.currency as string) ?? 'KRW',
    market: (r.market as string) ?? '',
    status: ((r.status as AccountStatus) ?? 'active'),
    note: (r.note as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}
function accountToRow(a: Partial<AdAccount>): Row {
  return {
    platform: a.platform ?? 'meta',
    name: a.name ?? '',
    external_id: a.externalId ?? '',
    currency: a.currency ?? 'KRW',
    market: a.market ?? '',
    status: a.status ?? 'active',
    note: a.note ?? '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAdAccounts(): Promise<AdAccount[]> {
  const { data, error } = await supabase
    .from('marketing_ad_accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchAdAccounts failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToAccount(r as Row));
}

export async function saveAdAccount(a: Partial<AdAccount> & { id?: string }): Promise<AdAccount> {
  const row = accountToRow(a);
  if (a.id) {
    const { data, error } = await supabase.from('marketing_ad_accounts').update(row).eq('id', a.id).select().single();
    if (error) throw new Error(error.message);
    return rowToAccount(data as Row);
  }
  const { data, error } = await supabase.from('marketing_ad_accounts').insert(row).select().single();
  if (error) throw new Error(error.message);
  return rowToAccount(data as Row);
}

export async function deleteAdAccount(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_ad_accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 광고 세트 ─────────────────────────────────────────────────────
// 레거시(문자열 라벨) ↔ 신형(해석된 spec) 모두 안전하게 읽는다.
function migrateGeos(v: unknown): GeoSpec[] {
  if (!Array.isArray(v)) return [];
  const out: GeoSpec[] = [];
  for (const g of v) {
    if (typeof g === 'string') {
      if (g.trim()) out.push({ type: 'city', key: '', name: g }); // 라벨만(미해석)
    } else if (g && typeof g === 'object') {
      const o = g as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      if (!name) continue;
      const type = (['country', 'region', 'city', 'zip'] as const).find((x) => x === o.type) ?? 'city';
      out.push({
        type,
        key: typeof o.key === 'string' ? o.key : '',
        name,
        radius: typeof o.radius === 'number' ? o.radius : undefined,
        distanceUnit: o.distanceUnit === 'mile' ? 'mile' : o.distanceUnit === 'kilometer' ? 'kilometer' : undefined,
      });
    }
  }
  return out;
}
function migrateInterests(v: unknown): InterestSpec[] {
  if (!Array.isArray(v)) return [];
  const out: InterestSpec[] = [];
  for (const i of v) {
    if (typeof i === 'string') {
      if (i.trim()) out.push({ id: '', name: i });
    } else if (i && typeof i === 'object') {
      const o = i as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      if (name) out.push({ id: typeof o.id === 'string' ? o.id : '', name });
    }
  }
  return out;
}

function migrateAudiences(v: unknown): AudienceSpec[] {
  if (!Array.isArray(v)) return [];
  const out: AudienceSpec[] = [];
  for (const a of v) {
    if (a && typeof a === 'object') {
      const o = a as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      if (id) out.push({ id, name: typeof o.name === 'string' ? o.name : id });
    }
  }
  return out;
}

function rowToTargeting(v: unknown): AdTargeting {
  const t = (v as Partial<Record<string, unknown>>) ?? {};
  return {
    geos: migrateGeos(t.geos),
    ageMin: typeof t.ageMin === 'number' ? t.ageMin : 25,
    ageMax: typeof t.ageMax === 'number' ? t.ageMax : 45,
    genders: Array.isArray(t.genders) ? (t.genders as Gender[]) : [],
    interests: migrateInterests(t.interests),
    locales: Array.isArray(t.locales) ? (t.locales as string[]) : [],
    customAudiences: migrateAudiences(t.customAudiences),
    excludedAudiences: migrateAudiences(t.excludedAudiences),
  };
}

function rowToAdSet(r: Row): AdSet {
  return {
    id: r.id as string,
    campaignId: (r.campaign_id as string) ?? '',
    name: (r.name as string) ?? '',
    status: ((r.status as AdStatus) ?? 'active'),
    targeting: rowToTargeting(r.targeting),
    budget: Number(r.budget) || 0,
    budgetType: ((r.budget_type as BudgetType) ?? 'daily'),
    periodStart: (r.period_start as string | null) ?? null,
    periodEnd: (r.period_end as string | null) ?? null,
    placements: Array.isArray(r.placements) ? (r.placements as string[]) : [],
    spend: Number(r.spend) || 0,
    impressions: (r.impressions as number) ?? 0,
    clicks: (r.clicks as number) ?? 0,
    conversions: (r.conversions as number) ?? 0,
    revenue: Number(r.revenue) || 0,
    sortOrder: (r.sort_order as number) ?? 0,
    note: (r.note as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}
function adSetToRow(s: Partial<AdSet>): Row {
  return {
    campaign_id: s.campaignId,
    name: s.name ?? '',
    status: s.status ?? 'active',
    targeting: s.targeting ?? defaultTargeting(),
    budget: s.budget ?? 0,
    budget_type: s.budgetType ?? 'daily',
    period_start: s.periodStart || null,
    period_end: s.periodEnd || null,
    placements: s.placements ?? [],
    spend: s.spend ?? 0,
    impressions: s.impressions ?? 0,
    clicks: s.clicks ?? 0,
    conversions: s.conversions ?? 0,
    revenue: s.revenue ?? 0,
    sort_order: s.sortOrder ?? 0,
    note: s.note ?? '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAdSets(campaignId: string): Promise<AdSet[]> {
  const { data, error } = await supabase
    .from('marketing_ad_sets')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchAdSets failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToAdSet(r as Row));
}

export async function saveAdSet(s: Partial<AdSet> & { id?: string; campaignId: string }): Promise<AdSet> {
  const row = adSetToRow(s);
  if (s.id) {
    const { data, error } = await supabase.from('marketing_ad_sets').update(row).eq('id', s.id).select().single();
    if (error) throw new Error(error.message);
    return rowToAdSet(data as Row);
  }
  const { data, error } = await supabase.from('marketing_ad_sets').insert(row).select().single();
  if (error) throw new Error(error.message);
  return rowToAdSet(data as Row);
}

export async function deleteAdSet(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_ad_sets').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 광고 ──────────────────────────────────────────────────────────
function rowToAd(r: Row): Ad {
  return {
    id: r.id as string,
    adSetId: (r.ad_set_id as string) ?? '',
    name: (r.name as string) ?? '',
    status: ((r.status as AdStatus) ?? 'active'),
    creativeKind: ((r.creative_kind as CreativeKind) ?? 'cardnews'),
    articleId: (r.article_id as string | null) ?? null,
    creativeLang: (r.creative_lang as string) ?? '',
    thumbnailUrl: (r.thumbnail_url as string) ?? '',
    mediaUrl: (r.media_url as string) ?? '',
    headline: (r.headline as string) ?? '',
    primaryText: (r.primary_text as string) ?? '',
    landingUrl: (r.landing_url as string) ?? '',
    sourcePostId: (r.source_post_id as string) ?? '',
    sourceChannel: (r.source_channel as string) ?? '',
    sourceUrl: (r.source_url as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}
function adToRow(a: Partial<Ad>): Row {
  const row: Row = {
    ad_set_id: a.adSetId,
    name: a.name ?? '',
    status: a.status ?? 'active',
    creative_kind: a.creativeKind ?? 'cardnews',
    article_id: a.articleId ?? null,
    creative_lang: a.creativeLang ?? '',
    thumbnail_url: a.thumbnailUrl ?? '',
    media_url: a.mediaUrl ?? '',
    headline: a.headline ?? '',
    primary_text: a.primaryText ?? '',
    landing_url: a.landingUrl ?? '',
    sort_order: a.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
  // 소스 게시물 필드는 값이 있을 때만 포함 — migration 052 미적용이어도 스튜디오 소재 저장은 동작.
  if (a.sourcePostId) row.source_post_id = a.sourcePostId;
  if (a.sourceChannel) row.source_channel = a.sourceChannel;
  if (a.sourceUrl) row.source_url = a.sourceUrl;
  return row;
}

export async function fetchAds(adSetId: string): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('marketing_ads')
    .select('*')
    .eq('ad_set_id', adSetId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchAds failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToAd(r as Row));
}

export async function saveAd(a: Partial<Ad> & { id?: string; adSetId: string }): Promise<Ad> {
  const row = adToRow(a);
  if (a.id) {
    const { data, error } = await supabase.from('marketing_ads').update(row).eq('id', a.id).select().single();
    if (error) throw new Error(error.message);
    return rowToAd(data as Row);
  }
  const { data, error } = await supabase.from('marketing_ads').insert(row).select().single();
  if (error) throw new Error(error.message);
  return rowToAd(data as Row);
}

export async function deleteAd(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_ads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
