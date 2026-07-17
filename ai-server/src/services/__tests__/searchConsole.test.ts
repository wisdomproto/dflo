import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapRows, sumTotals, langFilter, countryLabel } from '../searchConsole.js';

test('mapRows: GSC 의 ctr(0~1 비율)을 %로 바꾼다', () => {
  const rows = mapRows([{ keys: ['growth clinic korea'], clicks: 3, impressions: 60, ctr: 0.05, position: 8.4 }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'growth clinic korea');
  assert.equal(rows[0].clicks, 3);
  assert.equal(rows[0].ctr, 5); // 0.05 → 5%
  assert.equal(rows[0].position, 8.4);
});

test('mapRows: 빈 응답·undefined 는 빈 배열 (데이터 없는 신규 GSC 속성)', () => {
  assert.deepEqual(mapRows(undefined), []);
  assert.deepEqual(mapRows([]), []);
});

test('mapRows: 누락 필드는 0 으로 (GSC 가 필드를 생략할 수 있음)', () => {
  const rows = mapRows([{ keys: ['x'] }]);
  assert.deepEqual(rows[0], { label: 'x', clicks: 0, impressions: 0, ctr: 0, position: 0 });
  // keys 자체가 없으면 (unknown)
  assert.equal(mapRows([{ clicks: 1 }])[0].label, '(unknown)');
});

test('mapRows: keyFn 으로 라벨 가공 (국가코드 → 국가명)', () => {
  const rows = mapRows([{ keys: ['aus'], clicks: 1, impressions: 2, ctr: 0.5, position: 1 }], (k) => countryLabel(k[0]));
  assert.equal(rows[0].label, '🇦🇺 호주');
});

test('sumTotals: position 은 노출수 가중 평균 (단순 평균이면 꼬리가 왜곡한다)', () => {
  const rows = [
    { label: 'a', clicks: 10, impressions: 1000, ctr: 1, position: 2 },   // 많이 노출, 상위
    { label: 'b', clicks: 0, impressions: 1, ctr: 0, position: 90 },      // 노출 1회, 90위 꼬리
  ];
  const t = sumTotals(rows);
  assert.equal(t.clicks, 10);
  assert.equal(t.impressions, 1001);
  // 단순 평균이면 (2+90)/2 = 46 으로 터무니없다. 가중 평균은 ~2.09.
  assert.ok(t.position < 3, `가중 평균이어야 함, got ${t.position}`);
  assert.ok(Math.abs(t.position - (2 * 1000 + 90 * 1) / 1001) < 1e-9);
  // ctr 은 합계 기준 재계산 (행별 ctr 평균이 아니라)
  assert.ok(Math.abs(t.ctr - (10 / 1001) * 100) < 1e-9);
});

test('sumTotals: 노출 0 이어도 나눗셈 터지지 않는다', () => {
  const t = sumTotals([]);
  assert.deepEqual(t, { clicks: 0, impressions: 0, ctr: 0, position: 0 });
});

test('langFilter: all 은 필터 없음(전체), 언어는 page contains /{lang}/', () => {
  assert.equal(langFilter('all'), undefined);
  const f = langFilter('en');
  assert.deepEqual(f, [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/en/' }] }]);
});

test('countryLabel: 미등록 코드는 대문자 코드 그대로 (빈칸 방지)', () => {
  assert.equal(countryLabel('kor'), '🇰🇷 한국');
  assert.equal(countryLabel('MYS'), '🇲🇾 말레이시아'); // 대소문자 무관
  assert.equal(countryLabel('zzz'), 'ZZZ');
});
