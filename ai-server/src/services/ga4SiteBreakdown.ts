// 언어(경로)/페이지 분류 + GA4 site-breakdown 집계 (googleapis 무관, 순수 → 단위 테스트 대상).
// 언어 = 경로 prefix(/ko /th /vi /en). 요약 지표(사용자/세션/참여시간)는 landingPage(세션 진입 페이지)
// 기준으로 언어에 귀속(한 세션은 1 랜딩이라 중복 없음), 페이지뷰·이벤트는 pagePath 기준.
// 'all' = ko+th+vi+en 합산. 유입 '지역'(geo)은 GA4 country/city = 방문자의 실제 지리적 위치(언어 경로와 별개).

export type Country = 'ko' | 'th' | 'vi' | 'en' | 'zh-hant' | 'zh-hans' | 'other';
export type PageBucket = 'main' | 'clinic' | 'cases' | 'calculator' | 'reservation' | 'other';
export type CountryKey = 'all' | 'ko' | 'th' | 'vi' | 'en' | 'zh-hant' | 'zh-hans';

// ★평범한 배열이라 Country/CountryKey 유니온을 넓혀도 자동으로 강제되지 않는다 — 여기에 안 넣으면
//   finalize 루프가 중국어 버킷을 건너뛰어 지표가 조용히 0/빈 배열이 된다(에러 없음).
const LANG_KEYS: CountryKey[] = ['all', 'ko', 'th', 'vi', 'en', 'zh-hant', 'zh-hans'];

export function classifyCountry(path: string): Country {
  if (path.startsWith('/th/') || path === '/th') return 'th';
  if (path.startsWith('/vi/') || path === '/vi') return 'vi';
  if (path.startsWith('/en/') || path === '/en') return 'en';
  if (path.startsWith('/zh-hant/') || path === '/zh-hant') return 'zh-hant';
  if (path.startsWith('/zh-hans/') || path === '/zh-hans') return 'zh-hans';
  // /ko/*, 루트 '/', 그 외(/calc-embed 등) → ko (루트는 ko 리다이렉트)
  return 'ko';
}

export function classifyPage(pagePath: string): PageBucket {
  if (/\/calculator\.html|\/calc-embed/.test(pagePath)) return 'calculator';
  if (/\/clinic\.html/.test(pagePath)) return 'clinic';
  if (/\/cases\.html/.test(pagePath)) return 'cases';
  if (/\/reservation/.test(pagePath)) return 'reservation'; // 예약 폼 가상 page_view (/reservation)
  // ★명시 열거 — /^\/[a-z-]{2,7}\/?$/ 류로 넓히면 /report·/blog·/guide 가 main 으로 오분류된다.
  if (pagePath === '/' || /^\/(ko|th|vi|en|zh-hant|zh-hans)\/?(index\.html)?$/.test(pagePath)) return 'main';
  return 'other';
}

