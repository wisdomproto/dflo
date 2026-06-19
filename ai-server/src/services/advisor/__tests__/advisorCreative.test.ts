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
  assert.equal(out[0].reelId, 39);
  assert.equal(out[0].source, 'organic');
  assert.ok(out.some((c) => c.reelId === 46 && c.source === 'topic-fit'));
  assert.ok(!out.some((c) => c.reelId === 8));
});

test('pickNewCandidates: flags missing Thai reel', () => {
  const topics: TopicAsset[] = [
    { reelId: 46, title: 'C', advertised: false, hasThaiReel: false, painPoints: [] },
  ];
  const out = pickNewCandidates([], topics, 3);
  assert.equal(out[0].needsThaiReel, true);
});
