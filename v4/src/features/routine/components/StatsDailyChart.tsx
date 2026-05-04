// ================================================
// StatsDailyChart - 카테고리별 일별/주별 Bar 차트
// ================================================

import { useMemo, useState } from 'react';
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

type ScoreKey =
  | 'mealScore'
  | 'exerciseScore'
  | 'waterScore'
  | 'supplementScore'
  | 'sleepScore'
  | 'injectionScore';

const CATEGORIES: {
  key: ScoreKey;
  avgKey: keyof MonthStats['averages'];
  label: string;
  emoji: string;
  color: string;
}[] = [
  { key: 'mealScore', avgKey: 'meal', label: '식사', emoji: '🍜', color: '#48bb78' },
  { key: 'exerciseScore', avgKey: 'exercise', label: '운동', emoji: '🏃', color: '#ed8936' },
  { key: 'waterScore', avgKey: 'water', label: '수분', emoji: '💧', color: '#4299e1' },
  { key: 'supplementScore', avgKey: 'supplement', label: '영양제', emoji: '💊', color: '#f56565' },
  { key: 'sleepScore', avgKey: 'sleep', label: '수면', emoji: '😴', color: '#9f7aea' },
  { key: 'injectionScore', avgKey: 'injection', label: '성장주사', emoji: '💉', color: '#e11d48' },
];

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-primary';
  return 'text-warning';
}

function withAlpha(hex: string, opacity: number): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, '0');
}

// ── 일별 ──

function buildDailyChart(days: DayStats[], totalDays: number, key: ScoreKey, color: string) {
  const dayMap = new Map(days.map((d) => [parseInt(d.date.split('-')[2], 10), d[key]]));

  const labels: string[] = [];
  const scores: (number | null)[] = [];
  const colors: string[] = [];

  for (let i = 1; i <= totalDays; i++) {
    labels.push(String(i));
    const score = dayMap.has(i) ? dayMap.get(i)! : null;
    scores.push(score);
    if (score == null) colors.push('transparent');
    else colors.push(withAlpha(color, Math.max(0.35, score / 100)));
  }

  return {
    data: {
      labels,
      datasets: [
        {
          data: scores,
          backgroundColor: colors,
          borderRadius: 2,
          barPercentage: 0.85,
          categoryPercentage: 0.95,
        },
      ],
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
            font: { size: 10 },
            color: '#9ca3af',
            callback: function (_: unknown, index: number) {
              const day = index + 1;
              if (day === 1 || day % 7 === 0 || day === totalDays) return String(day);
              return '';
            },
          },
        },
        y: { display: false, min: 0, max: 100 },
      },
    } as const,
  };
}

// ── 주별 ──

interface WeekBucket {
  label: string;
  scores: number[]; // 기록된 날짜의 점수만
  hasData: boolean;
}

function buildWeeklyBuckets(days: DayStats[], totalDays: number, key: ScoreKey, year: number, month: number): WeekBucket[] {
  // 1~7, 8~14, 15~21, 22~28, 29~end
  const ranges: [number, number][] = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28],
    [29, totalDays],
  ].filter(([s]) => s <= totalDays) as [number, number][];

  const dayMap = new Map(days.map((d) => [parseInt(d.date.split('-')[2], 10), d[key]]));
  return ranges.map(([s, e]) => {
    const scores: number[] = [];
    for (let i = s; i <= e; i++) {
      if (dayMap.has(i)) scores.push(dayMap.get(i)!);
    }
    return {
      label: `${month}/${s}~${e}`,
      scores,
      hasData: scores.length > 0,
    };
  });
}

function buildWeeklyChart(buckets: WeekBucket[], color: string) {
  const labels = buckets.map((b) => b.label);
  const scores = buckets.map((b) => (b.hasData ? Math.round(b.scores.reduce((a, x) => a + x, 0) / b.scores.length) : null));
  const colors = scores.map((s) => (s == null ? 'transparent' : withAlpha(color, Math.max(0.4, s / 100))));

  return {
    data: {
      labels,
      datasets: [
        {
          data: scores,
          backgroundColor: colors,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.85,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: { label?: string }[]) => items[0]?.label ?? '',
            label: (item: { raw?: unknown }) =>
              item.raw != null ? `평균 ${Math.round(item.raw as number)}점` : '기록 없음',
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#6b7280' },
        },
        y: { display: false, min: 0, max: 100 },
      },
    } as const,
  };
}

// ── 메인 ──

interface Props {
  days: DayStats[];
  totalDaysInMonth: number;
  averages: MonthStats['averages'];
  year?: number;
  month?: number;
}

export function StatsDailyChart({ days, totalDaysInMonth, averages, year, month }: Props) {
  const [view, setView] = useState<'daily' | 'weekly'>('weekly');

  const charts = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const dailyBuilt = buildDailyChart(days, totalDaysInMonth, cat.key, cat.color);
      const weeklyBuckets = buildWeeklyBuckets(days, totalDaysInMonth, cat.key, year ?? 0, month ?? 0);
      const weeklyBuilt = buildWeeklyChart(weeklyBuckets, cat.color);
      return {
        ...cat,
        avg: averages[cat.avgKey],
        daily: dailyBuilt,
        weekly: weeklyBuilt,
      };
    });
  }, [days, totalDaysInMonth, averages, year, month]);

  return (
    <div className="space-y-2">
      {/* 일별 / 주별 토글 */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-[11px] font-semibold">
          <button
            onClick={() => setView('weekly')}
            className={`px-3 py-1 rounded-full transition-colors ${
              view === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            주별
          </button>
          <button
            onClick={() => setView('daily')}
            className={`px-3 py-1 rounded-full transition-colors ${
              view === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            일별
          </button>
        </div>
      </div>

      {charts.map((chart) => {
        const cur = view === 'weekly' ? chart.weekly : chart.daily;
        return (
          <Card key={chart.key}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-800">
                {chart.emoji} {chart.label}
              </h3>
              <span className={`text-lg font-black ${scoreColorClass(chart.avg)}`}>
                {chart.avg}
                <span className="text-xs font-normal text-gray-400 ml-0.5">점</span>
              </span>
            </div>
            <Bar data={cur.data} options={cur.options} />
          </Card>
        );
      })}
    </div>
  );
}
