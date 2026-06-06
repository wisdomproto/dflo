import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedRowToPost } from '../lib/blog-supabase.mjs';

test('blog_published row → ContentFlow 포스트 shape', () => {
  const post = publishedRowToPost({
    slug: '키-크는-법-abcdef12',
    seo_title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    html_body: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
  assert.deepEqual(post, {
    slug: '키-크는-법-abcdef12',
    title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    body_html: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
});
