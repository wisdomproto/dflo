// Import 판독문 OCR measurements into Supabase.
//
// Usage:
//   node cases/import_ocr_measurements.mjs [--dry-run] [chart_number ...]
//
// For each cases/판독문_ocr/<chart>/data.json:
//   1. Look up child by chart_number (skip if not in DB).
//   2. For rows with visit_id (DB match) → use that visit.
//   3. For ocr_only rows (visit_id null) → create a new non-intake visit.
//   4. Upsert hospital_measurements(visit_id) with height/weight/bone_age/pah.
//   5. Patch visits.notes with memo if empty.
//
// Dedup: one hospital_measurements row per visit_id (UPDATE if exists).

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OCR_DIR = resolve(HERE, '판독문_ocr');

function loadEnv(p) {
  try {
    const t = readFileSync(p, 'utf8');
    const o = {};
    for (const l of t.split(/\r?\n/)) {
      const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return o;
  } catch {
    return {};
  }
}
const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const URL = v4.VITE_SUPABASE_URL || ai.SUPABASE_URL;
const KEY = ai.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing Supabase creds');
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const chartFilter = new Set(args.filter((a) => !a.startsWith('--')));

// ─────────────────────────────────────────
// Helpers

// "12세 3개월" → 12.25  |  "12세0개월" → 12  |  "12세 6-8개월" → 12.58
function parseKoreanAge(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/(\d+)\s*세\s*(\d+)?(?:\s*[-–~]\s*(\d+))?\s*개월?/);
  if (!m) return null;
  const years = parseInt(m[1], 10);
  const lo = m[2] != null ? parseInt(m[2], 10) : 0;
  const hi = m[3] != null ? parseInt(m[3], 10) : lo;
  const months = (lo + hi) / 2;
  return +(years + months / 12).toFixed(2);
}

function log(...a) {
  console.log(...a);
}

async function findChild(chartNumber) {
  const { data } = await supabase
    .from('children')
    .select('id, chart_number, name')
    .eq('chart_number', chartNumber)
    .maybeSingle();
  return data;
}

async function findMeasurement(visitId) {
  const { data } = await supabase
    .from('hospital_measurements')
    .select('id, height, weight, bone_age, pah, notes')
    .eq('visit_id', visitId)
    .maybeSingle();
  return data;
}

async function findVisit(visitId) {
  const { data } = await supabase
    .from('visits')
    .select('id, child_id, visit_date, notes, is_intake')
    .eq('id', visitId)
    .maybeSingle();
  return data;
}

async function createVisit({ child_id, visit_date, memo }) {
  if (DRY_RUN) return { id: `dry:${visit_date}` };
  const { data, error } = await supabase
    .from('visits')
    .insert({
      child_id,
      visit_date,
      is_intake: false,
      notes: memo || null,
      chief_complaint: 'OCR 임포트',
    })
    .select('id')
    .single();
  if (error) throw new Error(`visit create failed: ${error.message}`);
  return data;
}

async function upsertMeasurement({ visitId, childId, payload }) {
  if (DRY_RUN) return;
  const existing = await findMeasurement(visitId);
  if (existing) {
    const update = {};
    // Only set fields we have — don't wipe existing values.
    for (const [k, v] of Object.entries(payload)) {
      if (v != null && existing[k] == null) update[k] = v;
    }
    if (!Object.keys(update).length) return 'noop';
    update.updated_at = new Date().toISOString();
    const { error } = await supabase.from('hospital_measurements').update(update).eq('id', existing.id);
    if (error) throw new Error(`measurement update failed: ${error.message}`);
    return 'updated';
  }
  const { error } = await supabase.from('hospital_measurements').insert({
    visit_id: visitId,
    child_id: childId,
    ...payload,
  });
  if (error) throw new Error(`measurement insert failed: ${error.message}`);
  return 'inserted';
}

async function patchVisitNotes(visitId, memo) {
  if (!memo || DRY_RUN) return;
  const v = await findVisit(visitId);
  if (!v) return;
  if (v.notes && v.notes.trim()) return; // don't clobber existing notes
  await supabase.from('visits').update({ notes: memo }).eq('id', visitId);
}

