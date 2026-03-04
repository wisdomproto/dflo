// ================================================
// StatsDailyChart - 카테고리별 일별 Bar 차트
// ================================================

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Card from '@/shared/components/Card';
import type { DayStats } from '@/features/routine/hooks/useMonthStats';
import type { MonthStats } from '@/features/routine/hooks/useMonthStats';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

type ScoreKey = 'mealScore' | 'exerciseScore' | 'waterScore';

const CATEGORIES: { key: ScoreKey; label: string; emoji: string; color: string; unit: string }[] = [
  { key: 'mealScore', label: '식사', emoji: '\uD83C\uDF5C', color: '#48bb78', unit: '점' },
  { key: 'exerciseScore', label: '운동', emoji: '\uD83C\uDFC3', color: '#ed8936', unit: '점' },
  { key: 'waterScore', label: '수분', emoji: '\uD83D\uDCA7', color: '#4299e1', unit: '점' },
];

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-primary';
  return 'text-warning';
}

function buildChart(days: DayStats[], totalDays: number, key: ScoreKey, color: string) {
  const dayMap = new Map(days.map((d) => [parseInt(d.date.split('-')[2], 10), d[key]]));

  const labels: string[] = [];
  const scores: (number | null)[] = [];
  const colors: string[] = [];

  for (let i = 1; i <= totalDays; i++) {
    labels.push(String(i));
    const score = dayMap.has(i) ? dayMap.get(i)! : null;
    scores.push(score);
    // 데이터 없는 날: 투명, 있는 날: 점수에 따라 투명도
    if (score == null) {
      colors.push('transparent');
    } else {
      const opacity = Math.max(0.3, score / 100);
      colors.push(color + Math.round(opacity * 255).toString(16).padStart(2, '0'));
    }
  }

  return {
    data: {
      labels,
      datasets: [{
        data: scores,
        backgroundColor: colors,
        borderRadius: 2,
        barPercentage: 0.75,
        categoryPercentage: 0.9,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: { label?: string }[]) => `${items[0]?.label ?? ''}일`,
            label: (item: { raw?: unknown }) =>
              item.raw != null ? `${Math.round(item.raw as number)}점` : '기록 없음',
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 8 },
            color: '#9ca3af',
            callback: function (_: unknown, index: number) {
              const day = index + 1;
              if (day === 1 || day % 5 === 0 || day === totalDays) return String(day);
              return '';
            },
          },
        },
        y: {
          display: false,
          min: 0,
          max: 100,
        },
      },
    } as const,
  };
}

interface Props {
  days: DayStats[];
  totalDaysInMonth: number;
  averages: MonthStats['averages'];
}

export function StatsDailyChart({ days, totalDaysInMonth, averages }: Props) {
  const charts = useMemo(
    () => CATEGORIES.map((cat) => ({
      ...cat,
      ...buildChart(days, totalDaysInMonth, cat.key, cat.color),
      avg: averages[cat.key.replace('Score', '') as keyof MonthStats['averages']],
    })),
    [days, totalDaysInMonth, averages],
  );

  return (
    <div className="space-y-2">
      {charts.map((chart) => (
        <Card key={chart.key}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-800">
              {chart.emoji} {chart.label}
            </h3>
            <span className={`text-lg font-black ${scoreColorClass(chart.avg)}`}>
              {chart.avg}<span className="text-xs font-normal text-gray-400 ml-0.5">점</span>
            </span>
          </div>
          <Bar data={chart.data} options={chart.options} />
        </Card>
      ))}
    </div>
  );
}
