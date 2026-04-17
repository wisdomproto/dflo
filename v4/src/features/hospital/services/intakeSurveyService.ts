import type { Child, IntakeSurvey } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export const DEFAULT_INTAKE_SURVEY: IntakeSurvey = {
  growth_history: [8, 9, 10, 11, 12, 13, 14, 15, 16].map((age) => ({ age, height: null })),
  growth_flags: { rapid_growth: false, slowed: false, puberty_concern: false },
  past_clinic_consult: null,
  parents_interested: null,
  sports_athlete: null,
  sports_event: '',
  child_interested: null,
  chronic_conditions: '',
  tanner_stage: null,
  short_stature_causes: [],
  short_stature_other: '',
  updated_at: new Date(0).toISOString(),
};

/**
 * Update one or more first-class `children` columns (name, grade, father_height, etc.).
 * Returns the refreshed child row.
 */
export async function updateChildField(
  childId: string,
  patch: Partial<Omit<Child, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', childId)
    .select()
    .single();
  if (error) {
    logger.error('updateChildField failed', error);
    throw new Error('환자 정보 저장에 실패했습니다.');
  }
  return data as Child;
}

/**
 * Merge a partial patch into `children.intake_survey` (jsonb) and bump `updated_at`.
 * Pulls the current JSON, merges client-side, and writes back so callers only need
 * to send the fields they changed.
 */
export async function updateIntakeSurvey(
  childId: string,
  patch: Partial<IntakeSurvey>,
): Promise<Child> {
  const { data: current, error: fetchErr } = await supabase
    .from('children')
    .select('intake_survey')
    .eq('id', childId)
    .single();
  if (fetchErr) {
    logger.error('updateIntakeSurvey fetch failed', fetchErr);
    throw new Error('초진 설문 저장에 실패했습니다.');
  }
  const currentSurvey: IntakeSurvey =
    (current?.intake_survey as IntakeSurvey | null) ?? DEFAULT_INTAKE_SURVEY;
  const merged: IntakeSurvey = {
    ...currentSurvey,
    ...patch,
    // Merge growth_flags object shallow so checkbox updates don't wipe others.
    growth_flags: patch.growth_flags
      ? { ...currentSurvey.growth_flags, ...patch.growth_flags }
      : currentSurvey.growth_flags,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('children')
    .update({ intake_survey: merged, updated_at: merged.updated_at })
    .eq('id', childId)
    .select()
    .single();
  if (error) {
    logger.error('updateIntakeSurvey failed', error);
    throw new Error('초진 설문 저장에 실패했습니다.');
  }
  return data as Child;
}
