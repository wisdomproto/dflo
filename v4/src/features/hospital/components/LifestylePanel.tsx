import { useEffect, useMemo, useState } from 'react';
import type { DailyRoutine, ExerciseLog, Meal } from '@/shared/types';
import {
  fetchDailyRoutinesInRange,
  fetchExercisesForRoutines,
  fetchMealsForRoutines,
} from '@/features/hospital/services/lifestyleService';
import { logger } from '@/shared/lib/logger';

interface Props {
  childId: string;
  /** ISO date (yyyy-mm-dd) used as the anchor day (= visit date). */
  anchorDate: string;
}

/**
 * Lifestyle summary anchored on the visit date.
 *   - KPI strip aggregates the CURRENTLY-VISIBLE calendar month
 *   - Calendar starts on the visit's month; ◀ ▶ navigates month-by-month
 *     over the child's full history
 *   - Clicking a day opens a detail modal
 */
export function LifestylePanel({ childId, anchorDate }: Props) {
  const anchorYm = anchorDate.slice(0, 7); // "YYYY-MM"
  const [ym, setYm] = useState(anchorYm);

  // Re-center on the visit date whenever the parent selects a different visit.
  useEffect(() => {
    setYm(anchorDate.slice(0, 7));
  }, [anchorDate]);

  const { startDate, endDate, days, label } = useMemo(() => buildMonthView(ym), [ym]);

  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DailyRoutine | null>(null);
  const [filter, setFilter] = useState<FilterKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rs = await fetchDailyRoutinesInRange(childId, startDate, endDate);
        if (cancelled) return;
        setRoutines(rs);
        const ids = rs.map((r) => r.id);
        const [ms, ex] = await Promise.all([
          fetchMealsForRoutines(ids),
          fetchExercisesForRoutines(ids),
        ]);
        if (cancelled) return;
        setMeals(ms);
        setExercises(ex);
      } catch (e) {
        logger.error('lifestyle load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, startDate, endDate]);

  const byDate = useMemo(() => {
    const m = new Map<string, DailyRoutine>();
    routines.forEach((r) => m.set(r.routine_date, r));
    return m;
  }, [routines]);

  const mealsByRoutine = useMemo(() => {
    const m = new Map<string, Meal[]>();
    meals.forEach((x) => {
      const arr = m.get(x.daily_routine_id) ?? [];
      arr.push(x);
      m.set(x.daily_routine_id, arr);
    });
    return m;
  }, [meals]);

  const exercisesByRoutine = useMemo(() => {
    const m = new Map<string, ExerciseLog[]>();
    exercises.forEach((x) => {
      const arr = m.get(x.daily_routine_id) ?? [];
      arr.push(x);
      m.set(x.daily_routine_id, arr);
    });
    return m;
  }, [exercises]);


  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="text-xs text-slate-400">불러오는 중…</div>
      ) : routines.length === 0 ? (
        <div className="text-xs text-slate-400">이 달에는 기록이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ' +
                (filter == null
                  ? 'border-slate-400 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')
              }
              title="모든 카테고리 표시"
            >
              전체
            </button>
            {filter != null && (
              <span className="text-[10px] text-slate-500">
                · 클릭한 카테고리만 캘린더에 표시됩니다
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {(
            [
              { key: 'sleep', label: '수면', ...evalSleep(routines) },
              { key: 'mood', label: '기분', ...evalMood(routines) },
              { key: 'injection', label: '성장주사', ...evalInjection(routines) },
              { key: 'meal', label: '식사', ...evalMeals(meals) },
              { key: 'exercise', label: '운동', ...evalExercise(routines, exercises) },
            ] as Array<{
              key: FilterKey;
              label: string;
              grade: Grade;
              detail: string;
            }>
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(filter === c.key ? null : c.key)}
              className={
                'flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition ' +
                (filter === c.key
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300')
              }
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {c.label}
                </span>
                <GradeBadge grade={c.grade} />
              </div>
              <span className="text-[11px] text-slate-500">{c.detail}</span>
            </button>
          ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setYm(shiftMonth(ym, -1))}
            title="이전 달"
            aria-label="이전 달"
            className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ◀
          </button>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="flex items-center gap-1">
            {ym !== anchorYm && (
              <button
                type="button"
                onClick={() => setYm(anchorYm)}
                className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
                title="진료일이 있는 달로 돌아가기"
              >
                진료월
              </button>
            )}
            <button
              type="button"
              onClick={() => setYm(shiftMonth(ym, +1))}
              title="다음 달"
              aria-label="다음 달"
              className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              ▶
            </button>
          </div>
        </div>

        <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {days.map((d) => {
            const iso = fmtDate(d);
            const r = byDate.get(iso);
            const isAnchor = iso === anchorDate;
            return (
              <button
                key={iso}
                type="button"
                disabled={!r}
                onClick={() => r && setSelected(r)}
                className={
                  'relative flex h-14 flex-col items-center justify-between rounded-md border px-1 py-1 text-[11px] transition ' +
                  (r
                    ? 'cursor-pointer border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    : 'cursor-default border-dashed border-slate-100 bg-slate-50/50 text-slate-300') +
                  (isAnchor ? ' ring-2 ring-indigo-500 ring-offset-1' : '')
                }
                title={r ? `${iso} — 상세 보기` : iso}
              >
                <span className="self-start font-medium">{d.getDate()}</span>
                {r && (
                  <div className="flex items-center gap-0.5">
                    {(filter == null || filter === 'sleep') && r.sleep_quality && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${sleepColors[r.sleep_quality] ?? 'bg-slate-300'}`}
                        title={`수면 · ${r.sleep_quality}`}
                      />
                    )}
                    {(filter == null || filter === 'mood') && r.mood && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-amber-400"
                        title={`기분 · ${moodLabel[r.mood] ?? r.mood}`}
                      />
                    )}
                    {(filter == null || filter === 'injection') && r.growth_injection && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="성장주사" />
                    )}
                    {(filter == null || filter === 'meal') &&
                      (mealsByRoutine.get(r.id)?.length ?? 0) > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" title="식사 기록" />
                      )}
                    {(filter == null || filter === 'exercise') &&
                      (exercisesByRoutine.get(r.id)?.length ?? 0) > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="운동" />
                      )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          <FilterChip active={filter == null} onClick={() => setFilter(null)}>
            전체
          </FilterChip>
          <FilterChip active={filter === 'sleep'} onClick={() => setFilter(filter === 'sleep' ? null : 'sleep')}>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
              수면
            </span>
          </FilterChip>
          <FilterChip active={filter === 'mood'} onClick={() => setFilter(filter === 'mood' ? null : 'mood')}>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> 기분
          </FilterChip>
          <FilterChip
            active={filter === 'injection'}
            onClick={() => setFilter(filter === 'injection' ? null : 'injection')}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> 성장주사
          </FilterChip>
          <FilterChip active={filter === 'meal'} onClick={() => setFilter(filter === 'meal' ? null : 'meal')}>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> 식사
          </FilterChip>
          <FilterChip
            active={filter === 'exercise'}
            onClick={() => setFilter(filter === 'exercise' ? null : 'exercise')}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 운동
          </FilterChip>
          <span className="ml-auto">진료일 = 파랑 테두리</span>
        </div>
      </div>

      {selected && (
        <DayDetailModal
          routine={selected}
          meals={mealsByRoutine.get(selected.id) ?? []}
          exercises={exercisesByRoutine.get(selected.id) ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// =========================== filters & grading ===========================

type FilterKey = 'sleep' | 'mood' | 'injection' | 'meal' | 'exercise';
type Grade = 'good' | 'ok' | 'bad';

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition ' +
        (active
          ? 'border-slate-400 bg-slate-100 text-slate-800'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')
      }
    >
      {children}
    </button>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  const cfg =
    grade === 'good'
      ? { label: '잘했어요', cls: 'bg-emerald-100 text-emerald-700' }
      : grade === 'ok'
        ? { label: '보통', cls: 'bg-amber-100 text-amber-700' }
        : { label: '부족', cls: 'bg-rose-100 text-rose-700' };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function pctGrade(pct: number, goodCut = 70, okCut = 40): Grade {
  if (pct >= goodCut) return 'good';
  if (pct >= okCut) return 'ok';
  return 'bad';
}

function evalSleep(rs: DailyRoutine[]): { grade: Grade; detail: string } {
  const rated = rs.filter((r) => r.sleep_quality);
  if (rated.length === 0) return { grade: 'ok', detail: '기록 없음' };
  const good = rated.filter((r) => r.sleep_quality === 'good').length;
  const bad = rated.filter((r) => r.sleep_quality === 'bad').length;
  const pct = Math.round((good / rated.length) * 100);
  return { grade: pctGrade(pct), detail: `good ${good} · bad ${bad} (${pct}%)` };
}

function evalMood(rs: DailyRoutine[]): { grade: Grade; detail: string } {
  const rated = rs.filter((r) => r.mood);
  if (rated.length === 0) return { grade: 'ok', detail: '기록 없음' };
  const positive = rated.filter((r) => r.mood === 'happy' || r.mood === 'normal').length;
  const pct = Math.round((positive / rated.length) * 100);
  return { grade: pctGrade(pct), detail: `긍정 ${positive}/${rated.length} (${pct}%)` };
}

function evalInjection(rs: DailyRoutine[]): { grade: Grade; detail: string } {
  if (rs.length === 0) return { grade: 'ok', detail: '기록 없음' };
  const done = rs.filter((r) => r.growth_injection).length;
  const pct = Math.round((done / rs.length) * 100);
  // Growth hormone is typically daily when prescribed; grade strictly.
  return { grade: pctGrade(pct, 80, 50), detail: `${done}/${rs.length}일 (${pct}%)` };
}

function evalMeals(meals: Meal[]): { grade: Grade; detail: string } {
  if (meals.length === 0) return { grade: 'ok', detail: '기록 없음' };
  const good = meals.filter((m) => m.is_healthy === true).length;
  const bad = meals.filter((m) => m.is_healthy === false).length;
  const pct = Math.round((good / meals.length) * 100);
  return { grade: pctGrade(pct), detail: `good ${good} · bad ${bad} (${pct}%)` };
}

function evalExercise(
  rs: DailyRoutine[],
  exs: ExerciseLog[],
): { grade: Grade; detail: string } {
  if (rs.length === 0) return { grade: 'ok', detail: '기록 없음' };
  const routineWithEx = new Set(exs.map((e) => e.daily_routine_id));
  const days = routineWithEx.size;
  const pct = Math.round((days / rs.length) * 100);
  return { grade: pctGrade(pct, 60, 30), detail: `${days}/${rs.length}일 (${pct}%)` };
}

// =========================== helpers ===========================

function buildMonthView(ym: string) {
  const [yStr, mStr] = ym.split('-');
  const year = Number(yStr);
  const month = Number(mStr); // 1..12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const label = `${year}년 ${month}월`;
  return {
    startDate: fmtDate(start),
    endDate: fmtDate(end),
    days: out,
    label,
  };
}

function shiftMonth(ym: string, delta: number): string {
  const [yStr, mStr] = ym.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function DayDetailModal({
  routine,
  meals,
  exercises,
  onClose,
}: {
  routine: DailyRoutine;
  meals: Meal[];
  exercises: ExerciseLog[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{routine.routine_date}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-5 py-4 text-sm">
          <DetailRow label="키 / 몸무게">
            {routine.daily_height ? `${routine.daily_height}cm` : '—'}
            {routine.daily_weight ? ` / ${routine.daily_weight}kg` : ''}
          </DetailRow>
          <DetailRow label="수면">
            {routine.sleep_time && routine.wake_time
              ? `${routine.sleep_time} → ${routine.wake_time}`
              : '—'}
            {routine.sleep_quality ? ` · ${routine.sleep_quality}` : ''}
          </DetailRow>
          <DetailRow label="수분">
            {routine.water_intake_ml ? `${routine.water_intake_ml} ml` : '—'}
          </DetailRow>
          <DetailRow label="영양제">
            <div className="flex flex-wrap gap-1">
              {(routine.basic_supplements ?? []).map((s) => (
                <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                  {s}
                </span>
              ))}
              {(routine.extra_supplements ?? []).map((s) => (
                <span
                  key={s}
                  className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700"
                >
                  {s}
                </span>
              ))}
              {(routine.basic_supplements?.length ?? 0) +
                (routine.extra_supplements?.length ?? 0) ===
                0 && <span className="text-slate-400">—</span>}
            </div>
          </DetailRow>
          <DetailRow label="성장주사">
            {routine.growth_injection ? (
              <span className="text-indigo-700">✓ {routine.injection_time ?? ''}</span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="기분">{routine.mood ?? '—'}</DetailRow>
          {routine.daily_notes && (
            <DetailRow label="메모">
              <span className="whitespace-pre-wrap text-slate-700">{routine.daily_notes}</span>
            </DetailRow>
          )}
          {meals.length > 0 && (
            <DetailRow label="식사">
              <div className="flex flex-col gap-1">
                {meals.map((m) => {
                  const rating = healthRating(m.is_healthy);
                  return (
                    <div key={m.id} className="flex items-baseline gap-2 rounded bg-slate-50 px-2 py-1 text-[12px]">
                      <span className="font-semibold">{mealTypeLabel(m.meal_type)}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: rating.bg, color: rating.fg }}
                      >
                        {rating.label}
                      </span>
                      {m.meal_time && <span className="text-slate-500">{m.meal_time}</span>}
                      {m.description && <span className="text-slate-700">· {m.description}</span>}
                    </div>
                  );
                })}
              </div>
            </DetailRow>
          )}
          {exercises.length > 0 && (
            <DetailRow label="운동">
              <div className="flex flex-col gap-1">
                {exercises.map((e) => {
                  const [cat, rest] = splitExerciseName(e.exercise_name);
                  return (
                    <div key={e.id} className="flex items-baseline gap-2 rounded bg-emerald-50/60 px-2 py-1 text-[12px]">
                      <span
                        className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: categoryColor(cat) }}
                      >
                        {cat}
                      </span>
                      <span className="text-slate-800">{rest}</span>
                      {e.duration_minutes != null && (
                        <span className="ml-auto text-slate-500">{e.duration_minutes}분</span>
                      )}
                      {!e.completed && <span className="text-red-500">미완료</span>}
                    </div>
                  );
                })}
              </div>
            </DetailRow>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-start gap-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="min-w-0 text-slate-800">{children}</div>
    </div>
  );
}

const sleepColors: Record<string, string> = {
  good: 'bg-sky-500',
  normal: 'bg-sky-300',
  bad: 'bg-rose-300',
};

const moodLabel: Record<string, string> = {
  happy: '좋음',
  normal: '보통',
  sad: '슬픔',
  tired: '피곤',
  sick: '아픔',
};

function healthRating(isHealthy: boolean | null | undefined): {
  label: string;
  bg: string;
  fg: string;
} {
  if (isHealthy === true) return { label: 'GOOD', bg: '#d1fae5', fg: '#047857' };
  if (isHealthy === false) return { label: 'BAD', bg: '#fee2e2', fg: '#b91c1c' };
  return { label: 'MODERATE', bg: '#fef3c7', fg: '#92400e' };
}

function splitExerciseName(name: string): [string, string] {
  // Expected format "카테고리 · 이름" (also tolerant of "카테고리 - 이름")
  const parts = name.split(/\s*[·\-]\s*/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' · ')];
  return ['운동', name];
}

const CATEGORY_COLORS: Record<string, string> = {
  '성장 스트레칭': '#8b5cf6',
  '점프': '#f97316',
  '유산소': '#06b6d4',
  '근력': '#ef4444',
  '구기': '#10b981',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#64748b';
}

function mealTypeLabel(t: string) {
  if (t === 'breakfast') return '아침';
  if (t === 'lunch') return '점심';
  if (t === 'dinner') return '저녁';
  if (t === 'snack') return '간식';
  return t;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

