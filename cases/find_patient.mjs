// 환자 이름 → chart_number 찾기. 일회성 헬퍼.
// Usage: node cases/find_patient.mjs --name=전하준
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
const name = process.argv.slice(2).find((a) => a.startsWith('--name='))?.split('=')[1];
if (!name) { console.error('Usage: --name=전하준'); process.exit(2); }
const { data, error } = await s.from('children').select('chart_number, name, gender, birth_date').ilike('name', `%${name}%`);
if (error) throw error;
console.log(JSON.stringify(data, null, 2));
