// GA4 Data API 프록시 라우트.
// /api/analytics/overview?days=N → 지난 N일 요약 (page_view, kakao_consult_click 등)

import { Router } from 'express';
import { fetchOverview } from '../services/ga4.js';

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
