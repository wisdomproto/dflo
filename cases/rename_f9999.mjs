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
const { data, error } = await s
  .from('children')
  .update({ name: '김철수' })
  .eq('chart_number', 'F9999')
  .select()
  .single();
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`✅ ${data.chart_number} → ${data.name}`);
