import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreArticle } from '../../src/features/marketing/utils/googleSeoScorer.ts';

const strong = {
  seoTitle: '소아 성장 키 크는 법 완벽 가이드',
  slug: 'child-growth-guide',
  metaDescription: '소아 성장과 키 크는 법을 의학적 근거로 정리했습니다. 성장판, 수면, 영양까지 부모가 알아야 할 핵심을 담았습니다. 지금 확인하세요.',
  h1: '소아 성장 키 크는 법',
  primaryKeyword: '소아 성장',
  secondaryKeywords: ['키 크는 법', '성장판'],
  sections: [
    { heading: '소아 성장이란', html: '<p>소아 성장은 중요합니다. 키 크는 법을 알아봅니다.</p>', imagePrompt: 'flat illustration', imageUrl: null },
    { heading: '성장판과 수면', html: '<ul><li>성장판 자극</li><li>충분한 수면</li></ul>', imagePrompt: 'flat illustration', imageUrl: null },
    { heading: '영양과 운동', html: '<p>소아 성장에 영양은 핵심입니다.</p>', imagePrompt: 'flat illustration', imageUrl: null },
  ],
  faq: [ { q: '키는 언제 크나요?', a: '사춘기 전후입니다.' }, { q: '성장판 검사는?', a: '엑스레이로 합니다.' } ],
};

test('strong article scores high (A/B)', () => {
  const r = scoreArticle(strong, 'ko');
  assert.equal(r.max, 100);
  assert.ok(r.score >= 80, `expected >=80, got ${r.score}`);
  assert.ok(['A', 'B'].includes(r.grade), `grade ${r.grade}`);
});

test('empty article scores low (F) and details cover 11 items', () => {
  const empty = { seoTitle: '', slug: '', metaDescription: '', h1: '', primaryKeyword: '', secondaryKeywords: [], sections: [], faq: [] };
  const r = scoreArticle(empty, 'ko');
  assert.equal(r.details.length, 11);
  assert.equal(r.grade, 'F');
});

test('thai partial keyword overlap is credited (no-space LCS)', () => {
  const th = {
    seoTitle: 'การเจริญเติบโตของเด็ก', slug: 'thai-growth', metaDescription: 'การเจริญเติบโตของเด็กและส่วนสูงสำหรับผู้ปกครองที่ต้องการทราบข้อมูลที่ถูกต้องและครบถ้วน',
    h1: 'การเจริญเติบโตของเด็ก', primaryKeyword: 'การเจริญเติบโต', secondaryKeywords: [],
    sections: [ { heading: 'a', html: '<p>การเจริญเติบโตของเด็กสำคัญมาก</p>', imagePrompt: 'x', imageUrl: null } ],
    faq: [],
  };
  const r = scoreArticle(th, 'th');
  const titleItem = r.details.find((d) => d.label === '제목 키워드');
  assert.ok(titleItem.score > 0, 'thai title keyword should be credited');
});
