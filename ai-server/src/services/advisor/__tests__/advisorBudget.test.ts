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
  assert.equal(calc.weeklyWon, 300000);
  assert.equal(calc.dailyWon, Math.round(300000 / 7));
});

test('buildBudget: line lead cost over floor → profit warning', () => {
  const b = buildBudget(stats({ lineCpa: 500000 }), { lineLeads: 5 });
  assert.ok(b.warnings.some((w) => /손익/.test(w)));
});

test('buildBudget: goal misaligned with phase → guardrail warning', () => {
  const b = buildBudget(stats({ retargetPoolSize: 100 }), { lineLeads: 20 });
  assert.equal(b.phase, 'initial');
  assert.ok(b.warnings.some((w) => /단계|풀/.test(w)));
});

test('buildBudget: untracked goal metric is skipped (no CPA)', () => {
  const b = buildBudget(stats({ calcCpa: null }), { calcCompletions: 100 });
  const calc = b.tracks.find((t) => t.track === 'homepage');
  assert.equal(calc, undefined);
});
