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
        <div className="py-10 text-center space-y-3">
          <p className="text-3xl">📒</p>
          <p className="text-sm font-medium text-gray-700">이번 달 기록이 아직 없어요</p>
          <p className="text-xs text-gray-400">매일 짧게라도 기록하면 통계가 채워져요</p>
          <button
            onClick={() => onSelectDate(new Date())}
            className="inline-flex items-center gap-1 mt-1 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold active:opacity-90"
          >
            📝 다이어리 쓰러 가기
          </button>
        </div>
      ) : (
        <>
          <StatsScoreCards
            averages={stats.averages}
            recordedDays={stats.recordedDays}
            totalDaysInMonth={stats.totalDaysInMonth}
            injectionDays={stats.injectionDays}
          />
          <StatsDailyChart
            days={stats.days}
            totalDaysInMonth={stats.totalDaysInMonth}
            averages={stats.averages}
            year={year}
            month={month}
          />
          <StatsCalendarHeatmap
            year={year} month={month} selectedDate={selectedDate}
            days={stats.days} onSelectDate={onSelectDate}
          />
        </>
      )}
    </div>
  );
}
