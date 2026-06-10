import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceSummaryPrompt, parseSummaryResponse } from '../dist/services/evidenceSummary.js';

test('buildEvidenceSummaryPrompt embeds title+abstract and asks for the 2 JSON fields', () => {
  const p = buildEvidenceSummaryPrompt('GnRH agonist final height', 'We studied 100 girls...');
  assert.match(p, /GnRH agonist final height/);
  assert.match(p, /We studied 100 girls/);
  assert.match(p, /korean_summary/);
  assert.match(p, /key_finding/);
});

test('parseSummaryResponse: plain JSON', () => {
  assert.deepEqual(parseSummaryResponse('{"korean_summary":"요약","key_finding":"+4.5cm"}'),
    { korean_summary: '요약', key_finding: '+4.5cm' });
});

test('parseSummaryResponse: code-fence wrapped', () => {
  assert.deepEqual(parseSummaryResponse('```json\n{"korean_summary":"가","key_finding":"나"}\n```'),
    { korean_summary: '가', key_finding: '나' });
});

test('parseSummaryResponse: extracts JSON from surrounding prose', () => {
  assert.deepEqual(parseSummaryResponse('결과: {"korean_summary":"가","key_finding":"나"} 끝'),
    { korean_summary: '가', key_finding: '나' });
});

test('parseSummaryResponse: throws on garbage or missing field', () => {
  assert.throws(() => parseSummaryResponse('no json'));
  assert.throws(() => parseSummaryResponse('{"korean_summary":"only"}'));
});
