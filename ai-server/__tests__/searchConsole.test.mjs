import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRows, sumTotals, langFilter } from '../dist/services/searchConsole.js';

test('mapRows: ctr 은 비율→%, 차원 없는 행(keys 없음)도 받는다', () => {
  const [r] = mapRows([{ clicks: 32, impressions: 6142, ctr: 0.0052, position: 18.4 }]);
  assert.equal(r.clicks, 32);
  assert.equal(r.impressions, 6142);
  assert.ok(Math.abs(r.ctr - 0.52) < 1e-9);
  assert.equal(r.label, '(unknown)'); // 차원이 없으면 라벨이 없다 — 총계 계산엔 안 쓴다
  assert.deepEqual(mapRows(undefined), []);
});

test('sumTotals: 차원 없는 단일 행이면 GSC 값이 그대로 총계', () => {
  const t = sumTotals(mapRows([{ clicks: 32, impressions: 6142, ctr: 0.0052, position: 18.4 }]));
  assert.equal(t.clicks, 32);
  assert.equal(t.impressions, 6142);
  assert.ok(Math.abs(t.position - 18.4) < 1e-9);
  assert.ok(Math.abs(t.ctr - (32 / 6142) * 100) < 1e-9);
});

test('sumTotals: position 은 노출 가중 평균(단순 평균이면 꼬리가 왜곡)', () => {
  const t = sumTotals([
    { label: 'a', clicks: 1, impressions: 100, ctr: 1, position: 5 },
    { label: 'b', clicks: 0, impressions: 1, ctr: 0, position: 90 },
  ]);
  assert.ok(Math.abs(t.position - (5 * 100 + 90) / 101) < 1e-9); // 단순 평균이면 47.5
  assert.equal(t.impressions, 101);
});

test('sumTotals: 빈 입력에서 0 나눗셈 가드', () => {
  assert.deepEqual(sumTotals([]), { clicks: 0, impressions: 0, ctr: 0, position: 0 });
});

test('langFilter: 전체는 필터 없음, 언어는 page contains /{lang}/', () => {
  assert.equal(langFilter('all'), undefined);
  const f = langFilter('ja');
  assert.equal(f[0].filters[0].dimension, 'page');
  assert.equal(f[0].filters[0].operator, 'contains');
  assert.equal(f[0].filters[0].expression, '/ja/');
});
