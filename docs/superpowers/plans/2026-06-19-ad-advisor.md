# 광고 어드바이저 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주간 목표를 넣으면 실측 데이터 기반으로 예산을 역산하고, 소재 유지/교체/신규 후보를 추천하며, 신규 광고 소재의 훅 스토리(태국어+한국어)를 생성하는 온디맨드 광고 어드바이저(`/marketing/advisor`)를 구현한다.

**Architecture:** 숫자(게이트·CPA·예산·소재 스코어)는 ai-server `src/services/advisor/`의 순수 함수로 결정론적 계산(단위 테스트), AI는 신규 훅 스토리 생성에만. v4는 목표 폼 + 결과 4섹션 페이지. 데이터 부족 시 작동을 막고 무엇을 모아야 하는지 안내. 저장 없음(온디맨드), migration 없음.

**Tech Stack:** ai-server (Express, ESM TypeScript, `node:test`), Gemini(`generateText`), 기존 서비스(`metaAds`/`ga4SiteBreakdown`/`metaFeed`) 재사용, v4 (React 19 + TS + Tailwind, Zustand 불필요·로컬 state).

스펙: `docs/superpowers/specs/2026-06-19-ad-advisor-design.md`

---

## File Structure

ai-server:
- `src/services/advisor/types.ts` — 공유 타입 (Track/Phase/Goals/Stats/결과)
- `src/services/advisor/advisorGate.ts` — 데이터 충분성 판정 (순수)
- `src/services/advisor/advisorBudget.ts` — 예산 역산·단계·수익성 (순수)
- `src/services/advisor/advisorCreative.ts` — 소재 스코어링·신규 후보 (순수)
- `src/services/advisor/advisorStory.ts` — 훅 스토리 프롬프트 빌더 (순수)
- `src/services/advisor/advisorData.ts` — 데이터 수집·정규화 (I/O)
- `src/services/advisor/__tests__/*.test.ts` — 순수 모듈 테스트
- `src/routes/marketing.ts` — `POST /advisor/recommend` 핸들러 추가 (Modify)

v4:
- `src/features/marketing/services/adAdvisorService.ts` — API 호출 + 타입
- `src/features/marketing/components/AdAdvisorPage.tsx` — 페이지
- `src/app/router.tsx` — lazy route 등록 (Modify)
- 마케팅 사이드바 컴포넌트 — 메뉴 항목 추가 (Modify, 탐색해서 확정)

---

## Task 1: 공유 타입 + 상수

**Files:**
- Create: `ai-server/src/services/advisor/types.ts`

- [ ] **Step 1: 타입·상수 작성**

```typescript
// ai-server/src/services/advisor/types.ts
// 광고 어드바이저 공유 타입 + 캘리브레이션 상수. 순수(런타임 의존성 없음).

export type Track = 'engagement' | 'homepage' | 'conversion';
export type Phase = 'initial' | 'mid' | 'mature';

/** 사용자가 넣는 주간 목표 (지표별, 미설정은 undefined) */
export interface WeeklyGoals {
  calcCompletions?: number; // 홈페이지 트랙
  lineLeads?: number;       // 전환 트랙
  viewerPoolGrowth?: number;// 참여 트랙
}

/** 직전 윈도우 실측 데이터 (advisorData가 채움) */
export interface AdvisorStats {
  windowDays: number;
  campaignsWithSpend: number;
  maxCampaignRuntimeDays: number;
  videoViewDays: number;
  // 광고 기여(approx) 전환 수
  calcCompletions: number;
  lineLeads: number;
  // 실측 단가 (분모 0이면 null)
  calcCpa: number | null;
  lineCpa: number | null;
  costPerViewer: number | null;
  // 단계 판정 입력
  retargetPoolSize: number;
  pixelMature: boolean;
  // 소재 평가/후보용
  runningCreatives: RunningCreative[];
  organicReels: OrganicReel[];
  topicLibrary: TopicAsset[];
}

export interface RunningCreative {
  reelId: number;
  title: string;
  track: Track;
  impressions: number;
  runtimeDays: number;
  frequency: number;
  ctr: number;            // %
  costPer3sView: number | null; // engagement track
  costPerCompletion: number | null; // homepage track
}

export interface OrganicReel {
  reelId: number;
  title: string;
  advertised: boolean;
  organicReach: number;
  organicEngagementRate: number; // %
}

export interface TopicAsset {
  reelId: number;       // = sort_order 1..62
  title: string;
  advertised: boolean;
  hasThaiReel: boolean;
  painPoints: string[]; // 매칭용 태그
}

export const GATE = {
  windowDays: 14,
  minConversions: 30,
  minGlobalRuntimeDays: 7,
  minVideoDays: 7,
  minCreativeImpressions: 1000,
  minCreativeRuntimeDays: 3,
} as const;

export const PROFIT = {
  leadCostFloorWon: 200_000, // 흑자선 하한~상한
  leadCostCeilWon: 400_000,
  assumedConsultToTreatment: 0.2,
  treatmentRevenueWon: 10_000_000,
} as const;

export const CREATIVE = {
  fatigueFrequency: 3.5,
} as const;

/** 단계별 권장 트랙 비율 (engagement / homepage / conversion) */
export const PHASE_RATIO: Record<Phase, Record<Track, number>> = {
  initial: { engagement: 0.7, homepage: 0.3, conversion: 0 },
  mid:     { engagement: 0.5, homepage: 0.5, conversion: 0 },
  mature:  { engagement: 0.3, homepage: 0.3, conversion: 0.4 },
};
```

