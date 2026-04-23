// Import prescriptions from eone CSV → prescriptions table.
//
// Usage:
//   node cases/insert_prescriptions.mjs [--dry-run] [--limit N] [--chart 12345]
//
// Matching rules:
//   - Chart number must exist in children. Otherwise skip.
//   - For each row, find closest visit for that child within ±30 days.
//     If none found, create a new visit on the prescription date
//     (notes='Auto-created from prescription import', is_intake=false).
//   - Dedup: (visit_id, medication_id). Same medication on the same visit
//     is collapsed into a single prescription row.
//
// Input: cases/_prescription_rows.json (run parse_prescriptions.py first)

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ROWS_PATH = resolve(HERE, '_prescription_rows.json');
const V4_ENV_PATH = resolve(ROOT, 'v4', '.env.local');
const AI_ENV_PATH = resolve(ROOT, 'ai-server', '.env');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1], 10) : null;
const CHART_IDX = args.indexOf('--chart');
const CHART_FILTER = CHART_IDX >= 0 ? args[CHART_IDX + 1] : null;
const WINDOW_DAYS = 30;

function loadEnv(path) {
  const out = {};
  try {
    const txt = readFileSync(path, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

const v4Env = loadEnv(V4_ENV_PATH);
const aiEnv = loadEnv(AI_ENV_PATH);
const SUPABASE_URL = v4Env.VITE_SUPABASE_URL || aiEnv.SUPABASE_URL;
const SUPABASE_KEY = aiEnv.SUPABASE_SERVICE_ROLE_KEY || v4Env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL / key.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / 86400000);
}

async function fetchAllPages(table, select) {
  const rows = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

console.log('Loading reference data…');
const childrenRows = await fetchAllPages('children', 'id, chart_number, name');
const childrenByChart = new Map();
for (const c of childrenRows) {
  if (c.chart_number) childrenByChart.set(String(c.chart_number).trim(), c);
}
console.log(`  children: ${childrenRows.length} (${childrenByChart.size} with chart_number)`);

const medicationRows = await fetchAllPages('medications', 'id, code');
const medsByCode = new Map(medicationRows.map((m) => [m.code, m.id]));
console.log(`  medications: ${medicationRows.length}`);

const visitRows = await fetchAllPages('visits', 'id, child_id, visit_date, is_intake');
// Exclude intake visits from matching (per project convention).
const visitsByChild = new Map();
for (const v of visitRows) {
  if (v.is_intake) continue;
  if (!visitsByChild.has(v.child_id)) visitsByChild.set(v.child_id, []);
  visitsByChild.get(v.child_id).push({ id: v.id, date: v.visit_date });
}
for (const arr of visitsByChild.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
console.log(`  visits (non-intake): ${visitRows.length - visitRows.filter((v) => v.is_intake).length}`);

// Load existing prescriptions to dedup.
const existingRx = await fetchAllPages('prescriptions', 'visit_id, medication_id');
const rxKeys = new Set(existingRx.map((r) => `${r.visit_id}|${r.medication_id}`));
console.log(`  existing prescriptions: ${existingRx.length}`);

console.log('\nLoading prescription rows…');
let rows = JSON.parse(readFileSync(ROWS_PATH, 'utf8'));
console.log(`  input rows: ${rows.length}`);

if (CHART_FILTER) rows = rows.filter((r) => r.chart === CHART_FILTER);
if (LIMIT) rows = rows.slice(0, LIMIT);
console.log(`  after filters: ${rows.length}`);

// Stats
const stats = {
  chartNotInDb: 0,
  chartInDb: 0,
  medicationMissing: 0,
  visitReused: 0,
  visitCreated: 0,
  rxDeduped: 0,
  rxToInsert: 0,
  rxInserted: 0,
  rxFailed: 0,
};

// Group rows by (chart, date) so same-day same-patient creates at most one visit.
// Process in chart order.
const byChart = new Map();
for (const row of rows) {
  if (!row.chart || !row.date) continue;
  if (!byChart.has(row.chart)) byChart.set(row.chart, []);
  byChart.get(row.chart).push(row);
}

const toInsert = [];
const newVisitBuffer = [];  // {child_id, visit_date} -> to insert then collect ids

// Queue of unique (child_id, visit_date) that need to be created.
// Using map so we don't create duplicates for the same chart+date within one run.
const visitCreateKey = (childId, date) => `${childId}|${date}`;
const pendingVisits = new Map();   // key -> {child_id, visit_date}
const pendingRxByVisitKey = new Map();  // key -> array of pending-rx (to link after insert)

function pickClosestVisit(visits, date) {
  if (!visits || visits.length === 0) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const v of visits) {
    const d = daysBetween(v.date, date);
    if (d < bestDiff) {
      bestDiff = d;
      best = v;
    }
  }
  if (bestDiff > WINDOW_DAYS) return null;
  return best;
}

for (const [chart, chartRows] of byChart) {
  const child = childrenByChart.get(String(chart).trim());
  if (!child) {
    stats.chartNotInDb += chartRows.length;
    continue;
  }
  stats.chartInDb += chartRows.length;
  const childVisits = visitsByChild.get(child.id) || [];

  for (const row of chartRows) {
    const medId = medsByCode.get(row.code);
    if (!medId) {
      stats.medicationMissing++;
      continue;
    }
    const visit = pickClosestVisit(childVisits, row.date);
    let rxTarget;
    if (visit) {
      rxTarget = { visit_id: visit.id, _isNew: false };
      stats.visitReused++;
    } else {
      const key = visitCreateKey(child.id, row.date);
      if (!pendingVisits.has(key)) {
        pendingVisits.set(key, { child_id: child.id, visit_date: row.date });
        stats.visitCreated++;
      }
      rxTarget = { visit_id: null, _isNew: true, _newKey: key };
    }

    // Build rx payload
    const dose = row.dose_single && row.dose_single !== '0.000' ? row.dose_single : null;
    const duration = row.duration ? parseInt(row.duration, 10) : null;
    const totalNum = row.dose_total ? parseFloat(row.dose_total) : NaN;
    const singleNum = row.dose_single ? parseFloat(row.dose_single) : NaN;
    const notes = Number.isFinite(totalNum) && Number.isFinite(singleNum) && totalNum !== singleNum
      ? `total=${totalNum.toFixed(1)}`
      : null;
    const rxRow = {
      child_id: child.id,
      medication_id: medId,
      dose,
      frequency: null,
      duration_days: Number.isFinite(duration) && duration > 0 ? duration : null,
      notes,
    };
    if (rxTarget._isNew) {
      if (!pendingRxByVisitKey.has(rxTarget._newKey)) pendingRxByVisitKey.set(rxTarget._newKey, []);
      pendingRxByVisitKey.get(rxTarget._newKey).push(rxRow);
    } else {
      const dedupKey = `${rxTarget.visit_id}|${medId}`;
      if (rxKeys.has(dedupKey)) {
        stats.rxDeduped++;
        continue;
      }
      rxKeys.add(dedupKey);
      toInsert.push({ visit_id: rxTarget.visit_id, ...rxRow });
    }
  }
}

stats.rxToInsert = toInsert.length + Array.from(pendingRxByVisitKey.values()).reduce((s, arr) => s + arr.length, 0);

console.log('\nPlan summary:');
console.log(`  rows ignored (chart not in DB): ${stats.chartNotInDb}`);
console.log(`  rows processed (chart in DB):   ${stats.chartInDb}`);
console.log(`  rows skipped (medication miss): ${stats.medicationMissing}`);
console.log(`  will reuse existing visits:     ${stats.visitReused}`);
console.log(`  new visits to create:           ${pendingVisits.size}`);
console.log(`  rx deduped (already in DB):     ${stats.rxDeduped}`);
console.log(`  rx to insert (existing visits): ${toInsert.length}`);
console.log(`  rx to insert (new visits):      ${stats.rxToInsert - toInsert.length}`);

if (DRY) {
  console.log('\n--dry-run: no writes performed.');
  process.exit(0);
}

// 1) Create pending visits in batches
console.log('\nCreating new visits…');
const newVisitList = Array.from(pendingVisits.entries()).map(([key, v]) => ({ ...v, _key: key }));
const keyToVisitId = new Map();
const BATCH = 500;
for (let i = 0; i < newVisitList.length; i += BATCH) {
  const chunk = newVisitList.slice(i, i + BATCH);
  const payload = chunk.map((v) => ({
    child_id: v.child_id,
    visit_date: v.visit_date,
    notes: 'Auto-created from prescription import',
    is_intake: false,
  }));
  const { data, error } = await sb.from('visits').insert(payload).select('id, child_id, visit_date');
  if (error) { console.error(`visits batch ${i}:`, error.message); continue; }
  // Map back by (child_id, visit_date) — should be unique within this batch
  const mapLocal = new Map();
  for (const r of data) mapLocal.set(`${r.child_id}|${r.visit_date}`, r.id);
  for (const v of chunk) {
    const id = mapLocal.get(`${v.child_id}|${v.visit_date}`);
    if (id) keyToVisitId.set(v._key, id);
  }
  process.stdout.write(`\r  created ${keyToVisitId.size}/${newVisitList.length} visits`);
}
process.stdout.write('\n');

// 2) Attach pending rx rows to new visit ids, dedup, add to toInsert
for (const [key, rxArr] of pendingRxByVisitKey) {
  const visitId = keyToVisitId.get(key);
  if (!visitId) continue;
  for (const rx of rxArr) {
    const dedupKey = `${visitId}|${rx.medication_id}`;
    if (rxKeys.has(dedupKey)) { stats.rxDeduped++; continue; }
    rxKeys.add(dedupKey);
    toInsert.push({ visit_id: visitId, ...rx });
  }
}

console.log(`\nPrescriptions to insert: ${toInsert.length}`);

// 3) Insert prescriptions in batches
for (let i = 0; i < toInsert.length; i += BATCH) {
  const chunk = toInsert.slice(i, i + BATCH);
  const { error } = await sb.from('prescriptions').insert(chunk);
  if (error) {
    console.error(`\nrx batch ${i}:`, error.message);
    stats.rxFailed += chunk.length;
  } else {
    stats.rxInserted += chunk.length;
  }
  process.stdout.write(`\r  inserted ${stats.rxInserted}/${toInsert.length}`);
}
process.stdout.write('\n');

console.log('\nFinal stats:');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
