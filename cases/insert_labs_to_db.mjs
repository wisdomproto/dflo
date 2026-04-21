// Import aggregated lab orders into Supabase (lab_tests + visits).
//
// Usage:
//   node cases/insert_labs_to_db.mjs [chart_number ...]
//   node cases/insert_labs_to_db.mjs --dry-run 22028
//
// Prereqs:
//   - cases/랩데이터_ocr/_aggregated.json exists (run aggregate_labs.py first)
//   - v4/.env.local has VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
//   - migration 008 applied (extended test_type CHECK)
//
// For each lab order we:
//   1. Look up the child by chart_number.
//   2. Find or create a visit on the collected_date.
//   3. Skip if a lab_test with this accession already exists on that visit.
//   4. Insert lab_tests row with result_data payload.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const AGG_PATH = resolve(HERE, '랩데이터_ocr', '_aggregated.json');
const V4_ENV_PATH = resolve(ROOT, 'v4', '.env.local');
const AI_ENV_PATH = resolve(ROOT, 'ai-server', '.env');

// Until migration 008 is applied the DB still enforces the original CHECK
// constraint: {allergy, organic_acid, blood}. Map the fine-grained panel
// types from aggregate_labs.py onto those three, and keep the full panel
// label inside result_data so the UI can filter precisely.
const TEST_TYPE_TO_DB_VALUE = {
  blood: 'blood',
  food_intolerance: 'allergy',
  mast_allergy: 'allergy',
  nk_activity: 'blood',
  organic_acid: 'organic_acid',
  hair_mineral: 'organic_acid',
  attachment: 'blood',
};

