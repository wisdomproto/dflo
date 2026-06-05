// ai-server/src/routes/marketing.ts
// POST /api/marketing/generate-article → read marketing_config (service-role),
// build the 187 editor prompt, call Gemini, return article text.
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generateText } from '../services/gemini.js';
import { buildArticlePrompt, type ArticleConfig, type ArticleRequest } from '../services/articleGenerator.js';
import { searchNaverKeywords, searchGoogleKeywords } from '../services/keywordSearch.js';
import { fetchAndAudit, buildSuggestPrompt } from '../services/seoAudit.js';
import { fetchYoutubeChannelStats } from '../services/youtubeChannel.js';
import { buildCompetitorPrompt, type CompetitorConfig } from '../services/competitorAnalyzer.js';
import { pushToChannel } from '../services/publishPush.js';
import { buildCommentPrompt, type CommentConfig, type CommentDraftRequest } from '../services/commentDraft.js';
import { buildAdsInsightPrompt, type AdsInsightRequest } from '../services/adsInsights.js';
import { buildKeywordIdeasPrompt, parseIdeas, type IdeasConfig, type IdeasRequest } from '../services/keywordIdeas.js';
import { buildBasePrompt, buildTopicPrompt, buildRewritePrompt, buildBlogPrompt } from '../services/contentPrompts.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[marketing] Missing Supabase URL/KEY — generate-article will use empty config.');
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function readMarketingConfig(): Promise<ArticleConfig> {
  const { data, error } = await sb.from('marketing_config').select('*').eq('id', 1).maybeSingle();
  if (error) console.warn('[marketing] config read failed — using empty config:', error.message);
  return (data ?? {}) as ArticleConfig;
}

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

