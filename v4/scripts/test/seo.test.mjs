import { test } from 'node:test';
import assert from 'node:assert';
import { buildHead, buildHreflang, buildSeo, gaSnippet, pixelSnippet, ACTIVE_LANGS, ALL_LANGS, HREFLANG_MAP, OG_LOCALE_MAP, ORIGIN, PATH_PREFIX } from '../lib/seo.mjs';

test('buildSeo returns ko-specific title/description', () => {
  const seo = buildSeo('ko');
  assert.match(seo.title, /187 성장클리닉/);
  assert.ok(seo.description.length > 50);
});

test('buildHreflang emits one alternate per ACTIVE_LANG + x-default, never an unbuilt lang', () => {
  const tags = buildHreflang();

  // Every active (shipped) lang must have an alternate.
  for (const lang of ACTIVE_LANGS) {
    assert.ok(tags.includes(`hreflang="${HREFLANG_MAP[lang]}"`), `missing active hreflang: ${lang}`);
  }
  assert.ok(tags.includes('hreflang="x-default"'));

  // Planned-but-unbuilt langs (ja/zh-tw/id) must NOT appear: emitting them creates 404
  // hreflang targets that invalidate the whole cluster in Search Console. See ACTIVE_LANGS
  // in scripts/lib/seo.mjs — a lang only joins hreflang once its pages actually ship.
  for (const lang of ALL_LANGS.filter((l) => !ACTIVE_LANGS.includes(l))) {
    assert.ok(!tags.includes(`hreflang="${HREFLANG_MAP[lang]}"`), `unbuilt hreflang leaked: ${lang}`);
  }

  // Exactly ACTIVE_LANGS + x-default alternate links, and nothing more.
  const count = (tags.match(/rel="alternate"/g) || []).length;
  assert.equal(count, ACTIVE_LANGS.length + 1);
});

// ★ 이 두 테스트를 "중복"으로 보고 지우거나 위 테스트에 합치지 말 것.
//
// 위 테스트(`buildHreflang emits one alternate per ACTIVE_LANG…`)는 **기대값을 검사 대상과 같은 맵에서
// 만들어 쓴다**(`hreflang="${HREFLANG_MAP[lang]}"`). 즉 언어를 ACTIVE_LANGS 에만 추가하고 HREFLANG_MAP 을
// 빠뜨리면, 기대 문자열이 `hreflang="undefined"` 가 되고 산출물에도 진짜로 `hreflang="undefined"` 가 찍혀
// **양쪽이 일치해 통과한다**. 개수 단언(`ACTIVE_LANGS.length + 1`)도 링크 수는 맞으니 통과.
// → 테스트 전부 초록인데 **전 언어 전 페이지의 hreflang 클러스터가 무효**가 된다(Search Console).
//
// 아래 두 테스트가 그 자기참조 함정의 바깥에 서 있는 유일한 방어선이다:
//  ① 맵 커버리지를 맵 자신이 아니라 ACTIVE_LANGS 기준으로 직접 검사
//  ② 산출물에 리터럴 'undefined'/빈 값이 없는지 + 실제 href 가 나오는지 (맵에 빈 문자열이 들어와도 잡힘)

// ① 언어 활성화 = ACTIVE_LANGS 에 추가. 그런데 hreflang 값·og:locale 은 별도 맵에서 온다.
// 맵을 빠뜨리면 undefined 가 그대로 렌더되므로, 활성 언어는 두 맵에 반드시 항목이 있어야 한다.
test('hreflang/og-locale 맵이 ACTIVE_LANGS 를 전부 커버한다(맵 누락 = 전 페이지 hreflang 무효)', () => {
  for (const lang of ACTIVE_LANGS) {
    assert.ok(HREFLANG_MAP[lang], `HREFLANG_MAP 에 '${lang}' 항목이 없다 — ACTIVE_LANGS 에 추가하면 이 맵에도 추가할 것`);
    assert.ok(OG_LOCALE_MAP[lang], `OG_LOCALE_MAP 에 '${lang}' 항목이 없다 — ACTIVE_LANGS 에 추가하면 이 맵에도 추가할 것`);
  }
});

// ② 최종 백스톱: 맵이 아니라 **렌더된 문자열**을 본다. 맵에 빈 문자열('')이 들어와
// ①을 통과하더라도 여기서 hreflang="" 로 잡힌다.
test('buildHreflang 산출물에 hreflang="undefined"/빈 값이 없고 언어별 실제 href 가 나온다', () => {
  const tags = buildHreflang();

  assert.ok(!tags.includes('hreflang="undefined"'), `hreflang="undefined" 가 렌더됐다 — HREFLANG_MAP 누락:\n${tags}`);
  assert.ok(!tags.includes('hreflang=""'), `hreflang="" 가 렌더됐다 — HREFLANG_MAP 값이 비었다:\n${tags}`);

  for (const lang of ACTIVE_LANGS) {
    assert.ok(
      tags.includes(`href="${ORIGIN}${PATH_PREFIX}/${lang}/"`),
      `'${lang}' 의 실제 href 가 산출물에 없다:\n${tags}`
    );
  }
});

test('buildHead includes canonical for the given lang', () => {
  const head = buildHead('ko');
  assert.ok(head.includes('rel="canonical" href="https://www.dr187growup.com/ko/"'));
  assert.ok(head.includes('property="og:locale" content="ko_KR"'));
});

test('gaSnippet: 측정ID 없으면 빈 문자열', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  const prevV = process.env.VITE_GA_MEASUREMENT_ID;
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  assert.equal(gaSnippet(), '');
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
  if (prevV !== undefined) process.env.VITE_GA_MEASUREMENT_ID = prevV;
});

