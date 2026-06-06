import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompositeCasePrompt } from '../dist/services/insightPrompts.js';

test('prompt includes category, n, common meds, and forbids real-patient/efficacy claims', () => {
  const p = buildCompositeCasePrompt('precocious_suspect', { n: 12, avgGrowthCm: 18, avgInitialBoneAge: 11.5, genderSplit:{male:8,female:4}, commonMeds:['에이큐_G','루프린'] });
  assert.match(p, /precocious_suspect/);
  assert.match(p, /12/);
  assert.match(p, /합성|가상|전형/); // composite framing
  assert.match(p, /실존|개인|특정 환자/); // must mention NOT a real individual
});
