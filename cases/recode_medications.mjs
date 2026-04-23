// Reassign medication codes to a clean, searchable format.
//
// New format: {CAT}{3-digit-serial}
//   SUP — 영양제 / 비타민 / 미네랄 / 보충제 (oral supplements)
//   INJ — 주사 / IV / PO (injections and IV preparations)
//   PRO — 시술 / 물리치료 / 운동 / Manual therapy / PT
//   MED — 일반 처방약 (tablets, capsules, liquids, ointments)
//
// Each category is sorted alphabetically by name (Korean collation), then numbered.
// Original eone code is preserved in `notes` as "eone:{orig}".
//
// Usage: node cases/recode_medications.mjs [--dry-run]

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p) { const o={}; try { for (const l of readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'');}}catch{} return o; }
const v = loadEnv(resolve(ROOT,'v4','.env.local'));
const a = loadEnv(resolve(ROOT,'ai-server','.env'));
const sb = createClient(
  v.VITE_SUPABASE_URL || a.SUPABASE_URL,
  a.SUPABASE_SERVICE_ROLE_KEY || v.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const DRY = process.argv.includes('--dry-run');

// ─── Category classifier (3 buckets) ─────────────────────────────────
// Kept intentionally conservative: anything not clearly INJ or PRO → MED.
const PROC_KEYWORDS = [
  'Manual therapy', 'Posture Correction', 'Posture Exer', 'J Exercise',
  'Physical Therapy', '물리치료', '도수치료', '운동치료',
];
const INJ_KEYWORDS = [
  '주사', ' IV', 'IV)', 'IV ', 'IV/', '수액', '드립', '앰플', 'Ampoule', 'ampoule',
  'BOTOX', 'Botox', 'HCG', '루프린', '성장호르몬주', 'Hormone balance IV',
  '히알루론산주', '메가도스', '영양주사',
];

function classify(name, code) {
  const n = name || '';
  for (const k of PROC_KEYWORDS) {
    if (n.includes(k)) return 'PRO';
  }
  // Known procedure shortcodes
  if (['mt', 'mt05', 'mtp', 'mt_EX', 'PCE', 'PCC', 'JE', 'PerTra'].includes(code)) return 'PRO';
  for (const k of INJ_KEYWORDS) {
    if (n.includes(k)) return 'INJ';
  }
  // Code-based injection hints (eone convention: Hormone balance IV/PO, HCG_D, etc.)
  if (code === 'HCG_D' || /IV$/.test(code)) return 'INJ';
  return 'MED';
}

// ─── Fetch current medications ────────────────────────────────────────
const all = [];
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('medications').select('id, code, name, default_dose, notes').range(from, from + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
}
console.log(`Loaded ${all.length} medications.`);

// ─── Classify + sort within category ─────────────────────────────────
const buckets = { INJ: [], PRO: [], MED: [] };
// Rows with empty or obviously-invalid names (separator rows that slipped in) → skip/cleanup separately
const junkIds = [];
for (const m of all) {
  const n = (m.name || '').trim();
  if (!n || n.startsWith('◀') || m.code.startsWith('◀')) {
    junkIds.push(m.id);
    continue;
  }
  const cat = classify(m.name, m.code);
  buckets[cat].push({ ...m, _cat: cat });
}
for (const cat of Object.keys(buckets)) {
  buckets[cat].sort((x, y) => (x.name || '').localeCompare(y.name || '', 'ko'));
}

console.log(`\nJunk rows to delete: ${junkIds.length}`);
console.log('Category distribution:');
for (const cat of ['INJ','PRO','MED']) console.log(`  ${cat}: ${buckets[cat].length}`);

// ─── Generate new codes ───────────────────────────────────────────────
const updates = [];
const pad4 = (n) => String(n).padStart(4, '0');
const pad3 = (n) => String(n).padStart(3, '0');
for (const cat of ['INJ','PRO','MED']) {
  const width = cat === 'MED' ? pad4 : pad3;
  buckets[cat].forEach((m, i) => {
    const newCode = `${cat}${width(i + 1)}`;
    const notes = m.notes && m.notes.includes('eone:')
      ? m.notes
      : (m.notes ? `${m.notes} | eone:${m.code}` : `eone:${m.code}`);
    updates.push({ id: m.id, oldCode: m.code, newCode, notes, name: m.name });
  });
}
console.log(`\nCode changes to apply: ${updates.length}`);

// Preview a sample
console.log('\nPreview first 20:');
for (const u of updates.slice(0, 20)) {
  console.log(`  ${u.oldCode.padEnd(15)} → ${u.newCode}   ${u.name.slice(0, 55)}`);
}

// Write mapping file
writeFileSync(
  resolve(HERE, '_medication_code_mapping.json'),
  JSON.stringify(updates, null, 2),
  'utf8',
);
console.log(`\nMapping saved: cases/_medication_code_mapping.json`);

if (DRY) { console.log('\n--dry-run: no writes.'); process.exit(0); }

// ─── Delete junk rows + their prescriptions ──────────────────────────
if (junkIds.length) {
  await sb.from('prescriptions').delete().in('medication_id', junkIds);
  await sb.from('medications').delete().in('id', junkIds);
  console.log(`Deleted ${junkIds.length} junk medication rows.`);
}

// ─── Apply updates in two passes to avoid UNIQUE collision ───────────
// pass 1: rename to temporary code "TMP-{id}"
// pass 2: rename to final new code
console.log('\nPass 1: temporary rename…');
let ok = 0;
for (const u of updates) {
  const { error } = await sb
    .from('medications')
    .update({ code: `TMP-${u.id.slice(0, 8)}` })
    .eq('id', u.id);
  if (error) { console.error(`  ${u.oldCode}: ${error.message}`); continue; }
  ok++;
  if (ok % 200 === 0) process.stdout.write(`\r  pass1 ${ok}/${updates.length}`);
}
process.stdout.write(`\r  pass1 ${ok}/${updates.length}\n`);

console.log('Pass 2: assign final codes…');
ok = 0;
for (const u of updates) {
  const { error } = await sb
    .from('medications')
    .update({ code: u.newCode, notes: u.notes })
    .eq('id', u.id);
  if (error) { console.error(`  ${u.newCode}: ${error.message}`); continue; }
  ok++;
  if (ok % 200 === 0) process.stdout.write(`\r  pass2 ${ok}/${updates.length}`);
}
process.stdout.write(`\r  pass2 ${ok}/${updates.length}\n`);

console.log('\nDone.');
