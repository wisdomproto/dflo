// 국가/페이지 분류 + GA4 site-breakdown 집계 (googleapis 무관, 순수 → 단위 테스트 대상).
// 국가 = 경로 prefix. 요약 지표(사용자/세션/참여시간)는 landingPage(세션 진입 페이지)
// 기준으로 국가에 귀속(한 세션은 1 랜딩이라 중복 없음), 페이지뷰·이벤트는 pagePath 기준.
// 'all' = 한국+태국 합산. vi/en 등은 'other' 로 제외.

export type Country = 'ko' | 'th' | 'other';
export type PageBucket = 'main' | 'clinic' | 'cases' | 'calculator' | 'other';
export type CountryKey = 'all' | 'ko' | 'th';

export function classifyCountry(path: string): Country {
  if (path.startsWith('/th/') || path === '/th') return 'th';
  if (path.startsWith('/vi/') || path === '/vi') return 'other';
  if (path.startsWith('/en/') || path === '/en') return 'other';
  // /ko/*, 루트 '/', 그 외(/calc-embed 등) → ko (루트는 ko 리다이렉트)
  return 'ko';
}

export function classifyPage(pagePath: string): PageBucket {
  if (/\/calculator\.html|\/calc-embed/.test(pagePath)) return 'calculator';
  if (/\/clinic\.html/.test(pagePath)) return 'clinic';
  if (/\/cases\.html/.test(pagePath)) return 'cases';
  if (pagePath === '/' || /^\/[a-z]{2}\/?(index\.html)?$/.test(pagePath)) return 'main';
  return 'other';
}

// 국가 → 누적 대상 키. ko/th 는 자기 + all, other 는 어디에도 안 들어감.
function countryKeys(c: Country): CountryKey[] {
  if (c === 'ko') return ['ko', 'all'];
  if (c === 'th') return ['th', 'all'];
  return [];
}

export interface Summary {
  users: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
  pageViews: number; // landingPage 기준 (세션 단위)
  engagementSec: number; // 총 참여시간(초) — 합산용
  avgEngagementSec: number; // 1인당 평균 참여시간(초)
}
export interface NamedCount { label: string; sessions: number; pct: number }
export interface DailyPoint { date: string; users: number; sessions: number; views: number }
export interface PageViews {
  main: number; clinic: number; cases: number; calculator: number; other: number; total: number;
}
export interface CountryStats {
  summary: Summary;
  prevSummary: Summary; // 직전 동일 기간 (증감 계산용)
  pageViews: PageViews; // pagePath 기준 페이지 분해
  events: { heightCalc: number; messenger: number };
  messengerChannel: 'kakao' | 'line' | 'mixed';
  conversionRate: number; // 메신저 클릭 / 페이지뷰(pagePath total)
  channels: NamedCount[];
  devices: NamedCount[];
  daily: DailyPoint[];
}
export interface SiteBreakdown { byCountry: Record<CountryKey, CountryStats> }

