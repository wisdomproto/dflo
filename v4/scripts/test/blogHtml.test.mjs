import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, buildBlogBodyHtml, buildBlogReferencesHtml, buildBlogHtmlBody } from '../../src/features/marketing/utils/blogHtml.ts';

test('esc: 정적 빌드와 동일하게 작은따옴표까지 이스케이프', () => {
  assert.equal(esc(`<b>"a"&'b'</b>`), '&lt;b&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/b&gt;');
});

test('buildBlogBodyHtml: 섹션 제목 h2 + 이미지(lazy) + 본문 순서', () => {
  const a = { sections: [{ heading: '잠', html: '<p>충분히</p>', imageUrl: 'https://x/i.png' }], faq: [] };
  const html = buildBlogBodyHtml(a, 'ko');
  assert.match(html, /<h2>잠<\/h2>/);
  assert.match(html, /<img src="https:\/\/x\/i\.png" alt="잠" loading="lazy">/);
  assert.match(html, /<p>충분히<\/p>/);
  assert.ok(html.indexOf('<h2>') < html.indexOf('<img'));
  assert.ok(html.indexOf('<img') < html.indexOf('<p>충분히'));
});

test('buildBlogBodyHtml: imageUrl 없으면 img 생략', () => {
  const a = { sections: [{ heading: '키', html: '<p>x</p>', imageUrl: null }], faq: [] };
  assert.doesNotMatch(buildBlogBodyHtml(a, 'ko'), /<img/);
});

test('buildBlogBodyHtml: FAQ 있으면 section.post-faq 렌더', () => {
  const a = { sections: [{ heading: 'h', html: '<p>b</p>', imageUrl: null }], faq: [{ q: '몇 살부터?', a: '8세' }] };
  const html = buildBlogBodyHtml(a, 'ko');
  assert.match(html, /post-faq/);
  assert.match(html, /<h3>몇 살부터\?<\/h3><p>8세<\/p>/);
});

test('buildBlogReferencesHtml: 빈 배열이면 빈 문자열(inert)', () => {
  assert.equal(buildBlogReferencesHtml([], 'ko'), '');
});

test('buildBlogReferencesHtml: 제목·저널·PubMed·DOI 링크', () => {
  const refs = [{ title: 'Sleep & growth', journal: 'Pediatrics', year: 2020, url: 'https://pubmed/1', doi: '10.1/x' }];
  const html = buildBlogReferencesHtml(refs, 'ko');
  assert.match(html, /참고문헌/);
  assert.match(html, /Sleep &amp; growth/);
  assert.match(html, /href="https:\/\/pubmed\/1"/);
  assert.match(html, /href="https:\/\/doi\.org\/10\.1\/x"/);
});

test('buildBlogHtmlBody: 본문 + 참고문헌 결합', () => {
  const a = { sections: [{ heading: 'h', html: '<p>b</p>', imageUrl: null }], faq: [] };
  const refs = [{ title: 'T', journal: 'J', year: 2021, url: 'https://p/1', doi: null }];
  const html = buildBlogHtmlBody(a, refs, 'ko');
  assert.ok(html.indexOf('<p>b</p>') < html.indexOf('post-references'));
});