- [ ] **Step 2: 커밋**

```bash
git add ai-server/src/services/advisor/types.ts
git commit -m "feat(advisor): 공유 타입 + 캘리브레이션 상수"
```

---

## Task 2: 데이터 게이트 (advisorGate.ts)

**Files:**
- Create: `ai-server/src/services/advisor/advisorGate.ts`
- Test: `ai-server/src/services/advisor/__tests__/advisorGate.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// ai-server/src/services/advisor/__tests__/advisorGate.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGate } from '../advisorGate.js';
import type { AdvisorStats } from '../types.js';

function baseStats(over: Partial<AdvisorStats> = {}): AdvisorStats {
  return {
    windowDays: 14, campaignsWithSpend: 1, maxCampaignRuntimeDays: 10,
    videoViewDays: 10, calcCompletions: 40, lineLeads: 40,
    calcCpa: 5000, lineCpa: 250000, costPerViewer: 50,
    retargetPoolSize: 0, pixelMature: false,
    runningCreatives: [], organicReels: [], topicLibrary: [],
    ...over,
  };
}

test('global gate fails when no campaign spend', () => {
  const g = evaluateGate(baseStats({ campaignsWithSpend: 0 }), { calcCompletions: 50 });
  assert.equal(g.global.ok, false);
  assert.match(g.global.reason!, /광고 성과 데이터/);
});

test('global gate fails when runtime under 7 days', () => {
  const g = evaluateGate(baseStats({ maxCampaignRuntimeDays: 6 }), { calcCompletions: 50 });
  assert.equal(g.global.ok, false);
});

test('calc gate boundary: 29 fails, 30 passes', () => {
  const fail = evaluateGate(baseStats({ calcCompletions: 29 }), { calcCompletions: 50 });
  assert.equal(fail.calcCompletions.ok, false);
  assert.equal(fail.calcCompletions.have, 29);
  assert.equal(fail.calcCompletions.need, 30);
  const pass = evaluateGate(baseStats({ calcCompletions: 30 }), { calcCompletions: 50 });
  assert.equal(pass.calcCompletions.ok, true);
});

test('gate only evaluates metrics the user set a goal for', () => {
  const g = evaluateGate(baseStats({ lineLeads: 0 }), { calcCompletions: 50 });
  // lineLeads goal not set → signal ok=true (not requested), so it does not block
  assert.equal(g.lineLeads.requested, false);
  assert.equal(g.lineLeads.ok, true);
});

test('anyReady false when global fails even if metric data present', () => {
  const g = evaluateGate(baseStats({ campaignsWithSpend: 0 }), { calcCompletions: 50 });
  assert.equal(g.anyReady, false);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorGate.test.ts`
Expected: FAIL (`evaluateGate` not found)

- [ ] **Step 3: 구현**

```typescript
// ai-server/src/services/advisor/advisorGate.ts
// 데이터 충분성 판정 (순수). 사용자가 목표를 건 지표만 평가한다.
import { GATE, type AdvisorStats, type WeeklyGoals } from './types.js';

export interface GateSignal {
  requested: boolean; // 사용자가 이 지표에 목표를 걸었나
  ok: boolean;        // 데이터 충분(또는 미요청)
  have: number;
  need: number;
  reason?: string;
}

export interface GateResult {
  global: { ok: boolean; reason?: string };
  calcCompletions: GateSignal;
  lineLeads: GateSignal;
  viewerPool: GateSignal;
  anyReady: boolean; // global ok && 요청 지표 중 1개 이상 통과
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorGate.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/services/advisor/advisorGate.ts ai-server/src/services/advisor/__tests__/advisorGate.test.ts
git commit -m "feat(advisor): 데이터 게이트 판정 (지표별, 14일/30건)"
```

---

## Task 3: 예산 역산 (advisorBudget.ts)

