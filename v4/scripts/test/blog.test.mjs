import { test } from 'node:test';
import assert from 'node:assert';
import { renderPost } from '../lib/blog.mjs';

test('renderPost substitutes title and body', () => {
  const post = {
    slug: 'hello',
    title: 'Hello World',
    body_html: '<p>body</p>',
    published_at: '2026-05-01T00:00:00Z',
  };
  const template = `<h1>{{post.title}}</h1><article>{{post.body_html}}</article><div>{{post.published_at_display}}</div>`;
  const html = renderPost({
    post,
    template,
    locale: { meta: { lang: 'ko' } },
    messenger: { url: 'x', label: 'l', color_bg: '#fff', color_fg: '#000', channel: 'kakao' },
    seoHead: '',
  });
  assert.ok(html.includes('<h1>Hello World</h1>'));
  assert.ok(html.includes('<p>body</p>'));
  assert.ok(html.includes('2026'));
});
