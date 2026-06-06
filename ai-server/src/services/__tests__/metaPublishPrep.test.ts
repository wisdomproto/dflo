import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePublish, targetIdFor, htmlToText } from '../metaPublishPrep.js';

test('IG는 이미지 없으면 거부', () => {
  assert.equal(validatePublish('instagram', []).ok, false);
  assert.equal(validatePublish('instagram', ['u']).ok, true);
});
test('FB/Threads는 텍스트만도 허용', () => {
  assert.equal(validatePublish('facebook', []).ok, true);
  assert.equal(validatePublish('threads', []).ok, true);
});
test('targetIdFor: 플랫폼별 채널 id 선택', () => {
  const ch = { platform: 'instagram', meta_page_id: 'P', meta_ig_id: 'IG', meta_threads_id: 'T' };
  assert.equal(targetIdFor(ch, 'instagram'), 'IG');
  assert.equal(targetIdFor(ch, 'facebook'), 'P');
  assert.equal(targetIdFor(ch, 'threads'), 'T');
});
test('htmlToText: 태그 제거 + 공백 정리', () => {
  assert.equal(htmlToText('<p>안녕 <b>키</b></p>'), '안녕 키');
});
