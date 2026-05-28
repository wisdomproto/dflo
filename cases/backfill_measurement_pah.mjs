// hospital_measurements.pah 백필 — bone_age + height 가 있는 모든 row 에 대해
// XrayPanel 과 같은 LMS 알고리즘으로 예측 성인키를 계산해 저장. 이 백필 이후
// 부터는 환자 스토리 generator 가 DB 의 pah 컬럼만 source-of-truth 로 사용.
//
// 안전장치:
//   - pah 가 이미 NULL 이 아닌 row 는 기본적으로 건드리지 않음 (--force 로 덮어쓰기)
//   - bone_age 또는 height 가 없는 row 는 skip
//
// Usage:
//   node cases/backfill_measurement_pah.mjs                 # 누락분만 채움
//   node cases/backfill_measurement_pah.mjs --force         # 기존 값도 LMS 로 덮어쓰기
//   node cases/backfill_measurement_pah.mjs --chart=NNNNN   # 특정 환자만
//   node cases/backfill_measurement_pah.mjs --dry-run       # update 안 하고 카운트만

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { predictAdultHeightByBonePercentile } from './lib/predict.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p) {
  const out = {};
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const URL = aiEnv.SUPABASE_URL || v4Env.VITE_SUPABASE_URL;
const KEY =
  aiEnv.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('× SUPABASE_URL / KEY 누락');
  process.exit(2);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const chartOnly = args.find((a) => a.startsWith('--chart='))?.split('=')[1] ?? null;

const s = createClient(URL, KEY, { auth: { persistSession: false } });

// 1. children: id → gender 매핑
let childFilter = s.from('children').select('id, gender, chart_number');
if (chartOnly) childFilter = childFilter.eq('chart_number', chartOnly);
const children = [];
for (let from = 0; ; from += 1000) {
  let q = s.from('children').select('id, gender, chart_number').range(from, from + 999);
  if (chartOnly) q = q.eq('chart_number', chartOnly);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) break;
  children.push(...data);
  if (data.length < 1000) break;
}
const childById = new Map(children.map((c) => [c.id, c]));
console.log(`children loaded: ${children.length}${chartOnly ? ` (chart ${chartOnly} only)` : ''}`);
if (children.length === 0) {
  console.error('× 해당 환자 없음');
  process.exit(2);
}

// 2. hospital_measurements: bone_age 있는 row
const childIds = [...childById.keys()];
const measurements = [];
for (let i = 0; i < childIds.length; i += 200) {
  const chunk = childIds.slice(i, i + 200);
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from('hospital_measurements')
      .select('id, child_id, height, bone_age, pah, measured_date')
      .in('child_id', chunk)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    measurements.push(...data);
    if (data.length < 1000) break;
  }
}
console.log(`measurements loaded: ${measurements.length}`);

// 3. 대상 필터링 + 계산
const stats = { skipped_no_inputs: 0, skipped_has_pah: 0, computed: 0, no_change: 0, updated: 0, errors: 0 };
const updates = [];
for (const m of measurements) {
  if (m.bone_age == null || m.height == null) {
    stats.skipped_no_inputs += 1;
    continue;
  }
  if (m.pah != null && !force) {
    stats.skipped_has_pah += 1;
    continue;
  }
  const c = childById.get(m.child_id);
  if (!c || (c.gender !== 'male' && c.gender !== 'female')) continue;
  const pah = predictAdultHeightByBonePercentile(m.height, m.bone_age, c.gender);
  if (pah == null || pah <= 0) continue;
  const rounded = Math.round(pah * 10) / 10;
  stats.computed += 1;
  if (m.pah != null && Math.abs(m.pah - rounded) < 0.05) {
    stats.no_change += 1;
    continue;
  }
  updates.push({ id: m.id, pah: rounded });
}
console.log(`\nplan: ${updates.length} row 업데이트 예정 (force=${force}, dry=${dryRun})`);
console.log(`  computed=${stats.computed}, skipped_no_inputs=${stats.skipped_no_inputs}, skipped_has_pah=${stats.skipped_has_pah}, no_change=${stats.no_change}`);

if (dryRun) {
  console.log('\ndry-run: 변경 없이 종료');
  process.exit(0);
}

// 4. 실제 업데이트 (배치 update)
let done = 0;
for (const u of updates) {
  const { error } = await s
    .from('hospital_measurements')
    .update({ pah: u.pah, updated_at: new Date().toISOString() })
    .eq('id', u.id);
  if (error) {
    console.error(`  [err] id=${u.id}: ${error.message}`);
    stats.errors += 1;
  } else {
    stats.updated += 1;
  }
  done += 1;
  if (done % 100 === 0) process.stdout.write(`  ${done}/${updates.length} updated\n`);
}

console.log(`\n✓ done. updated=${stats.updated}, errors=${stats.errors}`);
