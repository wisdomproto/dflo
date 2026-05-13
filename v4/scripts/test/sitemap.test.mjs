import { test } from 'node:test';
import assert from 'node:assert';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap contains one <url> per active lang home', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th', 'vi', 'en'], blogSlugs: {} });
  const matches = xml.match(/<loc>/g) || [];
  assert.equal(matches.length, 4);
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
  assert.ok(xml.includes('/test/ko/blog/hello-world/'));
  assert.ok(xml.includes('/test/ko/blog/second-post/'));
});
