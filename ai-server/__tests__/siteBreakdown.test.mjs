import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCountry, classifyPage, aggregateSiteBreakdown } from '../dist/services/ga4SiteBreakdown.js';

test('classifyCountry: 경로 prefix 로 국가', () => {
  assert.equal(classifyCountry('/th/clinic.html'), 'th');
  assert.equal(classifyCountry('/ko/index.html'), 'ko');
  assert.equal(classifyCountry('/vi/cases.html'), 'vi');
  assert.equal(classifyCountry('/en/'), 'en');
  // 슬래시 없는 prefix 도 같은 언어 (/vi → /vi/ 301)
  assert.equal(classifyCountry('/vi'), 'vi');
  assert.equal(classifyCountry('/en'), 'en');
  // 루트·미분류 경로는 ko 폴백 (루트는 /ko/ 로 301) — 'other' 로 떨어지지 않는다
  assert.equal(classifyCountry('/'), 'ko');
  assert.equal(classifyCountry('/calc-embed'), 'ko');
  // 중국어(번체·간체) — 하이픈 prefix. 안 잡히면 ko 에 조용히 합산된다.
  assert.equal(classifyCountry('/zh-hant/index.html'), 'zh-hant');
  assert.equal(classifyCountry('/zh-hans/calculator.html'), 'zh-hans');
  assert.equal(classifyCountry('/zh-hant'), 'zh-hant');
  assert.equal(classifyCountry('/zh-hans'), 'zh-hans');
  // 아랍어 — 안 잡히면 ko 에 조용히 합산되고 countryKeys 에서 증발한다.
  assert.equal(classifyCountry('/ar/index.html'), 'ar');
  assert.equal(classifyCountry('/ar'), 'ar');
});

test('classifyPage: 경로 → 4분류', () => {
  assert.equal(classifyPage('/th/calculator.html'), 'calculator');
  assert.equal(classifyPage('/calc-embed'), 'calculator');
  assert.equal(classifyPage('/ko/clinic.html'), 'clinic');
  assert.equal(classifyPage('/ko/cases.html'), 'cases');
  assert.equal(classifyPage('/ko/'), 'main');
  assert.equal(classifyPage('/ko/index.html'), 'main');
  assert.equal(classifyPage('/ko/blog/foo/'), 'other');
});

// vi/en 은 2026-06-30 부터 자기 버킷 (옛 'other' 제외 폐기) → all 합산에도 들어간다.
const INPUT = {
  landing: [
    { landingPage: '/ko/index.html', users: 100, newUsers: 60, sessions: 120, pageViews: 300, engagementSec: 6000 },
    { landingPage: '/th/calculator.html', users: 30, newUsers: 20, sessions: 35, pageViews: 80, engagementSec: 1750 },
    { landingPage: '/vi/index.html', users: 20, newUsers: 15, sessions: 25, pageViews: 60, engagementSec: 1000 },
    { landingPage: '/en/index.html', users: 10, newUsers: 5, sessions: 12, pageViews: 30, engagementSec: 500 },
  ],
  landingPrev: [
    { landingPage: '/ko/index.html', users: 80, newUsers: 50, sessions: 90, pageViews: 240, engagementSec: 4800 },
  ],
  pv: [
    { pagePath: '/ko/index.html', views: 200 },
    { pagePath: '/ko/clinic.html', views: 50 },
    { pagePath: '/th/calculator.html', views: 80 },
    { pagePath: '/vi/index.html', views: 60 },
    { pagePath: '/en/index.html', views: 30 },
  ],
  events: [
    { pagePath: '/ko/index.html', eventName: 'consult_click', count: 10 },
    { pagePath: '/th/calculator.html', eventName: 'calc_open', count: 20 },
    { pagePath: '/th/calculator.html', eventName: 'height_calc_complete', count: 8 },
  ],
  channels: [
    { landingPage: '/ko/index.html', channel: 'Organic Search', sessions: 80 },
    { landingPage: '/ko/index.html', channel: 'Direct', sessions: 40 },
    { landingPage: '/th/calculator.html', channel: 'Direct', sessions: 35 },
  ],
  devices: [
    { landingPage: '/ko/index.html', device: 'mobile', sessions: 100 },
    { landingPage: '/th/calculator.html', device: 'desktop', sessions: 35 },
  ],
  daily: [
    { date: '20260601', landingPage: '/ko/index.html', users: 50, sessions: 60, views: 150 },
    { date: '20260601', landingPage: '/th/calculator.html', users: 30, sessions: 35, views: 80 },
    { date: '20260602', landingPage: '/ko/index.html', users: 50, sessions: 60, views: 150 },
  ],
  // geo(유입 지역)·campaigns(utm_campaign) 는 BreakdownInput 필수 — 집계가 그대로 순회한다.
  // 이 fixture 는 언어 귀속만 검증하므로 빈 배열. 두 rollup 은 아래 GEO_INPUT/CAMPAIGN_INPUT 에서 검증.
  geo: [],
  campaigns: [],
};

