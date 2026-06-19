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
  assert.equal(g.lineLeads.requested, false);
  assert.equal(g.lineLeads.ok, true);
});

test('anyReady false when global fails even if metric data present', () => {
  const g = evaluateGate(baseStats({ campaignsWithSpend: 0 }), { calcCompletions: 50 });
  assert.equal(g.anyReady, false);
});
