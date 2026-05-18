import { test } from 'node:test';
import assert from 'node:assert';
import { getMessengerCTA } from '../lib/messenger.mjs';

test('returns Kakao for ko', () => {
  const cta = getMessengerCTA('ko');
  assert.equal(cta.channel, 'kakao');
  assert.match(cta.url, /pf\.kakao\.com/);
  assert.equal(cta.color_bg, '#FAE100');
});

test('returns Kakao fallback for vi/en (1차 launch)', () => {
  for (const lang of ['vi', 'en']) {
    const cta = getMessengerCTA(lang);
    assert.equal(cta.channel, 'kakao', `${lang} should fallback to kakao`);
    assert.ok(cta.url.startsWith('https://'), `${lang} url should be live`);
  }
});

test('returns LINE OA for th', () => {
  const cta = getMessengerCTA('th');
  assert.equal(cta.channel, 'line');
  assert.match(cta.url, /line\.me\/R\/ti\/p\/%40894qhqtu/);
  assert.equal(cta.color_bg, '#06C755');
});

test('throws if active lang has TBD url', () => {
  assert.throws(
    () => getMessengerCTA('ja', { requireLiveUrl: true }),
    /TBD/,
  );
});

test('returns stub data without requireLiveUrl', () => {
  const cta = getMessengerCTA('ja');
  assert.equal(cta.channel, 'line');
  assert.equal(cta.url, 'TBD');
});
