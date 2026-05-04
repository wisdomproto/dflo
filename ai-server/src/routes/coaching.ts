// ================================================
// /api/coaching/:childId  — 환자 오늘의 생활 코칭
// GET  : 오늘 캐시 있으면 반환 (없으면 자동 생성)
// POST : 강제 재생성
// ================================================

import { Router, type Request, type Response } from 'express';
import { getOrGenerateCoaching } from '../services/coachingGenerator.js';

export const coachingRouter = Router();

coachingRouter.get('/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId);
  try {
    const result = await getOrGenerateCoaching(childId);
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[coaching/get]', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

coachingRouter.post('/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId);
  try {
    const result = await getOrGenerateCoaching(childId, { force: true });
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[coaching/post]', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
