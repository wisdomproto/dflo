// meals + exercises + exercise_logs 스키마/데이터 점검.

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
  // ── meals ──
  console.log('=== meals (sample row) ===');
  const { data: mealSample } = await s.from('meals').select('*').limit(1);
  if (mealSample?.length) {
    console.log('columns:', Object.keys(mealSample[0]).join(', '));
    console.log('sample:', JSON.stringify(mealSample[0], null, 2));
  }

  console.log('\n=== meals.is_healthy distribution ===');
  const meals = await fetchAll('meals', 'is_healthy');
  const dist = new Map();
  for (const m of meals) {
    const key = m.is_healthy === null ? 'null' : String(m.is_healthy);
    dist.set(key, (dist.get(key) || 0) + 1);
  }
  for (const [k, v] of dist) console.log(`  ${k}: ${v}`);
  console.log(`  total: ${meals.length}`);

  // 다른 quality 컬럼 후보 검색
  console.log('\n=== meals other quality-like columns sample (50) ===');
  const { data: ms } = await s.from('meals').select('*').limit(50);
  if (ms?.length) {
    const allKeys = new Set();
    for (const m of ms) for (const k of Object.keys(m)) allKeys.add(k);
    console.log('  all column keys observed:', [...allKeys].join(', '));
  }

  // ── exercises ──
  console.log('\n=== exercises (full list) ===');
  const exercises = await fetchAll('exercises', '*');
  console.log(`total: ${exercises.length}`);
  if (exercises[0]) {
    console.log('columns:', Object.keys(exercises[0]).join(', '));
  }
  // 카테고리별 그룹
  const byCat = new Map();
  for (const ex of exercises) {
    const cat = ex.category ?? '(no category)';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(ex);
  }
  for (const [cat, list] of byCat) {
    console.log(`\n  [${cat}] ${list.length}`);
    for (const ex of list) {
      const yt = ex.youtube_url ? '✓YT' : '·';
      const active = ex.is_active === false ? '✗' : '·';
      console.log(`    ${yt} ${active} #${ex.order_index ?? '-'} ${ex.name ?? ex.id}`);
    }
  }

  // ── exercise_logs ──
  console.log('\n=== exercise_logs sample ===');
  const { data: logSample } = await s.from('exercise_logs').select('*').limit(1);
  if (logSample?.length) {
    console.log('columns:', Object.keys(logSample[0]).join(', '));
  }
  const logs = await fetchAll('exercise_logs', 'exercise_name, completed');
  console.log(`total exercise_logs: ${logs.length}`);
  // 어떤 운동 이름이 가장 많이 로그됐는지 top 10
  const nameCnt = new Map();
  for (const l of logs) {
    const k = l.exercise_name || '(no name)';
    nameCnt.set(k, (nameCnt.get(k) || 0) + 1);
  }
  console.log('  top 10 logged exercise_name:');
  for (const [n, c] of [...nameCnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(c).padStart(4)}  ${n}`);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
