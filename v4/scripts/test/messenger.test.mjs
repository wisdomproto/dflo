import { test } from 'node:test';
import assert from 'node:assert';
import { getMessengerCTA } from '../lib/messenger.mjs';

test('returns Kakao for ko', () => {
  const cta = getMessengerCTA('ko');
  assert.equal(cta.channel, 'kakao');
  assert.match(cta.url, /pf\.kakao\.com/);
  assert.equal(cta.color_bg, '#FAE100');
});

test('returns Kakao for vi', () => {
  const cta = getMessengerCTA('vi');
  assert.equal(cta.channel, 'kakao');
  assert.ok(cta.url.startsWith('https://'), 'vi url should be live');
});

// en 은 2026-07-03 카톡 → WhatsApp (화교[미·동남아] 타겟). 옛 테스트는 kakao 를 기대해 깨져 있었음.
test('returns WhatsApp for en', () => {
  const cta = getMessengerCTA('en');
  assert.equal(cta.channel, 'whatsapp');
  assert.match(cta.url, /wa\.me\//);
  assert.equal(cta.color_bg, '#25D366');
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

// ===== 1:1 상담 채널 시트 (th/vi/en) =====
// _shell.js 는 consult_channels 길이>1 일 때만 시트를 띄운다 → ko 에 실수로 추가되면
// 카톡 직행 + 예약 폼 동선이 시트로 바뀌어 버린다.
test('ko has no consult sheet (single Kakao channel)', () => {
  assert.equal(getMessengerCTA('ko').consult_channels, undefined);
});

test('th/vi/en expose all 3 channels with the market lead first', () => {
  const expected = { th: 'line', vi: 'kakao', en: 'whatsapp' };
  for (const [lang, lead] of Object.entries(expected)) {
    const chans = getMessengerCTA(lang).consult_channels;
    assert.ok(Array.isArray(chans), `${lang} should have consult_channels`);
    assert.deepEqual(
      [...chans].map((c) => c.channel).sort(),
      ['kakao', 'line', 'whatsapp'],
      `${lang} should offer all 3 channels`,
    );
    assert.equal(chans[0].channel, lead, `${lang} should lead with ${lead}`);
    for (const c of chans) {
      assert.ok(c.url.startsWith('https://'), `${lang}/${c.channel} url should be live`);
      assert.ok(c.label && c.color_bg && c.color_fg, `${lang}/${c.channel} needs label+colors`);
    }
  }
});
