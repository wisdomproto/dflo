// 국가 → 성장표준 매핑. 틀리면 예측키가 조용히 다른 인구 기준으로 계산된다
// (에러가 안 나므로 테스트가 유일한 방어선).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growthStandardOf } from '../../src/shared/data/countries.ts';

test('자국 LMS 를 가진 나라는 그 표준을 쓴다', () => {
  assert.equal(growthStandardOf('KR'), 'KR');
  assert.equal(growthStandardOf('TH'), 'TH');
  assert.equal(growthStandardOf('ID'), 'ID');
});

test('중화권은 CN 표준을 공유한다', () => {
  for (const c of ['CN', 'TW', 'HK', 'MO', 'SG']) {
    assert.equal(growthStandardOf(c), 'CN', `${c} → CN`);
  }
});

test('CDC 채택국은 US 표준을 공유한다', () => {
  for (const c of ['US', 'AU', 'CA', 'NZ']) {
    assert.equal(growthStandardOf(c), 'US', `${c} → US`);
  }
});

test('매핑에 없는 코드는 WHO 로 떨어진다', () => {
  // ★특정 나라를 WHO 로 못박지 않는다 — 자국 LMS 를 확보할 때마다 매핑은 늘어나고,
  //   그때 이 테스트가 발목을 잡으면 안 된다. 폴백 동작 자체만 고정한다.
  assert.equal(growthStandardOf('ZZ'), 'WHO');
  assert.equal(growthStandardOf('QQ'), 'WHO');
});

test('빈 값도 WHO (설문 미응답·구접수)', () => {
  assert.equal(growthStandardOf(null), 'WHO');
  assert.equal(growthStandardOf(undefined), 'WHO');
  assert.equal(growthStandardOf(''), 'WHO');
});
