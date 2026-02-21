// ================================================
// CalendarView - 캘린더 뷰 (루틴 기록 달력)
// 각 날짜에 카테고리별 컬러 도트 표시
// ================================================

import Card from '@/shared/components/Card';
import { toDateString, getDaysInMonth, isSameDay } from '@/shared/utils/date';
import type { DailyRoutine } from '@/shared/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
  </svg>
);

/** 카테고리 도트 설정 (공용) */
export const ROUTINE_CATEGORIES = [
  { key: 'hasMeal', label: '식사', color: 'bg-orange-400' },
  { key: 'hasExercise', label: '운동', color: 'bg-green-400' },
  { key: 'hasWater', label: '수분', color: 'bg-blue-400' },
  { key: 'hasSupplement', label: '영양제', color: 'bg-yellow-400' },
  { key: 'hasInjection', label: '주사', color: 'bg-red-400' },
  { key: 'hasSleep', label: '수면', color: 'bg-purple-400' },
] as const;

export interface DayFlags {
  hasMeal: boolean;
  hasExercise: boolean;
  hasWater: boolean;
  hasSupplement: boolean;
  hasInjection: boolean;
  hasSleep: boolean;
}

/** DailyRoutine → DayFlags (식사/운동은 외부에서 별도 주입) */
export function routineToFlags(
  r: DailyRoutine,
  mealRoutineIds?: Set<string>,
  exerciseRoutineIds?: Set<string>,
): DayFlags {
  return {
    hasMeal: mealRoutineIds ? mealRoutineIds.has(r.id) : false,
    hasExercise: exerciseRoutineIds ? exerciseRoutineIds.has(r.id) : false,
    hasWater: (r.water_intake_ml ?? 0) > 0,
    hasSupplement: ((r.basic_supplements as string[])?.length ?? 0) > 0 || ((r.extra_supplements as string[])?.length ?? 0) > 0,
    hasInjection: r.growth_injection === true,
    hasSleep: r.sleep_quality != null || r.sleep_time != null,
  };
}

interface Props {
  calYear: number;
  calMonth: number;
  date: Date;
  monthRoutines: DailyRoutine[];
  /** 날짜별 플래그 맵 (있으면 도트 표시, 없으면 단순 hasData 도트) */
  dayFlagsMap?: Map<string, DayFlags>;
  onShiftMonth: (delta: number) => void;
  onSelectDate: (d: Date) => void;
}

export function CalendarView({ calYear, calMonth, date, monthRoutines, dayFlagsMap, onShiftMonth, onSelectDate }: Props) {
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const today = new Date();
  const routineDates = new Set(monthRoutines.map((r) => r.routine_date));

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onShiftMonth(-1)} className="p-1 text-gray-400 active:text-gray-700"><Chevron dir="left" /></button>
        <span className="text-sm font-bold text-gray-800">{calYear}년 {calMonth}월</span>
        <button onClick={() => onShiftMonth(1)} className="p-1 text-gray-400 active:text-gray-700"><Chevron dir="right" /></button>
      </div>

      {/* 범례 */}
      {dayFlagsMap && (
        <div className="flex flex-wrap gap-2 mb-3">
          {ROUTINE_CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
              <span className="text-[10px] text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1
            ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dd = new Date(calYear, calMonth - 1, day);
          const dateStr = toDateString(dd);
          const hasData = routineDates.has(dateStr);
          const flags = dayFlagsMap?.get(dateStr);
          const isToday = isSameDay(dd, today);
          const isSel = isSameDay(dd, date);
          const dow = dd.getDay();
          return (
            <button key={day} onClick={() => onSelectDate(dd)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors
                ${isSel ? 'bg-primary text-white' : isToday ? 'bg-primary/10' : 'hover:bg-gray-50'}
                ${!isSel && dow === 0 ? 'text-red-400' : ''} ${!isSel && dow === 6 ? 'text-blue-400' : ''}`}>
              <span className={`font-medium ${isSel ? 'text-white' : ''}`}>{day}</span>
              {flags ? (
                <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                  {ROUTINE_CATEGORIES.map((c) => {
                    const active = flags[c.key as keyof DayFlags];
                    return active ? (
                      <span key={c.key} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/80' : c.color}`} />
                    ) : null;
                  })}
                </div>
              ) : (
                hasData && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-green-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
