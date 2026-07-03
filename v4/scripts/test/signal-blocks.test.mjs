import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSignalBlocks, ALWAYS_SHOW } from '../../src/features/website/report/signalBlocks.ts';

const base = { gender: 'male', age: 10, currentHeight: 140, predicted: 175, percentile: 50 };
const emptySurvey = {};

test('안심군: 트리거 없어도 보편 블록(수면·영양·운동)은 노출', () => {
  const ids = selectSignalBlocks(base, emptySurvey);
  for (const id of ALWAYS_SHOW) assert.ok(ids.includes(id));
});

test('늦은 취침 → sleep', () => {
  assert.ok(selectSignalBlocks(base, { sleepTime: '23:30' }).includes('sleep'));
});

test('비염/알러지 → inflammation', () => {
  assert.ok(selectSignalBlocks(base, { pastConditions: '알러지성 비염' }).includes('inflammation'));
});

test('성장 느려짐 / 연 4cm 미만 → growthVelocity', () => {
  assert.ok(selectSignalBlocks(base, { growthPattern: '거의 안 자라는 것 같음' }).includes('growthVelocity'));
  assert.ok(selectSignalBlocks(base, { yearlyGrowth: '3' }).includes('growthVelocity'));
});

test('저출생/조산 → sga', () => {
  assert.ok(selectSignalBlocks(base, { birthWeight: '2.3' }).includes('sga'));
  assert.ok(selectSignalBlocks(base, { gestationalWeeks: '35' }).includes('sga'));
});

test('부모키 있으면 genetics, 없으면 숨김', () => {
  assert.ok(selectSignalBlocks({ ...base, fatherHeight: 165, motherHeight: 152 }, {}).includes('genetics'));
  assert.ok(!selectSignalBlocks(base, {}).includes('genetics'));
});

test('사춘기 이른 신호 → puberty (여아 유방발달 조기)', () => {
  const girl = { gender: 'female', age: 8.5, currentHeight: 130, predicted: 158, percentile: 50 };
  assert.ok(selectSignalBlocks(girl, { breastDevelopment: '봉우리 시작' }).includes('puberty'));
});

test('결과는 고정 순서로 정렬되어 반환', () => {
  const ids = selectSignalBlocks({ ...base, fatherHeight: 165, motherHeight: 152 }, { sleepTime: '23:30', pastConditions: '비염' });
  const order = ['sleep','inflammation','nutrition','exercise','puberty','genetics','obesity','growthVelocity','sga','stress'];
  const idx = ids.map((id) => order.indexOf(id));
  assert.deepEqual(idx, [...idx].sort((a,b)=>a-b));
});
