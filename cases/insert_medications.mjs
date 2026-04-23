// Upsert medications master from parsed prescription CSV.
//
// Usage:
//   node cases/insert_medications.mjs [--dry-run]
//
// Input: cases/_prescription_codes.json (run parse_prescriptions.py first)
// Only rows with classification === 'MEDICINE' are upserted.
// Schema: medications(code UNIQUE, name, default_dose, unit, notes, is_active)

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CODES_PATH = resolve(HERE, '_prescription_codes.json');
const V4_ENV_PATH = resolve(ROOT, 'v4', '.env.local');
const AI_ENV_PATH = resolve(ROOT, 'ai-server', '.env');

const DRY = process.argv.includes('--dry-run');

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
  console.error('Missing Supabase URL / key. Check v4/.env.local or ai-server/.env.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const all = JSON.parse(readFileSync(CODES_PATH, 'utf8'));
const medicines = all.filter((c) => c.classification === 'MEDICINE');
console.log(`Found ${medicines.length} medicine codes in input.`);

// Fetch existing medications (by code) so we can distinguish insert vs update
async function fetchExisting() {
  const map = new Map();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('medications')
      .select('id, code, name')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) map.set(r.code, r);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

const existing = await fetchExisting();
console.log(`Existing medications in DB: ${existing.size}`);

const toInsert = [];
const toUpdate = [];
for (const m of medicines) {
  const row = {
    code: m.code,
    name: m.name,
    default_dose: m.sample_dose || null,
    notes: null,
    is_active: true,
  };
  const existingRow = existing.get(m.code);
  if (!existingRow) {
    toInsert.push(row);
  } else if (existingRow.name !== m.name) {
    // Update name to latest (keep id)
    toUpdate.push({ id: existingRow.id, ...row });
  }
}
console.log(`Insert: ${toInsert.length}, Update (name drift): ${toUpdate.length}`);

if (DRY) {
  console.log('--dry-run: no writes performed.');
  process.exit(0);
}

// Insert in batches of 500
async function batchInsert(rows) {
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from('medications').insert(chunk);
    if (error) {
      console.error(`  insert batch ${i}: ${error.message}`);
      fail += chunk.length;
    } else {
      ok += chunk.length;
    }
    process.stdout.write(`\r  inserted ${ok}/${rows.length}`);
  }
  process.stdout.write('\n');
  return { ok, fail };
}

const ins = await batchInsert(toInsert);
console.log(`Inserted ${ins.ok}, failed ${ins.fail}`);

if (toUpdate.length) {
  let ok = 0;
  for (const r of toUpdate) {
    const { error } = await sb
      .from('medications')
      .update({ name: r.name, default_dose: r.default_dose })
      .eq('id', r.id);
    if (error) console.error(`  update ${r.code}: ${error.message}`);
    else ok += 1;
  }
  console.log(`Updated ${ok}/${toUpdate.length}`);
}

const finalMap = await fetchExisting();
console.log(`Total medications in DB now: ${finalMap.size}`);
