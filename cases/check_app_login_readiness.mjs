// 앱 로그인 준비 상태 진단.
// children.chart_number + children.password 매칭 + parent_id 유효성 점검.

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
  console.log('=== children ===');
  const children = await fetchAll('children', 'id, chart_number, password, parent_id, name, is_active');
  console.log(`total: ${children.length}`);
  console.log(`with chart_number: ${children.filter((c) => c.chart_number).length}`);
  console.log(`with password: ${children.filter((c) => c.password).length}`);
  console.log(`without password: ${children.filter((c) => !c.password).length}`);
  console.log(`with parent_id: ${children.filter((c) => c.parent_id).length}`);
  console.log(`without parent_id: ${children.filter((c) => !c.parent_id).length}`);
  console.log(`is_active=true: ${children.filter((c) => c.is_active).length}`);
  console.log(`TMP-* chart_number: ${children.filter((c) => (c.chart_number || '').startsWith('TMP-')).length}`);

  // 패스워드가 있는 행이 있다면 어떤 값들이 쓰였는지 빈도
  const pwCount = new Map();
  for (const c of children) {
    if (!c.password) continue;
    pwCount.set(c.password, (pwCount.get(c.password) || 0) + 1);
  }
  if (pwCount.size > 0) {
    console.log('\npassword distribution:');
    for (const [pw, n] of [...pwCount.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  "${pw}" → ${n}`);
    }
  }

  // 부모 유저
  console.log('\n=== users (parents) ===');
  const parentIds = [...new Set(children.map((c) => c.parent_id).filter(Boolean))];
  const { data: parents, error: pErr } = await s
    .from('users')
    .select('id, email, name, role, is_active')
    .in('id', parentIds);
  if (pErr) throw pErr;
  for (const p of parents) {
    const cnt = children.filter((c) => c.parent_id === p.id).length;
    console.log(`  ${p.email.padEnd(35)} role=${p.role} active=${p.is_active} children=${cnt}`);
  }

  // 샘플 5명 (chart, name, password 유무)
  console.log('\n=== sample children ===');
  for (const c of children.slice(0, 5)) {
    console.log(`  ${(c.chart_number || '<no chart>').padEnd(15)} ${(c.name || '').padEnd(20)} pw=${c.password ? 'YES' : 'NO'}`);
  }

  // 데이터가 가장 많은 환자 5명 (visits 기준)
  console.log('\n=== top 5 patients by visit count ===');
  const allVisits = await fetchAll('visits', 'child_id, is_intake');
  const visitMap = new Map();
  for (const v of allVisits) {
    if (v.is_intake) continue;
    visitMap.set(v.child_id, (visitMap.get(v.child_id) || 0) + 1);
  }
  const top5 = children
    .map((c) => ({ ...c, visits: visitMap.get(c.id) || 0 }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
  for (const c of top5) {
    console.log(`  ${(c.chart_number || '?').padEnd(10)} ${(c.name || '').padEnd(20)} visits=${c.visits}  pw=${c.password ? 'YES' : 'NO'}`);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
