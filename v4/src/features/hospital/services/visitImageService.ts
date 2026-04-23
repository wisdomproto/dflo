import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BUCKET = 'xray-images';

export interface VisitImage {
  id: string;
  visit_id: string;
  child_id: string;
  image_path: string;
  source_file: string | null;
  series_id: string | null;
  image_index: number | null;
  created_at: string;
}

export async function fetchVisitImagesByVisit(visitId: string): Promise<VisitImage[]> {
  const { data, error } = await supabase
    .from('visit_images')
    .select('*')
    .eq('visit_id', visitId)
    .order('image_index', { ascending: true, nullsFirst: false });
  if (error) {
    logger.error('fetchVisitImagesByVisit failed', error);
    throw new Error('X-ray 이미지 목록을 불러오지 못했습니다.');
  }
  return (data ?? []) as VisitImage[];
}

export async function fetchVisitIdsWithImages(childId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('visit_images')
    .select('visit_id')
    .eq('child_id', childId);
  if (error) {
    logger.error('fetchVisitIdsWithImages failed', error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.visit_id as string));
}

export async function getVisitImageSignedUrl(
  path: string,
  expiresInSec = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error || !data) {
    logger.error('getVisitImageSignedUrl failed', error);
    throw new Error('이미지 링크 생성에 실패했습니다.');
  }
  return data.signedUrl;
}

export async function fetchVisitImageSignedUrls(
  paths: string[],
  expiresInSec = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresInSec);
  if (error || !data) {
    logger.error('createSignedUrls failed', error);
    throw new Error('이미지 링크 생성에 실패했습니다.');
  }
  const map: Record<string, string> = {};
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  });
  return map;
}
