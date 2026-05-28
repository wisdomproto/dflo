// 특정 환자의 raw lab 파일이 storage 에 얼마나 올라가있는지 확인.
// Usage: node cases/check_raw_labs.mjs --chart=23661
import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p) {
  const o = {};
  try { for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
  return o;
}
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const URL = ai.SUPABASE_URL || v4.VITE_SUPABASE_URL;
const KEY = ai.SUPABASE_SERVICE_ROLE_KEY || v4.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY;
const s = createClient(URL, KEY, { auth: { persistSession: false } });
const chart = process.argv.slice(2).find((a) => a.startsWith('--chart='))?.split('=')[1];
if (!chart) { console.error('Usage: --chart=NNNNN'); process.exit(2); }

// Storage list lab/{chart}/
const { data: labFiles, error: lErr } = await s.storage.from('raw-records').list(`lab/${chart}`, { limit: 200 });
if (lErr) {
  console.error('lab storage list error:', lErr.message);
} else {
  console.log(`\n=== raw-records/lab/${chart}/ — ${labFiles?.length ?? 0}개 파일 ===`);
  for (const f of labFiles ?? []) console.log(`  ${f.name}  (${f.metadata?.size ?? '?'} bytes)`);
}

// 판독문 파일
const { data: panFiles, error: pErr } = await s.storage.from('raw-records').list(`pandokmun/${chart}`, { limit: 200 });
if (pErr) {
  console.error('pandokmun storage list error:', pErr.message);
} else {
  console.log(`\n=== raw-records/pandokmun/${chart}/ — ${panFiles?.length ?? 0}개 파일 ===`);
  for (const f of panFiles ?? []) console.log(`  ${f.name}`);
}

// 현재 DB 의 lab_tests
const { data: child } = await s.from('children').select('id').eq('chart_number', chart).single();
if (child) {
  const { data: labs } = await s.from('lab_tests')
    .select('collected_date, test_type, result_data')
    .eq('child_id', child.id)
    .order('collected_date', { ascending: true });
  console.log(`\n=== DB lab_tests — ${labs?.length ?? 0}건 ===`);
  for (const l of labs ?? []) {
    const panel = l.result_data?.panel_type || l.test_type;
    console.log(`  ${l.collected_date}  panel=${panel}`);
  }
}
