// exercises 테이블에 클라이언트 하드코딩 9개 운동을 INSERT.
// 컬럼: name, category, youtube_url, order_index, is_active
// 비어있는 테이블 가정 — 이미 row 있으면 skip.

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

const ROWS = [
  { name: '목 스트레칭',        category: '스트레칭', videoId: '-DULXNYk3Sg', start: 42 },
  { name: '등 스트레칭',        category: '스트레칭', videoId: '-DULXNYk3Sg', start: 117 },
  { name: '복부 스트레칭',      category: '스트레칭', videoId: 'RzuXWJJf7bY', start: 52 },
  { name: '옆구리 스트레칭',    category: '스트레칭', videoId: 'cBYdbmVwB0E', start: 135 },
  { name: '등 근육운동',        category: '근육운동', videoId: 'U62yLjlBSE8', start: 219 },
  { name: '허벅지 뒤 스트레칭', category: '스트레칭', videoId: 'RzuXWJJf7bY', start: 128 },
  { name: '엉덩이 스트레칭',    category: '스트레칭', videoId: 'kcgO4-ifJqE', start: 47 },
  { name: '허벅지 앞 스트레칭', category: '스트레칭', videoId: 'cBYdbmVwB0E', start: 48 },
  { name: '엉덩이 근육 운동',   category: '근육운동', videoId: 'bqjB7pRbIfw', start: 230 },
];

function urlOf(videoId, start) {
  return `https://www.youtube.com/watch?v=${videoId}&t=${start}s`;
}

async function main() {
  const { data: existing, error: eErr } = await s.from('exercises').select('id, name');
  if (eErr) throw eErr;
  console.log(`existing exercises: ${existing.length}`);
  if (existing.length > 0) {
    console.log('이미 데이터가 있어요. 종료합니다.');
    for (const e of existing) console.log(`  - ${e.name}`);
    return;
  }

  const payload = ROWS.map((r, i) => ({
    name: r.name,
    category: r.category,
    youtube_url: urlOf(r.videoId, r.start),
    order_index: i + 1,
    is_active: true,
  }));

  const { error } = await s.from('exercises').insert(payload);
  if (error) throw error;
  console.log(`inserted ${payload.length} exercises`);

  const { data: after } = await s.from('exercises').select('order_index, name, category, youtube_url').order('order_index');
  for (const e of after ?? []) {
    console.log(`  #${e.order_index}  [${e.category}]  ${e.name}  ${e.youtube_url}`);
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