test('aggregateSiteBreakdown: ko 요약/페이지/이벤트/채널/디바이스/일자별 + 직전기간', () => {
  const r = aggregateSiteBreakdown(INPUT);
  const ko = r.byCountry.ko;
  // 요약 (landingPage 기준)
  assert.equal(ko.summary.users, 100);
  assert.equal(ko.summary.newUsers, 60);
  assert.equal(ko.summary.returningUsers, 40);
  assert.equal(ko.summary.sessions, 120);
  assert.equal(ko.summary.pageViews, 300);
  assert.equal(ko.summary.avgEngagementSec, 60); // 6000/100
  assert.equal(ko.prevSummary.users, 80);
  assert.equal(ko.prevSummary.returningUsers, 30); // 80-50
  // 페이지별 (pagePath 기준)
  assert.equal(ko.pageViews.main, 200);
  assert.equal(ko.pageViews.clinic, 50);
  assert.equal(ko.pageViews.total, 250);
  // 이벤트 + 전환율
  assert.equal(ko.events.messenger, 10);
  assert.equal(ko.conversionRate, 4); // 10/250*100
  assert.equal(ko.messengerChannel, 'kakao');
  // 채널 (내림차순 + pct)
  assert.equal(ko.channels[0].label, 'Organic Search');
  assert.equal(ko.channels[0].sessions, 80);
  assert.equal(ko.channels[0].pct, 66.67); // 80/120
  // 디바이스
  assert.equal(ko.devices[0].label, 'mobile');
  // 일자별 (날짜순)
  assert.equal(ko.daily.length, 2);
  assert.equal(ko.daily[0].date, '20260601');
  assert.equal(ko.daily[0].users, 50);
});

test('aggregateSiteBreakdown: th + all 합산', () => {
  const r = aggregateSiteBreakdown(INPUT);
  const th = r.byCountry.th;
  assert.equal(th.summary.users, 30);
  assert.equal(th.events.calcOpen, 20);
  assert.equal(th.events.heightCalc, 8);
  assert.equal(th.calcCompletionRate, 40); // 8/20*100 (열람→완료 퍼널)
  assert.equal(th.events.messenger, 0);
  assert.equal(th.messengerChannel, 'line');
  assert.equal(th.pageViews.calculator, 80);

  // vi/en = 자기 버킷 (옛 'other' 제외 폐기)
  const vi = r.byCountry.vi;
  assert.equal(vi.summary.users, 20);
  assert.equal(vi.pageViews.main, 60);
  assert.equal(vi.messengerChannel, 'kakao');

  const en = r.byCountry.en;
  assert.equal(en.summary.users, 10);
  assert.equal(en.pageViews.main, 30);
  assert.equal(en.messengerChannel, 'whatsapp'); // en 은 2026-07-03 WhatsApp (옛 kakao 는 드리프트였음)

  // all = ko+th+vi+en (vi/en 도 합산 대상)
  const all = r.byCountry.all;
  assert.equal(all.summary.users, 160); // 100 + 30 + 20 + 10
  assert.equal(all.summary.sessions, 192); // 120 + 35 + 25 + 12
  assert.equal(all.summary.newUsers, 100); // 60 + 20 + 15 + 5
  assert.equal(all.pageViews.total, 420); // 250 + 80 + 60 + 30
  assert.equal(all.events.messenger, 10);
  assert.equal(all.events.calcOpen, 20);
  assert.equal(all.events.heightCalc, 8);
  assert.equal(all.calcCompletionRate, 40); // 8/20*100
  assert.equal(all.messengerChannel, 'mixed');
  assert.equal(all.summary.avgEngagementSec, 57.81); // (6000+1750+1000+500)/160
  assert.equal(all.daily.length, 2);
  assert.equal(all.daily[0].users, 80); // 20260601: 50 + 30 (daily 는 ko/th 행만)
});

