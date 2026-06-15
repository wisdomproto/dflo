import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLangReady, selectReadyTopics, buildScheduledAtIso, planSchedule } from '../lib/blog-schedule.mjs';

const ready = { sections: [{ html: '<p>a</p>', imageUrl: 'u1' }, { html: '<p>b</p>', imageUrl: 'u2' }] };
const noImg = { sections: [{ html: '<p>a</p>', imageUrl: null }] };
const noHtml = { sections: [{ html: '  ', imageUrl: 'u' }] };
const empty = { sections: [] };

test('isLangReady: 모든 섹션 이미지+본문이면 true', () => {
  assert.equal(isLangReady(ready), true);
  assert.equal(isLangReady(noImg), false);
  assert.equal(isLangReady(noHtml), false);
  assert.equal(isLangReady(empty), false);
  assert.equal(isLangReady(undefined), false);
});

test('selectReadyTopics: 모든 대상 언어 준비된 토픽만, sortOrder 정렬', () => {
  const arts = [
    { id: 'b', sortOrder: 2, blog: { ko: ready, th: ready } },
    { id: 'a', sortOrder: 1, blog: { ko: ready, th: ready } },
    { id: 'c', sortOrder: 3, blog: { ko: ready, th: noImg } },   // th 미준비 → 제외
    { id: 'd', sortOrder: 4, blog: { ko: ready } },               // th 없음 → 제외
  ];
  assert.deepEqual(selectReadyTopics(arts, ['ko', 'th']).map((a) => a.id), ['a', 'b']);
});

test('buildScheduledAtIso: 09:00 KST(+540) = 00:00Z 같은 날', () => {
  assert.equal(buildScheduledAtIso('2026-06-16', '09:00', 540), '2026-06-16T00:00:00.000Z');
});

test('buildScheduledAtIso: 자정 KST 넘는 시각 처리', () => {
  // 00:30 KST = 전날 15:30 UTC
  assert.equal(buildScheduledAtIso('2026-06-16', '00:30', 540), '2026-06-15T15:30:00.000Z');
});

test('planSchedule: 하루 1토픽, skip 제외, 시작일부터 순차', () => {
  const topics = [{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 2 }, { id: 'c', sortOrder: 3 }];
  const plan = planSchedule(topics, { startDate: '2026-06-16', time: '09:00', tzOffsetMin: 540, skipArticleIds: new Set(['b']) });
  assert.deepEqual(plan, [
    { articleId: 'a', sortOrder: 1, scheduledAtIso: '2026-06-16T00:00:00.000Z' },
    { articleId: 'c', sortOrder: 3, scheduledAtIso: '2026-06-17T00:00:00.000Z' },
  ]);
});
