// 예산 역산 + 단계 판정 + 수익성/가드레일 경고 (순수).
import {
  PHASE_RATIO, PROFIT, type AdvisorStats, type Phase, type Track, type WeeklyGoals,
} from './types.js';

export interface TrackBudget {
  track: Track;
  weeklyWon: number;
  dailyWon: number;
  basis: 'goal' | 'phase-suggested';
  goalCount?: number;
  cpa?: number;
}

export interface BudgetResult {
  phase: Phase;
  tracks: TrackBudget[];
  totalWeeklyWon: number;
  totalDailyWon: number;
  warnings: string[];
  estimatedRevenueWon: number | null;
}

export function detectPhase(s: AdvisorStats): Phase {
  if (s.retargetPoolSize >= 5000 && s.pixelMature) return 'mature';
  if (s.retargetPoolSize >= 1000 && s.pixelMature) return 'mid';
  return 'initial';
}

const GOAL_TRACK: Record<keyof WeeklyGoals, Track> = {
  calcCompletions: 'homepage',
  lineLeads: 'conversion',
  viewerPoolGrowth: 'engagement',
};

export function buildBudget(stats: AdvisorStats, goals: WeeklyGoals): BudgetResult {
  const phase = detectPhase(stats);
  const warnings: string[] = [];
  const tracks: TrackBudget[] = [];

  const cpaFor: Record<Track, number | null> = {
    homepage: stats.calcCpa,
    conversion: stats.lineCpa,
    engagement: stats.costPerViewer,
  };

  (Object.keys(GOAL_TRACK) as (keyof WeeklyGoals)[]).forEach((k) => {
    const count = goals[k];
    if (count == null) return;
    const track = GOAL_TRACK[k];
    const cpa = cpaFor[track];
    if (cpa == null) return;
    const weeklyWon = Math.round(count * cpa);
    tracks.push({ track, weeklyWon, dailyWon: Math.round(weeklyWon / 7), basis: 'goal', goalCount: count, cpa });

    if (PHASE_RATIO[phase][track] === 0) {
      warnings.push(
        `현재 단계(${phaseLabel(phase)})에선 ${trackLabel(track)} 목표가 비현실적입니다 — 리타게팅 풀이 작아 CPA가 비쌈. 목표를 낮추거나 먼저 풀을 키우세요.`,
      );
    }
  });

  if (goals.lineLeads != null && stats.lineCpa != null && stats.lineCpa > PROFIT.leadCostFloorWon) {
    warnings.push(
      `LINE 리드당 ${won(stats.lineCpa)} — 흑자선(${won(PROFIT.leadCostFloorWon)}~${won(PROFIT.leadCostCeilWon)}) 초과, 손익 위험.`,
    );
  }

  const totalWeeklyWon = tracks.reduce((s, t) => s + t.weeklyWon, 0);
  const estimatedRevenueWon =
    goals.lineLeads != null
      ? Math.round(goals.lineLeads * PROFIT.assumedConsultToTreatment * PROFIT.treatmentRevenueWon)
      : null;

  return {
    phase, tracks, totalWeeklyWon, totalDailyWon: Math.round(totalWeeklyWon / 7),
    warnings, estimatedRevenueWon,
  };
}

function won(n: number): string { return `₩${Math.round(n).toLocaleString('ko-KR')}`; }
function phaseLabel(p: Phase): string { return p === 'initial' ? '초기' : p === 'mid' ? '중기' : '성숙'; }
function trackLabel(t: Track): string {
  return t === 'engagement' ? '참여' : t === 'homepage' ? '홈페이지' : '전환(LINE)';
}
