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
export interface GeoCity { label: string; sessions: number; users: number }
export interface GeoCountry { label: string; sessions: number; users: number; pct: number; cities: GeoCity[] }
export interface DailyPoint { date: string; users: number; sessions: number; views: number }
export interface PageViews {
  main: number; clinic: number; cases: number; calculator: number; reservation: number; other: number; total: number;
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
  geo: GeoCountry[];
  daily: DailyPoint[];
}
export type CountryKey = 'all' | 'ko' | 'th' | 'vi' | 'en' | 'zh-hant' | 'zh-hans';
// 캠페인(utm_campaign) 비교 — 크로스 언어(광고 전체 비교용), 국가별이 아니라 TOP-LEVEL.
export interface CampaignStats {
  name: string;
  sessions: number;
  calcOpen: number;
  heightCalc: number;
  consult: number;
  completionRate: number; // heightCalc / calcOpen (%, div-by-zero 가드)
}
export interface SiteBreakdown {
  byCountry: Record<CountryKey, CountryStats>;
  campaigns: CampaignStats[];
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

// ── 구글 검색어 (Search Console) ──
// GA4 엔 오가닉 검색어가 없다("not provided") → 이 데이터만 GSC 에서 온다.
export interface SearchRow {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;      // %
  position: number; // 평균 게재순위
}
export interface SearchConsoleData {
  range: { startDate: string; endDate: string };
  siteUrl: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: SearchRow[];
  countries: SearchRow[];
  pages: SearchRow[];
}

export async function fetchSearchConsole(
  arg: number | { date: string },
  lang: CountryKey = 'all',
): Promise<SearchConsoleData> {
  const qs = typeof arg === 'number'
    ? `days=${arg}`
    : `start=${encodeURIComponent(arg.date)}&end=${encodeURIComponent(arg.date)}`;
  const res = await fetch(`${BASE}/api/analytics/search-console?${qs}&lang=${lang}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `검색어 분석 실패: ${res.status}`);
  return body.data as SearchConsoleData;
}
