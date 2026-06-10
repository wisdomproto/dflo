import { test } from 'node:test';
import assert from 'node:assert';
import { buildHead, buildHreflang, buildSeo, ACTIVE_LANGS, ALL_LANGS, HREFLANG_MAP } from '../lib/seo.mjs';

test('buildSeo returns ko-specific title/description', () => {
  const seo = buildSeo('ko');
  assert.match(seo.title, /187 성장클리닉/);
  assert.ok(seo.description.length > 50);
});

test('buildHreflang emits one alternate per ACTIVE_LANG + x-default, never an unbuilt lang', () => {
  const tags = buildHreflang();

  // Every active (shipped) lang must have an alternate.
  for (const lang of ACTIVE_LANGS) {
    assert.ok(tags.includes(`hreflang="${HREFLANG_MAP[lang]}"`), `missing active hreflang: ${lang}`);
  }
  assert.ok(tags.includes('hreflang="x-default"'));

  // Planned-but-unbuilt langs (ja/zh-tw/id) must NOT appear: emitting them creates 404
  // hreflang targets that invalidate the whole cluster in Search Console. See ACTIVE_LANGS
  // in scripts/lib/seo.mjs — a lang only joins hreflang once its pages actually ship.
  for (const lang of ALL_LANGS.filter((l) => !ACTIVE_LANGS.includes(l))) {
    assert.ok(!tags.includes(`hreflang="${HREFLANG_MAP[lang]}"`), `unbuilt hreflang leaked: ${lang}`);
  }

  // Exactly ACTIVE_LANGS + x-default alternate links, and nothing more.
  const count = (tags.match(/rel="alternate"/g) || []).length;
  assert.equal(count, ACTIVE_LANGS.length + 1);
});

test('buildHead includes canonical for the given lang', () => {
  const head = buildHead('ko');
  assert.ok(head.includes('rel="canonical" href="https://www.dr187growup.com/ko/"'));
  assert.ok(head.includes('property="og:locale" content="ko_KR"'));
});
