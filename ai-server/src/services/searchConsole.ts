// Google Search Console (Search Analytics API) 클라이언트.
//
// ★왜 GA4 가 아니라 GSC 인가: 구글은 2011년부터 **오가닉 검색어를 애널리틱스에 넘기지 않는다**
//   ("not provided"). GA4 는 sessionSource=google / sessionMedium=organic 까지만 주고
//   검색어는 아예 없다(`sessionGoogleAdsKeyword` 는 유료 광고 전용). 검색어가 있는 곳은 GSC 뿐.
//
// 인증은 GA4 와 **같은 OAuth refresh token 을 재사용**한다 — setup-ga4-oauth.mjs 의 SCOPE 에
// webmasters.readonly 가 포함돼 있어야 한다(스코프 추가 후엔 토큰 재발급 필요).
//
// ⚠️ GSC 특성: ① 속성 등록 **이전 데이터는 소급 제공 안 함** ② 데이터 반영 **1~3일 지연**
//    → 최근 며칠은 비어 보이는 게 정상.

import { google, type searchconsole_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SITE_URL = process.env.GSC_SITE_URL || 'https://www.dr187growup.com/';
const CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA4_OAUTH_REFRESH_TOKEN;

let client: searchconsole_v1.Searchconsole | null = null;
let initError: string | null = null;

function init(): { client: searchconsole_v1.Searchconsole | null; error: string | null } {
  if (client) return { client, error: null };
  if (initError) return { client: null, error: initError };

  if (!CLIENT_ID) { initError = 'GA4_OAUTH_CLIENT_ID 미설정'; return { client: null, error: initError }; }
  if (!CLIENT_SECRET) { initError = 'GA4_OAUTH_CLIENT_SECRET 미설정'; return { client: null, error: initError }; }
  if (!REFRESH_TOKEN) {
    initError = 'GA4_OAUTH_REFRESH_TOKEN 미설정 — npm run setup-ga4-oauth 로 발급 필요';
    return { client: null, error: initError };
  }

  const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: REFRESH_TOKEN });
  client = google.searchconsole({ version: 'v1', auth: oauth });
  return { client, error: null };
}

export type SearchLang = 'all' | 'ko' | 'th' | 'vi' | 'en' | 'zh-hant' | 'zh-hans' | 'ar';

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

/** GSC 응답 행 → 우리 표 행. 순수 함수(테스트 대상).
 *  GSC 는 ctr 을 0~1 비율로, position 을 소수로 준다. keyFn 으로 라벨을 뽑는다. */
export function mapRows(
  rows: searchconsole_v1.Schema$ApiDataRow[] | undefined,
  keyFn: (keys: string[]) => string = (k) => k[0] ?? '(unknown)',
): SearchRow[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({
    label: keyFn(r.keys ?? []),
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
  }));
}

/** 행들을 합산해 총계. position 은 **노출수 가중 평균**(단순 평균은 노출 1회짜리 꼬리가 왜곡). */
export function sumTotals(rows: SearchRow[]): SearchConsoleData['totals'] {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    position: impressions > 0 ? weighted / impressions : 0,
  };
}

/** 언어 탭 → GSC page 필터. 우리 사이트는 전 페이지가 `/{lang}/` 프리픽스라 필터가 자명하다. */
export function langFilter(lang: SearchLang): searchconsole_v1.Schema$ApiDimensionFilterGroup[] | undefined {
  if (lang === 'all') return undefined;
  return [{ filters: [{ dimension: 'page', operator: 'contains', expression: `/${lang}/` }] }];
}

/** ISO 국가코드(GSC 는 3자리 소문자, 예 'kor') → 한국어 국가명. 미등록은 코드 그대로. */
const COUNTRY_KO: Record<string, string> = {
  kor: '🇰🇷 한국', usa: '🇺🇸 미국', tha: '🇹🇭 태국', vnm: '🇻🇳 베트남',
  idn: '🇮🇩 인도네시아', mys: '🇲🇾 말레이시아', aus: '🇦🇺 호주', gbr: '🇬🇧 영국',
  sgp: '🇸🇬 싱가포르', chn: '🇨🇳 중국', twn: '🇹🇼 대만', hkg: '🇭🇰 홍콩',
  jpn: '🇯🇵 일본', phl: '🇵🇭 필리핀', ind: '🇮🇳 인도', can: '🇨🇦 캐나다',
  nzl: '🇳🇿 뉴질랜드', are: '🇦🇪 UAE', deu: '🇩🇪 독일', fra: '🇫🇷 프랑스',
};
export function countryLabel(code: string): string {
  return COUNTRY_KO[code.toLowerCase()] ?? code.toUpperCase();
}

async function query(
  body: searchconsole_v1.Schema$SearchAnalyticsQueryRequest,
): Promise<searchconsole_v1.Schema$ApiDataRow[]> {
  const { client: c, error } = init();
  if (!c) throw new Error(error ?? 'Search Console init 실패');
  const res = await c.searchanalytics.query({ siteUrl: SITE_URL, requestBody: body });
  return res.data.rows ?? [];
}

/** 검색어·국가·페이지를 한 번에. 세 리포트 병렬. */
export async function fetchSearchConsole(
  startDate: string,
  endDate: string,
  lang: SearchLang = 'all',
  limit = 50,
): Promise<SearchConsoleData> {
  const base = { startDate, endDate, dimensionFilterGroups: langFilter(lang), rowLimit: limit };

  const [qRows, cRows, pRows] = await Promise.all([
    query({ ...base, dimensions: ['query'] }),
    query({ ...base, dimensions: ['country'] }),
    query({ ...base, dimensions: ['page'] }),
  ]);

  const queries = mapRows(qRows);
  return {
    range: { startDate, endDate },
    siteUrl: SITE_URL,
    // 총계는 country 행 합(국가 분해는 전 트래픽을 빠짐없이 덮는다).
    // query 행 합은 **총계가 아니다** — GSC 가 익명성 보호로 희소 검색어를 누락하기 때문.
    totals: sumTotals(mapRows(cRows)),
    queries,
    countries: mapRows(cRows, (k) => countryLabel(k[0] ?? '')),
    pages: mapRows(pRows),
  };
}
