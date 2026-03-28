// ================================================
// Banner Service - Supabase CRUD for website_banners
// ================================================

import { supabase } from '@/shared/lib/supabase';
import type { BannerSlide } from '../types/websiteSection';

interface BannerRow {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_action: string;
  cta_target: string;
  image_url: string | null;
  bg_gradient: string | null;
  title_size: number | null;
  title_color: string | null;
  subtitle_size: number | null;
  subtitle_color: string | null;
  order_index: number;
  is_active: boolean;
}

function rowToSlide(row: BannerRow): BannerSlide {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    ctaText: row.cta_text,
    ctaAction: row.cta_action as 'scroll' | 'link',
    ctaTarget: row.cta_target,
    imageUrl: row.image_url || undefined,
    bgGradient: row.bg_gradient || undefined,
    titleSize: row.title_size || undefined,
    titleColor: row.title_color || undefined,
    subtitleSize: row.subtitle_size || undefined,
    subtitleColor: row.subtitle_color || undefined,
    order: row.order_index,
  };
}

function slideToRow(slide: BannerSlide): Omit<BannerRow, 'id'> & { id?: string } {
  return {
    id: slide.id.startsWith('banner-') ? undefined : slide.id, // skip client-generated IDs
    title: slide.title,
    subtitle: slide.subtitle,
    cta_text: slide.ctaText,
    cta_action: slide.ctaAction,
    cta_target: slide.ctaTarget,
    image_url: slide.imageUrl || null,
    bg_gradient: slide.bgGradient || null,
    title_size: slide.titleSize || null,
    title_color: slide.titleColor || null,
    subtitle_size: slide.subtitleSize || null,
    subtitle_color: slide.subtitleColor || null,
    order_index: slide.order,
    is_active: true,
  };
}

/** Fetch all active banners (public, no auth needed) */
export async function fetchBanners(): Promise<BannerSlide[]> {
  const { data, error } = await supabase
    .from('website_banners')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (error) throw new Error(`배너 로드 실패: ${error.message}`);
  return (data as BannerRow[]).map(rowToSlide);
}

/** Save all banners (delete existing + insert new) — admin only */
export async function saveBanners(slides: BannerSlide[]): Promise<BannerSlide[]> {
  // Deactivate all existing
  const { error: deactivateError } = await supabase
    .from('website_banners')
    .update({ is_active: false })
    .eq('is_active', true);

  if (deactivateError) throw new Error(`배너 비활성화 실패: ${deactivateError.message}`);

  if (slides.length === 0) return [];

  // Insert new slides
  const rows = slides.map((s, i) => {
    const row = slideToRow({ ...s, order: i });
    delete row.id; // let DB generate UUID
    return row;
  });

  const { data, error } = await supabase
    .from('website_banners')
    .insert(rows)
    .select();

  if (error) throw new Error(`배너 저장 실패: ${error.message}`);
  return (data as BannerRow[]).map(rowToSlide);
}