// geo/campaigns 전용 fixture — 위 INPUT 의 all 합산(users 160·sessions 192 등)을 건드리지 않으려고 분리.
// 나머지 리포트는 빈 배열이라 이 fixture 로는 geo·campaigns 만 검증된다.
function inputWith(overrides) {
  return {
    landing: [], landingPrev: [], pv: [], events: [], channels: [], devices: [],
    geo: [], daily: [], campaigns: [],
    ...overrides,
  };
}

// ── 유입 지역(geo) — GA4 country/city = 방문자의 실제 위치. 언어는 landingPage 로 귀속. ──
const GEO_INPUT = inputWith({
  geo: [
    // 같은 나라·도시가 여러 랜딩으로 나뉘어 와도 한 도시로 합산된다 (Bangkok 40+10=50)
    { landingPage: '/th/index.html', country: 'Thailand', city: 'Bangkok', sessions: 40, users: 35 },
    { landingPage: '/th/calculator.html', country: 'Thailand', city: 'Bangkok', sessions: 10, users: 8 },
    { landingPage: '/th/index.html', country: 'Thailand', city: 'Chiang Mai', sessions: 12, users: 10 },
    // 태국어 사이트를 한국에서 본 방문자 (언어탭 × 유입지역 교차의 핵심 케이스)
    { landingPage: '/th/index.html', country: 'South Korea', city: 'Seoul', sessions: 8, users: 6 },
    { landingPage: '/ko/index.html', country: 'South Korea', city: 'Seoul', sessions: 100, users: 90 },
    // country/city 가 빈 문자열이면 (미상) 폴백
    { landingPage: '/th/index.html', country: '', city: '', sessions: 5, users: 4 },
  ],
});

test('aggregateSiteBreakdown: geo 는 나라▸도시 중첩 + 언어 귀속 + sessions 내림차순', () => {
  const th = aggregateSiteBreakdown(GEO_INPUT).byCountry.th;
  // th 사이트 유입 지역 총 75세션 (62 + 8 + 5) → 내림차순
  assert.deepEqual(th.geo.map((g) => g.label), ['Thailand', 'South Korea', '(미상)']);

  const [thailand, korea, unknown] = th.geo;
  assert.equal(thailand.sessions, 62); // 40 + 10 + 12
  assert.equal(thailand.users, 53); // 35 + 8 + 10
  assert.equal(thailand.pct, 82.67); // 62/75*100
  // 도시 중첩 (sessions 내림차순)
  assert.deepEqual(thailand.cities, [
    { label: 'Bangkok', sessions: 50, users: 43 }, // 두 랜딩 행이 한 도시로 합산
    { label: 'Chiang Mai', sessions: 12, users: 10 },
  ]);
  // 태국어 사이트인데 한국에서 접속한 방문자
  assert.equal(korea.sessions, 8);
  assert.deepEqual(korea.cities, [{ label: 'Seoul', sessions: 8, users: 6 }]);
  // 빈 country/city → (미상)
  assert.equal(unknown.sessions, 5);
  assert.deepEqual(unknown.cities, [{ label: '(미상)', sessions: 5, users: 4 }]);

  // ko 버킷엔 ko 랜딩 행만 (th 랜딩의 Seoul 8세션이 섞이지 않는다)
  const ko = aggregateSiteBreakdown(GEO_INPUT).byCountry.ko;
  assert.deepEqual(ko.geo, [
    { label: 'South Korea', sessions: 100, users: 90, pct: 100, cities: [{ label: 'Seoul', sessions: 100, users: 90 }] },
  ]);
});

