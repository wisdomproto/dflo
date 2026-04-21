// Quick check: list recently-inserted lab_tests rows for sanity.
import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';

const envTxt = readFileSync('./ai-server/.env', 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s
  .from('lab_tests')
  .select('id, test_type, collected_date, result_data, child:children(chart_number, name)')
  .order('collected_date', { ascending: false })
  .limit(25);
if (error) { console.error(error); process.exit(1); }
for (const r of data) {
  const panel = r.result_data?.panel_type || r.test_type;
  const items = r.result_data?.items?.length
    ?? r.result_data?.abnormal_markers?.length
    ?? (r.result_data?.value !== undefined ? 1 : 0);
  console.log(`  ${r.child.chart_number} ${r.child.name}: ${panel.padEnd(16)} ${r.collected_date} (${items} rows)`);
}
