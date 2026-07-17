import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedRowToPost } from '../lib/blog-supabase.mjs';

test('blog_published row → ContentFlow 포스트 shape', () => {
  const post = publishedRowToPost({
    article_id: 'art-1',
    slug: '키-크는-법-abcdef12',
    seo_title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    html_body: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
  assert.deepEqual(post, {
    article_id: 'art-1',
    slug: '키-크는-법-abcdef12',
    title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    body_html: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
});

// article_id 는 hreflang 클러스터 키 — 없는 행(옛 데이터/캐시 글)도 깨지지 않아야 한다.
test('article_id 없는 행은 null 로 (번역 없음 취급)', () => {
  const post = publishedRowToPost({ slug: 'x', seo_title: 't', html_body: '', published_at: null });
  assert.equal(post.article_id, null);
});
