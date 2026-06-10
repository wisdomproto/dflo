// GA4 site-breakdown 순수 분류·집계 (googleapis 무관 → 단위 테스트 대상).
// 국가/페이지 구분 규칙의 단일 소스. pagePath 는 GA4 의 page path(쿼리 제외).

export type Country = 'ko' | 'th' | 'other';
export type PageBucket = 'main' | 'clinic' | 'cases' | 'calculator' | 'other';

export function classifyCountry(pagePath: string): Country {
  if (pagePath.startsWith('/th/') || pagePath === '/th') return 'th';
  if (pagePath.startsWith('/vi/') || pagePath === '/vi') return 'other';
  if (pagePath.startsWith('/en/') || pagePath === '/en') return 'other';
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

export interface CountryStats {
  pageViews: { main: number; clinic: number; cases: number; calculator: number; other: number; total: number };
  events: { heightCalc: number; messenger: number };
  messengerChannel: 'kakao' | 'line';
  conversionRate: number;
}
export interface SiteBreakdown {
  byCountry: Record<'ko' | 'th', CountryStats>;
}

export interface PvRow { pagePath: string; views: number }
export interface EventRow { pagePath: string; eventName: string; count: number }

function emptyStats(channel: 'kakao' | 'line'): CountryStats {
  return {
    pageViews: { main: 0, clinic: 0, cases: 0, calculator: 0, other: 0, total: 0 },
    events: { heightCalc: 0, messenger: 0 },
    messengerChannel: channel,
    conversionRate: 0,
  };
}

export function aggregateSiteBreakdown(pvRows: PvRow[], eventRows: EventRow[]): SiteBreakdown {
  const ko = emptyStats('kakao');
  const th = emptyStats('line');
  const pick = (c: Country) => (c === 'th' ? th : c === 'ko' ? ko : null);

  for (const r of pvRows) {
    const t = pick(classifyCountry(r.pagePath));
    if (!t) continue;
    const bucket = classifyPage(r.pagePath);
    t.pageViews[bucket] += r.views;
    t.pageViews.total += r.views;
  }
  for (const r of eventRows) {
    const t = pick(classifyCountry(r.pagePath));
    if (!t) continue;
    if (r.eventName === 'height_calc_complete') t.events.heightCalc += r.count;
    else if (r.eventName === 'consult_click') t.events.messenger += r.count;
  }
  for (const t of [ko, th]) {
    t.conversionRate = t.pageViews.total > 0
      ? +((t.events.messenger / t.pageViews.total) * 100).toFixed(2)
      : 0;
  }
  return { byCountry: { ko, th } };
}
