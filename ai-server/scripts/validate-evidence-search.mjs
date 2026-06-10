// ai-server/scripts/validate-evidence-search.mjs
// 임베딩 백필 검증용 일회성 진단: 한국어 쿼리 → evidence_papers 코사인 유사도 top-K.
//   - RPC 없이 JS brute-force (281행 × 768d). 교차언어(한국어 쿼리 ↔ 영어 초록) 매칭 sanity check.
//   - 읽기 전용 (DB write 없음).
// 사용: node scripts/validate-evidence-search.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function toVec(v){ return Array.isArray(v) ? v : JSON.parse(v); } // pgvector → string or array
function cosine(a, b){
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

const QUERIES = [
  '성장호르몬 치료가 키 작은 아이의 최종 성인 키를 얼마나 높이는가',
  '성조숙증 여아에서 GnRH 작용제 치료가 최종 키에 미치는 효과',
  '수면 부족이 아이 성장호르몬 분비와 키 성장에 미치는 영향',
];

async function main(){
  const { embedText } = await import('../dist/services/gemini.js');

  // 전체 코퍼스 로드 (id 없이 pmid 키)
  const { data, error } = await sb
    .from('evidence_papers')
    .select('pmid, title, journal, year, topic, citation_count, quality_score, embedding');
  if (error){ console.error('fetch fail:', error.message); process.exit(1); }
  const rows = data.filter(r => r.embedding).map(r => ({ ...r, vec: toVec(r.embedding) }));
  console.log(`corpus: ${rows.length} papers with embeddings (dim ${rows[0]?.vec.length})\n`);

  for (const q of QUERIES){
    const qv = await embedText(q);
    const scored = rows
      .map(r => ({ r, sim: cosine(qv, r.vec) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5);
    console.log(`■ "${q}"`);
    for (const { r, sim } of scored){
      console.log(`   ${sim.toFixed(3)} | ${r.topic.padEnd(18)} | ${r.year} | cite ${String(r.citation_count).padStart(4)} | ${(r.title || '').slice(0, 70)}`);
    }
    console.log('');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
