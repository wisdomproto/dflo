// GA4 Data API 클라이언트 — OAuth 2.0 refresh token 인증.
// 서비스 계정 키 정책에 막혔을 때 우회로. 한 번 setup-ga4-oauth.mjs 로
// refresh token 발급 후 .env 에 보관, 그 다음부턴 자동 access token 갱신.

import { google, type analyticsdata_v1beta } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { aggregateSiteBreakdown, type SiteBreakdown } from './ga4SiteBreakdown.js';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA4_OAUTH_REFRESH_TOKEN;

let dataClient: analyticsdata_v1beta.Analyticsdata | null = null;
let initError: string | null = null;

function init(): { client: analyticsdata_v1beta.Analyticsdata | null; error: string | null } {
  if (dataClient) return { client: dataClient, error: null };
  if (initError) return { client: null, error: initError };

  if (!PROPERTY_ID) { initError = 'GA4_PROPERTY_ID 미설정'; return { client: null, error: initError }; }
  if (!CLIENT_ID) { initError = 'GA4_OAUTH_CLIENT_ID 미설정'; return { client: null, error: initError }; }
  if (!CLIENT_SECRET) { initError = 'GA4_OAUTH_CLIENT_SECRET 미설정'; return { client: null, error: initError }; }
  if (!REFRESH_TOKEN) {
    initError = 'GA4_OAUTH_REFRESH_TOKEN 미설정 — npm run setup-ga4-oauth 로 발급 필요';
    return { client: null, error: initError };
  }

  const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: REFRESH_TOKEN });

  dataClient = google.analyticsdata({ version: 'v1beta', auth: oauth });
  return { client: dataClient, error: null };
}

export interface OverviewParams {
  startDate: string;
  endDate: string;
}

export interface AnalyticsOverview {
  range: { startDate: string; endDate: string };
  totals: {
    pageViews: number;
    activeUsers: number;
    kakaoConsultClicks: number;
    conversionRate: number;
  };
  daily: Array<{ date: string; pageViews: number; kakaoClicks: number }>;
  topPages: Array<{ path: string; views: number }>;
  kakaoBySource: Array<{ source: string; clicks: number }>;
  byLocale: Array<{ locale: string; pageViews: number; kakaoClicks: number }>;
}

async function runReport(
  body: analyticsdata_v1beta.Schema$RunReportRequest,
): Promise<analyticsdata_v1beta.Schema$RunReportResponse> {
  const { client, error } = init();
  if (!client) throw new Error(error ?? 'GA4 init 실패');
  const property = `properties/${PROPERTY_ID}`;
  const res = await client.properties.runReport({
    property,
    requestBody: body,
  });
  return res.data;
}

/**
 * 커스텀 디멘션(source, locale) 은 GA4 어드민에 사용자 정의 측정기준으로 등록되기
 * 전까지는 쿼리 시 400 에러를 반환한다. 등록되지 않은 경우 빈 응답으로 폴백.
 */
async function tryRunReport(
  body: analyticsdata_v1beta.Schema$RunReportRequest,
): Promise<analyticsdata_v1beta.Schema$RunReportResponse | null> {
  try {
    return await runReport(body);
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/not a valid dimension|not a valid metric/i.test(msg)) {
      return null;
    }
    throw e;
  }
}

