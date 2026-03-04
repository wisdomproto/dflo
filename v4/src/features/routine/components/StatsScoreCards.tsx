// ================================================
// StatsScoreCards - 월별 종합/카테고리별 점수 카드
// ================================================

import Card from '@/shared/components/Card';
import type { MonthStats } from '@/features/routine/hooks/useMonthStats';

const CATEGORIES = [
  { key: 'meal' as const, label: '식사', emoji: '\uD83C\uDF5C', colorClass: 'text-meal', bgClass: 'bg-meal/15' },
  { key: 'exercise' as const, label: '운동', emoji: '\uD83C\uDFC3', colorClass: 'text-exercise', bgClass: 'bg-exercise/15' },
  { key: 'water' as const, label: '수분', emoji: '\uD83D\uDCA7', colorClass: 'text-water', bgClass: 'bg-water/15' },
  { key: 'supplement' as const, label: '영양제', emoji: '\uD83D\uDC8A', colorClass: 'text-supplement', bgClass: 'bg-supplement/15' },
  { key: 'sleep' as const, label: '수면', emoji: '\uD83D\uDE34', colorClass: 'text-sleep', bgClass: 'bg-sleep/15' },
];

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-primary';
  return 'text-warning';
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 50) return 'bg-primary';
  return 'bg-warning';
}

interface Props {
  averages: MonthStats['averages'];
  recordedDays: number;
  totalDaysInMonth: number;
  injectionDays: number;
}

export function StatsScoreCards({ averages, recordedDays, totalDaysInMonth, injectionDays }: Props) {
  const total = averages.total;

  return (
    <div className="space-y-3">
      {/* 종합 점수 */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-800">이번달 종합점수</span>
          <span className="text-xs text-gray-400">{recordedDays}일 기록 / {totalDaysInMonth}일</span>
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-black ${scoreColor(total)}`}>{total}</span>
          <span className="text-sm text-gray-400 mb-1">/ 100</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor(total)}`}
            style={{ width: `${total}%` }} />
        </div>
        {injectionDays > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            성장주사 {injectionDays}일 투여
          </p>
        )}
      </Card>

      {/* 카테고리별 점수 */}
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const score = averages[cat.key];
          return (
            <div key={cat.key}
              className={`rounded-xl p-3 ${cat.bgClass} flex flex-col items-center gap-1`}>
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-[11px] font-medium text-gray-600">{cat.label}</span>
              <span className={`text-xl font-black ${scoreColor(score)}`}>{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
