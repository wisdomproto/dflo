import type { DailyRoutine, ExerciseLog, Meal } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

/**
 * Fetch every `daily_routines` row for a patient within [start, end] dates.
 * Used by the admin "생활 습관" section to summarize the month around a
 * selected visit.
 */
export async function fetchDailyRoutinesInRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<DailyRoutine[]> {
  const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('child_id', childId)
    .gte('routine_date', startDate)
    .lte('routine_date', endDate)
    .order('routine_date', { ascending: true });
  if (error) {
    logger.error('fetchDailyRoutinesInRange failed', error);
    throw new Error('생활 습관 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as DailyRoutine[];
}

/** All meals for the given daily_routine ids, flattened (chunked). */
export async function fetchMealsForRoutines(routineIds: string[]): Promise<Meal[]> {
  if (routineIds.length === 0) return [];
  const CHUNK = 50;
  const out: Meal[] = [];
  for (let i = 0; i < routineIds.length; i += CHUNK) {
    const slice = routineIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .in('daily_routine_id', slice);
    if (error) {
      logger.error('fetchMealsForRoutines failed', error);
      continue;
    }
    if (data) out.push(...(data as Meal[]));
  }
  return out;
}

/** All exercise logs for the given daily_routine ids, flattened.
 *  Falls back to chunked .in() to avoid PostgREST URL length limits
 *  when the month has many routine rows. */
export async function fetchExercisesForRoutines(
  routineIds: string[],
): Promise<ExerciseLog[]> {
  if (routineIds.length === 0) return [];
  const CHUNK = 50;
  const out: ExerciseLog[] = [];
  for (let i = 0; i < routineIds.length; i += CHUNK) {
    const slice = routineIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .in('daily_routine_id', slice);
    if (error) {
      logger.error('fetchExercisesForRoutines failed', error);
      continue;
    }
    if (data) out.push(...(data as ExerciseLog[]));
  }
  return out;
}
