// ================================================
// Storage 유틸 - Supabase Storage (content-images)
// 이미지 업로드 / 삭제 / URL 변환
// ================================================

import { supabase } from './supabase';

const BUCKET = 'content-images';

type Folder = 'recipes' | 'guides' | 'cases';

/**
 * 이미지 업로드 → public URL 반환
 * @param folder  저장 폴더 (recipes | guides | cases)
 * @param file    업로드할 파일
 * @returns       public URL string
 */
export async function uploadImage(folder: Folder, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${timestamp}-${randomId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);

  return getPublicUrl(path);
}

/**
 * 이미지 삭제 (public URL에서 경로 추출)
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const path = extractPath(publicUrl);
  if (!path) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) throw new Error(`이미지 삭제 실패: ${error.message}`);
}

/**
 * Storage 경로 → public URL 변환
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * public URL → Storage 경로 추출
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/content-images/recipes/abc.jpg"
 *      → "recipes/abc.jpg"
 */
function extractPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
