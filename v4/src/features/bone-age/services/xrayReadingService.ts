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

export async function fetchVisitIdsWithXray(childId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('xray_readings')
    .select('visit_id')
    .eq('child_id', childId);
  if (error) {
    logger.error('fetchVisitIdsWithXray failed', error);
    throw new Error('X-ray 목록을 불러오지 못했습니다.');
  }
  return new Set((data ?? []).map((r) => r.visit_id as string));
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

/**
 * Upsert-by-visit: if a reading already exists for this visit we UPDATE it
 * instead of creating a duplicate row. Avoids accumulating partial rows when
 * the user saves multiple times (e.g. saved bone-age first, then added image
 * later, or vice versa). Also preserves a previously-uploaded image path if
 * the new save doesn't include a fresh upload.
 */
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
  const { data: existing, error: fetchErr } = await supabase
    .from('xray_readings')
    .select('*')
    .eq('visit_id', input.visit_id)
    .order('xray_date', { ascending: false })
    .limit(1);
  if (fetchErr) {
    logger.error('createXrayReading fetch existing failed', fetchErr);
  }

  const existingRow = (existing ?? [])[0] as XrayReading | undefined;

  let data: XrayReading | null = null;

  if (existingRow) {
    const patch = {
      ...input,
      // Keep the old image_path if no new one is supplied this save.
      image_path: input.image_path ?? existingRow.image_path,
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error } = await supabase
      .from('xray_readings')
      .update(patch)
      .eq('id', existingRow.id)
      .select()
      .single();
    if (error) {
      logger.error('updateXrayReading failed', error);
      throw new Error('X-ray 판독 저장에 실패했습니다.');
    }
    data = updated as XrayReading;
  } else {
    const { data: inserted, error } = await supabase
      .from('xray_readings')
      .insert(input)
      .select()
      .single();
    if (error) {
      logger.error('createXrayReading failed', error);
      throw new Error('X-ray 판독 저장에 실패했습니다.');
    }
    data = inserted as XrayReading;
  }

  if (input.bone_age_result !== undefined) {
    await updateMeasurementBoneAge(input.visit_id, input.bone_age_result);
  }
  return data as XrayReading;
}
