import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCaseSlides } from '../../src/features/website/lib/selectCaseSlides.ts';

// 뷰어 슬라이드 선택 = 딥링크(?case=N) + 노출필터(?only=…). 경량 엔트리와 React 라우트가 공유하는 순수함수.
const sections = [
  {
    id: 's1', showNav: true,
    slides: [
      { id: 'intro', template: 'banner', order: 0 },
      { id: 'c1', template: 'cases', order: 1 },
      { id: 'c2', template: 'cases', order: 2 },
      { id: 'c3', template: 'cases', order: 3 },
      { id: 'c4', template: 'cases', order: 4 },
    ],
  },
];

test('no params → 모든 슬라이드, 첫 케이스 슬라이드에서 시작(인트로 건너뜀)', () => {
  const r = selectCaseSlides(sections, {});
  assert.equal(r.slides.length, 5);
  assert.equal(r.initialIndex, 1); // intro(0) 다음 첫 cases
});

test('?case=2 → 2번째 케이스(c2)를 초기 인덱스로', () => {
  const r = selectCaseSlides(sections, { caseParam: 2 });
  assert.equal(r.slides[r.initialIndex].id, 'c2');
});

test('?only=1,3 → 노출 케이스만 남기고 인트로 제외', () => {
  const r = selectCaseSlides(sections, { onlyParam: '1,3' });
  assert.deepEqual(r.slides.map((s) => s.id), ['c1', 'c3']);
});

test('?only 에 없어도 딥링크 케이스는 항상 포함', () => {
  const r = selectCaseSlides(sections, { caseParam: 4, onlyParam: '1,3' });
  const ids = r.slides.map((s) => s.id);
  assert.ok(ids.includes('c4'), 'deep-linked c4 must survive the only-filter');
  assert.equal(r.slides[r.initialIndex].id, 'c4');
});

test('cases 슬라이드 없는 섹션 → 빈 결과(폴백 안전)', () => {
  const r = selectCaseSlides([{ id: 'x', slides: [{ id: 'b', template: 'banner', order: 0 }] }], {});
  assert.equal(r.slides.length, 0);
});
