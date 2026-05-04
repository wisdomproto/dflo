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
  injectionScore: number;
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
    injection: number;
  };
}

// ── Scoring helpers ──────────────────────────────

/**
 * 식사 점수 — meal 평가(is_healthy) 까지 반영.
 * 3끼니(아침/점심/저녁) 각각:
 *   - is_healthy=true  → 100점
 *   - is_healthy=null  → 50점 (기록만)
 *   - is_healthy=false → 30점 (먹긴 했지만 별로)
 *   - row 없음          → 0점 (안 먹음)
 * 세 끼니 평균.
 */
function scoreMeal(qualities: Map<string, boolean | null>): number {
  const types = ['breakfast', 'lunch', 'dinner'] as const;
  const sum = types.reduce((acc, t) => {
    if (!qualities.has(t)) return acc + 0;
    const q = qualities.get(t);
    if (q === true) return acc + 100;
    if (q === false) return acc + 30;
    return acc + 50; // null = 기록만
  }, 0);
  return Math.round(sum / 3);
}

function scoreExercise(completedCount: number): number {
  if (completedCount === 0) return 0;
  if (completedCount === 1) return 30;
  if (completedCount === 2) return 50;
  if (completedCount === 3) return 70;
  return 100;
}

/** 수분 점수 — 1000ml(=1L) 만점. WaterCard 의 "잘 마셨어요" 기준과 일치. */
function scoreWater(ml: number | undefined): number {
  if (!ml || ml <= 0) return 0;
  return Math.min(Math.round((ml / 1000) * 100), 100);
}

function scoreSupplement(supplements: string[] | undefined | null): number {
  return (supplements?.length ?? 0) > 0 ? 100 : 0;
}

function scoreSleep(quality: string | undefined | null, sleepTime: string | undefined | null): number {
  if (!quality && !sleepTime) return 0;
  let score = 50;
  if (quality === 'good') score += 50;
  return score;
}

/** 성장주사 점수 — 매일 binary (true → 100, else → 0). */
function scoreInjection(injection: boolean | null | undefined): number {
  return injection === true ? 100 : 0;
}

// 가중치 합 = 100. 식사·주사를 가장 중요하게.
function totalScore(m: number, e: number, w: number, s: number, sl: number, inj: number): number {
  return Math.round(m * 0.20 + e * 0.15 + w * 0.15 + s * 0.15 + sl * 0.15 + inj * 0.20);
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
        supabase.from('meals').select('daily_routine_id, meal_type, is_healthy').in('daily_routine_id', ids),
        supabase.from('exercise_logs').select('daily_routine_id, completed').in('daily_routine_id', ids),
      ]);
      if (cancelled) return;

      // routineId → Map<meal_type, is_healthy(boolean|null)>
      // 같은 meal_type 이 여러 row 있으면 가장 좋은 평가(true > null > false) 우선.
      const mealMap = new Map<string, Map<string, boolean | null>>();
      for (const m of mealsRes.data ?? []) {
        if (!mealMap.has(m.daily_routine_id)) mealMap.set(m.daily_routine_id, new Map());
        const inner = mealMap.get(m.daily_routine_id)!;
        const cur = inner.get(m.meal_type);
        const next = m.is_healthy as boolean | null;
        // priority: true > null > false
        const rank = (v: boolean | null | undefined) => (v === true ? 2 : v === false ? 0 : 1);
        if (cur === undefined || rank(next) > rank(cur)) inner.set(m.meal_type, next);
      }

      const exMap = new Map<string, number>();
      for (const e of exRes.data ?? []) {
        if (e.completed) exMap.set(e.daily_routine_id, (exMap.get(e.daily_routine_id) ?? 0) + 1);
      }

      const days: DayStats[] = routines.map((r: DailyRoutine) => {
        const ms = scoreMeal(mealMap.get(r.id) ?? new Map());
        const es = scoreExercise(exMap.get(r.id) ?? 0);
        const ws = scoreWater(r.water_intake_ml);
        const ss = scoreSupplement(r.basic_supplements as string[]);
        const sls = scoreSleep(r.sleep_quality, r.sleep_time);
        const ijs = scoreInjection(r.growth_injection);
        return {
          date: r.routine_date,
          mealScore: ms, exerciseScore: es, waterScore: ws,
          supplementScore: ss, sleepScore: sls, injectionScore: ijs,
          totalScore: totalScore(ms, es, ws, ss, sls, ijs),
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
          injection: avg('injectionScore'),
        },
      });
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [childId, year, month]);

  return { stats, loading };
}
