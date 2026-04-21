// Create placeholder child records for every chart_number that has OCR'd
// lab data but no children row in the DB yet.
//
// Uses a dedicated parent user 'ocr-import@187growth.com' so these imported
// records don't mix with the seeded treatment cases. Patient fields come
// from the OCR header:
//   chart_number            — key
//   patient_name_raw_ocr    → name (often slightly garbled, fixable later)
//   gender (M/F)            → 'male' / 'female'
//   birth_prefix (YYMMDD-c) → birth_date, century from digit c (3/4 → 2000s)

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';

const envTxt = readFileSync('./ai-server/.env', 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PARENT_EMAIL = 'ocr-import@187growth.com';
const PARENT_NAME = '랩데이터 임포트 (placeholder)';

const DEFAULT_BIRTH_DATE = '2010-01-01';

function parseBirthDate(birthPrefix) {
  if (!birthPrefix) return null;
  const m = birthPrefix.match(/^(\d{2})(\d{2})(\d{2})-(\d)$/);
  if (!m) return null;
  const [, yy, mm, dd, cent] = m;
  // 3/4 → 2000s, 1/2 → 1900s, others → fallback to 2000s.
  const century = ['3', '4', '7', '8'].includes(cent) ? 2000 : 1900;
  const year = century + parseInt(yy, 10);
  return `${year}-${mm}-${dd}`;
}

function normalizeGender(g) {
  if (g === 'M') return 'male';
  if (g === 'F') return 'female';
  return 'male'; // conservative fallback
}

async function getOrCreateParent() {
  const { data: existing } = await s
    .from('users')
    .select('id')
    .eq('email', PARENT_EMAIL)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await s
    .from('users')
    .insert({
      email: PARENT_EMAIL,
      name: PARENT_NAME,
      role: 'parent',
      password: 'ocr-import-placeholder',
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const agg = JSON.parse(
    readFileSync('./cases/랩데이터_ocr/_aggregated.json', 'utf8'),
  );

  // Collapse to one record per chart_number (take the first order's header
  // fields; names/gender may be consistent but birth is most reliable).
  const patients = new Map();
  for (const o of agg) {
    if (!o.chart_number) continue;
    if (patients.has(o.chart_number)) continue;
    patients.set(o.chart_number, {
      chart_number: o.chart_number,
      name_raw: o.patient_name_raw_ocr,
      gender: o.gender,
      birth_prefix: o.birth_prefix,
    });
  }

  console.log(`Aggregated JSON has ${patients.size} unique chart_numbers.`);

  const parentId = await getOrCreateParent();
  console.log(`Parent user: ${PARENT_EMAIL} (${parentId})`);

  // Existing chart_numbers in DB
  const { data: existing, error } = await s
    .from('children')
    .select('id, chart_number');
  if (error) throw error;
  const existingSet = new Set(existing.map((c) => c.chart_number));
  console.log(`DB already has ${existingSet.size} children.`);

  // Chart numbers to create
  const toCreate = [...patients.values()].filter(
    (p) => !existingSet.has(p.chart_number),
  );
  console.log(`Creating ${toCreate.length} new children...`);

  let created = 0;
  let failed = 0;
  // Batch for speed.
  const BATCH = 50;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH);
    const rows = slice.map((p) => ({
      parent_id: parentId,
      name: (p.name_raw && p.name_raw.trim()) || `환자 ${p.chart_number}`,
      gender: normalizeGender(p.gender),
      birth_date: parseBirthDate(p.birth_prefix) || DEFAULT_BIRTH_DATE,
      chart_number: p.chart_number,
      is_active: true,
    }));
    const { error: insErr } = await s.from('children').insert(rows);
    if (insErr) {
      console.error(`  batch ${i}: ${insErr.message}`);
      // Fall back to individual inserts so one bad row doesn't kill the batch.
      for (const r of rows) {
        const { error: e2 } = await s.from('children').insert(r);
        if (e2) {
          console.error(`    ${r.chart_number}: ${e2.message}`);
          failed += 1;
        } else {
          created += 1;
        }
      }
    } else {
      created += rows.length;
    }
    if ((i / BATCH) % 4 === 0) {
      console.log(`  ...${Math.min(i + BATCH, toCreate.length)}/${toCreate.length}`);
    }
  }

  console.log(`\nCreated ${created}, failed ${failed}.`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
