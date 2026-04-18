import type { Visit } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

/**
 * 진료 기록 리스트용 visit fetch.
 *
 * is_intake 로 표시된 "첫 상담 가상 visit"은 첫 상담 전용 데이터 저장소로만
 * 쓰이며 일반 진료 기록에는 노출되지 않는다 (사용자 요청). 해당 visit 이
 * 필요한 화면은 `getOrCreateIntakeVisit` 를 직접 호출해서 얻는다.
 */
export async function fetchVisitsForChild(childId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('child_id', childId)
    .or('is_intake.is.null,is_intake.eq.false')
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
  is_intake?: boolean;
}): Promise<Visit> {
  const { data, error } = await supabase.from('visits').insert(input).select().single();
  if (error) {
    logger.error('createVisit failed', error);
    throw new Error('내원 기록 저장에 실패했습니다.');
  }
  return data as Visit;
}

/**
 * Lookup or lazily create the single "intake" visit for a child.
 * Used by the 기본 정보 tab to hang X-ray / lab / measurement data off of
 * an existing visit row without cluttering the 진료 기록 timeline semantics.
 */
export async function getOrCreateIntakeVisit(
  childId: string,
  defaultDate: string,
): Promise<Visit> {
  const { data: found, error: fetchErr } = await supabase
    .from('visits')
    .select('*')
    .eq('child_id', childId)
    .eq('is_intake', true)
    .maybeSingle();
  if (fetchErr) {
    logger.error('getOrCreateIntakeVisit fetch failed', fetchErr);
    throw new Error('초진 회차를 불러오지 못했습니다.');
  }
  if (found) return found as Visit;
  return await createVisit({
    child_id: childId,
    visit_date: defaultDate,
    chief_complaint: '초진 문진',
    is_intake: true,
  });
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