export async function fetchOverview(p: OverviewParams): Promise<AnalyticsOverview> {
  const dateRanges = [{ startDate: p.startDate, endDate: p.endDate }];

  // 1) 일자별 PV + 활성 사용자
  const dailyResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  // 2) 일자별 카톡 클릭
  const kakaoDailyResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'kakao_consult_click', matchType: 'EXACT' },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  const kakaoByDate = new Map<string, number>();
  for (const row of kakaoDailyResp.rows ?? []) {
    const d = row.dimensionValues?.[0]?.value ?? '';
    kakaoByDate.set(d, Number(row.metricValues?.[0]?.value ?? 0));
  }

  const daily = (dailyResp.rows ?? []).map((row) => {
    const d = row.dimensionValues?.[0]?.value ?? '';
    return {
      date: d,
      pageViews: Number(row.metricValues?.[0]?.value ?? 0),
      kakaoClicks: kakaoByDate.get(d) ?? 0,
    };
  });

  const totalPageViews = daily.reduce((s, x) => s + x.pageViews, 0);
  const totalKakao = daily.reduce((s, x) => s + x.kakaoClicks, 0);
  const totalUsers = (dailyResp.rows ?? []).reduce(
    (s, row) => s + Number(row.metricValues?.[1]?.value ?? 0),
    0,
  );

  // 3) 인기 페이지 (top 10)
  const topPagesResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '10',
  });
  const topPages = (topPagesResp.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? '',
    views: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  // 4) 카톡 클릭 source 별 — 커스텀 디멘션 등록 전이면 빈 배열로 폴백
  const kakaoBySourceResp = await tryRunReport({
    dateRanges,
    dimensions: [{ name: 'customEvent:source' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'kakao_consult_click', matchType: 'EXACT' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: '20',
  });
  const kakaoBySource = (kakaoBySourceResp?.rows ?? [])
    .map((row) => ({
      source: row.dimensionValues?.[0]?.value || '(unknown)',
      clicks: Number(row.metricValues?.[0]?.value ?? 0),
    }))
    .filter((r) => r.source && r.source !== '(not set)');

  // 5) locale 별 — 커스텀 디멘션 등록 전이면 빈 배열로 폴백
  const localePvResp = await tryRunReport({
    dateRanges,
    dimensions: [{ name: 'customEvent:locale' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  });
  const localePvMap = new Map<string, number>();
  for (const row of localePvResp?.rows ?? []) {
    const l = row.dimensionValues?.[0]?.value || 'ko';
    if (l === '(not set)') continue;
    localePvMap.set(l, Number(row.metricValues?.[0]?.value ?? 0));
  }

  const localeKakaoResp = await tryRunReport({
    dateRanges,
    dimensions: [{ name: 'customEvent:locale' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'kakao_consult_click', matchType: 'EXACT' },
      },
    },
  });
  const localeKakaoMap = new Map<string, number>();
  for (const row of localeKakaoResp?.rows ?? []) {
    const l = row.dimensionValues?.[0]?.value || 'ko';
    if (l === '(not set)') continue;
    localeKakaoMap.set(l, Number(row.metricValues?.[0]?.value ?? 0));
  }

  const localeKeys = new Set([...localePvMap.keys(), ...localeKakaoMap.keys()]);
  const byLocale = [...localeKeys]
    .map((locale) => ({
      locale,
      pageViews: localePvMap.get(locale) ?? 0,
      kakaoClicks: localeKakaoMap.get(locale) ?? 0,
    }))
    .sort((a, b) => b.pageViews - a.pageViews);

  return {
    range: { startDate: p.startDate, endDate: p.endDate },
    totals: {
      pageViews: totalPageViews,
      activeUsers: totalUsers,
      kakaoConsultClicks: totalKakao,
      conversionRate: totalPageViews > 0 ? +(totalKakao / totalPageViews * 100).toFixed(2) : 0,
    },
    daily,
    topPages,
    kakaoBySource,
    byLocale,
  };
}

// ── 채널 분석 (유입 분해) ─────────────────────────────────────────────
// sessionDefaultChannelGroup / sessionSource+sessionMedium / country 는 모두
// GA4 표준 측정기준이므로 tryRunReport 폴백 불필요 — runReport 직접 사용.

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

// 표준 RunReport 응답을 {label,sessions,users,percentage} 행으로 매핑.
// labelFn 으로 1개 이상의 차원 값을 라벨로 조합(소스/매체는 "source / medium").
function mapChannelRows(
  resp: analyticsdata_v1beta.Schema$RunReportResponse,
  labelFn: (dims: string[]) => string,
): ChannelRow[] {
  const rows = (resp.rows ?? []).map((row) => {
    const dims = (row.dimensionValues ?? []).map((d) => d.value ?? '');
    return {
      label: labelFn(dims) || '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    };
  });
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  return rows.map((r) => ({
    ...r,
    percentage: totalSessions > 0 ? +((r.sessions / totalSessions) * 100).toFixed(1) : 0,
  }));
}

export async function fetchChannels(days: number): Promise<ChannelBreakdown> {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
  const metrics = [{ name: 'sessions' }, { name: 'totalUsers' }];
  const orderBys = [{ metric: { metricName: 'sessions' }, desc: true }];

  // 1) 채널 그룹 (Organic Search / Direct / Referral …)
  const channelResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics,
    orderBys,
    limit: '20',
  });

  // 2) 소스 / 매체 (google / organic …)
  const sourceMediumResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics,
    orderBys,
    limit: '20',
  });

  // 3) 국가
  const countryResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'country' }],
    metrics,
    orderBys,
    limit: '20',
  });

  return {
    channelGroups: mapChannelRows(channelResp, (d) => d[0] ?? ''),
    sourceMedium: mapChannelRows(sourceMediumResp, (d) =>
      [d[0], d[1]].filter(Boolean).join(' / '),
    ),
    countries: mapChannelRows(countryResp, (d) => d[0] ?? ''),
  };
}

