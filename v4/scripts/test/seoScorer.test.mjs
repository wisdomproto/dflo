import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNaverSeoScore } from '../../src/features/marketing/utils/seoScorer.ts';

const mkCard = (text) => ({ id: '1', blogContentId: 'b', cardType: 'text', sortOrder: 0, content: { text } });

test('empty content scores low and returns 9 detail sections', () => {
  const r = calculateNaverSeoScore('', [], null);
  assert.equal(r.details.length, 9);
  assert.ok(r.score < 20);
});

test('keyword in title + dense body scores meaningfully higher', () => {
  const body = '<h2>성장호르몬</h2><p>' + '성장호르몬 치료는 키 성장에 도움이 됩니다. '.repeat(40) + '</p>';
  const r = calculateNaverSeoScore('성장호르몬 치료 효과 총정리', [mkCard(body)], { primary: '성장호르몬', secondary: ['키 성장'] });
  assert.ok(r.score > 40, `expected >40, got ${r.score}`);
});

test('score is sum of detail scores', () => {
  const r = calculateNaverSeoScore('테스트 제목입니다 열다섯자', [mkCard('<p>본문</p>')], { primary: '제목' });
  const sum = r.details.reduce((s, d) => s + d.score, 0);
  assert.equal(r.score, sum);
});
