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

test('aggregateSiteBreakdown: 국가별 PV·이벤트 집계 + 전환율', () => {
  const pv = [
    { pagePath: '/ko/index.html', views: 100 },
    { pagePath: '/ko/clinic.html', views: 20 },
    { pagePath: '/th/calculator.html', views: 30 },
    { pagePath: '/vi/index.html', views: 999 }, // other → 무시
  ];
  const ev = [
    { pagePath: '/ko/index.html', eventName: 'consult_click', count: 5 },
    { pagePath: '/th/calculator.html', eventName: 'height_calc_complete', count: 8 },
    { pagePath: '/th/index.html', eventName: 'consult_click', count: 2 },
  ];
  const r = aggregateSiteBreakdown(pv, ev);
  assert.equal(r.byCountry.ko.pageViews.main, 100);
  assert.equal(r.byCountry.ko.pageViews.clinic, 20);
  assert.equal(r.byCountry.ko.pageViews.total, 120);
  assert.equal(r.byCountry.ko.events.messenger, 5);
  assert.equal(r.byCountry.ko.events.heightCalc, 0);
  assert.equal(r.byCountry.ko.messengerChannel, 'kakao');
  assert.equal(r.byCountry.ko.conversionRate, +(5 / 120 * 100).toFixed(2));
  assert.equal(r.byCountry.th.pageViews.calculator, 30);
  assert.equal(r.byCountry.th.events.heightCalc, 8);
  assert.equal(r.byCountry.th.events.messenger, 2);
  assert.equal(r.byCountry.th.messengerChannel, 'line');
});
