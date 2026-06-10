import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSim, selectReferences } from '../dist/services/evidenceMatch.js';

test('cosineSim: identical=1, orthogonal=0, colinear=1, empty/mismatch=0', () => {
  assert.equal(cosineSim([1, 0], [1, 0]), 1);
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 2, 3], [2, 4, 6]).toFixed(4), '1.0000');
  assert.equal(cosineSim([], []), 0);
  assert.equal(cosineSim([1, 2], [1]), 0);
});

test('selectReferences: threshold filter + desc sort + topN cap + sim→similarity', () => {
  const scored = [
    { pmid: 'a', title: 'A', journal: 'J', year: 2020, doi: null, url: 'u', sim: 0.60 },
    { pmid: 'b', title: 'B', journal: 'J', year: 2021, doi: 'd', url: 'u', sim: 0.90 },
    { pmid: 'c', title: 'C', journal: 'J', year: 2019, doi: null, url: 'u', sim: 0.75 },
    { pmid: 'd', title: 'D', journal: 'J', year: 2018, doi: null, url: 'u', sim: 0.80 },
  ];
  const out = selectReferences(scored, { threshold: 0.72, topN: 2 });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((r) => r.pmid), ['b', 'd']);
  assert.equal(out[0].similarity, 0.9);
  assert.ok(!('sim' in out[0]));
});

test('selectReferences: empty when none meet threshold', () => {
  const scored = [{ pmid: 'a', title: 'A', journal: 'J', year: 2020, doi: null, url: 'u', sim: 0.5 }];
  assert.deepEqual(selectReferences(scored, { threshold: 0.72, topN: 5 }), []);
});
