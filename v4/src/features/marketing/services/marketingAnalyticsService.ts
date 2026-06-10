// src/features/marketing/services/marketingAnalyticsService.ts
// 사이트 분석(국가별) — ai-server GA4 프록시 호출. 키 없이 동작(프록시가 OAuth 보유).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface CountryStats {
  pageViews: { main: number; clinic: number; cases: number; calculator: number; other: number; total: number };
  events: { heightCalc: number; messenger: number };
  messengerChannel: 'kakao' | 'line';
  conversionRate: number;
}
export interface SiteBreakdown {
  byCountry: Record<'ko' | 'th', CountryStats>;
}

export async function fetchSiteBreakdown(days: number): Promise<SiteBreakdown> {
  const res = await fetch(`${BASE}/api/analytics/site-breakdown?days=${days}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `사이트 분석 실패: ${res.status}`);
  return body.data as SiteBreakdown;
}
