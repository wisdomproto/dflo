import { test } from 'node:test';
import assert from 'node:assert';
import { lazifyImages } from '../lib/img-attrs.mjs';

test('first two imgs (logo + hero) stay eager with fetchpriority, rest get lazy + async', () => {
  const html = '<img src="/logo.png" alt="logo"><p>x</p><img src="/hero.jpg" alt="hero"><img src="/a.jpg" alt="a"><img src="/b.webp" alt="b" />';
  const out = lazifyImages(html);
  assert.ok(out.includes('<img src="/logo.png" alt="logo" fetchpriority="high">'));
  assert.ok(out.includes('<img src="/hero.jpg" alt="hero" fetchpriority="high">'));
  assert.ok(out.includes('<img src="/a.jpg" alt="a" loading="lazy" decoding="async">'));
  assert.ok(out.includes('<img src="/b.webp" alt="b" loading="lazy" decoding="async" />'));
});

test('existing loading attribute is respected beyond the eager window', () => {
  const html = '<img src="/a.png"><img src="/b.png"><img src="/y.png" loading="eager">';
  const out = lazifyImages(html);
  assert.ok(out.includes('<img src="/y.png" loading="eager">'));
  assert.ok(!out.includes('loading="eager" loading='));
});

test('img markup inside script blocks is untouched', () => {
  const html = '<img src="/a.png"><img src="/b.png"><script>const t = `<img src="${u}">`;</script><img src="/tail.jpg">';
  const out = lazifyImages(html);
  assert.ok(out.includes('const t = `<img src="${u}">`;'), 'script template literal must be preserved');
  assert.ok(out.includes('<img src="/tail.jpg" loading="lazy" decoding="async">'));
});

test('multiline img tags are handled', () => {
  const html = '<img src="/a.png"><img src="/b.png">\n<img\n  src="/two.png"\n  alt="two"\n>';
  const out = lazifyImages(html);
  assert.ok(/two\.png"\n {2}alt="two" loading="lazy" decoding="async">/.test(out.replace(/\r/g, '')));
});
