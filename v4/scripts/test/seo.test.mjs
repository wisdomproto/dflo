import { test } from 'node:test';
import assert from 'node:assert';
import { buildHead, buildHreflang, buildSeo, gaSnippet, pixelSnippet, ACTIVE_LANGS, ALL_LANGS, HREFLANG_MAP } from '../lib/seo.mjs';

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

test('gaSnippet: 측정ID 없으면 빈 문자열', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  const prevV = process.env.VITE_GA_MEASUREMENT_ID;
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  assert.equal(gaSnippet(), '');
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
  if (prevV !== undefined) process.env.VITE_GA_MEASUREMENT_ID = prevV;
});

test('gaSnippet: 측정ID 있으면 gtag 스니펫', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const s = gaSnippet();
  assert.match(s, /googletagmanager\.com\/gtag\/js\?id=G-TEST123/);
  assert.match(s, /gtag\('config', ?'G-TEST123'\)/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 있으면 head 에 gtag 포함', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const head = buildHead('ko', { path: '/' });
  assert.match(head, /gtag\/js\?id=G-TEST123/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 없으면 gtag 미포함(회귀 안전)', () => {
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  const head = buildHead('ko', { path: '/' });
  assert.doesNotMatch(head, /googletagmanager/);
});

test('gaSnippet: VITE_GA_MEASUREMENT_ID 폴백', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  delete process.env.GA_MEASUREMENT_ID;
  process.env.VITE_GA_MEASUREMENT_ID = 'G-VITE';
  assert.match(gaSnippet(), /gtag\/js\?id=G-VITE/);
  delete process.env.VITE_GA_MEASUREMENT_ID;
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
});

test('gaSnippet: 잘못된 형식 ID 는 무시(주입 방어)', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  process.env.GA_MEASUREMENT_ID = '</script><bad>';
  assert.equal(gaSnippet(), '');
  delete process.env.GA_MEASUREMENT_ID;
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
});

// 2026-06-22 회귀 방지: gtag.js 를 requestIdleCallback/setTimeout 으로 지연 로드하면
// gtag.js 가 page_view 후 한참 뒤(모바일 idle/2초 timeout)에야 떠서 engagement_time 측정 윈도우가 ~0 이 됨
// → userEngagementDuration·engagedSessions 전부 0 으로 깨졌었음. 반드시 표준 async 즉시 로드 유지.
test('gaSnippet: 표준 async 즉시 로드 — 지연 로드 금지(engagement 측정 회귀 방지)', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const s = gaSnippet();
  assert.match(s, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-TEST123">/);
  assert.doesNotMatch(s, /requestIdleCallback/);
  assert.doesNotMatch(s, /setTimeout/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('pixelSnippet: 표준 즉시 로드 — 지연 로드 금지(빠른 이탈 PageView 누락 방지)', () => {
  const prev = process.env.META_PIXEL_ID;
  process.env.META_PIXEL_ID = '12345678';
  const s = pixelSnippet();
  assert.match(s, /fbq\('init', ?'12345678'\)/);
  assert.match(s, /fbq\('track', ?'PageView'\)/);
  assert.doesNotMatch(s, /requestIdleCallback/);
  assert.doesNotMatch(s, /setTimeout/);
  delete process.env.META_PIXEL_ID;
  if (prev !== undefined) process.env.META_PIXEL_ID = prev;
});
