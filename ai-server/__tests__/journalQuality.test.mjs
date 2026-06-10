import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studyTypeFromPubTypes, studyGrade, isSci, normalize, computeBatchStats, qualityScore,
} from '../dist/services/journalQuality.js';

test('studyTypeFromPubTypes maps highest-evidence type first', () => {
  assert.equal(studyTypeFromPubTypes(['Journal Article', 'Meta-Analysis']), 'meta_analysis');
  assert.equal(studyTypeFromPubTypes(['Randomized Controlled Trial', 'Journal Article']), 'rct');
  assert.equal(studyTypeFromPubTypes(['Systematic Review']), 'systematic_review');
  assert.equal(studyTypeFromPubTypes(['Journal Article']), 'other');
  assert.equal(studyTypeFromPubTypes([]), 'other');
});

test('studyGrade orders evidence', () => {
  assert.ok(studyGrade('meta_analysis') > studyGrade('rct'));
  assert.ok(studyGrade('rct') > studyGrade('cohort'));
  assert.equal(studyGrade('unknownthing'), 0.2);
});

test('isSci passes whitelist ISSN or if_proxy threshold', () => {
  assert.equal(isSci({ issn: '0021-972X' }), true);                 // JCEM whitelist
  assert.equal(isSci({ issn: '9999-9999', ifProxy: 5 }), true);     // ifProxy fallback
  assert.equal(isSci({ issn: '9999-9999', ifProxy: 1 }), false);    // neither
  assert.equal(isSci({ ifProxy: null }), false);
});

test('normalize clamps and handles flat range', () => {
  assert.equal(normalize(5, 0, 10), 0.5);
  assert.equal(normalize(-3, 0, 10), 0);
  assert.equal(normalize(99, 0, 10), 1);
  assert.equal(normalize(5, 4, 4), 0); // max==min
});

test('qualityScore is 0..100 and rewards higher RCR within batch', () => {
  const papers = [
    { rcr: 3.0, ifProxy: 8, citationCount: 200, year: 2022, studyType: 'rct' },
    { rcr: 0.5, ifProxy: 2, citationCount: 10,  year: 2012, studyType: 'review' },
  ];
  const b = computeBatchStats(papers);
  const hi = qualityScore(papers[0], b, 2026);
  const lo = qualityScore(papers[1], b, 2026);
  assert.ok(hi >= 0 && hi <= 100);
  assert.ok(lo >= 0 && lo <= 100);
  assert.ok(hi > lo);
});

test('computeBatchStats handles empty array without Infinity', () => {
  const b = computeBatchStats([]);
  assert.equal(Number.isFinite(b.rcrMax), true);
});
