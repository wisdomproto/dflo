import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCohort, passesKAnonymity, K_MIN } from '../dist/services/clinicalStats.js';

const rows = [
  { gender:'male', initialHeight:140, latestHeight:160, initialBoneAge:11, topMeds:['에이큐_G','루프린'] },
  { gender:'male', initialHeight:138, latestHeight:158, initialBoneAge:12, topMeds:['에이큐_G'] },
  { gender:'female', initialHeight:135, latestHeight:150, initialBoneAge:10, topMeds:['에이큐_G'] },
];
test('aggregateCohort computes n, avg growth, common meds', () => {
  const s = aggregateCohort(rows);
  assert.equal(s.n, 3);
  assert.equal(s.commonMeds[0], '에이큐_G'); // most frequent first
  assert.ok(s.avgGrowthCm > 0);
});
test('passesKAnonymity true when n >= K_MIN', () => {
  assert.equal(passesKAnonymity(K_MIN), true);
  assert.equal(passesKAnonymity(K_MIN - 1), false);
});