// ────────────────────────────────────────────────────────────────────
// Env loader (no dotenv dep — tiny parser to avoid the npm install).
function loadEnv(path) {
  const out = {};
  const txt = readFileSync(path, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const v4Env = loadEnv(V4_ENV_PATH);
const aiEnv = loadEnv(AI_ENV_PATH);
const SUPABASE_URL = v4Env.VITE_SUPABASE_URL || aiEnv.SUPABASE_URL;
// Prefer service role (DDL + RLS-bypassing writes); fall back to anon if missing.
const SUPABASE_KEY = aiEnv.SUPABASE_SERVICE_ROLE_KEY || v4Env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL/key (checked v4/.env.local + ai-server/.env)');
  process.exit(1);
}
const USING_SERVICE_ROLE = !!aiEnv.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ────────────────────────────────────────────────────────────────────
// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const chartFilter = new Set(args.filter(a => !a.startsWith('--')));

// ────────────────────────────────────────────────────────────────────
// Helpers

async function findChildByChartNumber(chartNumber) {
  const { data, error } = await supabase
    .from('children')
    .select('id, name, chart_number')
    .eq('chart_number', chartNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findOrCreateVisit(childId, visitDate) {
  // Only real visits (is_intake=false) count as lab destinations.
  const { data: existing, error: findErr } = await supabase
    .from('visits')
    .select('id')
    .eq('child_id', childId)
    .eq('visit_date', visitDate)
    .eq('is_intake', false)
    .maybeSingle();
  if (findErr && findErr.code !== 'PGRST116') throw findErr;
  if (existing) return { id: existing.id, created: false };

  if (DRY_RUN) return { id: `dry-${visitDate}`, created: true };

  const { data: inserted, error: insErr } = await supabase
    .from('visits')
    .insert({
      child_id: childId,
      visit_date: visitDate,
      is_intake: false,
      notes: 'Imported from eone lab OCR pipeline',
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return { id: inserted.id, created: true };
}

async function labTestExists(visitId, accession, panelType) {
  if (!accession) return false;
  // Two panels can legitimately share one accession (e.g. an IgG4 food panel
  // whose cover page was parsed as a standalone standard report). Dedupe on
  // (visit, accession, panel_type) so both get stored.
  const { data, error } = await supabase
    .from('lab_tests')
    .select('id')
    .eq('visit_id', visitId)
    .eq('result_data->>accession', accession)
    .eq('result_data->>panel_type', panelType)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function insertLabTest(row) {
  if (DRY_RUN) return 'dry-insert';
  const { data, error } = await supabase
    .from('lab_tests')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// ────────────────────────────────────────────────────────────────────
// Main

async function main() {
  const raw = JSON.parse(readFileSync(AGG_PATH, 'utf8'));
  const orders = chartFilter.size
    ? raw.filter(o => chartFilter.has(o.chart_number))
    : raw;

  const keyLabel = USING_SERVICE_ROLE ? 'service_role' : 'anon';
  console.log(`Loaded ${raw.length} aggregated lab orders; processing ${orders.length} (${keyLabel}${DRY_RUN ? ', DRY RUN' : ''})`);

  const stats = {
    charts_seen: new Set(),
    charts_missing: new Set(),
    visits_created: 0,
    visits_reused: 0,
    labs_inserted: 0,
    labs_skipped_dup: 0,
    labs_skipped_nodate: 0,
    labs_errored: 0,
  };

  // Cache child lookups — many orders share one chart.
  const childCache = new Map();
  async function getChild(chartNumber) {
    if (childCache.has(chartNumber)) return childCache.get(chartNumber);
    const c = await findChildByChartNumber(chartNumber);
    childCache.set(chartNumber, c);
    return c;
  }

  for (const order of orders) {
    stats.charts_seen.add(order.chart_number);

    if (!order.collected_at) {
      stats.labs_skipped_nodate += 1;
      continue;
    }

    let child;
    try {
      child = await getChild(order.chart_number);
    } catch (e) {
      console.error(`  [err] chart ${order.chart_number} lookup: ${e.message}`);
      stats.labs_errored += 1;
      continue;
    }
    if (!child) {
      stats.charts_missing.add(order.chart_number);
      continue;
    }

    let visit;
    try {
      visit = await findOrCreateVisit(child.id, order.collected_at);
    } catch (e) {
      console.error(`  [err] visit for ${order.chart_number}@${order.collected_at}: ${e.message}`);
      stats.labs_errored += 1;
      continue;
    }
    if (visit.created) stats.visits_created += 1;
    else stats.visits_reused += 1;

    // Store accession inside result_data so we can dedupe on reruns.
    const resultData = { ...order.result_data, accession: order.accession };

    try {
      if (await labTestExists(visit.id, order.accession, order.test_type)) {
        stats.labs_skipped_dup += 1;
        continue;
      }
    } catch (e) {
      console.error(`  [err] dup-check ${order.accession}: ${e.message}`);
    }

    const dbTestType = TEST_TYPE_TO_DB_VALUE[order.test_type] || 'blood';
    // Preserve the fine-grained panel label inside result_data so the UI can
    // tell food_intolerance from mast_allergy even though they share 'allergy'.
    resultData.panel_type = order.test_type;
    const row = {
      visit_id: visit.id,
      child_id: child.id,
      test_type: dbTestType,
      collected_date: order.collected_at,
      result_date: order.reported_at || null,
      result_data: resultData,
      attachments: order.source_files.map(f => ({ file: f })),
    };

    try {
      await insertLabTest(row);
      stats.labs_inserted += 1;
    } catch (e) {
      console.error(`  [err] insert ${order.chart_number}/${order.accession}: ${e.message}`);
      stats.labs_errored += 1;
    }
  }

  console.log('\n── Summary ──');
  console.log(`charts seen:          ${stats.charts_seen.size}`);
  console.log(`charts missing in DB: ${stats.charts_missing.size}  ${[...stats.charts_missing].slice(0, 5).join(', ')}${stats.charts_missing.size > 5 ? ' …' : ''}`);
  console.log(`visits created:       ${stats.visits_created}`);
  console.log(`visits reused:        ${stats.visits_reused}`);
  console.log(`labs inserted:        ${stats.labs_inserted}`);
  console.log(`labs skipped (dup):   ${stats.labs_skipped_dup}`);
  console.log(`labs skipped (date):  ${stats.labs_skipped_nodate}`);
  console.log(`labs errored:         ${stats.labs_errored}`);
}

main().catch(e => {
  console.error('fatal:', e);
  process.exit(1);
});