// 언어 → 누적 대상 키. 각 언어는 자기 + all.
function countryKeys(c: Country): CountryKey[] {
  if (c === 'ko') return ['ko', 'all'];
  if (c === 'th') return ['th', 'all'];
  if (c === 'vi') return ['vi', 'all'];
  if (c === 'en') return ['en', 'all'];
  if (c === 'zh-hant') return ['zh-hant', 'all'];
  if (c === 'zh-hans') return ['zh-hans', 'all'];
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
// 유입 지역(geo) — 방문자의 실제 지리적 위치 (GA4 country/city). 언어 경로와 별개.
export interface GeoCity { label: string; sessions: number; users: number }
export interface GeoCountry { label: string; sessions: number; users: number; pct: number; cities: GeoCity[] }
export interface DailyPoint { date: string; users: number; sessions: number; views: number }
export interface PageViews {
  main: number; clinic: number; cases: number; calculator: number; reservation: number; other: number; total: number;
}
export interface CountryStats {
  summary: Summary;
  prevSummary: Summary; // 직전 동일 기간 (증감 계산용)
  pageViews: PageViews; // pagePath 기준 페이지 분해
  events: { calcOpen: number; heightCalc: number; messenger: number };
  calcCompletionRate: number; // 예측키 측정 완료 / 패널 열람 (열람→완료 퍼널)
  messengerChannel: 'kakao' | 'line' | 'whatsapp' | 'mixed';
  conversionRate: number; // 메신저 클릭 / 페이지뷰(pagePath total)
  channels: NamedCount[];
  devices: NamedCount[];
  geo: GeoCountry[]; // 유입 지역 (나라 → 도시, sessions 내림차순)
  daily: DailyPoint[];
}
// 캠페인(utm_campaign) 비교 — 크로스 언어(전 사이트 공통), 광고 성과 비교용.
// GA4 sessionCampaignName 이 태그 안 된 트래픽은 '(not set)'/'(direct)'/'(organic)'/'(referral)' 로
// 나오므로 실제 태그된 캠페인만 남긴다.
const UNTAGGED_CAMPAIGNS = new Set(['(not set)', '(direct)', '(organic)', '(referral)', '']);
export interface CampaignStats {
  name: string;
  sessions: number;
  calcOpen: number;
  heightCalc: number;
  consult: number;
  completionRate: number; // heightCalc / calcOpen (열람→완료 퍼널, div-by-zero 가드)
}
export interface SiteBreakdown {
  byCountry: Record<CountryKey, CountryStats>;
  campaigns: CampaignStats[]; // TOP-LEVEL — 캠페인은 언어를 가로지르는 광고 단위라 국가별이 아님
}

// ── 입력 행 (ga4.ts 가 GA4 응답을 이 형태로 매핑해 넘김) ──
export interface LandingRow {
  landingPage: string; users: number; newUsers: number; sessions: number; pageViews: number; engagementSec: number;
}
export interface PvRow { pagePath: string; views: number }
export interface EventRow { pagePath: string; eventName: string; count: number }
export interface ChannelRow { landingPage: string; channel: string; sessions: number }
export interface DeviceRow { landingPage: string; device: string; sessions: number }
export interface GeoRow { landingPage: string; country: string; city: string; sessions: number; users: number }
export interface DailyRow { date: string; landingPage: string; users: number; sessions: number; views: number }
// 캠페인 세션 행(sessionCampaignName 단독) + 캠페인×이벤트 행(calc_open/height_calc_complete/consult_click) 을
// 하나의 union 배열로 받는다 — sessions 가 있으면 세션행, count+eventName 이 있으면 이벤트행.
export interface CampaignRow {
  campaign: string;
  sessions?: number; // sessionCampaignName 단독 리포트
  eventName?: string; // sessionCampaignName × eventName 리포트
  count?: number;
}
export interface BreakdownInput {
  landing: LandingRow[];
  landingPrev: LandingRow[];
  pv: PvRow[];
  events: EventRow[];
  channels: ChannelRow[];
  devices: DeviceRow[];
  geo: GeoRow[];
  daily: DailyRow[];
  campaigns: CampaignRow[];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function blankSummary(): Summary {
  return { users: 0, newUsers: 0, returningUsers: 0, sessions: 0, pageViews: 0, engagementSec: 0, avgEngagementSec: 0 };
}
function blankStats(channel: 'kakao' | 'line' | 'whatsapp' | 'mixed'): CountryStats {
  return {
    summary: blankSummary(),
    prevSummary: blankSummary(),
    pageViews: { main: 0, clinic: 0, cases: 0, calculator: 0, reservation: 0, other: 0, total: 0 },
    events: { calcOpen: 0, heightCalc: 0, messenger: 0 },
    calcCompletionRate: 0,
    messengerChannel: channel,
    conversionRate: 0,
    channels: [],
    devices: [],
    geo: [],
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

// 캠페인 이름별 세션 + 3개 이벤트 카운트 합산 → completionRate 계산.
// (not set)/(direct)/(organic)/(referral)/빈 문자열(태그 안 된 트래픽) 제외, sessions 내림차순.
function rollupCampaigns(rows: CampaignRow[]): CampaignStats[] {
  interface Acc { sessions: number; calcOpen: number; heightCalc: number; consult: number }
  const map = new Map<string, Acc>();
  const get = (name: string): Acc => {
    const cur = map.get(name) ?? { sessions: 0, calcOpen: 0, heightCalc: 0, consult: 0 };
    map.set(name, cur);
    return cur;
  };
  for (const r of rows) {
    if (UNTAGGED_CAMPAIGNS.has(r.campaign)) continue;
    const acc = get(r.campaign);
    if (typeof r.sessions === 'number') acc.sessions += r.sessions;
    if (typeof r.count === 'number' && r.eventName) {
      if (r.eventName === 'calc_open') acc.calcOpen += r.count;
      else if (r.eventName === 'height_calc_complete') acc.heightCalc += r.count;
      else if (r.eventName === 'consult_click') acc.consult += r.count;
    }
  }
  return [...map.entries()]
    .map(([name, acc]) => ({
      name,
      sessions: acc.sessions,
      calcOpen: acc.calcOpen,
      heightCalc: acc.heightCalc,
      consult: acc.consult,
      completionRate: acc.calcOpen > 0 ? round2((acc.heightCalc / acc.calcOpen) * 100) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function aggregateSiteBreakdown(input: BreakdownInput): SiteBreakdown {
  const stats: Record<CountryKey, CountryStats> = {
    all: blankStats('mixed'),
    ko: blankStats('kakao'),
    th: blankStats('line'),
    vi: blankStats('kakao'),
    en: blankStats('whatsapp'),          // en 은 2026-07-03 WhatsApp 전환(여기 kakao 는 방치된 드리프트)
    'zh-hant': blankStats('whatsapp'),   // 대만·화교 = WhatsApp
    'zh-hans': blankStats('whatsapp'),
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
      if (r.eventName === 'calc_open') stats[k].events.calcOpen += r.count;
      else if (r.eventName === 'height_calc_complete') stats[k].events.heightCalc += r.count;
      else if (r.eventName === 'consult_click') stats[k].events.messenger += r.count;
    }
  }

  // 4) 채널 / 디바이스 (landingPage 기준)
  const blankRows = (): Record<CountryKey, { label: string; sessions: number }[]> => ({ all: [], ko: [], th: [], vi: [], en: [], 'zh-hant': [], 'zh-hans': [] });
  const chanByKey = blankRows();
  for (const r of input.channels) {
    for (const k of countryKeys(classifyCountry(r.landingPage))) chanByKey[k].push({ label: r.channel || '(other)', sessions: r.sessions });
  }
  const devByKey = blankRows();
  for (const r of input.devices) {
    for (const k of countryKeys(classifyCountry(r.landingPage))) devByKey[k].push({ label: r.device || '(other)', sessions: r.sessions });
  }

  // 5) 유입 지역 (landingPage → 언어 귀속, GA4 country + city = 실제 지리적 위치)
  type GeoAcc = { sessions: number; users: number; cities: Map<string, GeoCity> };
  const geoByKey: Record<CountryKey, Map<string, GeoAcc>> = { all: new Map(), ko: new Map(), th: new Map(), vi: new Map(), en: new Map(), 'zh-hant': new Map(), 'zh-hans': new Map() };
  for (const r of input.geo) {
    const country = r.country || '(미상)';
    const city = r.city || '(미상)';
    for (const k of countryKeys(classifyCountry(r.landingPage))) {
      const m = geoByKey[k];
      const c = m.get(country) ?? { sessions: 0, users: 0, cities: new Map() };
      c.sessions += r.sessions;
      c.users += r.users;
      const ci = c.cities.get(city) ?? { label: city, sessions: 0, users: 0 };
      ci.sessions += r.sessions;
      ci.users += r.users;
      c.cities.set(city, ci);
      m.set(country, c);
    }
  }

  // 6) 일자별 (landingPage 기준, date 합산)
  const dailyByKey: Record<CountryKey, Map<string, DailyPoint>> = { all: new Map(), ko: new Map(), th: new Map(), vi: new Map(), en: new Map(), 'zh-hant': new Map(), 'zh-hans': new Map() };
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
  for (const k of LANG_KEYS) {
    const st = stats[k];
    for (const field of ['summary', 'prevSummary'] as const) {
      const s = st[field];
      s.returningUsers = Math.max(0, s.users - s.newUsers);
      s.avgEngagementSec = s.users > 0 ? round2(s.engagementSec / s.users) : 0;
    }
    st.conversionRate = st.pageViews.total > 0 ? round2((st.events.messenger / st.pageViews.total) * 100) : 0;
    st.calcCompletionRate = st.events.calcOpen > 0 ? round2((st.events.heightCalc / st.events.calcOpen) * 100) : 0;
    st.channels = rollup(chanByKey[k]);
    st.devices = rollup(devByKey[k]);
    const geoTotal = [...geoByKey[k].values()].reduce((s, v) => s + v.sessions, 0);
    st.geo = [...geoByKey[k].entries()]
      .map(([label, v]) => ({
        label,
        sessions: v.sessions,
        users: v.users,
        pct: geoTotal > 0 ? round2((v.sessions / geoTotal) * 100) : 0,
        cities: [...v.cities.values()].sort((a, b) => b.sessions - a.sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions);
    st.daily = [...dailyByKey[k].values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // 7) 캠페인(utm_campaign) — 크로스 언어, 국가별 아님(TOP-LEVEL)
  const campaigns = rollupCampaigns(input.campaigns);

  return { byCountry: stats, campaigns };
}
