import type { LabTest, LabTestType } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchLabTestsByVisit(visitId: string): Promise<LabTest[]> {
  const { data, error } = await supabase
    .from('lab_tests')
    .select('*')
    .eq('visit_id', visitId)
    .order('collected_date', { ascending: false });
  if (error) {
    logger.error('fetchLabTestsByVisit failed', error);
    throw new Error('검사 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as LabTest[];
}

export async function createLabTest(input: {
  visit_id: string;
  child_id: string;
  test_type: LabTestType;
  collected_date?: string;
  result_date?: string;
  result_data?: Record<string, unknown>;
  attachments?: { url: string; name: string; mime: string }[];
  doctor_memo?: string;
}): Promise<LabTest> {
  const { data, error } = await supabase
    .from('lab_tests')
    .insert({
      ...input,
      result_data: input.result_data ?? {},
      attachments: input.attachments ?? [],
    })
    .select()
    .single();
  if (error) {
    logger.error('createLabTest failed', error);
    throw new Error('검사 기록 저장에 실패했습니다.');
  }
  return data as LabTest;
}

export async function updateLabTest(
  id: string,
  patch: Partial<Omit<LabTest, 'id' | 'created_at' | 'updated_at'>>,
): Promise<LabTest> {
  const { data, error } = await supabase
    .from('lab_tests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateLabTest failed', error);
    throw new Error('검사 기록 수정에 실패했습니다.');
  }
  return data as LabTest;
}

export async function deleteLabTest(id: string): Promise<void> {
  const { error } = await supabase.from('lab_tests').delete().eq('id', id);
  if (error) {
    logger.error('deleteLabTest failed', error);
    throw new Error('검사 기록 삭제에 실패했습니다.');
  }
}
