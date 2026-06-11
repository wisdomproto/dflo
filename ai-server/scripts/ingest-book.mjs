// ai-server/scripts/ingest-book.mjs
// cases/book-chunks.json → embedText(gemini-embedding-001) → knowledge_documents.
//   - 재적재 안전: 같은 source 삭제 후 재삽입(책 1권). 임베딩 쿼터는 생성과 별개·여유.
// 사용: node scripts/ingest-book.mjs [book-chunks.json 경로] [--dry-run]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const jsonArg = args.find(a => !a.startsWith('--'));
const jsonPath = jsonArg || new URL('../../cases/book-chunks.json', import.meta.url).pathname.replace(/^\//,'');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let _embed = null;
async function getEmbed(){ if(!_embed){ _embed = (await import('../dist/services/gemini.js')).embedText; } return _embed; }

async function main(){
  const chunks = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const source = chunks[0]?.source || '우리 아이 키 성장 바이블';
  console.log(`chunks: ${chunks.length} (source: ${source})`);
  if (DRY){ console.log('dry-run — no writes.'); return; }
  if (!chunks.length){ console.error('no chunks — aborting (입력이 비었음?).'); process.exit(1); }

  // 빌드/임베딩 모듈 선검증: delete 전에 실패시켜 테이블이 비워진 채 끝나는 것 방지
  const geminiPath = new URL('../dist/services/gemini.js', import.meta.url).pathname.replace(/^\//,'');
  if (!fs.existsSync(geminiPath)){ console.error('dist/services/gemini.js 없음 — 먼저: npm run build'); process.exit(1); }
  const embed = await getEmbed();

  const { error: delErr } = await sb.from('knowledge_documents').delete().eq('source', source);
  if (delErr){ console.error('delete fail:', delErr.message); process.exit(1); }

  let ok=0, fail=0;
  for (const c of chunks){
    let emb = null;
    for (let attempt=1; attempt<=4 && !emb; attempt++){
      try { emb = await embed(`${c.chapter}\n${c.content}`); }
      catch(e){ const m=String(e.message||e);
        if ((m.includes('429')||m.includes('503')||m.toLowerCase().includes('quota')) && attempt<4){ await sleep(5000*attempt); }
        else { console.warn('embed fail', c.chunk_index, m.slice(0,80)); break; } }
    }
    if (!emb){ fail++; continue; }
    const { error } = await sb.from('knowledge_documents').insert({
      source:c.source, author:c.author, chapter:c.chapter, chunk_index:c.chunk_index, content:c.content, embedding: emb });
    if (error){ fail++; console.warn('insert fail', c.chunk_index, error.message); }
    else { ok++; if (ok%20===0) console.log(`  ...${ok}/${chunks.length}`); }
    await sleep(700);
  }
  console.log(`done. inserted ${ok} fail ${fail} (of ${chunks.length})`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
