// ai-server/src/services/keywordSearch.ts
// Ported from ContentFlow api/naver/keywords + api/google/keywords.
import { createHmac } from 'node:crypto';

const NAVER_BASE = 'https://api.searchad.naver.com';
const DATAFORSEO_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

export interface NaverKw {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
}
export interface GoogleKw {
  keyword: string;
  searchVolume: number;
  competition: string | null;
  cpc: number;
}

export async function searchNaverKeywords(keywords: string[]): Promise<NaverKw[]> {
  const license = process.env.NAVER_API_LICENSE_KEY || '';
  const secret = process.env.NAVER_API_SECRET_KEY || '';
  const customer = process.env.NAVER_API_CUSTOMER_ID || '';
  if (!license || !secret || !customer) throw new Error('네이버 API 키가 설정되지 않았습니다.');

  const timestamp = String(Date.now());
  const uri = '/keywordstool';
  const signature = createHmac('sha256', secret).update(`${timestamp}.GET.${uri}`).digest('base64');
  const clean = keywords.map((k) => k.replace(/\s+/g, '')).filter(Boolean);
  const params = new URLSearchParams({ hintKeywords: clean.join(','), showDetail: '1' });

  const res = await fetch(`${NAVER_BASE}${uri}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': license,
      'X-Customer': customer,
      'X-Signature': signature,
    },
  });
  if (!res.ok) throw new Error(`네이버 API 오류 (${res.status}): ${await res.text().catch(() => '')}`);
  const data = (await res.json()) as { keywordList?: Array<Record<string, unknown>> };
  return (data.keywordList ?? []).map((item) => {
    const pc = typeof item.monthlyPcQcCnt === 'number' ? item.monthlyPcQcCnt : 0;
    const mobile = typeof item.monthlyMobileQcCnt === 'number' ? item.monthlyMobileQcCnt : 0;
    return {
      keyword: String(item.relKeyword ?? ''),
      pcSearch: pc,
      mobileSearch: mobile,
      totalSearch: pc + mobile,
      competition: (item.compIdx as string) ?? 'LOW',
    };
  });
}

export async function searchGoogleKeywords(keywords: string[]): Promise<GoogleKw[]> {
  const login = process.env.DATAFORSEO_LOGIN || '';
  const password = process.env.DATAFORSEO_PASSWORD || '';
  if (!login || !password) throw new Error('DataForSEO API 키가 설정되지 않았습니다.');

  const creds = Buffer.from(`${login}:${password}`).toString('base64');
  const res = await fetch(DATAFORSEO_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ keywords: keywords.slice(0, 700), language_code: 'ko', location_code: 2410 }]),
  });
  if (!res.ok) throw new Error(`DataForSEO API 오류 (${res.status}): ${await res.text().catch(() => '')}`);
  const data = (await res.json()) as { tasks?: Array<{ result?: Array<Record<string, unknown>> }> };
  const results = data.tasks?.[0]?.result ?? [];
  return results.map((item) => ({
    keyword: String(item.keyword ?? ''),
    searchVolume: (item.search_volume as number) || 0,
    competition: (item.competition as string | null) ?? null,
    cpc: (item.cpc as number) || 0,
  }));
}