test('aggregateSiteBreakdown: geo all = 전 언어 합산 (같은 나라는 언어 넘어 합쳐짐)', () => {
  const all = aggregateSiteBreakdown(GEO_INPUT).byCountry.all;
  // South Korea = ko 랜딩 100 + th 랜딩 8 = 108 → Thailand(62) 를 제치고 1위
  assert.deepEqual(all.geo.map((g) => g.label), ['South Korea', 'Thailand', '(미상)']);
  assert.equal(all.geo[0].sessions, 108);
  assert.equal(all.geo[0].pct, 61.71); // 108/175*100
  assert.deepEqual(all.geo[0].cities, [{ label: 'Seoul', sessions: 108, users: 96 }]);
});

test('aggregateSiteBreakdown: geo 행이 없으면 빈 배열', () => {
  const r = aggregateSiteBreakdown(inputWith({}));
  assert.deepEqual(r.byCountry.all.geo, []);
  assert.deepEqual(r.byCountry.th.geo, []);
});

test('aggregateSiteBreakdown: geo 세션이 전부 0 이면 pct 는 NaN 이 아니라 0', () => {
  // 세션 0·사용자만 있는 행(GA4 가 이런 행을 내보낼 수 있음) → geoTotal 0 = pct 가드 유일 도달 경로.
  // (행 자체가 없으면 map 이 비어 나눗셈에 도달하지 못하므로 가드가 안 걸린다)
  const th = aggregateSiteBreakdown(inputWith({
    geo: [{ landingPage: '/th/index.html', country: 'Thailand', city: 'Bangkok', sessions: 0, users: 2 }],
  })).byCountry.th;
  assert.equal(th.geo.length, 1);
  assert.equal(th.geo[0].pct, 0);
  assert.equal(th.geo[0].users, 2);
});

// ── 캠페인(utm_campaign) — TOP-LEVEL(언어를 가로지르는 광고 단위라 byCountry 아님) ──
// union 행: sessions 있으면 세션행 / eventName+count 있으면 이벤트행.
const CAMPAIGN_INPUT = inputWith({
  campaigns: [
    { campaign: 'th_calc_jul', sessions: 80 },
    { campaign: 'th_calc_jul', sessions: 40 }, // 같은 캠페인 세션행 누적 → 120
    { campaign: 'th_calc_jul', eventName: 'calc_open', count: 40 },
    { campaign: 'th_calc_jul', eventName: 'height_calc_complete', count: 10 },
    { campaign: 'th_calc_jul', eventName: 'consult_click', count: 5 },
    { campaign: 'th_calc_jul', eventName: 'page_view', count: 999 }, // 3개 이벤트 외엔 무시
    { campaign: 'ko_brand', sessions: 200 },
    { campaign: 'ko_brand', eventName: 'consult_click', count: 3 },
    // calc_open 0 인데 height_calc_complete 만 있는 캠페인 → completionRate div-by-zero 가드
    { campaign: 'en_awareness', sessions: 30 },
    { campaign: 'en_awareness', eventName: 'height_calc_complete', count: 4 },
    // 태그 안 된 트래픽 — 전부 제외
    { campaign: '(not set)', sessions: 500 },
    { campaign: '(direct)', sessions: 300 },
    { campaign: '(organic)', sessions: 100 },
    { campaign: '(referral)', sessions: 50 },
    { campaign: '', sessions: 20 },
    { campaign: '(not set)', eventName: 'calc_open', count: 70 }, // 이벤트행도 제외
  ],
});

