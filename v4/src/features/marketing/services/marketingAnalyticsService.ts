// src/features/marketing/services/marketingAnalyticsService.ts
// 사이트 분석(국가별) — ai-server GA4 프록시 호출. 키 없이 동작(프록시가 OAuth 보유).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface Summary {
  users: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
  pageViews: number;
  engagementSec: number;
  avgEngagementSec: number;
}
export interface NamedCount { label: string; sessions: number; pct: number }
export interface DailyPoint { date: string; users: number; sessions: number; views: number }
export interface PageViews {
  main: number; clinic: number; cases: number; calculator: number; other: number; total: number;
}
export interface CountryStats {
  summary: Summary;
  prevSummary: Summary;
  pageViews: PageViews;
  events: { calcOpen: number; heightCalc: number; messenger: number };
  calcCompletionRate: number; // 측정 완료 / 패널 열람 (열람→완료 퍼널)
  messengerChannel: 'kakao' | 'line' | 'mixed';
  conversionRate: number;
  channels: NamedCount[];
  devices: NamedCount[];
  daily: DailyPoint[];
}
export type CountryKey = 'all' | 'ko' | 'th';
export interface SiteBreakdown {
  byCountry: Record<CountryKey, CountryStats>;
}

// 기간(number=지난 N일) 또는 특정 하루({ date: 'YYYY-MM-DD' }) 로 조회.
export async function fetchSiteBreakdown(arg: number | { date: string }): Promise<SiteBreakdown> {
  const qs = typeof arg === 'number'
    ? `days=${arg}`
    : `start=${encodeURIComponent(arg.date)}&end=${encodeURIComponent(arg.date)}`;
  const res = await fetch(`${BASE}/api/analytics/site-breakdown?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `사이트 분석 실패: ${res.status}`);
  return body.data as SiteBreakdown;
}
