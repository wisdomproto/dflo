import { test } from 'node:test';
import assert from 'node:assert';
import { render } from '../lib/render.mjs';

test('render replaces simple {{key}} placeholder', () => {
  const out = render('Hello {{name}}!', { name: 'World' });
  assert.equal(out, 'Hello World!');
});

test('render walks nested paths', () => {
  const out = render('{{a.b.c}}', { a: { b: { c: 'deep' } } });
  assert.equal(out, 'deep');
});

test('render preserves text without placeholders', () => {
  const out = render('plain text', {});
  assert.equal(out, 'plain text');
});

test('render handles {{#each list}} blocks', () => {
  const tpl = '{{#each items}}<li>{{name}}</li>{{/each}}';
  const out = render(tpl, { items: [{ name: 'a' }, { name: 'b' }] });
  assert.equal(out, '<li>a</li><li>b</li>');
});

test('render throws on missing key', () => {
  assert.throws(() => render('{{missing}}', {}), /missing/);
});
