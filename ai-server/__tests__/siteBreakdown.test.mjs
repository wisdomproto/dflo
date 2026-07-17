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
  // 여기선 빈 배열(이 파일은 언어 귀속만 검증). 두 리포트의 rollup 은 아직 커버리지 없음.
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
  assert.equal(en.messengerChannel, 'kakao');

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
