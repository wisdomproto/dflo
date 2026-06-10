// src/features/marketing/services/cardnewsService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { Cardnews, CardnewsSlide, CardCanvasData, CardLang, CardSlideText } from '../types';
import { CARD_LANGS } from '../types';

// Keep field lists in sync: 032+044 migration columns ↔ mappers ↔ Cardnews/CardnewsSlide.
type Row = Record<string, unknown>;

const AI_BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

function emptyTexts(): Record<CardLang, CardSlideText> {
  return CARD_LANGS.reduce((acc, l) => { acc[l] = { headline: '', subtext: '' }; return acc; }, {} as Record<CardLang, CardSlideText>);
}
function emptyI18n(): Record<CardLang, string> {
  return CARD_LANGS.reduce((acc, l) => { acc[l] = ''; return acc; }, {} as Record<CardLang, string>);
}

// ── AI generation ───────────────────────────────────────────────────────────
export interface GeneratedI18nSlide {
  role: string;
  illustration: string;
  texts: Record<CardLang, CardSlideText>;
  isCta: boolean;
}

/** 다국어 카드뉴스 슬라이드(언어공통 일러스트 + 5개 언어 텍스트) 생성. */
export async function generateCardnewsI18n(req: {
  title: string;
  body?: string;
}): Promise<GeneratedI18nSlide[]> {
  const res = await fetch(`${AI_BASE}/api/marketing/cardnews-i18n`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `카드뉴스 생성 실패: ${res.status}`);
  return (b.slides ?? []) as GeneratedI18nSlide[];
}

/** 캡션 + 해시태그(5개 언어) 생성. */
export async function generateCaptions(req: {
  title: string;
  body?: string;
}): Promise<{ captions: Record<CardLang, string>; hashtags: Record<CardLang, string> }> {
  const res = await fetch(`${AI_BASE}/api/marketing/cardnews-captions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `캡션 생성 실패: ${res.status}`);
  return { captions: b.captions ?? emptyI18n(), hashtags: b.hashtags ?? emptyI18n() };
}

// ── Mappers ─────────────────────────────────────────────────────────────────
const EMPTY_CANVAS: CardCanvasData = { bgColor: '#ffffff', imageUrl: null, imageY: 50, textBlocks: [], images: {} };

function rowToCardnews(r: Row, slides: CardnewsSlide[]): Cardnews {
  return {
    id: r.id as string,
    contentId: r.content_id as string,
    caption: (r.caption as string) ?? '',
    hashtags: (r.hashtags as string[]) ?? [],
    slides,
    captions: { ...emptyI18n(), ...((r.captions as Record<CardLang, string>) ?? {}) },
    hashtagsI18n: { ...emptyI18n(), ...((r.hashtags_i18n as Record<CardLang, string>) ?? {}) },
  };
}

function rowToSlide(r: Row): CardnewsSlide {
  return {
    id: r.id as string,
    cardnewsId: r.cardnews_id as string,
    canvas: (r.canvas as CardCanvasData) ?? EMPTY_CANVAS,
    imagePrompt: (r.image_prompt as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
    illustration: (r.illustration as string) ?? '',
    texts: { ...emptyTexts(), ...((r.texts as Record<CardLang, CardSlideText>) ?? {}) },
    role: (r.role as string) ?? '',
    isCta: (r.is_cta as boolean) ?? false,
  };
}

// ── CRUD ────────────────────────────────────────────────────────────────────
export async function fetchCardnews(contentId: string): Promise<Cardnews | null> {
  const { data, error } = await supabase
    .from('marketing_cardnews')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) {
    logger.warn('[marketing] fetchCardnews failed:', error.message);
    return null;
  }
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;
  const row = rows[0];

  const { data: slides, error: slideErr } = await supabase
    .from('marketing_cardnews_slides')
    .select('*')
    .eq('cardnews_id', row.id as string)
    .order('sort_order', { ascending: true });
  if (slideErr) {
    logger.warn('[marketing] fetchCardnews slides failed:', slideErr.message);
    return rowToCardnews(row, []);
  }
  return rowToCardnews(row, ((slides ?? []) as Row[]).map(rowToSlide));
}

export async function createCardnews(contentId: string): Promise<Cardnews> {
  const { data, error } = await supabase
    .from('marketing_cardnews')
    .insert({ content_id: contentId, caption: '', hashtags: [], captions: emptyI18n(), hashtags_i18n: emptyI18n() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCardnews(data as Row, []);
}

export async function updateCardnews(
  id: string,
  patch: Partial<Pick<Cardnews, 'caption' | 'hashtags' | 'captions' | 'hashtagsI18n'>>
): Promise<void> {
  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.caption !== undefined) row.caption = patch.caption;
  if (patch.hashtags !== undefined) row.hashtags = patch.hashtags;
  if (patch.captions !== undefined) row.captions = patch.captions;
  if (patch.hashtagsI18n !== undefined) row.hashtags_i18n = patch.hashtagsI18n;
  const { error } = await supabase.from('marketing_cardnews').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addSlide(
  cardnewsId: string,
  sortOrder: number,
  init?: Partial<Pick<CardnewsSlide, 'illustration' | 'texts' | 'role' | 'isCta'>>
): Promise<CardnewsSlide> {
  const { data, error } = await supabase
    .from('marketing_cardnews_slides')
    .insert({
      cardnews_id: cardnewsId,
      sort_order: sortOrder,
      canvas: {},
      illustration: init?.illustration ?? '',
      texts: init?.texts ?? emptyTexts(),
      role: init?.role ?? '',
      is_cta: init?.isCta ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToSlide(data as Row);
}

export async function updateSlide(
  id: string,
  patch: Partial<Pick<CardnewsSlide, 'canvas' | 'imagePrompt' | 'illustration' | 'texts' | 'role' | 'isCta'>>
): Promise<void> {
  const row: Row = {};
  if (patch.canvas !== undefined) row.canvas = patch.canvas;
  if (patch.imagePrompt !== undefined) row.image_prompt = patch.imagePrompt;
  if (patch.illustration !== undefined) row.illustration = patch.illustration;
  if (patch.texts !== undefined) row.texts = patch.texts;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.isCta !== undefined) row.is_cta = patch.isCta;
  const { error } = await supabase.from('marketing_cardnews_slides').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSlide(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_cardnews_slides').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderSlides(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) =>
      supabase.from('marketing_cardnews_slides').update({ sort_order: i }).eq('id', id)
    )
  );
}
