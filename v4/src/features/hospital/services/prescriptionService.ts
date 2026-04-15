import type { Prescription } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchPrescriptionsByVisit(visitId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('fetchPrescriptionsByVisit failed', error);
    throw new Error('처방을 불러오지 못했습니다.');
  }
  return (data ?? []) as Prescription[];
}

export async function createPrescription(input: {
  visit_id: string;
  child_id: string;
  medication_id: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  notes?: string;
}): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert(input)
    .select()
    .single();
  if (error) {
    logger.error('createPrescription failed', error);
    throw new Error('처방 저장에 실패했습니다.');
  }
  return data as Prescription;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) {
    logger.error('deletePrescription failed', error);
    throw new Error('처방 삭제에 실패했습니다.');
  }
}
