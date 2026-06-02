// scripts/test/extract-marketing-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDomestic, STRATEGY_INDEX } from '../extract-marketing-data.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(
  resolve(SCRIPT_DIR, '../../public/marketing/strategy/domestic-strategy.html'),
  'utf8',
);

test('extracts 72 keywords with 4 golden', () => {
  const { keywords } = extractDomestic(HTML);
  assert.equal(keywords.length, 72);
  assert.equal(keywords.filter((k) => k.isGolden).length, 4);
  const sample = keywords[0];
  assert.ok(typeof sample.keyword === 'string' && sample.keyword.length > 0);
  assert.ok(['high', 'medium', 'low'].includes(sample.competition));
  assert.equal(typeof sample.totalSearch, 'number');
  // category must not leak the golden marker (golden-ness lives on isGolden)
  assert.ok(keywords.every((k) => !k.category.includes('gold')));
});

test('extracts 78 topics with correct category + status distribution', () => {
  const { topics } = extractDomestic(HTML);
  assert.equal(topics.length, 78);
  const byCat = topics.reduce((m, t) => ((m[t.category] = (m[t.category] || 0) + 1), m), {});
  assert.deepEqual(byCat, { A: 20, B: 15, C: 15, D: 18, E: 10 });
  const byStatus = topics.reduce((m, t) => ((m[t.status] = (m[t.status] || 0) + 1), m), {});
  assert.deepEqual(byStatus, { new: 46, done: 25, similar: 7 });
  assert.equal(topics[0].categoryName, '성장과학'); // A
});

test('strategy index lists 8 docs', () => {
  assert.equal(STRATEGY_INDEX.length, 8);
});
