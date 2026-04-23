// Restore prescriptions.notes = "total=N.N" from the CSV-derived rows.
//
// Approach: load _prescription_rows.json, for each CSV row compute the
// intended total (rounded to 1 decimal), then match to the existing
// prescription row via (child_id, medication_id, visit_date within ±30d, dose).
// Write notes field.
//
// Usage: node cases/restore_rx_totals.mjs [--dry-run]

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p){const o={};try{for(const l of readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'');}}catch{}return o;}
const v = loadEnv(resolve(ROOT,'v4','.env.local'));
const a = loadEnv(resolve(ROOT,'ai-server','.env'));
const sb = createClient(v.VITE_SUPABASE_URL || a.SUPABASE_URL, a.SUPABASE_SERVICE_ROLE_KEY || v.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const DRY = process.argv.includes('--dry-run');

async function fetchAll(table, cols, filter) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(cols).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

console.log('Loading reference data…');
const children = await fetchAll('children', 'id, chart_number');
const childByChart = new Map(children.filter(c => c.chart_number).map(c => [String(c.chart_number).trim(), c.id]));
console.log(`  children with chart: ${childByChart.size}`);

// medications keyed by eone code (stored in notes as eone:...)
const meds = await fetchAll('medications', 'id, code, notes');
const medIdByEone = new Map();
for (const m of meds) {
  const match = (m.notes || '').match(/eone:([^\s|]+)/);
  if (match) medIdByEone.set(match[1], m.id);
}
console.log(`  medications with eone ref: ${medIdByEone.size}`);

// visits by child
const visits = await fetchAll('visits', 'id, child_id, visit_date, is_intake');
const visitsByChild = new Map();
for (const v of visits) {
  if (v.is_intake) continue;
  if (!visitsByChild.has(v.child_id)) visitsByChild.set(v.child_id, []);
  visitsByChild.get(v.child_id).push({ id: v.id, date: v.visit_date });
}
for (const arr of visitsByChild.values()) arr.sort((a,b) => a.date.localeCompare(b.date));
console.log(`  visit groups: ${visitsByChild.size}`);

// Existing prescriptions keyed by (child_id|medication_id|visit_id)
const rx = await fetchAll('prescriptions', 'id, visit_id, child_id, medication_id, dose, notes');
const rxKey = (c,m,v) => `${c}|${m}|${v}`;
const rxMap = new Map();
for (const r of rx) rxMap.set(rxKey(r.child_id, r.medication_id, r.visit_id), r);
console.log(`  prescriptions: ${rx.length}`);

// Load CSV rows
const rows = JSON.parse(readFileSync(resolve(HERE, '_prescription_rows.json'), 'utf8'));
console.log(`  CSV rows: ${rows.length}`);

function daysBetween(a,b) { return Math.abs((new Date(a)-new Date(b))/86400000); }
function pickClosestVisit(list, date) {
  if (!list || list.length === 0) return null;
  let best = null, bestDiff = Infinity;
  for (const v of list) {
    const d = daysBetween(v.date, date);
    if (d < bestDiff) { bestDiff = d; best = v; }
  }
  return bestDiff <= 30 ? best : null;
}

const updates = [];
let noMatch = 0;
for (const row of rows) {
  const childId = childByChart.get(String(row.chart).trim());
  if (!childId) continue;
  const medId = medIdByEone.get(row.code);
  if (!medId) continue;
  const childVisits = visitsByChild.get(childId) || [];
  // Also consider auto-created visits on exact date
  const visit = pickClosestVisit(childVisits, row.date);
  if (!visit) { noMatch++; continue; }
  const r = rxMap.get(rxKey(childId, medId, visit.id));
  if (!r) continue;
  const tot = parseFloat(row.dose_total);
  const sing = parseFloat(row.dose_single);
  if (!Number.isFinite(tot) || !Number.isFinite(sing)) continue;
  if (tot === sing) continue;   // nothing to note
  const note = `total=${tot.toFixed(1)}`;
  if (r.notes !== note) {
    updates.push({ id: r.id, notes: note });
  }
}
console.log(`\nTo update: ${updates.length}   (rows with no matching visit: ${noMatch})`);

if (DRY) { console.log('--dry-run.'); process.exit(0); }

// Batch update
let ok = 0;
for (const u of updates) {
  const { error } = await sb.from('prescriptions').update({ notes: u.notes }).eq('id', u.id);
  if (!error) ok++;
  if (ok % 500 === 0) process.stdout.write(`\r  ${ok}/${updates.length}`);
}
process.stdout.write(`\r  ${ok}/${updates.length}\n`);
console.log('Done.');
