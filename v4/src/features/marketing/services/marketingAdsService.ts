// src/features/marketing/services/marketingAdsService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const MARKETING_KEY = import.meta.env.VITE_MARKETING_KEY as string | undefined;
function marketingHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (MARKETING_KEY) h['x-marketing-key'] = MARKETING_KEY;
  return h;
}

export type AdPlatform = 'meta' | 'google' | 'youtube' | 'naver';
export type AdStatus = 'active' | 'paused' | 'ended' | 'draft';
export type BudgetType = 'daily' | 'lifetime';

export const AD_REGIONS: { code: string; label: string }[] = [
  { code: 'kr', label: '🇰🇷 한국' },
  { code: 'th', label: '🇹🇭 태국' },
  { code: 'vi', label: '🇻🇳 베트남' },
  { code: 'sea_en', label: '🌏 동남아 영어권' },
  { code: 'global', label: '🌐 글로벌' },
];

export interface AdCampaign {
  id: string;
  platform: AdPlatform;
  name: string;
  status: AdStatus;
  objective: string;
  language: string;
  budget: number;
  budgetType: BudgetType;
  periodStart: string | null;
  periodEnd: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  region: string;
  channelId: string | null;
  accountId: string | null; // → marketing_ad_accounts.id (migration 047)
  market: string; // 시장(언어): ko | en | th | vi (migration 047)
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDerived {
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  convRate: number;
}

// Keep field lists in sync: 028 migration columns ↔ campaignToRow ↔ rowToCampaign ↔ AdCampaign.
type Row = Record<string, unknown>;

function rowToCampaign(r: Row): AdCampaign {
  return {
    id: r.id as string,
    platform: ((r.platform as AdPlatform) ?? 'meta'),
    name: (r.name as string) ?? '',
    status: ((r.status as AdStatus) ?? 'active'),
    objective: (r.objective as string) ?? '',
    language: (r.language as string) ?? 'ko',
    budget: Number(r.budget) || 0,
    budgetType: ((r.budget_type as BudgetType) ?? 'daily'),
    periodStart: (r.period_start as string | null) ?? null,
    periodEnd: (r.period_end as string | null) ?? null,
    spend: Number(r.spend) || 0,
    impressions: (r.impressions as number) ?? 0,
    clicks: (r.clicks as number) ?? 0,
    conversions: (r.conversions as number) ?? 0,
    revenue: Number(r.revenue) || 0,
    region: (r.region as string) ?? '',
    channelId: (r.channel_id as string | null) ?? null,
    accountId: (r.account_id as string | null) ?? null,
    market: (r.market as string) ?? '',
    note: (r.note as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function campaignToRow(c: Partial<AdCampaign>): Row {
  return {
    platform: c.platform ?? 'meta',
    name: c.name ?? '',
    status: c.status ?? 'active',
    objective: c.objective ?? '',
    language: c.language ?? 'ko',
    budget: c.budget ?? 0,
    budget_type: c.budgetType ?? 'daily',
    period_start: c.periodStart || null,
    period_end: c.periodEnd || null,
    spend: c.spend ?? 0,
    impressions: c.impressions ?? 0,
    clicks: c.clicks ?? 0,
    conversions: c.conversions ?? 0,
    revenue: c.revenue ?? 0,
    region: c.region ?? '',
    channel_id: c.channelId ?? null,
    account_id: c.accountId ?? null,
    market: c.market ?? '',
    note: c.note ?? '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCampaigns(): Promise<AdCampaign[]> {
  const { data, error } = await supabase
    .from('marketing_ad_campaigns')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchCampaigns failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToCampaign(r as Row));
}

export async function saveCampaign(c: Partial<AdCampaign> & { id?: string }): Promise<AdCampaign> {
  const row = campaignToRow(c);
  if (c.id) {
    const { data, error } = await supabase
      .from('marketing_ad_campaigns')
      .update(row)
      .eq('id', c.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToCampaign(data as Row);
  }
  const { data, error } = await supabase
    .from('marketing_ad_campaigns')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCampaign(data as Row);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_ad_campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// 파생 지표 — 전부 클라이언트 산술. 0 분모는 반드시 0 반환 (NaN/Infinity 금지).
export function deriveMetrics(c: {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}): CampaignDerived {
  const impressions = c.impressions || 0;
  const clicks = c.clicks || 0;
  const conversions = c.conversions || 0;
  const spend = c.spend || 0;
  const revenue = c.revenue || 0;
  return {
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    convRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
  };
}

// ── Meta Marketing API 푸시 ────────────────────────────────────────
export interface MetaPushResult {
  ok: boolean;
  metaCampaignId?: string;
  metaAdsetId?: string;
  adIds?: string[];
  warnings: string[];
  error?: string;
}

// 워크스페이스 캠페인을 Meta에 PAUSED로 생성(캠페인→세트→광고). 저장된 캠페인 id 필요.
export async function pushCampaignToMeta(campaignId: string): Promise<MetaPushResult> {
  const res = await fetch(`${BASE}/api/marketing/ads/push`, {
    method: 'POST',
    headers: marketingHeaders(true),
    body: JSON.stringify({ campaignId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    return { ok: false, warnings: body.warnings ?? [], error: body.error || `푸시 실패: ${res.status}` };
  }
  return body as MetaPushResult;
}

export interface MetaInsightRow {
  campaignId: string; campaignName: string;
  spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpc: number;
}
// 광고 계정(act_…) 성과 읽기.
export async function fetchMetaInsights(accountExternalId: string, preset = 'maximum'): Promise<MetaInsightRow[]> {
  const id = accountExternalId.replace(/^act_/, '');
  const res = await fetch(`${BASE}/api/marketing/ads/insights/act_${id}?preset=${preset}`, { headers: marketingHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `성과 조회 실패: ${res.status}`);
  return (body.rows ?? []) as MetaInsightRow[];
}

// ── Meta 타게팅 검색(지역·관심사 자동완성) ─────────────────────────
export interface GeoResult {
  type: 'country' | 'region' | 'city' | 'zip';
  key: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  supportsRadius?: boolean;
}
export interface InterestResult {
  id: string;
  name: string;
  audienceLower?: number;
  audienceUpper?: number;
  path?: string[];
}

// 검색 실패(미연결 등)는 throw 대신 { results:[], error } — 타이핑마다 호출되므로.
export async function searchAdGeo(q: string, country?: string): Promise<{ results: GeoResult[]; error?: string }> {
  const url = new URL(`${BASE}/api/marketing/meta/targeting/geo`);
  url.searchParams.set('q', q);
  if (country) url.searchParams.set('country', country);
  try {
    const res = await fetch(url.toString(), { headers: marketingHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { results: [], error: body.error || `검색 실패: ${res.status}` };
    return { results: (body.results ?? []) as GeoResult[] };
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : '검색 오류' };
  }
}

export async function searchAdInterest(q: string): Promise<{ results: InterestResult[]; error?: string }> {
  const url = new URL(`${BASE}/api/marketing/meta/targeting/interest`);
  url.searchParams.set('q', q);
  try {
    const res = await fetch(url.toString(), { headers: marketingHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { results: [], error: body.error || `검색 실패: ${res.status}` };
    return { results: (body.results ?? []) as InterestResult[] };
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : '검색 오류' };
  }
}

// ── Meta 맞춤 타겟(리타게팅 풀) ────────────────────────────────────
export interface AudienceResult {
  id: string;
  name: string;
  subtype: string;
  approxCount?: number;
  ready?: boolean;
}
export async function listCustomAudiences(accountExternalId: string): Promise<{ audiences: AudienceResult[]; error?: string }> {
  const id = accountExternalId.replace(/^act_/, '');
  try {
    const res = await fetch(`${BASE}/api/marketing/meta/audiences/act_${id}`, { headers: marketingHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { audiences: [], error: body.error || `조회 실패: ${res.status}` };
    return { audiences: (body.audiences ?? []) as AudienceResult[] };
  } catch (e) {
    return { audiences: [], error: e instanceof Error ? e.message : '조회 오류' };
  }
}
export async function createLookalike(
  accountExternalId: string,
  input: { sourceAudienceId: string; country: string; ratio: number; name?: string },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const id = accountExternalId.replace(/^act_/, '');
  try {
    const res = await fetch(`${BASE}/api/marketing/meta/audiences/act_${id}/lookalike`, {
      method: 'POST',
      headers: marketingHeaders(true),
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { ok: false, error: body.error || `생성 실패: ${res.status}` };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '생성 오류' };
  }
}

// GATED: Gemini 키 의존. 키 만료 시 502 → 호출부에서 에러 표시.
export async function requestAdsInsights(campaigns: AdCampaign[], kakaoClicks: number): Promise<string> {
  const payload = {
    campaigns: campaigns.map((c) => {
      const d = deriveMetrics(c);
      return {
        name: c.name,
        platform: c.platform,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        revenue: c.revenue,
        ctr: d.ctr,
        cpc: d.cpc,
        cpa: d.cpa,
        roas: d.roas,
      };
    }),
    kakaoClicks,
  };
  const res = await fetch(`${BASE}/api/marketing/ads-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `진단 실패: ${res.status}`);
  return body.insight as string;
}
