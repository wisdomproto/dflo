// Upsert a Claude-written patient story by chart_number.
//
// Usage:
//   node cases/upsert_patient_story.mjs \
//     --chart=26198 \
//     --title="오래 자랄 아이" \
//     --story-file=/tmp/holding-story.txt
//
// --story-file 은 본문 텍스트를 통째로 담은 UTF-8 파일 경로. 인라인 인용을
// 피하려고 파일로 받는다 (쉘 escape 지옥 회피).

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const URL = aiEnv.SUPABASE_URL || v4Env.VITE_SUPABASE_URL;
const KEY =
  aiEnv.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('× SUPABASE_URL / KEY 누락');
  process.exit(2);
}

const args = process.argv.slice(2);
const get = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const chart = get('chart');
const title = get('title');
const storyFile = get('story-file');
if (!chart || !title || !storyFile) {
  console.error('Usage: --chart=NNNNN --title="..." --story-file=PATH');
  process.exit(2);
}
const story = readFileSync(storyFile, 'utf8').trim();
if (!story) {
  console.error('× story-file 비어있음');
  process.exit(2);
}

const s = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: childRows, error: cErr } = await s
  .from('children')
  .select('id, chart_number, name')
  .eq('chart_number', chart);
if (cErr) throw cErr;
if (!childRows?.length) {
  console.error(`× chart_number=${chart} 환자 없음`);
  process.exit(2);
}
const child = childRows[0];

const { error } = await s.from('patient_stories').upsert(
  {
    child_id: child.id,
    title,
    story,
    model: 'claude-opus-4-7',
    source: 'claude',
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'child_id' },
);
if (error) {
  console.error('× upsert 실패:', error.message);
  process.exit(1);
}

console.log(`✓ #${child.chart_number} ${child.name} 스토리 저장됨`);
console.log(`  title: ${title}`);
console.log(`  length: ${story.length}자`);
