import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localeToCountry, randomLocaleName } from '../../src/features/website/lib/anonymousName.ts';

// ★익명 예측이 insert 시점에 국적·이름을 굳혀 저장한다 → 중국어를 'en'/'EN'/영어 이름으로
// 떨어뜨리면 DB 가 영구 오염된다. 번체=TW, 간체=ZH(중립, 본토 아님).
test('Chinese locales map to their own country bucket, not EN', () => {
  assert.equal(localeToCountry('zh-hant'), 'TW');
  assert.equal(localeToCountry('zh-hans'), 'ZH');
});

test('existing locale country codes unchanged', () => {
  assert.equal(localeToCountry('ko'), 'KR');
  assert.equal(localeToCountry('th'), 'TH');
  assert.equal(localeToCountry('vi'), 'VN');
  assert.equal(localeToCountry('en'), 'EN');
  assert.equal(localeToCountry('xx'), 'EN'); // 미지원 → en 폴백(기존 동작)
});

test('randomLocaleName draws from the matching Chinese pool (Han script)', () => {
  const han = /[一-鿿]/;
  for (let i = 0; i < 20; i++) {
    assert.match(randomLocaleName('zh-hant'), han, 'zh-hant name should be Chinese');
    assert.match(randomLocaleName('zh-hans'), han, 'zh-hans name should be Chinese');
  }
});
