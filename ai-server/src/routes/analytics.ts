// GA4 Data API 프록시 라우트.
// /api/analytics/overview?days=N → 지난 N일 요약 (page_view, kakao_consult_click 등)

import { Router } from 'express';
import { fetchOverview, fetchChannels, fetchSiteBreakdown } from '../services/ga4.js';

export const analyticsRouter = Router();

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

// /api/analytics/site-breakdown?days=N → 국가(ko/th)×페이지(메인/병원/사례/예상키)×이벤트
analyticsRouter.get('/site-breakdown', async (req, res) => {
  const daysRaw = Number(req.query.days ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 30;
  try {
    const data = await fetchSiteBreakdown(days);
    res.json({ success: true, days, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /site-breakdown failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
