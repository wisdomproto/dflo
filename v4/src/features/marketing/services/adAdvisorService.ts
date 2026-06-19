const AI = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

export interface WeeklyGoals {
  calcCompletions?: number; lineLeads?: number; viewerPoolGrowth?: number;
}
export interface GateSignal { requested: boolean; ok: boolean; have: number; need: number; reason?: string; }
export interface AdvisorResponse {
  ready: boolean;
  gate: {
    global: { ok: boolean; reason?: string };
    calcCompletions: GateSignal; lineLeads: GateSignal; viewerPool: GateSignal; anyReady: boolean;
  };
  budget?: {
    phase: 'initial' | 'mid' | 'mature';
    tracks: Array<{ track: string; weeklyWon: number; dailyWon: number; basis: string; goalCount?: number; cpa?: number }>;
    totalWeeklyWon: number; totalDailyWon: number; warnings: string[]; estimatedRevenueWon: number | null;
  };
  creatives?: {
    running: Array<{ reelId: number; title: string; verdict: string; reason: string }>;
    candidates: Array<{ reelId: number; title: string; source: string; needsThaiReel: boolean; reason: string }>;
  };
  stories?: Array<{ reelId: number; title: string; story: string }>;
}

export async function fetchAdvice(goals: WeeklyGoals, accountExternalId?: string): Promise<AdvisorResponse> {
  const r = await fetch(`${AI}/api/marketing/advisor/recommend`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goals, accountExternalId }),
  });
  if (!r.ok) throw new Error(`advisor ${r.status}`);
  return r.json();
}
