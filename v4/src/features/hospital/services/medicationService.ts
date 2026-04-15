import type { Medication } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchMedications(
  opts: { activeOnly?: boolean } = {},
): Promise<Medication[]> {
  let q = supabase.from('medications').select('*').order('code');
  if (opts.activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) {
    logger.error('fetchMedications failed', error);
    throw new Error('약품 목록을 불러오지 못했습니다.');
  }
  return (data ?? []) as Medication[];
}

export async function createMedication(
  input: Omit<Medication, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
    is_active?: boolean;
  },
): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert(input)
    .select()
    .single();
  if (error) {
    logger.error('createMedication failed', error);
    throw new Error('약품 등록에 실패했습니다.');
  }
  return data as Medication;
}

export async function updateMedication(
  id: string,
  patch: Partial<Omit<Medication, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateMedication failed', error);
    throw new Error('약품 수정에 실패했습니다.');
  }
  return data as Medication;
}

export async function deleteMedication(id: string): Promise<void> {
  // soft delete via is_active = false
  const { error } = await supabase.from('medications').update({ is_active: false }).eq('id', id);
  if (error) {
    logger.error('deleteMedication failed', error);
    throw new Error('약품 비활성화에 실패했습니다.');
  }
}
