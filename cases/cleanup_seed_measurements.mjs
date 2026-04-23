// Delete seed-only measurements (and their image-less xray_readings) that
// came from cases/치료 후기 케이스 정리 xlsx → seed_treatment_cases.sql.
// Criterion: measurement date does NOT appear in the patient's pandokmun
// OCR data.json with a real source_image.
//
// Visits themselves are preserved (they hold prescriptions, visit_images,
// lab_tests). visits.notes are also reset to empty so the seed-only
// 치료 메모 strings ("수면: good, 피로도: good, 운동: good") are gone.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p){const o={};try{for(const l of readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^["']|["']$/g,'');}}catch{}return o;}
const v=loadEnv(resolve(ROOT,'v4','.env.local')), a=loadEnv(resolve(ROOT,'ai-server','.env'));
const sb=createClient(v.VITE_SUPABASE_URL||a.SUPABASE_URL, a.SUPABASE_SERVICE_ROLE_KEY||v.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});

const DRY = process.argv.includes('--dry-run');
const CHARTS = ['3177', '5368', '22028', '26064', '26043', '27485', '27486'];

function ocrDatesForChart(chart) {
  const p = resolve(HERE, '판독문_ocr', chart, 'data.json');
  if (!existsSync(p)) return new Set();
  const d = JSON.parse(readFileSync(p, 'utf8'));
  return new Set(
    (d.measurements || []).filter((m) => m.source_image).map((m) => m.date),
  );
}

const { data: children } = await sb.from('children').select('id, chart_number, name').in('chart_number', CHARTS);
console.log('children matched:', children.length);

const toDeleteM = [];   // measurement ids
const toDeleteX = [];   // xray_reading ids (image_path null on affected visits)
const visitsToReset = new Set();   // visits to clear notes on (if seed-origin)

for (const c of children) {
  const ocrDates = ocrDatesForChart(c.chart_number);
  const { data: ms } = await sb
    .from('hospital_measurements')
    .select('id, visit_id, measured_date')
    .eq('child_id', c.id);
  for (const m of ms || []) {
    if (ocrDates.has(m.measured_date)) continue;
    toDeleteM.push(m.id);
    visitsToReset.add(m.visit_id);
  }
  // Corresponding xray_readings with no image on same visits
  if (visitsToReset.size) {
    const { data: xrs } = await sb
      .from('xray_readings')
      .select('id, visit_id, image_path')
      .eq('child_id', c.id);
    for (const x of xrs || []) {
      if (visitsToReset.has(x.visit_id) && x.image_path == null) toDeleteX.push(x.id);
    }
  }
}

console.log(`\nWill delete:`);
console.log(`  hospital_measurements: ${toDeleteM.length}`);
console.log(`  xray_readings (no image): ${toDeleteX.length}`);
console.log(`  visits to clear notes on: ${visitsToReset.size}`);

if (DRY) { console.log('\n--dry-run.'); process.exit(0); }

// Batch delete
async function batchDel(table, ids) {
  let ok = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await sb.from(table).delete().in('id', ids.slice(i, i + 100));
    if (!error) ok += Math.min(100, ids.length - i);
  }
  return ok;
}

console.log('\nDeleting…');
const mDeleted = await batchDel('hospital_measurements', toDeleteM);
console.log(`  hospital_measurements deleted: ${mDeleted}`);
const xDeleted = await batchDel('xray_readings', toDeleteX);
console.log(`  xray_readings deleted:        ${xDeleted}`);

// Clear notes on affected visits (only if notes came from seed patterns).
// Be conservative: only reset notes that look like seed-origin text.
const SEED_NOTE_PATTERNS = /^수면:|피로도:|운동|체중관리|채소 늘리자|잘 안커서|일찍 잔다|메디기넨|elbow|골연령/;
let notesCleared = 0;
const visitIds = Array.from(visitsToReset);
for (let i = 0; i < visitIds.length; i += 100) {
  const chunk = visitIds.slice(i, i + 100);
  const { data: vs } = await sb.from('visits').select('id, notes').in('id', chunk);
  for (const v of vs || []) {
    if (v.notes && SEED_NOTE_PATTERNS.test(v.notes)) {
      const { error } = await sb.from('visits').update({ notes: null }).eq('id', v.id);
      if (!error) notesCleared++;
    }
  }
}
console.log(`  visits.notes cleared: ${notesCleared}`);

console.log('\nDone.');
