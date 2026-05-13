import { test } from 'node:test';
import assert from 'node:assert';
import { renderPost, renderIndex } from '../lib/blog.mjs';

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

test('renderIndex lists posts with links', () => {
  const posts = [
    { slug: 'a', title: 'Post A', meta_description: 'desc a', published_at: '2026-05-01' },
    { slug: 'b', title: 'Post B', meta_description: 'desc b', published_at: '2026-05-02' },
  ];
  const template = `{{#each posts}}<article><a href="/{{lang}}/blog/{{slug}}/">{{title}}</a></article>{{/each}}`;
  const html = renderIndex({
    posts, template,
    locale: { meta: { lang: 'ko' }, blog: { index_heading: 'Blog' } },
    seoHead: '',
  });
  assert.ok(html.includes('<a href="/ko/blog/a/">'));
  assert.ok(html.includes('Post B'));
});