**Files:**
- Create: `ai-server/src/services/advisor/advisorBudget.ts`
- Test: `ai-server/src/services/advisor/__tests__/advisorBudget.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// ai-server/src/services/advisor/__tests__/advisorBudget.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPhase, buildBudget } from '../advisorBudget.js';
import type { AdvisorStats } from '../types.js';

function stats(over: Partial<AdvisorStats> = {}): AdvisorStats {
  return {
    windowDays: 14, campaignsWithSpend: 1, maxCampaignRuntimeDays: 10,
    videoViewDays: 10, calcCompletions: 60, lineLeads: 40,
    calcCpa: 3000, lineCpa: 250000, costPerViewer: 50,
    retargetPoolSize: 0, pixelMature: false,
    runningCreatives: [], organicReels: [], topicLibrary: [],
    ...over,
  };
}

test('detectPhase: initial when pool small / pixel immature', () => {
  assert.equal(detectPhase(stats({ retargetPoolSize: 200, pixelMature: false })), 'initial');
});

test('detectPhase: mid when pool grown + pixel mature', () => {
  assert.equal(detectPhase(stats({ retargetPoolSize: 1500, pixelMature: true })), 'mid');
});

test('detectPhase: mature when pool large', () => {
  assert.equal(detectPhase(stats({ retargetPoolSize: 6000, pixelMature: true })), 'mature');
});

test('buildBudget: calc track = target × calcCpa, weekly→daily ÷7', () => {
  const b = buildBudget(stats(), { calcCompletions: 100 });
  const calc = b.tracks.find((t) => t.track === 'homepage')!;
  assert.equal(calc.weeklyWon, 300000); // 100 × 3000
  assert.equal(calc.dailyWon, Math.round(300000 / 7));
});

test('buildBudget: line lead cost over floor → profit warning', () => {
  const b = buildBudget(stats({ lineCpa: 500000 }), { lineLeads: 5 });
  assert.ok(b.warnings.some((w) => /손익/.test(w)));
});

test('buildBudget: goal misaligned with phase → guardrail warning', () => {
  // initial phase but user sets a LINE conversion goal (conversion ratio 0 in initial)
  const b = buildBudget(stats({ retargetPoolSize: 100 }), { lineLeads: 20 });
  assert.equal(b.phase, 'initial');
  assert.ok(b.warnings.some((w) => /단계|풀/.test(w)));
});

test('buildBudget: untracked goal metric is skipped (no CPA)', () => {
  const b = buildBudget(stats({ calcCpa: null }), { calcCompletions: 100 });
  const calc = b.tracks.find((t) => t.track === 'homepage');
  assert.equal(calc, undefined); // CPA 없으면 예산 산출 생략
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorBudget.test.ts`
Expected: FAIL (`detectPhase` not found)

- [ ] **Step 3: 구현**

```typescript
// ai-server/src/services/advisor/advisorBudget.ts
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
  estimatedRevenueWon: number | null; // LINE 목표 기반 추정
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
  const goalCountFor: Partial<Record<Track, number>> = {
    homepage: goals.calcCompletions,
    conversion: goals.lineLeads,
    engagement: goals.viewerPoolGrowth,
  };

  (Object.keys(GOAL_TRACK) as (keyof WeeklyGoals)[]).forEach((k) => {
    const count = goals[k];
    if (count == null) return;
    const track = GOAL_TRACK[k];
    const cpa = cpaFor[track];
    if (cpa == null) return; // 데이터 없으면 생략 (게이트가 별도 안내)
    const weeklyWon = Math.round(count * cpa);
    tracks.push({ track, weeklyWon, dailyWon: Math.round(weeklyWon / 7), basis: 'goal', goalCount: count, cpa });

    // 단계 가드레일: conversion 목표인데 단계 권장 비율이 0이면 경고
    if (PHASE_RATIO[phase][track] === 0) {
      warnings.push(
        `현재 단계(${phaseLabel(phase)})에선 ${trackLabel(track)} 목표가 비현실적입니다 — 리타게팅 풀이 작아 CPA가 비쌈. 목표를 낮추거나 먼저 풀을 키우세요.`,
      );
    }
  });

  // 수익성 점검 (LINE)
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorBudget.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/services/advisor/advisorBudget.ts ai-server/src/services/advisor/__tests__/advisorBudget.test.ts
git commit -m "feat(advisor): 예산 역산 + 단계 가드레일 + 수익성 점검"
```

---

## Task 4: 소재 스코어링 (advisorCreative.ts)

**Files:**
- Create: `ai-server/src/services/advisor/advisorCreative.ts`
- Test: `ai-server/src/services/advisor/__tests__/advisorCreative.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// ai-server/src/services/advisor/__tests__/advisorCreative.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeRunning, pickNewCandidates } from '../advisorCreative.js';
import type { RunningCreative, OrganicReel, TopicAsset } from '../types.js';

const eng = (over: Partial<RunningCreative>): RunningCreative => ({
  reelId: 1, title: 'r', track: 'engagement', impressions: 5000, runtimeDays: 7,
  frequency: 2.0, ctr: 1.0, costPer3sView: 0.4, costPerCompletion: null, ...over,
});

test('judgeRunning: low data → 보류', () => {
  const r = judgeRunning([eng({ impressions: 500, runtimeDays: 1 })]);
  assert.equal(r[0].verdict, 'hold');
});

test('judgeRunning: high frequency winner → 교체(refresh)', () => {
  const r = judgeRunning([eng({ frequency: 4.2 })]);
  assert.equal(r[0].verdict, 'refresh');
});

test('judgeRunning: healthy → 유지(keep)', () => {
  const r = judgeRunning([eng({ frequency: 2.1, costPer3sView: 0.3 })]);
  assert.equal(r[0].verdict, 'keep');
});

test('pickNewCandidates: organic un-advertised ranked first', () => {
  const organic: OrganicReel[] = [
    { reelId: 39, title: 'A', advertised: false, organicReach: 9000, organicEngagementRate: 5 },
    { reelId: 8, title: 'B', advertised: true, organicReach: 12000, organicEngagementRate: 6 },
  ];
  const topics: TopicAsset[] = [
    { reelId: 46, title: 'C', advertised: false, hasThaiReel: false, painPoints: ['예상키'] },
  ];
  const out = pickNewCandidates(organic, topics, 3);
  assert.equal(out[0].reelId, 39);          // organic, un-advertised first
  assert.equal(out[0].source, 'organic');
  assert.ok(out.some((c) => c.reelId === 46 && c.source === 'topic-fit'));
  assert.ok(!out.some((c) => c.reelId === 8)); // advertised excluded
});

test('pickNewCandidates: flags missing Thai reel', () => {
  const topics: TopicAsset[] = [
    { reelId: 46, title: 'C', advertised: false, hasThaiReel: false, painPoints: [] },
  ];
  const out = pickNewCandidates([], topics, 3);
  assert.equal(out[0].needsThaiReel, true);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorCreative.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

```typescript
// ai-server/src/services/advisor/advisorCreative.ts
// 가동 광고 판정(유지/컷/교체/보류) + 신규 후보 선별(오가닉 1순위·주제적합 2순위). 순수.
import { CREATIVE, type OrganicReel, type RunningCreative, type TopicAsset } from './types.js';