test('aggregateSiteBreakdown: campaigns 는 태그된 캠페인만 sessions 내림차순으로', () => {
  const { campaigns } = aggregateSiteBreakdown(CAMPAIGN_INPUT);
  // (not set)/(direct)/(organic)/(referral)/빈 문자열 전부 탈락 → 3개만
  assert.deepEqual(campaigns.map((c) => c.name), ['ko_brand', 'th_calc_jul', 'en_awareness']);
  assert.deepEqual(campaigns.map((c) => c.sessions), [200, 120, 30]); // th 는 80+40 누적
});

test('aggregateSiteBreakdown: campaigns 이벤트 누적 + completionRate(div-by-zero 가드)', () => {
  const { campaigns } = aggregateSiteBreakdown(CAMPAIGN_INPUT);
  const byName = Object.fromEntries(campaigns.map((c) => [c.name, c]));

  assert.deepEqual(byName.th_calc_jul, {
    name: 'th_calc_jul', sessions: 120, calcOpen: 40, heightCalc: 10, consult: 5,
    completionRate: 25, // 10/40*100 (page_view 999 는 안 섞임)
  });
  // 이벤트행이 일부만 있는 캠페인 = 나머지 0
  assert.deepEqual(byName.ko_brand, {
    name: 'ko_brand', sessions: 200, calcOpen: 0, heightCalc: 0, consult: 3, completionRate: 0,
  });
  // calcOpen 0 → 0/0 이 아니라 0 (NaN·Infinity 아님)
  assert.equal(byName.en_awareness.calcOpen, 0);
  assert.equal(byName.en_awareness.heightCalc, 4);
  assert.equal(byName.en_awareness.completionRate, 0);
});

test('aggregateSiteBreakdown: campaigns 는 이벤트행만 있어도(세션 0) 집계된다', () => {
  const { campaigns } = aggregateSiteBreakdown(inputWith({
    campaigns: [{ campaign: 'vi_test', eventName: 'calc_open', count: 12 }],
  }));
  assert.deepEqual(campaigns, [
    { name: 'vi_test', sessions: 0, calcOpen: 12, heightCalc: 0, consult: 0, completionRate: 0 },
  ]);
});

test('aggregateSiteBreakdown: 태그된 캠페인이 없으면 빈 배열', () => {
  const { campaigns } = aggregateSiteBreakdown(inputWith({
    campaigns: [{ campaign: '(not set)', sessions: 500 }, { campaign: '(direct)', sessions: 300 }],
  }));
  assert.deepEqual(campaigns, []);
});

// ── 중국어(zh-hant/zh-hans) 버킷 — LANG_KEYS(finalize)·countryKeys(rollup)·classifyCountry·
//    messengerChannel 을 한꺼번에 검증. 전용 fixture 라 위 INPUT 의 all 합산과 무관. ──
const ZH_INPUT = inputWith({
  landing: [
    { landingPage: '/zh-hant/index.html', users: 40, newUsers: 30, sessions: 48, pageViews: 120, engagementSec: 2400 },
    { landingPage: '/zh-hans/index.html', users: 20, newUsers: 15, sessions: 24, pageViews: 60, engagementSec: 1200 },
  ],
  pv: [
    { pagePath: '/zh-hant/index.html', views: 100 },
    { pagePath: '/zh-hans/calculator.html', views: 30 },
  ],
  events: [
    { pagePath: '/zh-hant/index.html', eventName: 'consult_click', count: 5 },
    { pagePath: '/zh-hans/calculator.html', eventName: 'calc_open', count: 12 },
    { pagePath: '/zh-hans/calculator.html', eventName: 'height_calc_complete', count: 6 },
  ],
  channels: [
    { landingPage: '/zh-hant/index.html', channel: 'Direct', sessions: 48 },
  ],
});

