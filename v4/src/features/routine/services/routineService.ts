import type { DailyRoutine, ExerciseLog } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Routine Service - 187 성장케어 v4
// ================================================

// ------------------------------------------------
// Daily Routine
// ------------------------------------------------

/**
 * 특정 날짜의 루틴을 조회합니다.
 */
export async function fetchRoutine(
  childId: string,
  date: string,
): Promise<DailyRoutine | null> {
  const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('child_id', childId)
    .eq('routine_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('Failed to fetch routine:', error);
    throw new Error('루틴 정보를 불러오는데 실패했습니다.');
  }

  return data as DailyRoutine;
}

/**
 * 특정 월의 루틴 목록을 조회합니다.
 */
export async function fetchRoutinesByMonth(
  childId: string,
  year: number,
  month: number,
): Promise<DailyRoutine[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('child_id', childId)
    .gte('routine_date', startDate)
    .lt('routine_date', endDate)
    .order('routine_date', { ascending: true });

  if (error) {
    logger.error('Failed to fetch routines by month:', error);
    throw new Error('월별 루틴 정보를 불러오는데 실패했습니다.');
  }

  return data as DailyRoutine[];
}

/**
 * 루틴을 생성하거나 업데이트합니다 (child_id + routine_date 유니크).
 */
export async function upsertRoutine(routine: {
  child_id: string;
  routine_date: string;
  daily_height?: number;
  daily_weight?: number;
  sleep_time?: string;
  wake_time?: string;
  sleep_quality?: DailyRoutine['sleep_quality'];
  sleep_notes?: string;
  water_intake_ml?: number;
  basic_supplements?: string[];
  extra_supplements?: string[];
  growth_injection?: boolean;
  injection_time?: string;
  injection_notes?: string;
  daily_notes?: string;
  mood?: DailyRoutine['mood'];
}): Promise<DailyRoutine> {
  const { data, error } = await supabase
    .from('daily_routines')
    .upsert(routine, { onConflict: 'child_id,routine_date' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to upsert routine:', error);
    throw new Error('루틴 저장에 실패했습니다.');
  }

  return data as DailyRoutine;
}

// ------------------------------------------------
// Meals → moved to features/meal/services/mealService.ts
// ------------------------------------------------

// ------------------------------------------------
// Exercise Logs
// ------------------------------------------------

/**
 * 루틴에 속한 운동 기록을 조회합니다.
 */
export async function fetchExerciseLogsByRoutine(
  routineId: string,
): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('daily_routine_id', routineId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch exercise logs:', error);
    throw new Error('운동 기록을 불러오는데 실패했습니다.');
  }

  return data as ExerciseLog[];
}

/**
 * 운동 기록을 생성하거나 업데이트합니다.
 */
export async function upsertExerciseLog(log: {
  id?: string;
  daily_routine_id: string;
  exercise_name: string;
  duration_minutes?: number;
  completed?: boolean;
}): Promise<ExerciseLog> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .upsert(log)
    .select()
    .single();

  if (error) {
    logger.error('Failed to upsert exercise log:', error);
    throw new Error('운동 기록 저장에 실패했습니다.');
  }

  return data as ExerciseLog;
}

/**
 * 운동 기록을 삭제합니다.
 */
export async function deleteExerciseLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete exercise log:', error);
    throw new Error('운동 기록 삭제에 실패했습니다.');
  }
}
