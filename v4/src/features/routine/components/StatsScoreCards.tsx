// ================================================
// StatsScoreCards - 월별 종합/카테고리별 점수 카드
// ================================================

import { useState } from 'react';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import type { MonthStats } from '@/features/routine/hooks/useMonthStats';

type CategoryKey = 'meal' | 'exercise' | 'water' | 'supplement' | 'sleep' | 'injection';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  weight: number; // 종합 점수 기여 비율 (%)
  rule: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'meal',
    label: '식사',
    emoji: '🍜',
    colorClass: 'text-meal',
    bgClass: 'bg-meal/15',
    weight: 20,
    rule:
      '아침/점심/저녁 각각 평가:\n· 👍 좋음 → 100점\n· 기록만 (평가 없음) → 50점\n· 👎 별로 → 30점\n· 안 먹음 → 0점\n세 끼니의 평균이 그 날의 식사 점수예요.',
  },
  {
    key: 'exercise',
    label: '운동',
    emoji: '🏃',
    colorClass: 'text-exercise',
    bgClass: 'bg-exercise/15',
    weight: 15,
    rule:
      '하루에 체크한 운동 개수 기준:\n· 4개 이상 → 100점\n· 3개 → 70점\n· 2개 → 50점\n· 1개 → 30점\n· 0개 → 0점',
  },
  {
    key: 'water',
    label: '수분',
    emoji: '💧',
    colorClass: 'text-water',
    bgClass: 'bg-water/15',
    weight: 15,
    rule:
      '하루 1L(1000ml) 마시면 만점이에요.\n· 1000ml 이상 → 100점\n· 500ml → 50점\n· 0ml → 0점\n수분 카드의 "잘 마셨어요" 배지와 같은 기준이에요.',
  },
  {
    key: 'supplement',
    label: '영양제',
    emoji: '💊',
    colorClass: 'text-supplement',
    bgClass: 'bg-supplement/15',
    weight: 15,
    rule:
      '영양제를 한 가지라도 복용했으면 100점, 없으면 0점이에요.\n복용한 영양제 종류 수와 무관해요.',
  },
  {
    key: 'sleep',
    label: '수면',
    emoji: '😴',
    colorClass: 'text-sleep',
    bgClass: 'bg-sleep/15',
    weight: 15,
    rule:
      '수면 시간 또는 컨디션을 기록하면 50점부터 시작해요.\n· "잘 잤다" 평가 → +50 (총 100점)\n· "별로" 평가 → +0 (50점)\n· 아무것도 기록 안 하면 0점',
  },
  {
    key: 'injection',
    label: '성장주사',
    emoji: '💉',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-100',
    weight: 20,
    rule:
      '성장주사를 매일 맞아야 하는 환자를 위한 항목이에요.\n· 투여 체크 → 100점\n· 미체크/안 맞음 → 0점\n해당 사항이 없으면 이 점수는 0으로 표시돼요. 다른 항목에 집중하면 됩니다.',
  },
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

function scoreCopy(score: number): string {
  if (score >= 80) return '아주 잘하고 있어요! 👏';
  if (score >= 60) return '잘하고 있어요. 조금만 더!';
  if (score >= 40) return '꾸준히 쌓아가요 💪';
  return '오늘부터 시작해 봐요 🌱';
}

interface Props {
  averages: MonthStats['averages'];
  recordedDays: number;
  totalDaysInMonth: number;
  injectionDays: number;
}

export function StatsScoreCards({ averages, recordedDays, totalDaysInMonth, injectionDays }: Props) {
  const total = averages.total;
  const [helpFor, setHelpFor] = useState<'total' | CategoryKey | null>(null);
  const recordRate = totalDaysInMonth > 0 ? Math.round((recordedDays / totalDaysInMonth) * 100) : 0;

  const helpDef = helpFor && helpFor !== 'total'
    ? CATEGORIES.find((c) => c.key === helpFor) ?? null
    : null;

  return (
    <>
      <div className="space-y-3">
        {/* 종합 점수 */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-gray-800">이번달 종합점수</span>
              <HelpButton onClick={() => setHelpFor('total')} label="종합 점수 설명" />
            </div>
            <span className="text-xs text-gray-400">
              {recordedDays}일 기록 / {totalDaysInMonth}일 ({recordRate}%)
            </span>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-black ${scoreColor(total)}`}>{total}</span>
            <span className="text-sm text-gray-400 mb-1">/ 100</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor(total)}`}
              style={{ width: `${total}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {scoreCopy(total)}
            <span className="text-gray-400"> · 기록한 {recordedDays}일 평균</span>
          </p>
          {injectionDays > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              💉 성장주사 {injectionDays}일 투여
            </p>
          )}
        </Card>

        {/* 카테고리별 점수 — 각 카드 우측 상단에 ? 버튼 */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const score = averages[cat.key];
            return (
              <div
                key={cat.key}
                className={`relative rounded-xl p-3 ${cat.bgClass} flex flex-col items-center gap-1`}
              >
                <button
                  onClick={() => setHelpFor(cat.key)}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/70 text-gray-500 text-[10px] font-bold flex items-center justify-center active:bg-white"
                  aria-label={`${cat.label} 점수 설명`}
                >
                  ?
                </button>
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-[11px] font-medium text-gray-600">{cat.label}</span>
                <span className={`text-xl font-black ${scoreColor(score)}`}>{score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 종합 점수 설명 모달 */}
      <Modal isOpen={helpFor === 'total'} onClose={() => setHelpFor(null)} title="점수는 어떻게 계산되나요?">
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <span className="font-semibold">기록한 날의 평균</span>으로 계산해요. 80점 이상이면 충분히 잘하고 있다는 뜻이에요.
          </p>
          <ul className="space-y-2 text-[13px] leading-relaxed">
            {CATEGORIES.map((cat) => (
              <li key={cat.key}>
                <span className={`font-semibold ${cat.colorClass}`}>
                  {cat.emoji} {cat.label} ({cat.weight}%)
                </span>
                <span className="text-gray-500 whitespace-pre-line"> — {cat.rule.split('\n')[0]}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 leading-relaxed">
            매일 모든 항목을 다 채울 필요는 없어요. 기록 자체가 가장 중요해요.
          </p>
        </div>
      </Modal>

      {/* 카테고리별 점수 설명 모달 */}
      <Modal isOpen={!!helpDef} onClose={() => setHelpFor(null)} title={helpDef ? `${helpDef.emoji} ${helpDef.label} 점수` : ''}>
        {helpDef && (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="text-xs text-gray-500">
              종합 점수에 <span className={`font-bold ${helpDef.colorClass}`}>{helpDef.weight}%</span> 비중으로 반영돼요.
            </p>
            <div className="rounded-lg bg-gray-50 px-4 py-3 whitespace-pre-line text-[13px] leading-relaxed text-gray-700">
              {helpDef.rule}
            </div>
            <p className="text-xs text-gray-400">
              하루 점수의 한 달 평균이 위 카드에 표시돼요.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center active:bg-gray-300"
      aria-label={label}
    >
      ?
    </button>
  );
}