test('gaSnippet: 측정ID 있으면 gtag 스니펫', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const s = gaSnippet();
  assert.match(s, /googletagmanager\.com\/gtag\/js\?id=G-TEST123/);
  assert.match(s, /gtag\('config', ?'G-TEST123'\)/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 있으면 head 에 gtag 포함', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const head = buildHead('ko', { path: '/' });
  assert.match(head, /gtag\/js\?id=G-TEST123/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 없으면 gtag 미포함(회귀 안전)', () => {
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  const head = buildHead('ko', { path: '/' });
  assert.doesNotMatch(head, /googletagmanager/);
});

test('gaSnippet: VITE_GA_MEASUREMENT_ID 폴백', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  delete process.env.GA_MEASUREMENT_ID;
  process.env.VITE_GA_MEASUREMENT_ID = 'G-VITE';
  assert.match(gaSnippet(), /gtag\/js\?id=G-VITE/);
  delete process.env.VITE_GA_MEASUREMENT_ID;
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
});

test('gaSnippet: 잘못된 형식 ID 는 무시(주입 방어)', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  process.env.GA_MEASUREMENT_ID = '</script><bad>';
  assert.equal(gaSnippet(), '');
  delete process.env.GA_MEASUREMENT_ID;
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
});

// 2026-06-22 회귀 방지: gtag.js 를 requestIdleCallback/setTimeout 으로 지연 로드하면
// gtag.js 가 page_view 후 한참 뒤(모바일 idle/2초 timeout)에야 떠서 engagement_time 측정 윈도우가 ~0 이 됨
// → userEngagementDuration·engagedSessions 전부 0 으로 깨졌었음. 반드시 표준 async 즉시 로드 유지.
test('gaSnippet: 표준 async 즉시 로드 — 지연 로드 금지(engagement 측정 회귀 방지)', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const s = gaSnippet();
  assert.match(s, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-TEST123">/);
  assert.doesNotMatch(s, /requestIdleCallback/);
  assert.doesNotMatch(s, /setTimeout/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('pixelSnippet: 표준 즉시 로드 — 지연 로드 금지(빠른 이탈 PageView 누락 방지)', () => {
  const prev = process.env.META_PIXEL_ID;
  process.env.META_PIXEL_ID = '12345678';
  const s = pixelSnippet();
  assert.match(s, /fbq\('init', ?'12345678'\)/);
  assert.match(s, /fbq\('track', ?'PageView'\)/);
  assert.doesNotMatch(s, /requestIdleCallback/);
  assert.doesNotMatch(s, /setTimeout/);
  delete process.env.META_PIXEL_ID;
  if (prev !== undefined) process.env.META_PIXEL_ID = prev;
});

test('pixelSnippet: 시장별 분리 — ko 는 _KO 픽셀만, 그 외는 기본 픽셀만', () => {
  const prevDef = process.env.META_PIXEL_ID;
  const prevKo = process.env.META_PIXEL_ID_KO;
  process.env.META_PIXEL_ID = '999009859491958,1581604220084208';
  process.env.META_PIXEL_ID_KO = '1475807327924387';

  const ko = pixelSnippet('ko');
  assert.match(ko, /fbq\('init', ?'1475807327924387'\)/);
  assert.doesNotMatch(ko, /999009859491958/);
  assert.doesNotMatch(ko, /1581604220084208/);

  const th = pixelSnippet('th');
  assert.match(th, /fbq\('init', ?'999009859491958'\)/);
  assert.match(th, /fbq\('init', ?'1581604220084208'\)/);
  assert.doesNotMatch(th, /1475807327924387/);

  // _KO 미설정 시 ko 도 기본으로 폴백(graceful)
  delete process.env.META_PIXEL_ID_KO;
  const koFallback = pixelSnippet('ko');
  assert.match(koFallback, /fbq\('init', ?'999009859491958'\)/);

  delete process.env.META_PIXEL_ID;
  if (prevDef !== undefined) process.env.META_PIXEL_ID = prevDef;
  if (prevKo !== undefined) process.env.META_PIXEL_ID_KO = prevKo;
});

// 시장별 픽셀 분리 — `VITE_META_PIXEL_ID_<LANG>` 하나만 채우면 그 언어만 갈린다.
// ko(한국 광고)·en(영어권) 사용 중. 전용 값이 없는 언어는 기본 픽셀로 폴백해야 한다(무회귀).
test('pixelSnippet: 언어 전용 픽셀은 그 언어만, 나머지는 기본으로 폴백', () => {
  process.env.META_PIXEL_ID = '11111111';
  process.env.META_PIXEL_ID_EN = '22222222';
  process.env.META_PIXEL_ID_KO = '33333333';

  assert.match(pixelSnippet('en'), /fbq\('init', ?'22222222'\)/);
  assert.doesNotMatch(pixelSnippet('en'), /11111111/);      // 기본 픽셀이 섞이면 귀속이 흐려짐
  assert.match(pixelSnippet('ko'), /fbq\('init', ?'33333333'\)/);
  // 전용 값 없는 언어(th/vi) → 기본
  assert.match(pixelSnippet('th'), /fbq\('init', ?'11111111'\)/);
  assert.match(pixelSnippet('vi'), /fbq\('init', ?'11111111'\)/);

  delete process.env.META_PIXEL_ID_EN;
  // 전용 값을 지우면 그 언어도 기본으로 (env 하나로 켜고 끈다)
  assert.match(pixelSnippet('en'), /fbq\('init', ?'11111111'\)/);

  delete process.env.META_PIXEL_ID;
  delete process.env.META_PIXEL_ID_KO;
});
