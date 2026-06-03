// ai-server/src/routes/marketing.ts
// POST /api/marketing/generate-article → read marketing_config (service-role),
// build the 187 editor prompt, call Gemini, return article text.
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generateText } from '../services/gemini.js';
import { buildArticlePrompt, type ArticleConfig, type ArticleRequest } from '../services/articleGenerator.js';
import { searchNaverKeywords, searchGoogleKeywords } from '../services/keywordSearch.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[marketing] Missing Supabase URL/KEY — generate-article will use empty config.');
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const marketingRouter = Router();

marketingRouter.post('/generate-article', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as ArticleRequest;
  if (!body.title || !String(body.title).trim()) {
    return res.status(400).json({ success: false, error: 'title required' });
  }
  try {
    const { data: config, error: cfgErr } = await sb
      .from('marketing_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (cfgErr) console.warn('[marketing] config read failed — using empty config:', cfgErr.message);
    const prompt = buildArticlePrompt((config ?? {}) as ArticleConfig, body);
    // ai_model intentionally ignored: generateText is fixed-model (gemini-2.5-flash).
    const content = await generateText(prompt);
    const clean = (content ?? '').trim();
    if (clean.length < 100) {
      return res.status(502).json({ success: false, error: '생성 결과가 너무 짧습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, content: clean });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] generate-article failed', e);
    res.status(500).json({ success: false, error: msg });
  }
});

marketingRouter.post('/naver-keywords', async (req: Request, res: Response) => {
  const keywords = (req.body?.keywords ?? []) as string[];
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: 'keywords required' });
  }
  try {
    const results = await searchNaverKeywords(keywords);
    res.json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] naver-keywords failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

marketingRouter.post('/google-keywords', async (req: Request, res: Response) => {
  const keywords = (req.body?.keywords ?? []) as string[];
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: 'keywords required' });
  }
  try {
    const results = await searchGoogleKeywords(keywords);
    res.json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] google-keywords failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
