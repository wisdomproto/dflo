import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

test('build:i18n generates /test/ko/index.html with no placeholders left', () => {
  execSync('node scripts/build-i18n.mjs', { cwd: process.cwd(), stdio: 'pipe' });

  const outPath = 'public/test/ko/index.html';
  assert.ok(existsSync(outPath), `${outPath} should exist after build`);

  const html = readFileSync(outPath, 'utf8');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no {{placeholder}} should remain');
  assert.ok(/<html\s+lang="ko"/.test(html), 'html lang attribute should be ko');
  assert.ok(html.includes('우리 아이 키'), 'should contain Korean hero copy');
});
