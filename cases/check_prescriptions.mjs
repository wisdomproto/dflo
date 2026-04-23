// Verify prescriptions import.
import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(path) {
  const out = {};
  try {
    const txt = readFileSync(path, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const sb = createClient(
  v4Env.VITE_SUPABASE_URL || aiEnv.SUPABASE_URL,
  aiEnv.SUPABASE_SERVICE_ROLE_KEY || v4Env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { count: rxCount } = await sb.from('prescriptions').select('*', { count: 'exact', head: true });
const { count: medCount } = await sb.from('medications').select('*', { count: 'exact', head: true });
const { count: visitCount } = await sb.from('visits').select('*', { count: 'exact', head: true });
console.log(`prescriptions: ${rxCount}`);
console.log(`medications:   ${medCount}`);
console.log(`visits:        ${visitCount}`);

// Fetch all prescriptions and aggregate client-side.
const allRx = [];
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('prescriptions').select('medication_id, child_id').range(from, from + 999);
  if (!data || data.length === 0) break;
  allRx.push(...data);
  if (data.length < 1000) break;
}
{
  const counts = new Map();
  for (const r of allRx) counts.set(r.medication_id, (counts.get(r.medication_id) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const { data: medLookup } = await sb
    .from('medications')
    .select('id, code, name')
    .in('id', top.map(([id]) => id));
  const mmap = new Map(medLookup.map((m) => [m.id, m]));
  console.log('\nTop 20 prescribed medications:');
  for (const [id, cnt] of top) {
    const m = mmap.get(id);
    console.log(`  ${cnt.toString().padStart(5)}  ${m?.code?.padEnd(15)}  ${m?.name}`);
  }
}

{
  const counts = new Map();
  for (const r of allRx) counts.set(r.child_id, (counts.get(r.child_id) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const { data: kids } = await sb
    .from('children')
    .select('id, name, chart_number')
    .in('id', top.map(([id]) => id));
  const kmap = new Map(kids.map((k) => [k.id, k]));
  console.log('\nTop 10 patients by prescription count:');
  for (const [id, cnt] of top) {
    const c = kmap.get(id);
    console.log(`  ${cnt.toString().padStart(5)}  ${c?.chart_number?.padEnd(8)}  ${c?.name}`);
  }
  console.log(`\nUnique children with prescriptions: ${counts.size}`);
}

// Visits created by auto-import
const { count: autoCount } = await sb
  .from('visits')
  .select('*', { count: 'exact', head: true })
  .eq('notes', 'Auto-created from prescription import');
console.log(`\nAuto-created visits: ${autoCount}`);
