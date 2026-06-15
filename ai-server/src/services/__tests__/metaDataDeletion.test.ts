import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignedRequest, buildSignedRequest, deletionConfirmationCode } from '../metaDataDeletion.js';

const SECRET = 'test_app_secret_123';

test('parseSignedRequest: 유효한 서명 → payload', () => {
  const signed = buildSignedRequest({ user_id: '999', algorithm: 'HMAC-SHA256' }, SECRET);
  const p = parseSignedRequest(signed, SECRET);
  assert.equal(p?.user_id, '999');
});

test('parseSignedRequest: 시크릿 틀리면 null', () => {
  const signed = buildSignedRequest({ user_id: '999' }, SECRET);
  assert.equal(parseSignedRequest(signed, 'wrong_secret'), null);
});

test('parseSignedRequest: 서명 변조 시 null', () => {
  const signed = buildSignedRequest({ user_id: '999' }, SECRET);
  const tampered = 'AAAA' + signed.slice(4);
  assert.equal(parseSignedRequest(tampered, SECRET), null);
});

test('parseSignedRequest: 형식 불량 / 빈 입력 → null', () => {
  assert.equal(parseSignedRequest('', SECRET), null);
  assert.equal(parseSignedRequest('no-dot-here', SECRET), null);
  assert.equal(parseSignedRequest('abc.', SECRET), null);
});

test('deletionConfirmationCode: 결정적 16자', () => {
  const a = deletionConfirmationCode('999', SECRET);
  const b = deletionConfirmationCode('999', SECRET);
  assert.equal(a, b);
  assert.equal(a.length, 16);
  assert.notEqual(deletionConfirmationCode('1000', SECRET), a);
});
