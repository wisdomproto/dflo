// ================================================
// MonthStatsView - 통계 탭 메인 컨테이너
// ================================================

import { useMonthStats } from '@/features/routine/hooks/useMonthStats';
import { StatsScoreCards } from '@/features/routine/components/StatsScoreCards';
import { StatsDailyChart } from '@/features/routine/components/StatsDailyChart';
import { StatsCalendarHeatmap } from '@/features/routine/components/StatsCalendarHeatmap';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

interface Props {
  childId: string | null;
  year: number;
  month: number;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

export function MonthStatsView({ childId, year, month, selectedDate, onSelectDate }: Props) {
  const { stats, loading } = useMonthStats(childId, year, month);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : !stats || stats.recordedDays === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          이번 달 기록이 없습니다
        </div>
      ) : (
        <>
          <StatsScoreCards
            averages={stats.averages}
            recordedDays={stats.recordedDays}
            totalDaysInMonth={stats.totalDaysInMonth}
            injectionDays={stats.injectionDays}
          />
          <StatsDailyChart days={stats.days} totalDaysInMonth={stats.totalDaysInMonth} averages={stats.averages} />
          <StatsCalendarHeatmap
            year={year} month={month} selectedDate={selectedDate}
            days={stats.days} onSelectDate={onSelectDate}
          />
        </>
      )}
    </div>
  );
}
