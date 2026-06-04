import { test } from 'node:test';
import assert from 'node:assert';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap registers home + 3 subpages per active lang', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th', 'vi', 'en'], blogSlugs: {} });
  const matches = xml.match(/<loc>/g) || [];
  // 4 langs × (1 home + clinic/cases/calculator) = 16, no blog provided.
  assert.equal(matches.length, 16);
});

test('sitemap embeds xhtml:link rel=alternate for each lang', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th', 'vi', 'en'], blogSlugs: {} });
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(xml.includes('rel="alternate"'));
  assert.ok(xml.includes('hreflang="ko"'));
  assert.ok(xml.includes('hreflang="x-default"'));
});

test('sitemap adds per-post entries when blogSlugs provided', () => {
  const xml = buildSitemap({
    activeLangs: ['ko'],
    blogSlugs: { ko: ['hello-world', 'second-post'] },
  });
  assert.ok(xml.includes('/ko/blog/hello-world/'));
  assert.ok(xml.includes('/ko/blog/second-post/'));
});
