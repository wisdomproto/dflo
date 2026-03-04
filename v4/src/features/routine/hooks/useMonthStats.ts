// ================================================
// useMonthStats - 월별 루틴 통계 데이터 훅
// ================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { fetchRoutinesByMonth } from '@/features/routine/services/routineService';
import type { DailyRoutine } from '@/shared/types';

export interface DayStats {
  date: string;
  mealScore: number;
  exerciseScore: number;
  waterScore: number;
  supplementScore: number;
  sleepScore: number;
  totalScore: number;
  hasInjection: boolean;
}

export interface MonthStats {
  days: DayStats[];
  totalDaysInMonth: number;
  recordedDays: number;
  injectionDays: number;
  averages: {
    total: number;
    meal: number;
    exercise: number;
    water: number;
    supplement: number;
    sleep: number;
  };
}

// ── Scoring helpers ──────────────────────────────

function scoreMeal(mealTypes: Set<string>): number {
  // breakfast/lunch/dinner 중 몇 끼 기록했는지
  const count = ['breakfast', 'lunch', 'dinner'].filter((t) => mealTypes.has(t)).length;
  return Math.round((count / 3) * 100);
}

function scoreExercise(completedCount: number): number {
  if (completedCount === 0) return 0;
  if (completedCount === 1) return 30;
  if (completedCount === 2) return 50;
  if (completedCount === 3) return 70;
  return 100;
}

function scoreWater(ml: number | undefined): number {
  if (!ml || ml <= 0) return 0;
  return Math.min(Math.round((ml / 1500) * 100), 100);
}

function scoreSupplement(supplements: string[] | undefined | null): number {
  return (supplements?.length ?? 0) > 0 ? 100 : 0;
}

function scoreSleep(quality: string | undefined | null, sleepTime: string | undefined | null): number {
  if (!quality && !sleepTime) return 0;
  let score = 50; // 기록 자체에 50점
  if (quality === 'good') score += 50;
  // quality === 'bad' → +0
  return score;
}

function totalScore(m: number, e: number, w: number, s: number, sl: number): number {
  return Math.round(m * 0.25 + e * 0.20 + w * 0.20 + s * 0.20 + sl * 0.15);
}

// ── Hook ─────────────────────────────────────────

export function useMonthStats(childId: string | null, year: number, month: number) {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!childId) { setStats(null); return; }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const routines = await fetchRoutinesByMonth(childId, year, month);
      if (cancelled) return;
      if (routines.length === 0) {
        const daysInMonth = new Date(year, month, 0).getDate();
        setStats({ days: [], totalDaysInMonth: daysInMonth, recordedDays: 0, injectionDays: 0,
          averages: { total: 0, meal: 0, exercise: 0, water: 0, supplement: 0, sleep: 0 } });
        setLoading(false);
        return;
      }

      const ids = routines.map((r) => r.id);

      const [mealsRes, exRes] = await Promise.all([
        supabase.from('meals').select('daily_routine_id, meal_type').in('daily_routine_id', ids),
        supabase.from('exercise_logs').select('daily_routine_id, completed').in('daily_routine_id', ids),
      ]);
      if (cancelled) return;

      // Build maps: routineId → meal types, routineId → completed exercise count
      const mealMap = new Map<string, Set<string>>();
      for (const m of mealsRes.data ?? []) {
        if (!mealMap.has(m.daily_routine_id)) mealMap.set(m.daily_routine_id, new Set());
        mealMap.get(m.daily_routine_id)!.add(m.meal_type);
      }

      const exMap = new Map<string, number>();
      for (const e of exRes.data ?? []) {
        if (e.completed) exMap.set(e.daily_routine_id, (exMap.get(e.daily_routine_id) ?? 0) + 1);
      }

      // Compute per-day stats
      const days: DayStats[] = routines.map((r: DailyRoutine) => {
        const ms = scoreMeal(mealMap.get(r.id) ?? new Set());
        const es = scoreExercise(exMap.get(r.id) ?? 0);
        const ws = scoreWater(r.water_intake_ml);
        const ss = scoreSupplement(r.basic_supplements as string[]);
        const sls = scoreSleep(r.sleep_quality, r.sleep_time);
        return {
          date: r.routine_date,
          mealScore: ms, exerciseScore: es, waterScore: ws,
          supplementScore: ss, sleepScore: sls,
          totalScore: totalScore(ms, es, ws, ss, sls),
          hasInjection: r.growth_injection === true,
        };
      });

      const daysInMonth = new Date(year, month, 0).getDate();
      const injDays = days.filter((d) => d.hasInjection).length;

      const avg = (key: keyof DayStats) => {
        if (days.length === 0) return 0;
        const sum = days.reduce((a, d) => a + (d[key] as number), 0);
        return Math.round(sum / days.length);
      };

      setStats({
        days, totalDaysInMonth: daysInMonth, recordedDays: days.length, injectionDays: injDays,
        averages: {
          total: avg('totalScore'), meal: avg('mealScore'), exercise: avg('exerciseScore'),
          water: avg('waterScore'), supplement: avg('supplementScore'), sleep: avg('sleepScore'),
        },
      });
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [childId, year, month]);

  return { stats, loading };
}