// ── 사이트 분석 (국가×페이지×이벤트) ─────────────────────────────────
// pagePath / eventName 표준 측정기준 → 커스텀 디멘션 등록 불필요.
export async function fetchSiteBreakdown(days: number): Promise<SiteBreakdown> {
  const cur = { startDate: `${days}daysAgo`, endDate: 'today' };
  // 직전 동일 기간 (예: 30일이면 그 앞 30일) — 요약 증감 비교용.
  const prev = { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` };

  // 요약은 landingPage(세션 진입) 기준 — 한 세션 1랜딩이라 국가 귀속에 중복 없음.
  const landingDims = [{ name: 'landingPage' }];
  const landingMetrics = [
    { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'sessions' },
    { name: 'screenPageViews' }, { name: 'userEngagementDuration' },
  ];
  const mapLanding = (resp: analyticsdata_v1beta.Schema$RunReportResponse) =>
    (resp.rows ?? []).map((r) => ({
      landingPage: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
      newUsers: Number(r.metricValues?.[1]?.value ?? 0),
      sessions: Number(r.metricValues?.[2]?.value ?? 0),
      pageViews: Number(r.metricValues?.[3]?.value ?? 0),
      engagementSec: Number(r.metricValues?.[4]?.value ?? 0),
    }));

  const [landResp, landPrevResp, pvResp, evResp, chResp, dvResp, dailyResp] = await Promise.all([
    runReport({ dateRanges: [cur], dimensions: landingDims, metrics: landingMetrics, limit: '1000' }),
    runReport({ dateRanges: [prev], dimensions: landingDims, metrics: landingMetrics, limit: '1000' }),
    runReport({ dateRanges: [cur], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], limit: '1000' }),
    runReport({
      dateRanges: [cur],
      dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['height_calc_complete', 'consult_click'] } } },
      limit: '1000',
    }),
    runReport({ dateRanges: [cur], dimensions: [{ name: 'landingPage' }, { name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: '1000' }),
    runReport({ dateRanges: [cur], dimensions: [{ name: 'landingPage' }, { name: 'deviceCategory' }], metrics: [{ name: 'sessions' }], limit: '1000' }),
    runReport({
      dateRanges: [cur],
      dimensions: [{ name: 'date' }, { name: 'landingPage' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: '10000',
    }),
  ]);

  return aggregateSiteBreakdown({
    landing: mapLanding(landResp),
    landingPrev: mapLanding(landPrevResp),
    pv: (pvResp.rows ?? []).map((r) => ({ pagePath: r.dimensionValues?.[0]?.value ?? '', views: Number(r.metricValues?.[0]?.value ?? 0) })),
    events: (evResp.rows ?? []).map((r) => ({ pagePath: r.dimensionValues?.[0]?.value ?? '', eventName: r.dimensionValues?.[1]?.value ?? '', count: Number(r.metricValues?.[0]?.value ?? 0) })),
    channels: (chResp.rows ?? []).map((r) => ({ landingPage: r.dimensionValues?.[0]?.value ?? '', channel: r.dimensionValues?.[1]?.value ?? '', sessions: Number(r.metricValues?.[0]?.value ?? 0) })),
    devices: (dvResp.rows ?? []).map((r) => ({ landingPage: r.dimensionValues?.[0]?.value ?? '', device: r.dimensionValues?.[1]?.value ?? '', sessions: Number(r.metricValues?.[0]?.value ?? 0) })),
    daily: (dailyResp.rows ?? []).map((r) => ({ date: r.dimensionValues?.[0]?.value ?? '', landingPage: r.dimensionValues?.[1]?.value ?? '', users: Number(r.metricValues?.[0]?.value ?? 0), sessions: Number(r.metricValues?.[1]?.value ?? 0), views: Number(r.metricValues?.[2]?.value ?? 0) })),
  });
}
