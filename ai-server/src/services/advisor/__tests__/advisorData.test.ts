import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFromInsights } from '../advisorData.js';
import type { AccountInsightRow } from '../../metaAds.js';

const row = (over: Partial<AccountInsightRow>): AccountInsightRow => ({
  campaignId: 'c', campaignName: 'n', spend: 0, impressions: 0, clicks: 0,
  reach: 0, ctr: 0, cpc: 0, ...over,
});

test('deriveFromInsights: counts only campaigns with spend > 0', () => {
  const rows = [row({ spend: 1000 }), row({ spend: 0 }), row({ spend: 50 })];
  assert.equal(deriveFromInsights(rows).campaignsWithSpend, 2);
});

test('deriveFromInsights: empty → 0', () => {
  assert.equal(deriveFromInsights([]).campaignsWithSpend, 0);
});
