// Delete non-medicine entries (X-ray film orders + chart copies) from medications
// and all prescriptions referencing them.
//
// Input: cases/_nonmed_flagged.json (array of {code, name})

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p) {
  const o = {};
  try {
    for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return o;
}
const v = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const a = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const sb = createClient(
  v.VITE_SUPABASE_URL || a.SUPABASE_URL,
  a.SUPABASE_SERVICE_ROLE_KEY || v.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const DRY = process.argv.includes('--dry-run');
const flagged = JSON.parse(readFileSync(resolve(HERE, '_nonmed_flagged.json'), 'utf8'));
const codes = flagged.map((f) => f.code);
console.log(`Flagged non-medicine codes: ${codes.length}`);

// Lookup ids
const { data: medRows, error: e1 } = await sb
  .from('medications')
  .select('id, code, name')
  .in('code', codes);
if (e1) { console.error(e1); process.exit(1); }
const medIds = medRows.map((m) => m.id);
console.log(`Matched in DB: ${medRows.length}`);

// Count prescriptions that reference them
const { count: rxCount, error: e2 } = await sb
  .from('prescriptions')
  .select('*', { count: 'exact', head: true })
  .in('medication_id', medIds);
if (e2) { console.error(e2); process.exit(1); }
console.log(`Prescriptions referencing these: ${rxCount}`);

if (DRY) { console.log('--dry-run: no writes.'); process.exit(0); }

// Delete prescriptions in chunks
const BATCH = 500;
for (let i = 0; i < medIds.length; i += BATCH) {
  const chunk = medIds.slice(i, i + BATCH);
  const { error } = await sb.from('prescriptions').delete().in('medication_id', chunk);
  if (error) console.error(`rx delete batch ${i}:`, error.message);
}
console.log('Deleted prescriptions.');

// Delete medications
const { error: e3 } = await sb.from('medications').delete().in('id', medIds);
if (e3) console.error('medications delete:', e3.message);
else console.log(`Deleted ${medIds.length} medications.`);

// Also clean up auto-created visits that now have ZERO prescriptions, zero measurements, zero labs, zero x-rays
// (these were created only because of a prescription-for-x-ray-order → now orphan).
const { data: autoVisits } = await sb
  .from('visits')
  .select('id, child_id, visit_date')
  .eq('notes', 'Auto-created from prescription import');
console.log(`Auto-created visits: ${autoVisits.length}`);

let orphanCount = 0;
for (const v of autoVisits) {
  const [{ count: rx }, { count: hm }, { count: xr }, { count: lb }] = await Promise.all([
    sb.from('prescriptions').select('*', { count: 'exact', head: true }).eq('visit_id', v.id),
    sb.from('hospital_measurements').select('*', { count: 'exact', head: true }).eq('visit_id', v.id),
    sb.from('xray_readings').select('*', { count: 'exact', head: true }).eq('visit_id', v.id),
    sb.from('lab_tests').select('*', { count: 'exact', head: true }).eq('visit_id', v.id),
  ]);
  if ((rx || 0) + (hm || 0) + (xr || 0) + (lb || 0) === 0) {
    const { error } = await sb.from('visits').delete().eq('id', v.id);
    if (!error) orphanCount++;
  }
}
console.log(`Deleted ${orphanCount} orphan auto-created visits.`);

// Final counts
const { count: medTotal } = await sb.from('medications').select('*', { count: 'exact', head: true });
const { count: rxTotal } = await sb.from('prescriptions').select('*', { count: 'exact', head: true });
const { count: vTotal } = await sb.from('visits').select('*', { count: 'exact', head: true });
console.log(`\nFinal: medications=${medTotal}, prescriptions=${rxTotal}, visits=${vTotal}`);
