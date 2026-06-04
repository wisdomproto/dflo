import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveProgramImgPath, localizeProgramImages } from '../lib/program-img.mjs';

test('언어 폴더에 있으면 언어 경로', () => {
  const exists = (p) => p === 'th/growth-hormone-balance/director.jpg';
  assert.equal(
    resolveProgramImgPath('th', 'growth-hormone-balance', 'director.jpg', exists),
    '/programs/images/th/growth-hormone-balance/director.jpg',
  );
});

test('언어 폴더에 없으면 _common fallback', () => {
  const exists = (p) => p === '_common/growth-hormone-balance/hero.jpg';
  assert.equal(
    resolveProgramImgPath('th', 'growth-hormone-balance', 'hero.jpg', exists),
    '/programs/images/_common/growth-hormone-balance/hero.jpg',
  );
});

test('ko 도 _common 을 본다 (ko 폴더 없음)', () => {
  const exists = (p) => p === '_common/late-growth/card-1.jpg';
  assert.equal(
    resolveProgramImgPath('ko', 'late-growth', 'card-1.jpg', exists),
    '/programs/images/_common/late-growth/card-1.jpg',
  );
});

test('둘 다 없으면 null', () => {
  const exists = () => false;
  assert.equal(resolveProgramImgPath('en', 'obesity-growth', 'cause-1.jpg', exists), null);
});

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'progimg-'));
  mkdirSync(join(root, '_common/growth-hormone-balance'), { recursive: true });
  mkdirSync(join(root, 'th/growth-hormone-balance'), { recursive: true });
  writeFileSync(join(root, '_common/growth-hormone-balance/hero.jpg'), 'x');
  writeFileSync(join(root, '_common/growth-hormone-balance/director.jpg'), 'x');
  writeFileSync(join(root, 'th/growth-hormone-balance/director.jpg'), 'x');
  return root;
}

test('localize: th 는 번역본 우선 + 나머지 _common', () => {
  const root = makeFixture();
  const html = '<img src="/programs/images/growth-hormone-balance/hero.jpg"><img src="/programs/images/growth-hormone-balance/director.jpg">';
  const out = localizeProgramImages(html, 'th', root, () => {});
  assert.match(out, /_common\/growth-hormone-balance\/hero\.jpg/);
  assert.match(out, /th\/growth-hormone-balance\/director\.jpg/);
});

test('localize: 누락 시 원본 유지 + warn 호출', () => {
  const root = makeFixture();
  const warned = [];
  const html = '<img src="/programs/images/growth-hormone-balance/missing.jpg">';
  const out = localizeProgramImages(html, 'ko', root, (m) => warned.push(m));
  assert.match(out, /\/programs\/images\/growth-hormone-balance\/missing\.jpg/);
  assert.equal(warned.length, 1);
});
