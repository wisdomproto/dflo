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
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const children = await fetchAll('children', 'id, chart_number, name, treatment_status');
const dist = new Map();
for (const c of children) {
  const k = c.treatment_status ?? '(null)';
  dist.set(k, (dist.get(k) || 0) + 1);
}
console.log('=== children.treatment_status 분포 ===');
for (const [k, v] of dist) console.log(`  ${k.padEnd(15)} ${v}`);
console.log(`  total          ${children.length}`);

console.log('\n=== 샘플 (treatment 5명, consultation 5명) ===');
const treat = children.filter((c) => c.treatment_status === 'treatment').slice(0, 5);
const cons = children.filter((c) => c.treatment_status === 'consultation').slice(0, 5);
console.log('[treatment]');
for (const c of treat) console.log(`  ${(c.chart_number || '?').padEnd(10)} ${c.name}`);
console.log('[consultation]');
for (const c of cons) console.log(`  ${(c.chart_number || '?').padEnd(10)} ${c.name}`);

const lee = children.find((c) => c.chart_number === '22028');
if (lee) console.log(`\n22028 이재윤: ${lee.treatment_status}`);
