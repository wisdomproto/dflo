// 데이터 충분성 판정 (순수). 사용자가 목표를 건 지표만 평가한다.
import { GATE, type AdvisorStats, type WeeklyGoals } from './types.js';

export interface GateSignal {
  requested: boolean;
  ok: boolean;
  have: number;
  need: number;
  reason?: string;
}

export interface GateResult {
  global: { ok: boolean; reason?: string };
  calcCompletions: GateSignal;
  lineLeads: GateSignal;
  viewerPool: GateSignal;
  anyReady: boolean;
}

function metricGate(requested: boolean, have: number, need: number, label: string): GateSignal {
  if (!requested) return { requested: false, ok: true, have, need };
  const ok = have >= need;
  return {
    requested: true, ok, have, need,
    reason: ok ? undefined : `${label} 데이터 부족 — ${need - have}건 더 필요 (현재 ${have}/${need})`,
  };
}

export function evaluateGate(stats: AdvisorStats, goals: WeeklyGoals): GateResult {
  const globalOk =
    stats.campaignsWithSpend >= 1 && stats.maxCampaignRuntimeDays >= GATE.minGlobalRuntimeDays;
  const global = {
    ok: globalOk,
    reason: globalOk ? undefined : '아직 광고 성과 데이터 없음 — 먼저 캠페인을 가동해 7일 이상 데이터를 모으세요.',
  };

  const calcCompletions = metricGate(
    goals.calcCompletions != null, stats.calcCompletions, GATE.minConversions, '계산기 완료',
  );
  const lineLeads = metricGate(
    goals.lineLeads != null, stats.lineLeads, GATE.minConversions, 'LINE 리드',
  );
  const viewerPool = metricGate(
    goals.viewerPoolGrowth != null, stats.videoViewDays, GATE.minVideoDays, '동영상 조회',
  );

  const requestedSignals = [calcCompletions, lineLeads, viewerPool].filter((s) => s.requested);
  const anyReady = globalOk && requestedSignals.some((s) => s.ok);

  return { global, calcCompletions, lineLeads, viewerPool, anyReady };
}
