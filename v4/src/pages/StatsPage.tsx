// ================================================
// StatsPage - 187 성장케어 v4
// 생활 다이어리 월별 통계 (RoutinePage 입력 탭에서 분리)
// ================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import ChildSelector from '@/shared/components/ChildSelector';
import { useChildrenStore } from '@/stores/childrenStore';
import { MonthStatsView } from '@/features/routine/components/MonthStatsView';
import { toDateString } from '@/shared/utils/date';

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
  </svg>
);

export default function StatsPage() {
  const navigate = useNavigate();
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);

  const shiftMonth = (d: number) => {
    let m = calMonth + d;
    let y = calYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const goToToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth() + 1);
    setSelectedDate(now);
  };

  const isThisMonth = calYear === today.getFullYear() && calMonth === today.getMonth() + 1;

  return (
    <Layout title="생활 통계">
      <div className="flex items-center justify-between px-4 pt-2">
        <ChildSelector />
      </div>

      <div className="flex items-center justify-center gap-2 mt-3 px-4">
        <button onClick={() => shiftMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition-colors">
          <Chevron dir="left" />
        </button>
        <span className="text-sm font-bold text-gray-700">
          {calYear}년 {calMonth}월
        </span>
        <button onClick={() => shiftMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition-colors">
          <Chevron dir="right" />
        </button>
        {!isThisMonth && (
          <button onClick={goToToday} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold active:bg-primary/20">
            오늘
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {!selectedChildId ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-gray-400">자녀를 먼저 선택해주세요</p>
          </Card>
        ) : (
          <MonthStatsView
            childId={selectedChildId}
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            onSelectDate={(d: Date) => {
              setSelectedDate(d);
              navigate(`/app/routine?date=${toDateString(d)}`);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
