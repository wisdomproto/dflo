import type { Measurement } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Measurement Service - 187 성장케어 v4
// ================================================

/**
 * 자녀의 측정 기록을 최신순으로 조회합니다.
 */
export async function fetchMeasurements(childId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('child_id', childId)
    .order('measured_date', { ascending: false });

  if (error) {
    logger.error('Failed to fetch measurements:', error);
    throw new Error('측정 기록을 불러오는데 실패했습니다.');
  }

  return data as Measurement[];
}

/**
 * 자녀의 최신 측정 기록을 조회합니다.
 */
export async function fetchLatestMeasurement(
  childId: string,
): Promise<Measurement | null> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('child_id', childId)
    .order('measured_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('Failed to fetch latest measurement:', error);
    throw new Error('최신 측정 기록을 불러오는데 실패했습니다.');
  }

  return data as Measurement;
}

/**
 * 새 측정 기록을 생성합니다.
 */
export async function createMeasurement(measurement: {
  child_id: string;
  measured_date: string;
  height: number;
  weight?: number;
  actual_age?: number;
  bone_age?: number;
  pah?: number;
  height_percentile?: number;
  weight_percentile?: number;
  bmi?: number;
  notes?: string;
  doctor_notes?: string;
  created_by?: string;
}): Promise<Measurement> {
  const { data, error } = await supabase
    .from('measurements')
    .insert(measurement)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create measurement:', error);
    throw new Error('측정 기록 등록에 실패했습니다.');
  }

  return data as Measurement;
}

/**
 * 측정 기록을 수정합니다.
 */
export async function updateMeasurement(
  id: string,
  updates: Partial<Measurement>,
): Promise<Measurement> {
  const { data, error } = await supabase
    .from('measurements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update measurement:', error);
    throw new Error('측정 기록 수정에 실패했습니다.');
  }

  return data as Measurement;
}

/**
 * 측정 기록을 삭제합니다.
 */
export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete measurement:', error);
    throw new Error('측정 기록 삭제에 실패했습니다.');
  }
}
