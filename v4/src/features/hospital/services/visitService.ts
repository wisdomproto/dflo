import type { Visit } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchVisitsForChild(childId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('child_id', childId)
    .order('visit_date', { ascending: false });
  if (error) {
    logger.error('fetchVisitsForChild failed', error);
    throw new Error('내원 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as Visit[];
}

export async function fetchVisit(id: string): Promise<Visit | null> {
  const { data, error } = await supabase.from('visits').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('fetchVisit failed', error);
    throw new Error('내원 기록을 불러오지 못했습니다.');
  }
  return data as Visit;
}

export async function createVisit(input: {
  child_id: string;
  visit_date: string;
  doctor_id?: string;
  chief_complaint?: string;
  plan?: string;
  notes?: string;
}): Promise<Visit> {
  const { data, error } = await supabase.from('visits').insert(input).select().single();
  if (error) {
    logger.error('createVisit failed', error);
    throw new Error('내원 기록 저장에 실패했습니다.');
  }
  return data as Visit;
}

export async function updateVisit(
  id: string,
  patch: Partial<Omit<Visit, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Visit> {
  const { data, error } = await supabase
    .from('visits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateVisit failed', error);
    throw new Error('내원 기록 수정에 실패했습니다.');
  }
  return data as Visit;
}

export async function deleteVisit(id: string): Promise<void> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) {
    logger.error('deleteVisit failed', error);
    throw new Error('내원 기록 삭제에 실패했습니다.');
  }
}
