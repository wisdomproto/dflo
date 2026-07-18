import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLocale } from '../../src/shared/lib/analyticsLocale.ts';

// ★중국어 페이지에서 한국 광고 픽셀(VITE_META_PIXEL_ID_KO)이 발사되던 버그의 회귀 방지.
// getLocale 이 zh-hant/zh-hans 를 'ko' 로 떨어뜨리면 pixelIdsForLocale('ko') = 한국 픽셀이 된다.
test('getLocale picks zh-hant/zh-hans, not ko (Korean ad pixel must not fire on Chinese pages)', () => {
  assert.equal(getLocale('/zh-hant/index.html'), 'zh-hant');
  assert.equal(getLocale('/zh-hans/'), 'zh-hans');
  assert.equal(getLocale('/zh-hant/calculator.html'), 'zh-hant');
});

test('getLocale still resolves the existing locales', () => {
  assert.equal(getLocale('/ko/'), 'ko');
  assert.equal(getLocale('/th/blog/'), 'th');
  assert.equal(getLocale('/en/'), 'en');
  // ar 이 'ko' 로 떨어지면 한국 광고 픽셀이 아랍어 페이지에서 발사된다.
  assert.equal(getLocale('/ar/index.html'), 'ar');
  assert.equal(getLocale('/ar/'), 'ar');
  assert.equal(getLocale('/'), 'ko'); // root → ko fallback (/ → /ko/ 301 이라 의도된 것)
  assert.equal(getLocale('/app/home'), 'ko'); // 비로케일 경로 → ko
});
