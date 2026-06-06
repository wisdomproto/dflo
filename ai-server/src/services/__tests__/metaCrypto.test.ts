import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../metaCrypto.js';

const KEY = crypto.randomBytes(32).toString('base64');

test('encrypt→decrypt 왕복', () => {
  const plain = JSON.stringify({ token: 'abc', pages: [1, 2] });
  const cipher = encrypt(plain, KEY);
  assert.notEqual(cipher, plain);
  assert.equal(decrypt(cipher, KEY), plain);
});

test('다른 키로 복호화 실패', () => {
  const cipher = encrypt('secret', KEY);
  const other = crypto.randomBytes(32).toString('base64');
  assert.throws(() => decrypt(cipher, other));
});

test('변조된 페이로드 복호화 실패', () => {
  const cipher = encrypt('secret', KEY);
  const parts = cipher.split('.');
  parts[2] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decrypt(parts.join('.'), KEY));
});
