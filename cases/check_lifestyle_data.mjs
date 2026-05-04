// 생활습관 데이터 (daily_routines / meals / exercise_logs) 가
// 어떤 children 에 들어 있는지, 어떤 환자에 가장 풍부한지 조사.

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
    const { data, error } = await s
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

async function main() {
  console.log('=== aggregating daily_routines ===');
  const routines = await fetchAll('daily_routines', 'child_id, routine_date');
  console.log(`total daily_routines rows: ${routines.length}`);
  const byChildRoutines = new Map();
  for (const r of routines) {
    const cur = byChildRoutines.get(r.child_id) || { rows: 0, dates: new Set() };
    cur.rows += 1;
    cur.dates.add(r.routine_date);
    byChildRoutines.set(r.child_id, cur);
  }
  console.log(`distinct children w/ routines: ${byChildRoutines.size}`);

  console.log('\n=== aggregating meals (via daily_routine_id) ===');
  const meals = await fetchAll('meals', 'daily_routine_id');
  console.log(`total meals rows: ${meals.length}`);
  // routine_id → child_id 매핑
  const routineIdToChild = new Map();
  for (const r of await fetchAll('daily_routines', 'id, child_id')) {
    routineIdToChild.set(r.id, r.child_id);
  }
  const byChildMeals = new Map();
  for (const m of meals) {
    const cid = routineIdToChild.get(m.daily_routine_id);
    if (!cid) continue;
    byChildMeals.set(cid, (byChildMeals.get(cid) || 0) + 1);
  }

  console.log('\n=== aggregating exercise_logs ===');
  const exercises = await fetchAll('exercise_logs', 'daily_routine_id');
  console.log(`total exercise_logs rows: ${exercises.length}`);
  const byChildExercises = new Map();
  for (const e of exercises) {
    const cid = routineIdToChild.get(e.daily_routine_id);
    if (!cid) continue;
    byChildExercises.set(cid, (byChildExercises.get(cid) || 0) + 1);
  }

  // join with children info
  const children = await fetchAll('children', 'id, chart_number, name');
  const byId = new Map(children.map((c) => [c.id, c]));

  // top 10 by routines
  console.log('\n=== top 10 children by daily_routines rows ===');
  const ranked = [...byChildRoutines.entries()]
    .map(([cid, v]) => ({
      child: byId.get(cid),
      routines: v.rows,
      distinctDates: v.dates.size,
      meals: byChildMeals.get(cid) || 0,
      exercises: byChildExercises.get(cid) || 0,
    }))
    .filter((r) => r.child)
    .sort((a, b) => b.routines - a.routines);
  for (const r of ranked.slice(0, 10)) {
    console.log(
      `  ${(r.child.chart_number || '?').padEnd(8)} ${(r.child.name || '').padEnd(15)} routines=${String(r.routines).padStart(4)}  meals=${String(r.meals).padStart(4)}  exercises=${String(r.exercises).padStart(4)}`,
    );
  }

  // 가장 풍부한 환자에 한해 최근 routine_date 분포
  if (ranked.length) {
    const top = ranked[0];
    console.log(`\n=== top patient ${top.child.chart_number} (${top.child.name}) routine date range ===`);
    const dates = [...byChildRoutines.get(top.child.id).dates].sort();
    console.log(`  earliest: ${dates[0]}`);
    console.log(`  latest:   ${dates[dates.length - 1]}`);
    console.log(`  distinct dates: ${dates.length}`);
  }

  // 다른 환자 참고: 22028 이재윤 (visits 가장 많은 환자) 의 생활습관 데이터?
  console.log('\n=== chart 22028 이재윤 ===');
  const lee = children.find((c) => c.chart_number === '22028');
  if (lee) {
    console.log(`  daily_routines: ${(byChildRoutines.get(lee.id)?.rows) || 0}`);
    console.log(`  meals:          ${byChildMeals.get(lee.id) || 0}`);
    console.log(`  exercises:      ${byChildExercises.get(lee.id) || 0}`);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
