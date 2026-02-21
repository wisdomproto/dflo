// ================================================
// RoutineCalendar - 관리자 환자 상세 생활습관 캘린더
// 공용 CalendarView + adminService 데이터 사용
// ================================================

import { useEffect, useState, useCallback } from 'react';
import { fetchRoutineSummaries } from '@/features/admin/services/adminService';
import type { RoutineSummary } from '@/features/admin/services/adminService';
import { ROUTINE_CATEGORIES } from '@/features/routine/components/CalendarView';
import type { DayFlags } from '@/features/routine/components/CalendarView';

interface RoutineCalendarProps {
  childId: string;
}

export function RoutineCalendar({ childId }: RoutineCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<RoutineSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRoutineSummaries(childId, year, month);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [childId, year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  // 캘린더 그리드 계산
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dataMap = new Map(data.map((d) => [d.date, d]));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">생활습관 기록</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">{year}년 {month}월</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-3">
        {ROUTINE_CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
            <span className="text-xs text-gray-500">{c.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;

              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const summary = dataMap.get(dateStr);
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col items-center py-1.5 rounded-lg ${isToday ? 'bg-primary/10' : 'hover:bg-gray-50'}`}
                >
                  <span className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                    {ROUTINE_CATEGORIES.map((c) => {
                      const active = summary?.[c.key as keyof DayFlags] === true;
                      return (
                        <span
                          key={c.key}
                          className={`w-2 h-2 rounded-full ${active ? c.color : 'bg-gray-200'}`}
                          title={`${c.label}: ${active ? '기록됨' : '없음'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
