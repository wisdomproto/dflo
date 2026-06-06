// src/features/marketing/services/marketingAdsService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

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
