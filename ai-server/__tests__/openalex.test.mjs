import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenAlexWork, parseOpenAlexSource } from '../dist/services/openalex.js';

const workJson = {
  id: 'https://openalex.org/W2741809807',
  doi: 'https://doi.org/10.1210/jc.2021-001',
  publication_year: 2021,
  cited_by_count: 145,
  type: 'article',
  primary_location: {
    source: {
      id: 'https://openalex.org/S125754415',
      display_name: 'The Journal of Clinical Endocrinology and Metabolism',
      issn_l: '0021-972X',
      issn: ['0021-972X', '1945-7197'],
    },
  },
};

test('parseOpenAlexWork strips prefixes and picks issn_l', () => {
  const w = parseOpenAlexWork(workJson);
  assert.equal(w.openalexId, 'W2741809807');
  assert.equal(w.doi, '10.1210/jc.2021-001');
  assert.equal(w.year, 2021);
  assert.equal(w.citedByCount, 145);
  assert.equal(w.type, 'article');
  assert.equal(w.sourceId, 'S125754415');
  assert.equal(w.issn, '0021-972X');
  assert.match(w.journalName, /Clinical Endocrinology/);
});

test('parseOpenAlexWork tolerates missing source', () => {
  const w = parseOpenAlexWork({ id: 'https://openalex.org/W1', cited_by_count: 0 });
  assert.equal(w.sourceId, '');
  assert.equal(w.issn, '');
  assert.equal(w.citedByCount, 0);
});

test('parseOpenAlexSource reads 2yr_mean_citedness as ifProxy', () => {
  const s = parseOpenAlexSource({ summary_stats: { '2yr_mean_citedness': 6.4, h_index: 410 } });
  assert.equal(s.ifProxy, 6.4);
  assert.equal(s.hIndex, 410);
});

test('parseOpenAlexSource defaults null when stats missing', () => {
  const s = parseOpenAlexSource({});
  assert.equal(s.ifProxy, null);
  assert.equal(s.hIndex, null);
});