// ── 입력 행 (ga4.ts 가 GA4 응답을 이 형태로 매핑해 넘김) ──
export interface LandingRow {
  landingPage: string; users: number; newUsers: number; sessions: number; pageViews: number; engagementSec: number;
}
export interface PvRow { pagePath: string; views: number }
export interface EventRow { pagePath: string; eventName: string; count: number }
export interface ChannelRow { landingPage: string; channel: string; sessions: number }
export interface DeviceRow { landingPage: string; device: string; sessions: number }
export interface DailyRow { date: string; landingPage: string; users: number; sessions: number; views: number }
export interface BreakdownInput {
  landing: LandingRow[];
  landingPrev: LandingRow[];
  pv: PvRow[];
  events: EventRow[];
  channels: ChannelRow[];
  devices: DeviceRow[];
  daily: DailyRow[];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function blankSummary(): Summary {
  return { users: 0, newUsers: 0, returningUsers: 0, sessions: 0, pageViews: 0, engagementSec: 0, avgEngagementSec: 0 };
}
function blankStats(channel: 'kakao' | 'line' | 'mixed'): CountryStats {
  return {
    summary: blankSummary(),
    prevSummary: blankSummary(),
    pageViews: { main: 0, clinic: 0, cases: 0, calculator: 0, other: 0, total: 0 },
    events: { heightCalc: 0, messenger: 0 },
    messengerChannel: channel,
    conversionRate: 0,
    channels: [],
    devices: [],
    daily: [],
  };
}

// label 별 sessions 합산 + 비중(%) 내림차순.
function rollup(rows: { label: string; sessions: number }[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.label, (map.get(r.label) ?? 0) + r.sessions);
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([label, sessions]) => ({ label, sessions, pct: total > 0 ? round2((sessions / total) * 100) : 0 }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function aggregateSiteBreakdown(input: BreakdownInput): SiteBreakdown {
  const stats: Record<CountryKey, CountryStats> = {
    all: blankStats('mixed'),
    ko: blankStats('kakao'),
    th: blankStats('line'),
  };

  // 1) 요약 (landingPage 기준) — current + previous
  const addLanding = (rows: LandingRow[], field: 'summary' | 'prevSummary') => {
    for (const r of rows) {
      for (const k of countryKeys(classifyCountry(r.landingPage))) {
        const s = stats[k][field];
        s.users += r.users;
        s.newUsers += r.newUsers;
        s.sessions += r.sessions;
        s.pageViews += r.pageViews;
        s.engagementSec += r.engagementSec;
      }
    }
  };
  addLanding(input.landing, 'summary');
  addLanding(input.landingPrev, 'prevSummary');

  // 2) 페이지뷰 (pagePath 기준)
  for (const r of input.pv) {
    const bucket = classifyPage(r.pagePath);
    for (const k of countryKeys(classifyCountry(r.pagePath))) {
      stats[k].pageViews[bucket] += r.views;
      stats[k].pageViews.total += r.views;
    }
  }

  // 3) 이벤트 (pagePath 기준)
  for (const r of input.events) {
    for (const k of countryKeys(classifyCountry(r.pagePath))) {
      if (r.eventName === 'height_calc_complete') stats[k].events.heightCalc += r.count;
      else if (r.eventName === 'consult_click') stats[k].events.messenger += r.count;
    }
  }

  // 4) 채널 / 디바이스 (landingPage 기준)
  const chanByKey: Record<CountryKey, { label: string; sessions: number }[]> = { all: [], ko: [], th: [] };
  for (const r of input.channels) {
    for (const k of countryKeys(classifyCountry(r.landingPage))) chanByKey[k].push({ label: r.channel || '(other)', sessions: r.sessions });
  }
  const devByKey: Record<CountryKey, { label: string; sessions: number }[]> = { all: [], ko: [], th: [] };
  for (const r of input.devices) {
    for (const k of countryKeys(classifyCountry(r.landingPage))) devByKey[k].push({ label: r.device || '(other)', sessions: r.sessions });
  }

  // 5) 일자별 (landingPage 기준, date 합산)
  const dailyByKey: Record<CountryKey, Map<string, DailyPoint>> = { all: new Map(), ko: new Map(), th: new Map() };
  for (const r of input.daily) {
    for (const k of countryKeys(classifyCountry(r.landingPage))) {
      const m = dailyByKey[k];
      const p = m.get(r.date) ?? { date: r.date, users: 0, sessions: 0, views: 0 };
      p.users += r.users;
      p.sessions += r.sessions;
      p.views += r.views;
      m.set(r.date, p);
    }
  }

  // finalize
  for (const k of ['all', 'ko', 'th'] as CountryKey[]) {
    const st = stats[k];
    for (const field of ['summary', 'prevSummary'] as const) {
      const s = st[field];
      s.returningUsers = Math.max(0, s.users - s.newUsers);
      s.avgEngagementSec = s.users > 0 ? round2(s.engagementSec / s.users) : 0;
    }
    st.conversionRate = st.pageViews.total > 0 ? round2((st.events.messenger / st.pageViews.total) * 100) : 0;
    st.channels = rollup(chanByKey[k]);
    st.devices = rollup(devByKey[k]);
    st.daily = [...dailyByKey[k].values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  return { byCountry: stats };
}