// ── site-analysis (사이트 분석) ────────────────────────────────────────────
// POST /seo-audit : 규칙 기반 온페이지 SEO 감사 (외부 키 불필요). cheerio 파싱 + 4엔진 점수.
marketingRouter.post('/seo-audit', async (req: Request, res: Response) => {
  const url = (req.body?.url ?? '') as string;
  if (!url || !String(url).trim()) {
    return res.status(400).json({ success: false, error: 'url required' });
  }
  try {
    const result = await fetchAndAudit(String(url));
    res.json({ success: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] seo-audit failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// POST /seo-suggest : Gemini 게이트 — 감사 결과 기반 우선순위 개선 제안. 키 만료 시 502.
marketingRouter.post('/seo-suggest', async (req: Request, res: Response) => {
  const url = (req.body?.url ?? '') as string;
  if (!url || !String(url).trim()) {
    return res.status(400).json({ success: false, error: 'url required' });
  }
  try {
    const audit = await fetchAndAudit(String(url));
    const prompt = buildSuggestPrompt(audit);
    const text = await generateText(prompt);
    const suggestions = String(text ?? '')
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    if (suggestions.length === 0) {
      return res.status(502).json({ success: false, error: '제안 생성 결과가 비어 있습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] seo-suggest failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── channel-analytics (채널 분석) ──────────────────────────────────────────
// POST /youtube-channel → YouTube 채널 통계 동기화 (GATED on YOUTUBE_API_KEY).
marketingRouter.post('/youtube-channel', async (req: Request, res: Response) => {
  const handle = String(req.body?.handle ?? '').trim();
  const channelId = String(req.body?.channelId ?? '').trim();
  if (!handle && !channelId) {
    return res.status(400).json({ success: false, error: 'handle 또는 channelId 가 필요합니다' });
  }
  if (!process.env.YOUTUBE_API_KEY) {
    return res.json({ success: false, error: 'YOUTUBE_API_KEY 미설정' });
  }
  try {
    const stats = await fetchYoutubeChannelStats({ handle: handle || undefined, channelId: channelId || undefined });
    res.json({ success: true, stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] youtube-channel failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── competitors (경쟁사) ───────────────────────────────────────────────────
// POST /competitor-analysis : 경쟁사 콘텐츠 갭/강점 분석 (Gemini 게이트).
marketingRouter.post('/competitor-analysis', async (req: Request, res: Response) => {
  const competitors = (req.body?.competitors ?? []) as Array<{ name?: string; url?: string; kind?: string }>;
  const cleaned = (Array.isArray(competitors) ? competitors : [])
    .filter((c) => c && String(c.name ?? '').trim())
    .map((c) => ({ name: String(c.name).trim(), url: c.url ? String(c.url).trim() : undefined, kind: c.kind === 'indirect' ? 'indirect' : 'direct' }));
  if (cleaned.length === 0) {
    return res.status(400).json({ success: false, error: 'competitors required' });
  }
  try {
    const { data: config, error: cfgErr } = await sb
      .from('marketing_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (cfgErr) console.warn('[marketing] config read failed — using empty config:', cfgErr.message);
    const prompt = buildCompetitorPrompt((config ?? {}) as CompetitorConfig, cleaned);
    const raw = await generateText(prompt);
    let text = (raw ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return res.status(502).json({ success: false, error: '분석 결과를 해석하지 못했습니다. 다시 시도해주세요.' });
    }
    let parsed: { gaps?: unknown; strengths?: unknown };
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      return res.status(502).json({ success: false, error: '분석 결과 JSON 파싱 실패. 다시 시도해주세요.' });
    }
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    res.json({ success: true, gaps, strengths });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] competitor-analysis failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── publish (발행) ─────────────────────────────────────────────────────────
// POST /publish-push — 실제 채널 자동 발행 (GATED). 키 부재 시 수동 표시 유도.
marketingRouter.post('/publish-push', async (req: Request, res: Response) => {
  const queueItemId = req.body?.queueItemId as string | undefined;
  const channel = req.body?.channel as string | undefined;
  if (!queueItemId || !channel) {
    return res.status(400).json({ success: false, error: 'queueItemId, channel required' });
  }
  try {
    const result = await pushToChannel({ queueItemId, channel });
    res.json({ success: true, publishedUrl: result.publishedUrl });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error('[marketing] publish-push gated/failed', reason);
    res.json({
      success: false,
      error: '채널 자동 발행은 준비 중입니다 (Meta/YouTube 연동 키 대기). 발행 후 published_url을 수동으로 표시해주세요.',
    });
  }
});

// ── monitoring (모니터링 / 댓글) ───────────────────────────────────────────
// POST /comment-draft : 멘션 기반 브랜드 보이스 답글 초안 (Gemini 게이트).
marketingRouter.post('/comment-draft', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CommentDraftRequest;
  if (!body.body || !String(body.body).trim()) {
    return res.status(400).json({ success: false, error: 'body required' });
  }
  try {
    const { data: config, error: cfgErr } = await sb
      .from('marketing_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (cfgErr) console.warn('[marketing] config read failed — using empty config:', cfgErr.message);
    const prompt = buildCommentPrompt((config ?? {}) as CommentConfig, body);
    const draft = await generateText(prompt);
    const clean = (draft ?? '').trim();
    if (!clean) {
      return res.status(502).json({ success: false, error: '초안 생성 결과가 비어 있습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, draft: clean });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] comment-draft failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── ads (광고 관리) ────────────────────────────────────────────────────────
// POST /ads-insights : 캠페인 실적 + GA4 전환 기반 한국어 진단 (Gemini 게이트).
marketingRouter.post('/ads-insights', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as AdsInsightRequest;
  if (!Array.isArray(body.campaigns)) {
    return res.status(400).json({ success: false, error: 'campaigns array required' });
  }
  try {
    const prompt = buildAdsInsightPrompt({
      campaigns: body.campaigns ?? [],
      kakaoClicks: Number(body.kakaoClicks) || 0,
    });
    const insight = await generateText(prompt);
    const clean = (insight ?? '').trim();
    if (!clean) {
      return res.status(502).json({ success: false, error: '진단 결과가 비어 있습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, insight: clean });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] ads-insights failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── keywords-slice2 (AI 아이디어) ──────────────────────────────────────────
// POST /keyword-ideas : 시드 키워드 → 채널별 콘텐츠 아이디어 (Gemini 게이트).
marketingRouter.post('/keyword-ideas', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as IdeasRequest;
  if (!body.seed || !String(body.seed).trim()) {
    return res.status(400).json({ success: false, error: 'seed required' });
  }
  try {
    const { data: config, error: cfgErr } = await sb
      .from('marketing_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (cfgErr) console.warn('[marketing] config read failed — using empty config:', cfgErr.message);
    const prompt = buildKeywordIdeasPrompt((config ?? {}) as IdeasConfig, {
      seed: String(body.seed),
      channels: Array.isArray(body.channels) ? body.channels : undefined,
    });
    const text = await generateText(prompt);
    const ideas = parseIdeas(text ?? '');
    if (ideas.length === 0) {
      return res.status(502).json({ success: false, error: '아이디어 생성에 실패했습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, ideas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] keyword-ideas failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// ── content-studio (콘텐츠 스튜디오) ───────────────────────────────────────
// POST /base-article : 제목 → TipTap 에디터용 HTML 본문 (Gemini 게이트).
marketingRouter.post('/base-article', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.title || !String(body.title).trim()) {
    return res.status(400).json({ success: false, error: 'title required' });
  }
  try {
    const html = (await generateText(buildBasePrompt(await readMarketingConfig(), body))).trim();
    if (html.length < 50) return res.status(502).json({ success: false, error: '생성 결과가 너무 짧습니다. 다시 시도해주세요.' });
    res.json({ success: true, html });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] base-article failed', e);
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /topics : 브랜드/카테고리 → 주제 제안 JSON 배열 (Gemini 게이트).
marketingRouter.post('/topics', async (req: Request, res: Response) => {
  try {
    const raw = await generateText(buildTopicPrompt(await readMarketingConfig(), req.body ?? {}));
    const s = raw.indexOf('['), e = raw.lastIndexOf(']');
    const topics = s >= 0 && e > s ? JSON.parse(raw.slice(s, e + 1)) : [];
    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(502).json({ success: false, error: '주제 추천 결과를 해석하지 못했습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, topics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] topics failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// POST /blog-generate : 기본 글/제목 → 채널 SEO 섹션 카드 JSON 배열 (Gemini 게이트).
marketingRouter.post('/blog-generate', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.title || !String(body.title).trim()) return res.status(400).json({ success: false, error: 'title required' });
  try {
    const raw = await generateText(buildBlogPrompt(await readMarketingConfig(), body));
    const s = raw.indexOf('['), e = raw.lastIndexOf(']');
    const cards = s >= 0 && e > s ? JSON.parse(raw.slice(s, e + 1)) : [];
    if (!Array.isArray(cards) || cards.length === 0) return res.status(502).json({ success: false, error: '블로그 생성 결과를 해석하지 못했습니다. 다시 시도해주세요.' });
    res.json({ success: true, cards });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] blog-generate failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// POST /rewrite : 선택 구간 → 수정 지시대로 재작성한 HTML 조각 (Gemini 게이트).
marketingRouter.post('/rewrite', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.selection || !String(body.selection).trim()) {
    return res.status(400).json({ success: false, error: 'selection required' });
  }
  try {
    const html = (await generateText(buildRewritePrompt(await readMarketingConfig(), body))).trim();
    if (!html) return res.status(502).json({ success: false, error: '재작성 결과가 비어 있습니다. 다시 시도해주세요.' });
    res.json({ success: true, html });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] rewrite failed', e);
    res.status(500).json({ success: false, error: msg });
  }
});
