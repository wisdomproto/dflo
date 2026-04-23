// Round medications.default_dose and prescriptions.dose to 1 decimal place.
// Stored as text (e.g. "1.000" → "1.0", "0.700" → "0.7", "9.800" → "9.8").

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

function round1(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (!t) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return t;   // keep non-numeric strings as-is
  return n.toFixed(1);
}

async function fetchAll(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

// ─── medications.default_dose ─────────────────────────────────────
const meds = await fetchAll('medications', 'id, default_dose');
const medUpdates = [];
for (const m of meds) {
  const rounded = round1(m.default_dose);
  if (rounded !== m.default_dose && rounded !== null) {
    medUpdates.push({ id: m.id, default_dose: rounded });
  }
}
console.log(`medications: ${meds.length}, needing update: ${medUpdates.length}`);

// ─── prescriptions.dose ───────────────────────────────────────────
const rx = await fetchAll('prescriptions', 'id, dose');
const rxUpdates = [];
for (const r of rx) {
  const rounded = round1(r.dose);
  if (rounded !== r.dose && rounded !== null) {
    rxUpdates.push({ id: r.id, dose: rounded });
  }
}
console.log(`prescriptions: ${rx.length}, needing update: ${rxUpdates.length}`);

if (DRY) { console.log('--dry-run.'); process.exit(0); }

async function applyUpdates(table, updates, col) {
  let ok = 0;
  for (const u of updates) {
    const patch = {};
    patch[col] = u[col];
    const { error } = await sb.from(table).update(patch).eq('id', u.id);
    if (!error) ok++;
    if (ok % 500 === 0) process.stdout.write(`\r  ${table} ${ok}/${updates.length}`);
  }
  process.stdout.write(`\r  ${table} ${ok}/${updates.length}\n`);
}

await applyUpdates('medications', medUpdates, 'default_dose');
await applyUpdates('prescriptions', rxUpdates, 'dose');
console.log('Done.');
