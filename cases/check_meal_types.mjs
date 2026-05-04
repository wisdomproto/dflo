// meals 테이블의 meal_type 분포 + daily_routine 당 meal_type 중복 여부 점검.

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

async function fetchAll(table, select) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await s.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

async function main() {
  const meals = await fetchAll('meals', 'id, daily_routine_id, meal_type, description, is_healthy');
  console.log(`total meals rows: ${meals.length}`);

  // 1) meal_type 분포
  console.log('\n=== meal_type distribution ===');
  const typeDist = new Map();
  for (const m of meals) {
    const k = m.meal_type ?? '(null)';
    typeDist.set(k, (typeDist.get(k) || 0) + 1);
  }
  for (const [k, v] of [...typeDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)} ${v}`);
  }

  // 2) daily_routine 별 meal_type 중복 (같은 routine 에 breakfast 가 N>1 회)
  console.log('\n=== daily_routine 안에서 같은 meal_type 중복 ===');
  const byRoutineType = new Map();
  for (const m of meals) {
    const key = `${m.daily_routine_id}|${m.meal_type}`;
    byRoutineType.set(key, (byRoutineType.get(key) || 0) + 1);
  }
  const duplicateBuckets = new Map(); // count → 몇 번 일어났나
  for (const v of byRoutineType.values()) {
    duplicateBuckets.set(v, (duplicateBuckets.get(v) || 0) + 1);
  }
  for (const [count, n] of [...duplicateBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${count}건/routine: ${n}개 (routine,meal_type) 조합`);
  }
  const totalDup = [...byRoutineType.values()].filter((v) => v > 1).length;
  console.log(`  → 중복 조합 (count>1): ${totalDup}개`);

  // 3) routine 당 meal_type 종류 수 (3끼만? 4끼? 5끼?)
  const byRoutine = new Map();
  for (const m of meals) {
    if (!byRoutine.has(m.daily_routine_id)) byRoutine.set(m.daily_routine_id, new Set());
    byRoutine.get(m.daily_routine_id).add(m.meal_type);
  }
  console.log('\n=== routine 당 meal_type 종류 수 ===');
  const sizeDist = new Map();
  for (const set of byRoutine.values()) {
    sizeDist.set(set.size, (sizeDist.get(set.size) || 0) + 1);
  }
  for (const [n, c] of [...sizeDist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${n}종류: ${c}개 routine`);
  }

  // 4) description 의 "간식" 분포 (meal_type 과 description 이 일치하는지)
  console.log('\n=== description 패턴 (meal_type 별 첫 단어) ===');
  const descByType = new Map();
  for (const m of meals) {
    const t = m.meal_type ?? '(null)';
    if (!descByType.has(t)) descByType.set(t, new Map());
    const head = (m.description ?? '').split(/[:\s]/)[0] || '(empty)';
    descByType.get(t).set(head, (descByType.get(t).get(head) || 0) + 1);
  }
  for (const [type, headMap] of descByType) {
    console.log(`\n  [${type}]`);
    const top = [...headMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [head, c] of top) console.log(`    ${head}: ${c}`);
  }

  // 5) 최근 7일 한 환자(22028 이재윤)의 raw 데이터 확인
  console.log('\n=== 22028 이재윤 최근 7개 routine 의 meals ===');
  const { data: child } = await s.from('children').select('id, name').eq('chart_number', '22028').single();
  if (child) {
    const { data: routines } = await s
      .from('daily_routines')
      .select('id, routine_date')
      .eq('child_id', child.id)
      .order('routine_date', { ascending: false })
      .limit(7);
    for (const r of routines ?? []) {
      const todays = meals.filter((m) => m.daily_routine_id === r.id);
      console.log(`  ${r.routine_date}  (${todays.length}개)`);
      for (const m of todays) {
        const hq = m.is_healthy === true ? '👍' : m.is_healthy === false ? '👎' : '·';
        console.log(`    ${hq} ${(m.meal_type || '?').padEnd(10)} ${m.description ?? ''}`);
      }
    }
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
