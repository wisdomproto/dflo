// ================================================
// StatsCalendarHeatmap - 점수 기반 달력 히트맵
// ================================================

import Card from '@/shared/components/Card';
import { toDateString, getDaysInMonth, isSameDay } from '@/shared/utils/date';
import type { DayStats } from '@/features/routine/hooks/useMonthStats';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface Props {
  year: number;
  month: number;
  selectedDate: Date;
  days: DayStats[];
  onSelectDate: (d: Date) => void;
}

function cellBg(score: number | undefined): string {
  if (score == null) return '';
  if (score >= 80) return 'bg-success/25';
  if (score >= 50) return 'bg-primary/20';
  if (score > 0) return 'bg-warning/20';
  return '';
}

function cellTextColor(score: number | undefined, isSel: boolean): string {
  if (isSel) return 'text-white';
  if (score == null) return '';
  if (score >= 80) return 'text-success font-semibold';
  if (score >= 50) return 'text-primary font-semibold';
  if (score > 0) return 'text-warning font-semibold';
  return '';
}

export function StatsCalendarHeatmap({ year, month, selectedDate, days, onSelectDate }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const today = new Date();

  const dayMap = new Map<string, DayStats>();
  for (const d of days) dayMap.set(d.date, d);

  return (
    <Card>
      <h3 className="text-sm font-bold text-gray-800 mb-3">월간 기록 현황</h3>

      {/* 범례 */}
      <div className="flex gap-3 mb-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/25" />80+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20" />50~79</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" />&lt;50</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200" />미기록</span>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1
            ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dd = new Date(year, month - 1, day);
          const dateStr = toDateString(dd);
          const stat = dayMap.get(dateStr);
          const isToday = isSameDay(dd, today);
          const isSel = isSameDay(dd, selectedDate);
          const dow = dd.getDay();

          return (
            <button key={day} onClick={() => onSelectDate(dd)}
              className={`relative flex flex-col items-center justify-center py-2 rounded-lg text-xs transition-all
                ${isSel ? 'bg-primary text-white shadow-sm' : isToday && !stat ? 'ring-1 ring-primary/30' : cellBg(stat?.totalScore)}
                ${!isSel && dow === 0 ? 'text-red-400' : ''} ${!isSel && dow === 6 ? 'text-blue-400' : ''}`}>
              <span className={`font-medium ${cellTextColor(stat?.totalScore, isSel)}`}>{day}</span>
              {stat && !isSel && (
                <span className="text-[8px] text-gray-400 mt-0.5">{stat.totalScore}</span>
              )}
              {stat?.hasInjection && (
                <span className="absolute top-0.5 right-0.5 text-[8px]">💉</span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
