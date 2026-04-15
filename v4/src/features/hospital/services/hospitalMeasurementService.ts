import type { HospitalMeasurement } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchMeasurementsByVisit(visitId: string): Promise<HospitalMeasurement[]> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .select('*')
    .eq('visit_id', visitId)
    .order('measured_date', { ascending: false });
  if (error) {
    logger.error('fetchMeasurementsByVisit failed', error);
    throw new Error('측정 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as HospitalMeasurement[];
}

export async function createMeasurement(input: {
  visit_id: string;
  child_id: string;
  measured_date: string;
  height: number;
  weight?: number;
  bone_age?: number;
  pah?: number;
  doctor_notes?: string;
}): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .insert(input)
    .select()
    .single();
  if (error) {
    logger.error('createMeasurement failed', error);
    throw new Error('측정 기록 저장에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

export async function updateMeasurement(
  id: string,
  patch: Partial<Omit<HospitalMeasurement, 'id' | 'created_at' | 'updated_at'>>,
): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateMeasurement failed', error);
    throw new Error('측정 기록 수정에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

export async function updateMeasurementBoneAge(
  visitId: string,
  boneAge: number,
): Promise<void> {
  const { error } = await supabase
    .from('hospital_measurements')
    .update({ bone_age: boneAge, updated_at: new Date().toISOString() })
    .eq('visit_id', visitId);
  if (error) {
    logger.error('updateMeasurementBoneAge failed', error);
    throw new Error('뼈나이 동기화에 실패했습니다.');
  }
}
