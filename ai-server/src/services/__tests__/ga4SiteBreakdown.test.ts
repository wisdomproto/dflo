import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSiteBreakdown, type BreakdownInput, type CampaignRow } from '../ga4SiteBreakdown.js';

// 최소 입력 — campaigns 외 필드는 빈 배열로 채운 BreakdownInput 헬퍼.
function baseInput(campaigns: CampaignRow[]): BreakdownInput {
  return {
    landing: [],
    landingPrev: [],
    pv: [],
    events: [],
    channels: [],
    devices: [],
    geo: [],
    daily: [],
    campaigns,
  };
}

test('aggregateSiteBreakdown: 캠페인 세션 + 이벤트 합산, completionRate 계산', () => {
  const rows: CampaignRow[] = [
    { campaign: 'lookalike_v1', sessions: 100 },
    { campaign: 'lookalike_v1', sessions: 50 }, // 여러 행(예: 다른 landingPage) → 합산
    { campaign: 'lookalike_v1', eventName: 'calc_open', count: 40 },
    { campaign: 'lookalike_v1', eventName: 'height_calc_complete', count: 10 },
    { campaign: 'lookalike_v1', eventName: 'consult_click', count: 4 },
  ];
  const result = aggregateSiteBreakdown(baseInput(rows));

  assert.equal(result.campaigns.length, 1);
  const c = result.campaigns[0];
  assert.equal(c.name, 'lookalike_v1');
  assert.equal(c.sessions, 150);
  assert.equal(c.calcOpen, 40);
  assert.equal(c.heightCalc, 10);
  assert.equal(c.consult, 4);
  assert.equal(c.completionRate, 25); // 10/40*100
});

test('aggregateSiteBreakdown: (not set) 등 태그 안 된 캠페인은 제외', () => {
  const rows: CampaignRow[] = [
    { campaign: 'lookalike_v1', sessions: 100 },
    { campaign: '(not set)', sessions: 500 },
    { campaign: '(direct)', sessions: 300 },
    { campaign: '(organic)', sessions: 200 },
    { campaign: '(referral)', sessions: 80 },
    { campaign: '', sessions: 10 },
  ];
  const result = aggregateSiteBreakdown(baseInput(rows));

  assert.equal(result.campaigns.length, 1);
  assert.equal(result.campaigns[0].name, 'lookalike_v1');
  assert.equal(result.campaigns[0].sessions, 100);
});

test('aggregateSiteBreakdown: calcOpen=0 이면 completionRate=0 (div-by-zero 가드)', () => {
  const rows: CampaignRow[] = [{ campaign: 'broad_old', sessions: 20 }];
  const result = aggregateSiteBreakdown(baseInput(rows));
  assert.equal(result.campaigns[0].completionRate, 0);
});

test('aggregateSiteBreakdown: 여러 캠페인은 sessions 내림차순 정렬', () => {
  const rows: CampaignRow[] = [
    { campaign: 'broad_old', sessions: 500 },
    { campaign: 'lookalike_v1', sessions: 1200 },
    { campaign: 'copy2', sessions: 30 },
  ];
  const result = aggregateSiteBreakdown(baseInput(rows));
  assert.deepEqual(result.campaigns.map((c) => c.name), ['lookalike_v1', 'broad_old', 'copy2']);
});

test('aggregateSiteBreakdown: 캠페인 없으면 빈 배열 (byCountry 는 여전히 채워짐)', () => {
  const result = aggregateSiteBreakdown(baseInput([]));
  assert.deepEqual(result.campaigns, []);
  assert.ok(result.byCountry.all);
  assert.ok(result.byCountry.ko);
});