export type Verdict = 'keep' | 'cut' | 'refresh' | 'hold';
export interface CreativeJudgement {
  reelId: number; title: string; verdict: Verdict; reason: string;
}

export function judgeRunning(creatives: RunningCreative[]): CreativeJudgement[] {
  return creatives.map((c) => {
    if (c.impressions < CREATIVE_MIN_IMPR || c.runtimeDays < CREATIVE_MIN_DAYS) {
      return j(c, 'hold', `데이터 부족 (노출 ${c.impressions}, ${c.runtimeDays}일)`);
    }
    const cost = c.track === 'engagement' ? c.costPer3sView : c.costPerCompletion;
    const good = cost != null && cost <= medianCost(creatives, c.track);
    if (good && c.frequency >= CREATIVE.fatigueFrequency) {
      return j(c, 'refresh', `성과 양호하나 빈도 ${c.frequency.toFixed(1)} — 같은 주제 새 소재로 교체`);
    }
    if (good) return j(c, 'keep', `성과 상위 · 빈도 ${c.frequency.toFixed(1)}`);
    return j(c, 'cut', `성과 하위 (단가 ${cost ?? '∞'})`);
  });
}

const CREATIVE_MIN_IMPR = 1000;
const CREATIVE_MIN_DAYS = 3;

function medianCost(creatives: RunningCreative[], track: RunningCreative['track']): number {
  const vals = creatives
    .filter((c) => c.track === track)
    .map((c) => (track === 'engagement' ? c.costPer3sView : c.costPerCompletion))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  if (!vals.length) return Infinity;
  return vals[Math.floor(vals.length / 2)];
}

function j(c: RunningCreative, verdict: Verdict, reason: string): CreativeJudgement {
  return { reelId: c.reelId, title: c.title, verdict, reason };
}

export interface NewCandidate {
  reelId: number; title: string; source: 'organic' | 'topic-fit';
  score: number; needsThaiReel: boolean; reason: string;
}

