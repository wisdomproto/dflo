// ai-server/scripts/backfill-embeddings.mjs
// evidence_papers 중 embedding IS NULL 인 행에 gemini-embedding-001(768d) 임베딩 백필.
//   - 텍스트 구성 = `${title}\n${abstract}` (ingest-papers/ingest-evidence 와 동일 → corpus 일관)
//   - 재-fetch 없음(외부 API 미사용, 랭킹 드리프트 없음). embedding 컬럼만 갱신.
//   - 재실행 = 자동 resume (이미 채운 행은 IS NULL 필터에서 제외)
//   - free-tier rate limit 대응: 기본 페이싱 + 429 백오프 재시도
// 사용:
//   node scripts/backfill-embeddings.mjs --dry-run          # 대상 행 수만 출력
//   node scripts/backfill-embeddings.mjs --limit 3          # 앞 3행만 (포맷 검증)
//   node scripts/backfill-embeddings.mjs                    # 전체 백필
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
// gemini.js 는 import 시점에 process.env.GEMINI_API_KEY 를 캡처 → .env 주입 후 동적 import
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
function argVal(name){
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const i = args.indexOf(name);
  return (i >= 0 && args[i+1] && !args[i+1].startsWith('--')) ? args[i+1] : '';
}
const LIMIT = Number(argVal('--limit')) || 0;
const BASE_SLEEP = Number(argVal('--sleep')) || 700; // ms, free-tier 완화 (~85 RPM 이하)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main(){
  const { embedText } = await import('../dist/services/gemini.js'); // 키 주입 후 동적 import

  let q = sb.from('evidence_papers').select('pmid, title, abstract').is('embedding', null).order('pmid');
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) { console.error('fetch fail:', error.message); process.exit(1); }
  console.log(`embedding IS NULL: ${data.length} rows (LIMIT=${LIMIT || 'none'})`);

  if (DRY) {
    for (const r of data.slice(0, 12)) console.log(`  ${r.pmid} | ${(r.title || '').slice(0, 64)}`);
    if (data.length > 12) console.log(`  ... +${data.length - 12} more`);
    console.log('dry-run — no writes.');
    return;
  }

  let ok = 0, fail = 0;
  for (const r of data) {
    const text = `${r.title || ''}\n${r.abstract || ''}`.trim();
    if (!text) { console.warn('skip empty text:', r.pmid); continue; }

    let emb = null;
    for (let attempt = 1; attempt <= 4 && !emb; attempt++) {
      try {
        emb = await embedText(text);
      } catch (e) {
        const msg = String(e.message || e);
        const isRate = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('503');
        if (isRate && attempt < 4) {
          const backoff = 5000 * attempt;
          console.warn(`  rate/transient on ${r.pmid} (try ${attempt}) → backoff ${backoff}ms`);
          await sleep(backoff);
        } else {
          console.warn('embed fail:', r.pmid, msg.slice(0, 120));
          break;
        }
      }
    }
    if (!emb) { fail++; continue; }

    const { error: uerr } = await sb.from('evidence_papers').update({ embedding: emb }).eq('pmid', r.pmid);
    if (uerr) { fail++; console.warn('update fail:', r.pmid, uerr.message); }
    else { ok++; if (ok % 20 === 0) console.log(`  ...${ok}/${data.length} embedded`); }

    await sleep(BASE_SLEEP);
  }
  console.log(`done. embedded=${ok} failed=${fail} (of ${data.length})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