test('aggregateSiteBreakdown: 중국어 버킷이 채워진다 (ko 에 합산되지 않음)', () => {
  const r = aggregateSiteBreakdown(ZH_INPUT);
  // 언어 귀속 — zh 행이 있는데 ko 는 비어 있어야 한다(오합산 회귀 방지)
  assert.equal(r.byCountry.ko.summary.users, 0, 'ko 에 중국어가 새면 안 됨');
  // finalize 루프(LANG_KEYS)가 zh 버킷을 돌아야 지표가 0 이 아니다
  assert.equal(r.byCountry['zh-hant'].summary.users, 40);
  assert.equal(r.byCountry['zh-hant'].summary.sessions, 48);
  assert.equal(r.byCountry['zh-hans'].summary.users, 20);
  // 이벤트 라우팅 + calcCompletionRate(6/12)
  assert.equal(r.byCountry['zh-hans'].events.calcOpen, 12);
  assert.equal(r.byCountry['zh-hans'].events.heightCalc, 6);
  assert.equal(r.byCountry['zh-hans'].calcCompletionRate, 50);
  // 채널·페이지뷰가 빈 배열/0 이 아니다 (countryKeys 가 zh 를 rollup 대상에 넣어야 함)
  assert.ok(r.byCountry['zh-hant'].channels.length > 0, 'zh-hant 채널 비어 있음');
  assert.equal(r.byCountry['zh-hant'].pageViews.total, 100);
  // 대표 채널 = WhatsApp
  assert.equal(r.byCountry['zh-hant'].messengerChannel, 'whatsapp');
  // all = 언어 넘어 합산 (users 40+20=60)
  assert.equal(r.byCountry.all.summary.users, 60);
});

// 언어 추가(ja/es)가 분류기부터 집계 버킷까지 실제로 이어지는지 — 이 파일은 SITE_LANGS 파생 리팩터
// 이후로 목록이 한 곳뿐이지만, 파생이 끊기면 그 언어만 조용히 0 이 되므로 값으로 확인한다.
test('ja/es: 경로 분류 + 버킷 집계 + all 합산', () => {
  assert.equal(classifyCountry('/ja/'), 'ja');
  assert.equal(classifyCountry('/ja'), 'ja');
  assert.equal(classifyCountry('/es/calculator.html'), 'es');
  assert.equal(classifyPage('/ja/'), 'main');
  assert.equal(classifyPage('/es/index.html'), 'main');
  assert.equal(classifyPage('/ja/blog/x/'), 'other');

  const r = aggregateSiteBreakdown(inputWith({
    landing: [
      { landingPage: '/ja/', users: 7, newUsers: 5, sessions: 9, pageViews: 12, engagementSec: 300 },
      { landingPage: '/es/calculator.html', users: 3, newUsers: 3, sessions: 4, pageViews: 5, engagementSec: 100 },
    ],
    pv: [{ pagePath: '/ja/', views: 12 }],
    events: [{ pagePath: '/ja/', eventName: 'consult_click', count: 2 }],
    channels: [{ landingPage: '/ja/', channel: 'Organic Search', sessions: 9 }],
    devices: [{ landingPage: '/es/calculator.html', device: 'mobile', sessions: 4 }],
    geo: [{ landingPage: '/ja/', country: 'Japan', city: 'Tokyo', sessions: 9, users: 7 }],
    daily: [{ date: '20260726', landingPage: '/es/calculator.html', users: 3, sessions: 4, views: 5 }],
  }));
  assert.equal(r.byCountry.ja.summary.users, 7);
  assert.equal(r.byCountry.ja.pageViews.main, 12);
  assert.equal(r.byCountry.ja.events.messenger, 2);
  assert.equal(r.byCountry.ja.channels[0]?.label, 'Organic Search');
  assert.equal(r.byCountry.ja.geo[0]?.label, 'Japan');
  assert.equal(r.byCountry.es.devices[0]?.label, 'mobile');
  assert.equal(r.byCountry.es.daily.length, 1);
  assert.equal(r.byCountry.ja.messengerChannel, 'whatsapp');
  assert.equal(r.byCountry.all.summary.users, 10);
});
