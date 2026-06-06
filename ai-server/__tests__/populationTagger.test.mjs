import test from 'node:test';
import assert from 'node:assert/strict';
import { tagPopulation } from '../dist/services/populationTagger.js';

test('explicit Korean in abstract → korean / explicit', () => {
  const r = tagPopulation({ abstract:'We studied Korean children with short stature.', affiliation:'' });
  assert.equal(r.group, 'east_asian');
  assert.equal(r.country, 'korean');
  assert.equal(r.confidence, 'explicit');
});
test('Thai affiliation, no abstract mention → sea / inferred', () => {
  const r = tagPopulation({ abstract:'A study of growth hormone therapy.', affiliation:'Department of Pediatrics, Bangkok, Thailand' });
  assert.equal(r.group, 'sea');
  assert.equal(r.confidence, 'inferred');
});
test('Caucasian-only explicit', () => {
  const r = tagPopulation({ abstract:'In a cohort of Caucasian boys ...', affiliation:'' });
  assert.equal(r.group, 'caucasian');
});
test('no signal → unknown', () => {
  const r = tagPopulation({ abstract:'Bone age assessment review.', affiliation:'' });
  assert.equal(r.group, 'unknown');
  assert.equal(r.confidence, 'unknown');
});
