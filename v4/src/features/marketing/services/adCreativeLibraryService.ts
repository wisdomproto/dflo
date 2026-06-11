// src/features/marketing/services/adCreativeLibraryService.ts
// 광고 전용 "다크 포스트" 소재 라이브러리 — 직접 업로드한 이미지/영상(R2)을 영구 보관해
// 캠페인마다 재사용. 파일 자체는 R2(marketing/ads), 여기는 그 참조(URL·이름·종류·시장)만 저장.
// migration 054. 테이블 없으면 graceful(fetch=빈 배열, save/delete=throw).
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export type AdCreativeKind = 'image' | 'reels';
export interface AdCreative {
  id: string;
  market: string;
  name: string;
  kind: AdCreativeKind;
  mediaUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

type Row = Record<string, unknown>;
function rowToCreative(r: Row): AdCreative {
  return {
    id: r.id as string,
    market: (r.market as string) ?? 'ko',
    name: (r.name as string) ?? '',
    kind: ((r.kind as AdCreativeKind) ?? 'image'),
    mediaUrl: (r.media_url as string) ?? '',
    thumbnailUrl: (r.thumbnail_url as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
  };
}

export async function fetchAdCreatives(market: string): Promise<AdCreative[]> {
  const { data, error } = await supabase
    .from('marketing_ad_creatives')
    .select('*')
    .eq('market', market)
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchAdCreatives failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToCreative(r as Row));
}

export async function saveAdCreative(c: {
  market: string; name: string; kind: AdCreativeKind; mediaUrl: string; thumbnailUrl?: string;
}): Promise<AdCreative> {
  const { data, error } = await supabase
    .from('marketing_ad_creatives')
    .insert({ market: c.market, name: c.name, kind: c.kind, media_url: c.mediaUrl, thumbnail_url: c.thumbnailUrl ?? '' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCreative(data as Row);
}

export async function updateAdCreativeThumbnail(id: string, thumbnailUrl: string): Promise<void> {
  const { error } = await supabase.from('marketing_ad_creatives').update({ thumbnail_url: thumbnailUrl }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAdCreative(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_ad_creatives').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
