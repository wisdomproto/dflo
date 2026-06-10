import { test } from 'node:test';
import assert from 'node:assert';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap contains exactly one <url> per active lang home', () => {
  const activeLangs = ['ko', 'th', 'vi', 'en'];
  const xml = buildSitemap({ activeLangs, blogSlugs: {} });
  // Home entries only — a <loc> ending in /{lang}/ (excludes subpage *.html and /blog/ locs).
  // Counting all <loc> tags would also pick up the clinic/cases/calculator subpages.
  for (const lang of activeLangs) {
    const homeLocs = xml.match(new RegExp(`<loc>[^<]*/${lang}/</loc>`, 'g')) || [];
    assert.equal(homeLocs.length, 1, `expected exactly one home loc for ${lang}`);
  }
});

test('sitemap lists clinic/cases/calculator subpages for each active lang', () => {
  const activeLangs = ['ko', 'th', 'vi', 'en'];
  const xml = buildSitemap({ activeLangs, blogSlugs: {} });
  for (const lang of activeLangs) {
    for (const file of ['clinic.html', 'cases.html', 'calculator.html']) {
      assert.ok(xml.includes(`<loc>https://www.dr187growup.com/${lang}/${file}</loc>`), `missing ${lang}/${file}`);
    }
  }
  // 4 homes + (3 subpages × 4 langs) = 16 indexable <loc> entries when no blog posts are present.
  const totalLocs = (xml.match(/<loc>/g) || []).length;
  assert.equal(totalLocs, 16);
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
