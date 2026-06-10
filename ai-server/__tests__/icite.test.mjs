import test from 'node:test';
import assert from 'node:assert/strict';
import { parseICite } from '../dist/services/icite.js';

const j = { data: [
  { pmid: 28218914, citation_count: 145, relative_citation_ratio: 2.34, is_research_article: 'Yes' },
  { pmid: 99999999, citation_count: 0,   relative_citation_ratio: null, is_research_article: false },
] };

test('parseICite maps by pmid string with rcr and research flag', () => {
  const m = parseICite(j);
  assert.equal(m.get('28218914').rcr, 2.34);
  assert.equal(m.get('28218914').citationCount, 145);
  assert.equal(m.get('28218914').isResearchArticle, true);
  assert.equal(m.get('99999999').rcr, null);       // 최신 논문 RCR 미산출 허용
  assert.equal(m.get('99999999').isResearchArticle, false);
});

test('parseICite tolerates empty/malformed', () => {
  assert.equal(parseICite({}).size, 0);
  assert.equal(parseICite({ data: null }).size, 0);
});
