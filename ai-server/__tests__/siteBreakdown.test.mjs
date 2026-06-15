import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCountry, classifyPage, aggregateSiteBreakdown } from '../dist/services/ga4SiteBreakdown.js';

test('classifyCountry: 경로 prefix 로 국가', () => {
  assert.equal(classifyCountry('/th/clinic.html'), 'th');
  assert.equal(classifyCountry('/ko/index.html'), 'ko');
  assert.equal(classifyCountry('/'), 'ko');
  assert.equal(classifyCountry('/vi/cases.html'), 'other');
  assert.equal(classifyCountry('/en/'), 'other');
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

const INPUT = {
  landing: [
    { landingPage: '/ko/index.html', users: 100, newUsers: 60, sessions: 120, pageViews: 300, engagementSec: 6000 },
    { landingPage: '/th/calculator.html', users: 30, newUsers: 20, sessions: 35, pageViews: 80, engagementSec: 1750 },
    { landingPage: '/vi/index.html', users: 999, newUsers: 999, sessions: 999, pageViews: 999, engagementSec: 999 }, // other → 제외
  ],
  landingPrev: [
    { landingPage: '/ko/index.html', users: 80, newUsers: 50, sessions: 90, pageViews: 240, engagementSec: 4800 },
  ],
  pv: [
    { pagePath: '/ko/index.html', views: 200 },
    { pagePath: '/ko/clinic.html', views: 50 },
    { pagePath: '/th/calculator.html', views: 80 },
    { pagePath: '/vi/index.html', views: 999 }, // other → 무시
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

  const all = r.byCountry.all;
  assert.equal(all.summary.users, 130); // 100 + 30
  assert.equal(all.summary.sessions, 155); // 120 + 35
  assert.equal(all.summary.newUsers, 80); // 60 + 20
  assert.equal(all.pageViews.total, 330); // 250 + 80
  assert.equal(all.events.messenger, 10);
  assert.equal(all.events.calcOpen, 20);
  assert.equal(all.events.heightCalc, 8);
  assert.equal(all.calcCompletionRate, 40); // 8/20*100
  assert.equal(all.messengerChannel, 'mixed');
  assert.equal(all.summary.avgEngagementSec, 59.62); // (6000+1750)/130
  assert.equal(all.daily.length, 2);
  assert.equal(all.daily[0].users, 80); // 20260601: 50 + 30
});
