// 릴 스티커 라이브러리 서비스 (migration 057). graceful: 테이블 미존재 시 친절한 에러로 변환.
// 업로드는 aiImageService.uploadStickerFile(원본 무변환) 만 사용 — WebP 변환 경로는 GIF 를 깨뜨림.
import { supabase } from '@/shared/lib/supabase';
import type { ReelStickerAsset } from '../types';
import { uploadStickerFile } from './aiImageService';

const MIGRATION_HINT = 'migration 057 적용 필요 (marketing_reel_stickers)';
function friendly(e: { message: string; code?: string }): Error {
  return new Error(/relation .* does not exist|42P01/.test(`${e.code} ${e.message}`) ? MIGRATION_HINT : e.message);
}
function mapSticker(r: Record<string, unknown>): ReelStickerAsset {
  return {
    id: r.id as string, name: r.name as string, category: r.category as ReelStickerAsset['category'],
    url: r.url as string, kind: r.kind as ReelStickerAsset['kind'], createdAt: r.created_at as string,
  };
}

/** 첫 1KB 에 'ANIM' FourCC 가 있으면 애니메이션 WebP(정지 1프레임으로 보일 수 있어 차단). */
async function isAnimatedWebp(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  for (let i = 0; i + 4 <= buf.length; i++) {
    if (buf[i] === 0x41 && buf[i + 1] === 0x4e && buf[i + 2] === 0x49 && buf[i + 3] === 0x4d) return true; // 'ANIM'
  }
  return false;
}

/** file.type → 스티커 kind. gif='gif', png/webp='image'. 애니 webp 는 throw. 그 외 타입은 throw. */
async function stickerKind(file: File): Promise<'image' | 'gif'> {
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/png') return 'image';
  if (file.type === 'image/webp') {
    if (await isAnimatedWebp(file)) throw new Error('애니메이션 WebP 는 지원하지 않습니다 — GIF 로 변환 후 업로드');
    return 'image';
  }
  throw new Error('PNG · WebP · GIF 만 업로드할 수 있습니다');
}

export async function fetchStickers(category?: 'sticker' | 'emoji'): Promise<ReelStickerAsset[]> {
  let q = supabase.from('marketing_reel_stickers').select('*').order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw friendly(error);
  return (data ?? []).map(mapSticker);
}

export async function createSticker(input: { name: string; category: 'sticker' | 'emoji'; file: File }): Promise<ReelStickerAsset> {
  const kind = await stickerKind(input.file);
  const url = await uploadStickerFile(input.file);
  const { data, error } = await supabase.from('marketing_reel_stickers')
    .insert({ name: input.name, category: input.category, url, kind }).select('*').single();
  if (error) throw friendly(error);
  return mapSticker(data as Record<string, unknown>);
}

/** 라이브러리에서만 제거 — R2 객체는 남긴다(릴에 박힌 src 참조 보호). */
export async function deleteSticker(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_reel_stickers').delete().eq('id', id);
  if (error) throw friendly(error);
}