// ─────────────────────────────────────────
// Main loop

async function processChart(chartDir, chartNumber) {
  const jsonPath = join(chartDir, 'data.json');
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch {
    return { chart: chartNumber, status: 'no-json' };
  }
  if (!data.ocr_done) return { chart: chartNumber, status: 'not-done' };
  const child = await findChild(chartNumber);
  if (!child) return { chart: chartNumber, status: 'no-db-match' };

  const stats = {
    chart: chartNumber,
    name: child.name,
    db_rows: 0,
    ocr_rows: 0,
    m_inserted: 0,
    m_updated: 0,
    m_skipped: 0,
    visits_created: 0,
    notes_patched: 0,
    errors: [],
  };

  for (const row of data.measurements ?? []) {
    const hasValues =
      row.height_cm != null || row.weight_kg != null || row.ba != null || row.pah != null;
    if (!hasValues && !row.memo) continue;

    try {
      let visitId = row.visit_id;
      if (!visitId) {
        stats.ocr_rows++;
        // Create a new visit for ocr_only rows
        const v = await createVisit({
          child_id: child.id,
          visit_date: row.date,
          memo: row.memo || null,
        });
        visitId = v.id;
        stats.visits_created++;
      } else {
        stats.db_rows++;
      }

      const payload = {};
      if (row.height_cm != null) payload.height = row.height_cm;
      if (row.weight_kg != null) payload.weight = row.weight_kg;
      const ba = parseKoreanAge(row.ba);
      if (ba != null) payload.bone_age = ba;
      if (row.pah != null) payload.pah = row.pah;
      if (row.memo) payload.notes = row.memo;
      if (row.date) payload.measured_date = row.date;

      if (Object.keys(payload).length && (hasValues || payload.notes)) {
        const res = hasValues
          ? await upsertMeasurement({ visitId, childId: child.id, payload })
          : null;
        if (res === 'inserted') stats.m_inserted++;
        else if (res === 'updated') stats.m_updated++;
        else if (res === 'noop') stats.m_skipped++;
      }

      // Patch visit.notes with OCR memo when it's empty (even if no measurement values)
      if (row.memo && row.visit_id) {
        await patchVisitNotes(row.visit_id, row.memo);
        stats.notes_patched++;
      }
    } catch (e) {
      stats.errors.push(`row ${row.id}: ${e.message}`);
    }
  }

  return stats;
}

async function main() {
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
  const entries = readdirSync(OCR_DIR).filter((e) => /^\d+$/.test(e));
  const total = { charts: 0, skipped: 0, not_found: 0, updated: 0, m_inserted: 0, m_updated: 0, m_skipped: 0, visits_created: 0, notes_patched: 0, errors: 0 };

  const details = [];
  for (const chartNumber of entries) {
    if (chartFilter.size && !chartFilter.has(chartNumber)) continue;
    const chartDir = join(OCR_DIR, chartNumber);
    if (!statSync(chartDir).isDirectory()) continue;
    total.charts++;
    try {
      const s = await processChart(chartDir, chartNumber);
      if (s.status === 'no-json' || s.status === 'not-done') {
        total.skipped++;
        continue;
      }
      if (s.status === 'no-db-match') {
        total.not_found++;
        details.push(`  [no-match] ${chartNumber}`);
        continue;
      }
      total.updated++;
      total.m_inserted += s.m_inserted;
      total.m_updated += s.m_updated;
      total.m_skipped += s.m_skipped;
      total.visits_created += s.visits_created;
      total.notes_patched += s.notes_patched;
      total.errors += s.errors.length;
      const label = `  [ok] ${chartNumber} ${s.name} · DB=${s.db_rows} OCR=${s.ocr_rows} · m+${s.m_inserted}/u${s.m_updated}/noop${s.m_skipped} · v+${s.visits_created} · notes${s.notes_patched}`;
      details.push(label);
      if (s.errors.length) details.push(`    errors: ${s.errors.join(' | ')}`);
    } catch (e) {
      total.errors++;
      details.push(`  [error] ${chartNumber}: ${e.message}`);
    }
  }

  for (const d of details) log(d);
  log('\n=== Summary ===');
  log(JSON.stringify(total, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
