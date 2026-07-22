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

test('throws if lang has TBD url', () => {
  // id is the remaining stub locale (not active) whose url is still TBD.
  assert.throws(
    () => getMessengerCTA('id', { requireLiveUrl: true }),
    /TBD/,
  );
});

test('returns stub data without requireLiveUrl', () => {
  const cta = getMessengerCTA('id');
  assert.equal(cta.channel, 'whatsapp');
  assert.equal(cta.url, 'TBD');
});

// ===== 1:1 상담 채널 시트 (th/vi/en) =====
// _shell.js 는 consult_channels 길이>1 일 때만 시트를 띄운다 → ko 에 실수로 추가되면
// 카톡 직행 + 예약 폼 동선이 시트로 바뀌어 버린다.
test('ko has no consult sheet (single Kakao channel)', () => {
  assert.equal(getMessengerCTA('ko').consult_channels, undefined);
});

// 중국어(번체·간체)는 카카오를 뺀 2채널 — 의도된 예외다.
// 대만·동남아/미국 화교에게 카카오는 쓸 이유가 없다. 3채널 관행에 맞춘다며
// 되돌려 놓지 말 것. consult.html 은 채널 2개(>1)로도 정상 생성된다.
test('Chinese locales drop Kakao — 2 channels, WhatsApp then LINE', () => {
  for (const lang of ['zh-hant', 'zh-hans']) {
    const chans = getMessengerCTA(lang).consult_channels;
    assert.ok(Array.isArray(chans), `${lang} should have consult_channels`);
    assert.equal(chans.length, 2, `${lang} channel count`);
    assert.deepEqual(chans.map((c) => c.channel), ['whatsapp', 'line']);
    assert.ok(!chans.some((c) => c.channel === 'kakao'), `${lang} 에 카카오가 되돌아왔다`);
    assert.equal(getMessengerCTA(lang).channel, 'whatsapp', `${lang} lead pill = WhatsApp`);
  }
});

// 아랍어(MENA)는 WhatsApp 지배 채널 → 대표 WhatsApp. 카카오/라인 무의미하나
// 상담 페이지 생성(채널>1) 위해 LINE 을 보조로 둔다(zh 선례). 되돌려 카카오 넣지 말 것.
test('Arabic leads with WhatsApp — 2 channels, no Kakao', () => {
  const cta = getMessengerCTA('ar');
  assert.equal(cta.channel, 'whatsapp');
  assert.match(cta.url, /wa\.me\//);
  const chans = cta.consult_channels;
  assert.ok(Array.isArray(chans), 'ar should have consult_channels');
  assert.equal(chans.length, 2, 'ar channel count');
  assert.deepEqual(chans.map((c) => c.channel), ['whatsapp', 'line']);
  assert.ok(!chans.some((c) => c.channel === 'kakao'), 'ar 에 카카오가 되돌아왔다');
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
