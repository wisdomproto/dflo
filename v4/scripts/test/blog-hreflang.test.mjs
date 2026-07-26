import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHreflangPaths, buildHreflang, buildBlogPostHead, buildHead } from '../lib/seo.mjs';
import { buildSitemap } from '../lib/sitemap.mjs';

// 배경: 블로그 slug 는 언어마다 다르다(en "adhd-medication-effect-on-height-children"
// ↔ th "adhd-med-child-height-growth"). 예전엔 hreflang 을 "모든 언어가 같은 slug" 로 만들어서
// 존재하지 않는 URL 을 가리켰고, 우리 호스팅은 그걸 404 가 아니라 200 + 한국어 SPA 셸로 응답해
// soft-404 가 됐다(글 240편 × 3언어). 아래는 그 회귀를 막는다.

test('buildHreflangPaths — 주어진 언어만, 언어별 실제 경로로', () => {
  const html = buildHreflangPaths({ en: '/blog/en-slug/', th: '/blog/th-slug/' });
  assert.match(html, /hreflang="en" href="[^"]*\/en\/blog\/en-slug\/"/);
  assert.match(html, /hreflang="th" href="[^"]*\/th\/blog\/th-slug\/"/);
  assert.doesNotMatch(html, /hreflang="vi"/);           // 번역 없는 언어는 안 나와야
  assert.doesNotMatch(html, /hreflang="ko"/);
  assert.doesNotMatch(html, /x-default/);               // ko 없으면 x-default 도 없음
});

test('buildHreflangPaths — ko 가 있으면 x-default 는 ko 경로', () => {
  const html = buildHreflangPaths({ ko: '/blog/ko-slug/', en: '/blog/en-slug/' });
  assert.match(html, /hreflang="x-default" href="[^"]*\/ko\/blog\/ko-slug\/"/);
});

test('buildHreflang — 전 언어 공통 경로(홈·서브페이지)는 그대로', () => {
  const html = buildHreflang('/cases.html');
  for (const lang of ['ko', 'th', 'vi', 'en']) {
    assert.match(html, new RegExp(`hreflang="${lang}" href="[^"]*/${lang}/cases\\.html"`));
  }
  assert.match(html, /hreflang="x-default"/);
});

test('blog post head — altSlugs 로 언어별 실제 slug 를 가리킨다', () => {
  const head = buildBlogPostHead({
    post: { slug: 'en-slug', title: 'T', meta_description: 'd', published_at: null },
    lang: 'en',
    altSlugs: { ko: 'ko-slug', en: 'en-slug', th: 'th-slug' },
  });
  assert.match(head, /hreflang="ko" href="[^"]*\/ko\/blog\/ko-slug\/"/);
  assert.match(head, /hreflang="th" href="[^"]*\/th\/blog\/th-slug\/"/);
  assert.match(head, /rel="canonical" href="[^"]*\/en\/blog\/en-slug\/"/);
  // ★핵심 회귀: 다른 언어에 en 의 slug 를 붙이면 안 된다
  assert.doesNotMatch(head, /\/ko\/blog\/en-slug\//);
  assert.doesNotMatch(head, /\/th\/blog\/en-slug\//);
  assert.doesNotMatch(head, /\/vi\/blog\/en-slug\//);
});

test('blog post head — altSlugs 없으면 자기 자신만(번역 없음)', () => {
  const head = buildBlogPostHead({
    post: { slug: 'only', title: 'T', meta_description: '', published_at: null },
    lang: 'th',
  });
  assert.match(head, /hreflang="th" href="[^"]*\/th\/blog\/only\/"/);
  assert.doesNotMatch(head, /hreflang="ko"/);
  assert.doesNotMatch(head, /hreflang="en"/);
});

test('sitemap — 블로그 alternate 는 article_id 클러스터 기준', () => {
  const xml = buildSitemap({
    activeLangs: ['ko', 'th', 'vi', 'en'],
    blogSlugs: { ko: ['ko-slug'], th: ['th-slug'], vi: [], en: ['en-slug'] },
    blogAlts: {
      ko: { 'ko-slug': { ko: 'ko-slug', th: 'th-slug', en: 'en-slug' } },
      th: { 'th-slug': { ko: 'ko-slug', th: 'th-slug', en: 'en-slug' } },
      en: { 'en-slug': { ko: 'ko-slug', th: 'th-slug', en: 'en-slug' } },
    },
  });
  // en 글 블록이 ko/th 의 진짜 slug 를 alternate 로 가져야
  assert.match(xml, /<loc>[^<]*\/en\/blog\/en-slug\/<\/loc>/);
  assert.match(xml, /hreflang="ko" href="[^"]*\/ko\/blog\/ko-slug\/"/);
  assert.match(xml, /hreflang="th" href="[^"]*\/th\/blog\/th-slug\/"/);
  // 없는 조합(다른 언어에 남의 slug)은 절대 나오면 안 됨
  assert.doesNotMatch(xml, /\/th\/blog\/en-slug\//);
  assert.doesNotMatch(xml, /\/vi\/blog\/[a-z-]*slug\//);   // vi 는 미발행
});

test('sitemap — 네임스페이스는 스펙 값(슬래시)', () => {
  const xml = buildSitemap({ activeLangs: ['ko'], blogSlugs: {} });
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.doesNotMatch(xml, /sitemap-0\.9/);
});

// consult.html 은 th/vi/en 만 빌드된다(ko 는 카톡 직행 + 예약 동선) — ko 를 hreflang·sitemap 에
// 넣으면 /ko/consult.html 은 404 가 아니라 200 + 한국어 SPA 셸이라 soft-404 가 된다.
test('buildHead — 언어 한정 페이지는 altPaths 로 그 언어만 hreflang', () => {
  const head = buildHead('en', {
    path: '/consult.html',
    skipJsonLd: true,
    altPaths: { th: '/consult.html', vi: '/consult.html', en: '/consult.html' },
  });
  assert.match(head, /hreflang="th" href="[^"]*\/th\/consult\.html"/);
  assert.match(head, /hreflang="en" href="[^"]*\/en\/consult\.html"/);
  assert.doesNotMatch(head, /\/ko\/consult\.html/);   // ★ ko 판은 없다
  assert.doesNotMatch(head, /x-default/);             // ko 없으면 x-default 도 없음
});

test('buildHead — altPaths 없으면 전 언어(기존 페이지 무회귀)', () => {
  const head = buildHead('en', { path: '/cases.html', skipJsonLd: true });
  for (const lang of ['ko', 'th', 'vi', 'en']) {
    assert.match(head, new RegExp(`hreflang="${lang}" href="[^"]*/${lang}/cases\\.html"`));
  }
});

test('sitemap — consultLangs 만 consult.html 등재', () => {
  const xml = buildSitemap({
    activeLangs: ['ko', 'th', 'vi', 'en'],
    blogSlugs: {},
    consultLangs: ['th', 'vi', 'en'],
  });
  assert.match(xml, /<loc>[^<]*\/en\/consult\.html<\/loc>/);
  assert.doesNotMatch(xml, /\/ko\/consult\.html/);
});

test('sitemap — consultLangs 없으면 consult 미등재(기본값)', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th'], blogSlugs: {} });
  assert.doesNotMatch(xml, /consult\.html/);
});
