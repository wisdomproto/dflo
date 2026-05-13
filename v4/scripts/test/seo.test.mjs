import { test } from 'node:test';
import assert from 'node:assert';
import { buildHead, buildHreflang, buildSeo } from '../lib/seo.mjs';

test('buildSeo returns ko-specific title/description', () => {
  const seo = buildSeo('ko');
  assert.match(seo.title, /187 성장클리닉/);
  assert.ok(seo.description.length > 50);
});

test('buildHreflang emits 7 alternates + x-default', () => {
  const tags = buildHreflang();
  assert.ok(tags.includes('hreflang="ko"'));
  assert.ok(tags.includes('hreflang="th"'));
  assert.ok(tags.includes('hreflang="vi"'));
  assert.ok(tags.includes('hreflang="en"'));
  assert.ok(tags.includes('hreflang="ja"'));
  assert.ok(tags.includes('hreflang="zh-TW"'));
  assert.ok(tags.includes('hreflang="id"'));
  assert.ok(tags.includes('hreflang="x-default"'));
});

test('buildHead includes canonical for the given lang', () => {
  const head = buildHead('ko');
  assert.ok(head.includes('rel="canonical" href="https://www.dr187growup.com/test/ko/"'));
  assert.ok(head.includes('property="og:locale" content="ko_KR"'));
});
