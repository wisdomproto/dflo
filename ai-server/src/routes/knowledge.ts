import { Router, type Request, type Response } from 'express';
import { searchKnowledge } from '../services/knowledgeRetrieval.js';

export const knowledgeRouter = Router();

// POST /api/knowledge/search { query, kPapers?, kInsights? } → { papers, insights }
knowledgeRouter.post('/search', async (req: Request, res: Response) => {
  const query = String(req.body?.query ?? '').trim();
  if (!query) return res.status(400).json({ success: false, error: 'query required' });
  try {
    const result = await searchKnowledge(query, { kPapers: req.body?.kPapers, kInsights: req.body?.kInsights });
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] search failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
