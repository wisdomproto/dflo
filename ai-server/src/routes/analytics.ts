// GA4 Data API 프록시 라우트.
// /api/analytics/overview?days=N → 지난 N일 요약 (page_view, kakao_consult_click 등)

import { Router } from 'express';
import { fetchOverview, fetchChannels, fetchSiteBreakdown, fetchSiteBreakdownRanges } from '../services/ga4.js';
import { fetchSearchConsole, type SearchLang } from '../services/searchConsole.js';

export const analyticsRouter = Router();

const LANGS: SearchLang[] = ['all', 'ko', 'th', 'vi', 'en', 'zh-hant', 'zh-hans', 'ar'];

/** days 전 ~ 오늘의 절대 날짜. GSC 는 GA4 와 달리 'NdaysAgo' 상대표기를 안 받는다. */
function daysAgoRange(days: number): { startDate: string; endDate: string } {
  const DAY = 86_400_000;
  const now = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { startDate: fmt(now - days * DAY), endDate: fmt(now) };
}

// 직전 동일 길이 창(절대 날짜). 단일일(start=end)이면 그 전날. 요약 증감 비교용.
function prevWindow(start: string, end: string): { startDate: string; endDate: string } {
  const DAY = 86_400_000;
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  const len = e - s; // 단일일이면 0
  const prevEnd = s - DAY;
  const prevStart = prevEnd - len;
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
}

analyticsRouter.get('/overview', async (req, res) => {
  const daysRaw = Number(req.query.days ?? 7);
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 7;

  try {
    const data = await fetchOverview({
      startDate: `${days}daysAgo`,
      endDate: 'today',
    });
    res.json({ success: true, days, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /overview failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// /api/analytics/channels?days=N → GA4 유입 분해 (채널 그룹 / 소스·매체 / 국가)
analyticsRouter.get('/channels', async (req, res) => {
  const daysRaw = Number(req.query.days ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 30;

  try {
    const data = await fetchChannels(days);
    res.json({ success: true, days, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /channels failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// /api/analytics/site-breakdown?days=N → 지난 N일 (국가×페이지×이벤트)
// /api/analytics/site-breakdown?start=YYYY-MM-DD&end=YYYY-MM-DD → 명시 범위(start=end 면 하루=일별 보기)
analyticsRouter.get('/site-breakdown', async (req, res) => {
  const start = typeof req.query.start === 'string' ? req.query.start : '';
  const end = typeof req.query.end === 'string' ? req.query.end : '';
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  try {
    if (dateRe.test(start) && dateRe.test(end)) {
      const cur = { startDate: start, endDate: end };
      const data = await fetchSiteBreakdownRanges(cur, prevWindow(start, end));
      res.json({ success: true, start, end, data });
      return;
    }
    const daysRaw = Number(req.query.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 30;
    const data = await fetchSiteBreakdown(days);
    res.json({ success: true, days, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /site-breakdown failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// /api/analytics/search-console?days=N&lang=en → 구글 검색어·국가·페이지 (GA4 엔 없는 데이터)
// /api/analytics/search-console?start=YYYY-MM-DD&end=YYYY-MM-DD&lang=all
analyticsRouter.get('/search-console', async (req, res) => {
  const start = typeof req.query.start === 'string' ? req.query.start : '';
  const end = typeof req.query.end === 'string' ? req.query.end : '';
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const langRaw = typeof req.query.lang === 'string' ? req.query.lang : 'all';
  const lang: SearchLang = (LANGS as string[]).includes(langRaw) ? (langRaw as SearchLang) : 'all';

  try {
    let range: { startDate: string; endDate: string };
    if (dateRe.test(start) && dateRe.test(end)) {
      range = { startDate: start, endDate: end };
    } else {
      const daysRaw = Number(req.query.days ?? 30);
      const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 30;
      range = daysAgoRange(days);
    }
    const data = await fetchSearchConsole(range.startDate, range.endDate, lang);
    res.json({ success: true, lang, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /search-console failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
