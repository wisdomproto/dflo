import type { XrayReading } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { updateMeasurementBoneAge } from '@/features/hospital/services/hospitalMeasurementService';

const BUCKET = 'xray-images';

export async function uploadXrayImage(childId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'webp';
  const path = `${childId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) {
    logger.error('uploadXrayImage failed', error);
    throw new Error('X-ray 업로드에 실패했습니다.');
  }
  return path;
}

export async function getXrayImageSignedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data) {
    logger.error('getXrayImageSignedUrl failed', error);
    throw new Error('X-ray 링크 생성에 실패했습니다.');
  }
  return data.signedUrl;
}

export async function fetchXrayReadingsByVisit(visitId: string): Promise<XrayReading[]> {
  const { data, error } = await supabase
    .from('xray_readings')
    .select('*')
    .eq('visit_id', visitId)
    .order('xray_date', { ascending: false });
  if (error) {
    logger.error('fetchXrayReadingsByVisit failed', error);
    throw new Error('X-ray 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as XrayReading[];
}

export async function createXrayReading(input: {
  visit_id: string;
  child_id: string;
  xray_date: string;
  image_path?: string;
  bone_age_result?: number;
  atlas_match_younger?: string;
  atlas_match_older?: string;
  doctor_memo?: string;
}): Promise<XrayReading> {
  const { data, error } = await supabase.from('xray_readings').insert(input).select().single();
  if (error) {
    logger.error('createXrayReading failed', error);
    throw new Error('X-ray 판독 저장에 실패했습니다.');
  }
  if (input.bone_age_result !== undefined) {
    await updateMeasurementBoneAge(input.visit_id, input.bone_age_result);
  }
  return data as XrayReading;
}
