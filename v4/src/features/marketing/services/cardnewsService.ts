// src/features/marketing/services/cardnewsService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { Cardnews, CardnewsSlide, CardCanvasData } from '../types';

// Keep field lists in sync: 032 migration columns ↔ mappers ↔ Cardnews/CardnewsSlide.
type Row = Record<string, unknown>;

const AI_BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export interface GeneratedSlide {
  headline: string;
  body: string;
  imagePrompt: string;
}

export async function generateCardnewsSlides(req: {
  title: string;
  body?: string;
  count?: number;
}): Promise<GeneratedSlide[]> {
  const res = await fetch(`${AI_BASE}/api/marketing/cardnews-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `카드뉴스 생성 실패: ${res.status}`);
  return (b.slides ?? []) as GeneratedSlide[];
}

const EMPTY_CANVAS: CardCanvasData = {
  bgColor: '#ffffff',
  imageUrl: null,
  imageY: 50,
  textBlocks: [],
};

function rowToCardnews(r: Row, slides: CardnewsSlide[]): Cardnews {
  return {
    id: r.id as string,
    contentId: r.content_id as string,
    caption: (r.caption as string) ?? '',
    hashtags: (r.hashtags as string[]) ?? [],
    slides,
  };
}

function rowToSlide(r: Row): CardnewsSlide {
  return {
    id: r.id as string,
    cardnewsId: r.cardnews_id as string,
    canvas: (r.canvas as CardCanvasData) ?? EMPTY_CANVAS,
    imagePrompt: (r.image_prompt as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

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
    .insert({ content_id: contentId, caption: '', hashtags: [] })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCardnews(data as Row, []);
}

export async function updateCardnews(
  id: string,
  patch: Partial<Pick<Cardnews, 'caption' | 'hashtags'>>
): Promise<void> {
  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.caption !== undefined) row.caption = patch.caption;
  if (patch.hashtags !== undefined) row.hashtags = patch.hashtags;
  const { error } = await supabase.from('marketing_cardnews').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addSlide(
  cardnewsId: string,
  canvas: CardCanvasData,
  sortOrder: number
): Promise<CardnewsSlide> {
  const { data, error } = await supabase
    .from('marketing_cardnews_slides')
    .insert({ cardnews_id: cardnewsId, canvas, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToSlide(data as Row);
}

export async function updateSlide(
  id: string,
  patch: Partial<Pick<CardnewsSlide, 'canvas' | 'imagePrompt'>>
): Promise<void> {
  const row: Row = {};
  if (patch.canvas !== undefined) row.canvas = patch.canvas;
  if (patch.imagePrompt !== undefined) row.image_prompt = patch.imagePrompt;
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