export function pickNewCandidates(
  organic: OrganicReel[], topics: TopicAsset[], limit: number,
): NewCandidate[] {
  const organicCands: NewCandidate[] = organic
    .filter((o) => !o.advertised)
    .sort((a, b) => b.organicReach * b.organicEngagementRate - a.organicReach * a.organicEngagementRate)
    .map((o) => ({
      reelId: o.reelId, title: o.title, source: 'organic' as const,
      score: o.organicReach * o.organicEngagementRate,
      needsThaiReel: false,
      reason: `오가닉 도달 ${o.organicReach.toLocaleString('ko-KR')} · 참여율 ${o.organicEngagementRate}% · 미광고`,
    }));

  const seen = new Set(organicCands.map((c) => c.reelId));
  const topicCands: NewCandidate[] = topics
    .filter((t) => !t.advertised && !seen.has(t.reelId))
    .map((t) => ({
      reelId: t.reelId, title: t.title, source: 'topic-fit' as const,
      score: t.painPoints.length, // 단순 적합도 (route에서 AI 점수로 보강 가능)
      needsThaiReel: !t.hasThaiReel,
      reason: `주제 적합 (페인 ${t.painPoints.join('·') || '일반'})${t.hasThaiReel ? '' : ' · 태국어 제작 필요'}`,
    }))
    .sort((a, b) => b.score - a.score);

  return [...organicCands, ...topicCands].slice(0, limit);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorCreative.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/services/advisor/advisorCreative.ts ai-server/src/services/advisor/__tests__/advisorCreative.test.ts
git commit -m "feat(advisor): 소재 판정 + 신규 후보 하이브리드 선별"
```

---

## Task 5: 훅 스토리 프롬프트 (advisorStory.ts)

**Files:**
- Create: `ai-server/src/services/advisor/advisorStory.ts`
- Test: `ai-server/src/services/advisor/__tests__/advisorStory.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// ai-server/src/services/advisor/__tests__/advisorStory.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryPrompt } from '../advisorStory.js';

test('buildStoryPrompt: includes track CTA, topic, and constraints', () => {
  const p = buildStoryPrompt({ reelId: 8, title: '성조숙증의 함정', track: 'homepage' });
  assert.match(p, /성조숙증의 함정/);
  assert.match(p, /예측키|측정/);          // homepage CTA
  assert.match(p, /ครับ|ผม/);              // 태국어 격식체 제약
  assert.match(p, /효과|보장|개인차/);      // 의료광고 규정
  assert.match(p, /태국어[\s\S]*한국어|한국어[\s\S]*태국어/);
});

test('buildStoryPrompt: engagement track uses profile CTA', () => {
  const p = buildStoryPrompt({ reelId: 1, title: '키 유전 80%', track: 'engagement' });
  assert.match(p, /프로필|더보기|팔로우/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorStory.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

```typescript
// ai-server/src/services/advisor/advisorStory.ts
// 광고용 훅 스토리 프롬프트 빌더 (순수). route가 generateText로 실행한다.
import type { Track } from './types.js';

export interface StorySeed { reelId: number; title: string; track: Track; }

const CTA: Record<Track, string> = {
  engagement: '프로필에서 더 많은 정보 보기 / 팔로우 유도 (낮은 약속)',
  homepage: '홈페이지에서 우리 아이 18세 예측키 1분 무료 측정',
  conversion: 'LINE으로 1:1 무료 상담',
};

export function buildStoryPrompt(seed: StorySeed): string {
  return `너는 187 성장클리닉(한국 성장 전문 의료)의 태국 시장 광고 카피라이터다.
아래 주제로 인스타그램/페이스북 릴스용 **광고 소재 훅 스토리**를 작성하라.

주제(기존 자산 #${seed.reelId}): "${seed.title}"
도착지/CTA: ${CTA[seed.track]}

[출력 형식]
🎬 훅 (첫 3초, 스크롤 멈추는 한 줄)
📖 내러티브 아크: 도입 → 문제(공감/공포) → 반전(솔루션 암시) → CTA
💬 핵심 자막 카피 3~4줄
🔘 CTA 문구
각 항목을 **태국어**와 **한국어** 둘 다 작성.

[필수 제약]
- 화자 = 남성 한국인 의사. 태국어는 격식·정중체(1인칭 ผม, 종결 ครับ). 여성형(ค่ะ/คะ/ดิฉัน/ฉัน) 금지.
- 의료광고 규정: 효과 보장·"최고/유일" 단정 금지, 개인차·전문의 상담 명시.
- 광고는 짧고 강하게. 교육 나열이 아니라 훅 중심.
- 기존 자산 #${seed.reelId}을(를) 변형하는 전제.`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-server && node --test src/services/advisor/__tests__/advisorStory.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/services/advisor/advisorStory.ts ai-server/src/services/advisor/__tests__/advisorStory.test.ts
git commit -m "feat(advisor): 광고용 훅 스토리 프롬프트 빌더"
```

---

## Task 6: 데이터 수집 (advisorData.ts)

**Files:**
- Create: `ai-server/src/services/advisor/advisorData.ts`

데이터 수집은 외부 I/O(Meta·GA4·DB)라 순수 테스트 대신 graceful 수집 + 정규화에 집중한다. 기존 서비스의 정확한 함수 시그니처는 구현 시 각 파일을 열어 확인한다(`metaAds.ts`의 `fetchAccountInsights`, `ga4SiteBreakdown.ts`, `metaFeed.ts`의 `fetchChannelFeed`).

- [ ] **Step 1: 구현 (정규화 + graceful 폴백)**

```typescript
// ai-server/src/services/advisor/advisorData.ts
// 기존 서비스를 묶어 AdvisorStats로 정규화한다. 어느 소스가 비어도 graceful.
import { GATE, type AdvisorStats, type OrganicReel, type RunningCreative, type TopicAsset } from './types.js';
import { fetchAccountInsights } from '../metaAds.js';
import { fetchSiteBreakdown } from '../ga4SiteBreakdown.js'; // 실제 export 명은 파일 확인 후 맞춤

export interface CollectInput {
  accountExternalId?: string; // Meta 광고 계정
  windowDays?: number;
}

/**
 * 각 소스를 best-effort로 모은다. 실패/빈 소스는 0/null/[]로.
 * 주의: 아래 호출은 기존 서비스의 실제 시그니처에 맞춰 구현 시 조정한다.
 */
export async function collectStats(input: CollectInput): Promise<AdvisorStats> {
  const windowDays = input.windowDays ?? GATE.windowDays;

  let calcCompletions = 0, lineLeads = 0;
  let campaignsWithSpend = 0, maxCampaignRuntimeDays = 0, videoViewDays = 0;
  let calcCpa: number | null = null, lineCpa: number | null = null, costPerViewer: number | null = null;
  const runningCreatives: RunningCreative[] = [];
  const organicReels: OrganicReel[] = [];
  const topicLibrary: TopicAsset[] = [];

  // 1) Meta 광고 인사이트 (지출·캠페인·소재). 실패 시 빈값 유지.
  try {
    if (input.accountExternalId) {
      const ins = await fetchAccountInsights(input.accountExternalId, windowDays).catch(() => null);
      if (ins) {
        // ins 구조에 맞춰 campaignsWithSpend/runtime/runningCreatives/cpa 매핑 (구현 시 확정)
      }
    }
  } catch { /* graceful */ }

  // 2) GA4: 광고 기여(approx) 계산기 완료·LINE 클릭 + 동영상 조회일수
  try {
    // const ga = await fetchSiteBreakdown({ days: windowDays });
    // paid 소스 기준 calcCompletions/lineLeads/videoViewDays/costPerViewer 매핑 (구현 시 확정)
  } catch { /* graceful */ }

  // 3) 오가닉 게시물 실적(metaFeed) + 4) 62토픽 라이브러리(자산 현황 조회) → 구현 시 채움

  // 단계 입력: retargetPoolSize/pixelMature 는 Meta 인사이트 video viewers + 픽셀 전환 누적으로 추정
  const retargetPoolSize = 0;
  const pixelMature = false;

  return {
    windowDays, campaignsWithSpend, maxCampaignRuntimeDays, videoViewDays,
    calcCompletions, lineLeads, calcCpa, lineCpa, costPerViewer,
    retargetPoolSize, pixelMature, runningCreatives, organicReels, topicLibrary,
  };
}
```

- [ ] **Step 2: 타입 컴파일 확인**

Run: `cd ai-server && npx tsc --noEmit`
Expected: PASS (no type errors; 미사용 import 정리)

- [ ] **Step 3: 커밋**

```bash
git add ai-server/src/services/advisor/advisorData.ts
git commit -m "feat(advisor): 데이터 수집·정규화 (graceful 폴백)"
```

> 참고: collectStats의 각 소스 매핑은 구현 시 `metaAds.ts`/`ga4SiteBreakdown.ts`/`metaFeed.ts`를 열어 실제 반환 구조에 맞춘다. 매핑 로직 중 순수 변환부가 생기면 별도 순수 함수로 빼고 테스트를 추가한다.

---

## Task 7: 라우트 핸들러 (POST /advisor/recommend)

**Files:**
- Modify: `ai-server/src/routes/marketing.ts`

- [ ] **Step 1: import 추가 (파일 상단 import 블록)**

```typescript
import { collectStats } from '../services/advisor/advisorData.js';
import { evaluateGate } from '../services/advisor/advisorGate.js';
import { buildBudget } from '../services/advisor/advisorBudget.js';
import { judgeRunning, pickNewCandidates } from '../services/advisor/advisorCreative.js';
import { buildStoryPrompt } from '../services/advisor/advisorStory.js';
import type { WeeklyGoals } from '../services/advisor/types.js';
```

- [ ] **Step 2: 핸들러 추가 (marketingRouter 정의 이후, 다른 핸들러들 사이)**

```typescript
// POST /api/marketing/advisor/recommend
// body: { goals: WeeklyGoals, accountExternalId?: string }
marketingRouter.post('/advisor/recommend', async (req: Request, res: Response) => {
  try {
    const goals = (req.body?.goals ?? {}) as WeeklyGoals;
    const accountExternalId = req.body?.accountExternalId as string | undefined;
    const stats = await collectStats({ accountExternalId });
    const gate = evaluateGate(stats, goals);

    if (!gate.anyReady) {
      return res.json({ ready: false, gate, stats: publicStats(stats) });
    }

    const budget = buildBudget(stats, goals);
    const running = judgeRunning(stats.runningCreatives);
    const candidates = pickNewCandidates(stats.organicReels, stats.topicLibrary, 3);

    // 훅 스토리: 교체 대상 + 태국어 미보유 후보에 대해 생성 (Gemini 없으면 graceful skip)
    const storySeeds = [
      ...running.filter((r) => r.verdict === 'refresh').map((r) => ({ reelId: r.reelId, title: r.title, track: 'engagement' as const })),
      ...candidates.filter((c) => c.needsThaiReel).map((c) => ({ reelId: c.reelId, title: c.title, track: 'homepage' as const })),
    ];
    const stories: Array<{ reelId: number; title: string; story: string }> = [];
    for (const seed of storySeeds.slice(0, 3)) {
      try {
        const story = await generateText(buildStoryPrompt(seed));
        stories.push({ reelId: seed.reelId, title: seed.title, story });
      } catch { /* Gemini 키 없거나 실패 → skip */ }
    }

    return res.json({ ready: true, gate, budget, creatives: { running, candidates }, stories });
  } catch (e: any) {
    console.error('[advisor] recommend failed:', e?.message);
    return res.status(500).json({ error: 'advisor_failed', message: e?.message });
  }
});

function publicStats(s: ReturnType<typeof collectStats> extends Promise<infer T> ? T : never) {
  return {
    windowDays: s.windowDays, calcCompletions: s.calcCompletions,
    lineLeads: s.lineLeads, videoViewDays: s.videoViewDays,
    campaignsWithSpend: s.campaignsWithSpend, maxCampaignRuntimeDays: s.maxCampaignRuntimeDays,
  };
}
```

- [ ] **Step 3: 타입 컴파일 확인**

Run: `cd ai-server && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 라우트 스모크 테스트 (목표 없이 → 데이터 부족 응답)**

Run: `cd ai-server && npm run dev` (별 터미널), 그 후:
`curl -s -X POST localhost:3001/api/marketing/advisor/recommend -H "Content-Type: application/json" -d '{"goals":{"calcCompletions":50}}'`
Expected: `{"ready":false,"gate":{...global.ok:false...}}` (광고 데이터 0이므로)

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/routes/marketing.ts
git commit -m "feat(advisor): POST /advisor/recommend 핸들러"
```

---

## Task 8: v4 서비스 + 타입

**Files:**
- Create: `v4/src/features/marketing/services/adAdvisorService.ts`

- [ ] **Step 1: 구현**

```typescript
// v4/src/features/marketing/services/adAdvisorService.ts
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
```

- [ ] **Step 2: 타입 게이트**

Run: `cd v4 && npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add v4/src/features/marketing/services/adAdvisorService.ts
git commit -m "feat(advisor): v4 API 서비스 + 응답 타입"
```

---

## Task 9: 페이지 (AdAdvisorPage.tsx)

**Files:**
- Create: `v4/src/features/marketing/components/AdAdvisorPage.tsx`

- [ ] **Step 1: 구현**

```tsx
// v4/src/features/marketing/components/AdAdvisorPage.tsx
import { useState } from 'react';
import { fetchAdvice, type AdvisorResponse, type WeeklyGoals } from '../services/adAdvisorService';

const won = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;
const TRACK_KO: Record<string, string> = { engagement: '참여(동영상조회)', homepage: '홈페이지(계산기)', conversion: '전환(LINE)' };

export default function AdAdvisorPage() {
  const [goals, setGoals] = useState<WeeklyGoals>({});
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AdvisorResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

  async function run() {
    setLoading(true); setErr(null); setRes(null);
    try { setRes(await fetchAdvice(goals)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">🤖 광고 어드바이저</h1>
        <p className="text-sm text-gray-500">주간 목표를 넣으면 실측 데이터로 예산·소재·신규 스토리를 추천합니다. (측정: 직전 14일 · dev 전용)</p>
      </div>

      <div className="bg-white rounded-xl border p-4 grid grid-cols-3 gap-3">
        <Field label="주간 계산기 완료" onChange={(v) => setGoals((g) => ({ ...g, calcCompletions: num(v) }))} />
        <Field label="주간 LINE 리드" onChange={(v) => setGoals((g) => ({ ...g, lineLeads: num(v) }))} />
        <Field label="주간 시청자 풀 증가" onChange={(v) => setGoals((g) => ({ ...g, viewerPoolGrowth: num(v) }))} />
        <button onClick={run} disabled={loading}
          className="col-span-3 bg-indigo-600 text-white rounded-lg py-2 font-semibold disabled:opacity-50">
          {loading ? '분석 중…' : '지금 추천받기'}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">오류: {err}</div>}

      {res && !res.ready && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="font-bold text-red-700">데이터 부족 — 아직 추천할 수 없습니다</div>
          {!res.gate.global.ok && <div className="text-sm text-red-700">{res.gate.global.reason}</div>}
          <ul className="text-sm text-red-700 list-disc pl-5">
            {(['calcCompletions', 'lineLeads', 'viewerPool'] as const).map((k) => {
              const s = res.gate[k];
              return s.requested && !s.ok ? <li key={k}>{s.reason}</li> : null;
            })}
          </ul>
        </div>
      )}

      {res?.ready && res.budget && (
        <>
          <Section title="💰 예산 추천">
            <div className="text-lg font-bold">{won(res.budget.totalWeeklyWon)}/주 · {won(res.budget.totalDailyWon)}/일</div>
            <div className="text-xs text-gray-500 mb-2">단계: {res.budget.phase}</div>
            {res.budget.tracks.map((t) => (
              <div key={t.track} className="flex justify-between text-sm border-t py-1">
                <span>{TRACK_KO[t.track] ?? t.track} {t.basis === 'phase-suggested' && <em className="text-gray-400">(권장)</em>}</span>
                <span>{won(t.weeklyWon)}/주 {t.cpa ? `· CPA ${won(t.cpa)}` : ''}</span>
              </div>
            ))}
            {res.budget.estimatedRevenueWon != null &&
              <div className="text-xs text-gray-600 mt-2">예상 매출(가정): {won(res.budget.estimatedRevenueWon)}</div>}
            {res.budget.warnings.map((w, i) => <div key={i} className="text-amber-700 text-sm mt-1">⚠ {w}</div>)}
          </Section>

          {res.creatives && (
            <Section title="🎞 소재 추천">
              {res.creatives.running.map((c) => (
                <div key={c.reelId} className="text-sm border-t py-1">#{c.reelId} {c.title} — <b>{verdictKo(c.verdict)}</b> <span className="text-gray-500">{c.reason}</span></div>
              ))}
              <div className="font-semibold text-sm mt-2">🆕 다음 테스트 후보</div>
              {res.creatives.candidates.map((c) => (
                <div key={c.reelId} className="text-sm border-t py-1">#{c.reelId} {c.title} <span className="text-gray-500">[{c.source}] {c.reason}</span></div>
              ))}
            </Section>
          )}

          {res.stories && res.stories.length > 0 && (
            <Section title="✍️ 신규 소재 훅 스토리">
              {res.stories.map((s) => (
                <div key={s.reelId} className="border-t py-2">
                  <div className="font-semibold text-sm">#{s.reelId} {s.title}</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 mt-1">{s.story}</pre>
                  <button onClick={() => navigator.clipboard.writeText(s.story)} className="text-xs text-indigo-600 mt-1">📋 복사</button>
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, onChange }: { label: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="block text-gray-600 mb-1">{label}</span>
      <input type="number" min={0} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-2 py-1" placeholder="목표" />
    </label>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border p-4"><div className="font-bold mb-2">{title}</div>{children}</div>;
}
function verdictKo(v: string) { return { keep: '유지', cut: '컷', refresh: '교체(피로)', hold: '보류' }[v] ?? v; }
```

- [ ] **Step 2: 타입 게이트**

Run: `cd v4 && npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add v4/src/features/marketing/components/AdAdvisorPage.tsx
git commit -m "feat(advisor): 광고 어드바이저 페이지 (목표 폼 + 결과 4섹션)"
```

---

## Task 10: 라우트 + 사이드바 등록

**Files:**
- Modify: `v4/src/app/router.tsx`
- Modify: 마케팅 사이드바 컴포넌트 (탐색해서 확정 — `StrategyViewer` 주변 사이드바, 예: `MarketingLayout`/사이드바 정의 파일)

- [ ] **Step 1: router.tsx에 lazy route 추가**

`router.tsx`에서 기존 마케팅 페이지 lazy 등록 패턴(예: `AdsManagerPage`)을 찾아 동일 형식으로 추가:

```tsx
const AdAdvisorPage = lazy(() => import('@/features/marketing/components/AdAdvisorPage'));
// 기존 /marketing/* 라우트 children 배열에:
{ path: 'advisor', element: <AdAdvisorPage /> },
```

- [ ] **Step 2: 사이드바 메뉴 항목 추가**

마케팅 사이드바 정의를 찾는다:

Run: `cd v4 && grep -rn "site-analysis\|channel-analytics\|마케팅" src/features/marketing src/shared --include=*.tsx -l`

찾은 사이드바 배열(광고 관련 그룹)에 한 줄 추가 (기존 항목 형식에 맞춤):

```tsx
{ to: '/marketing/advisor', label: '🤖 광고 어드바이저' },
```

- [ ] **Step 3: 타입 게이트 + 빌드**

Run: `cd v4 && npx tsc -b --noEmit && npm run build`
Expected: PASS

- [ ] **Step 4: 수동 확인 (dev)**

Run: `cd v4 && npm run dev` → 브라우저 `/marketing/advisor`
Expected: 목표 폼 표시 → "지금 추천받기" → (광고 데이터 0) "데이터 부족" 패널 노출

- [ ] **Step 5: 커밋**

```bash
git add v4/src/app/router.tsx v4/src/features/marketing/
git commit -m "feat(advisor): 라우트 + 마케팅 사이드바 등록"
```

---

## Task 11: 전체 회귀 확인

- [ ] **Step 1: ai-server 전체 테스트**

Run: `cd ai-server && npm test`
Expected: 기존 테스트 + advisor 신규(게이트5·예산7·소재5·스토리2 = 19) 전부 PASS

- [ ] **Step 2: v4 타입 게이트**

Run: `cd v4 && npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋 (필요 시)**

변경 없으면 skip.

---

## Self-Review 결과

- **스펙 커버리지**: 게이트(Task2)·예산 역산+단계+수익성(Task3)·소재 유지/교체/신규(Task4)·훅 스토리(Task5)·데이터 수집(Task6)·라우트(Task7)·서비스(Task8)·페이지/잠금상태(Task9)·사이드바(Task10) — 스펙 전 섹션 매핑됨.
- **운영 제약**: dev 전용(기존 `/api/marketing/*` 패턴 상속), Gemini 없으면 스토리만 graceful skip(Task7), 저장/ migration 없음 — 반영.
- **타입 일관성**: `WeeklyGoals`/`AdvisorStats`/`Track`/`Phase`/`GateResult`/`NewCandidate` 전 태스크 동일 시그니처. 함수명 `evaluateGate`/`detectPhase`/`buildBudget`/`judgeRunning`/`pickNewCandidates`/`buildStoryPrompt`/`collectStats`/`fetchAdvice` 일관.
- **알려진 미정**: Task6 데이터 매핑은 기존 서비스 실제 반환 구조에 맞춰 구현 시 확정(파일 명시). 순수 변환부 생기면 테스트 추가하도록 지시함.
