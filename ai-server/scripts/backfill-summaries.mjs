// ai-server/scripts/backfill-summaries.mjs
// evidence_papers 중 korean_summary 빈 + abstract 있는 행에 한국어 요약/핵심결론 생성.
//   - resume-safe(빈 행만), 700ms 페이싱 + 429 백오프. title-only(abstract 빈) 행 skip.
// 사용: node scripts/backfill-summaries.mjs [--dry-run] [--limit N]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { buildEvidenceSummaryPrompt, parseSummaryResponse } from '../dist/services/evidenceSummary.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
function argVal(name){ const eq=args.find(a=>a.startsWith(`${name}=`)); if(eq) return eq.split('=')[1]; const i=args.indexOf(name); return (i>=0&&args[i+1]&&!args[i+1].startsWith('--'))?args[i+1]:''; }
const LIMIT = Number(argVal('--limit')) || 0;
const BASE_SLEEP = Number(argVal('--sleep')) || 4000; // generateText(2.5-flash) 무료티어 RPM 낮음 → 느린 페이싱으로 429 회피(임베딩과 다른 쿼터)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _gen = null;
async function getGen(){ if(!_gen){ _gen = (await import('../dist/services/gemini.js')).generateText; } return _gen; }

async function main(){
  // korean_summary 빈(null 또는 '') AND abstract 비어있지 않음
  let q = sb.from('evidence_papers').select('pmid,title,abstract')
    .or('korean_summary.is.null,korean_summary.eq.').neq('abstract', '').order('pmid');
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error){ console.error('fetch fail:', error.message); process.exit(1); }
  console.log(`korean_summary 빈 + abstract 있음: ${data.length} rows (LIMIT=${LIMIT||'none'})`);
  if (DRY){ for (const r of data.slice(0,10)) console.log(`  ${r.pmid} | ${(r.title||'').slice(0,60)}`); console.log('dry-run, no writes.'); return; }

  const gen = await getGen();
  let ok=0, fail=0, consecFail=0;
  for (const r of data){
    let summary = null;
    for (let attempt=1; attempt<=4 && !summary; attempt++){
      try {
        const raw = await gen(buildEvidenceSummaryPrompt(r.title || '', r.abstract || ''));
        summary = parseSummaryResponse(raw);
      } catch(e){
        const msg = String(e.message||e);
        if ((msg.includes('429')||msg.includes('503')||msg.toLowerCase().includes('quota')) && attempt<4){
          console.warn(`  rate/transient ${r.pmid} (try ${attempt})`); await sleep(5000*attempt);
        } else { console.warn('gen/parse fail:', r.pmid, msg.slice(0,100)); break; }
      }
    }
    if (!summary){ fail++; if (++consecFail >= 6){ console.error('연속 6회 생성 실패 — Gemini 일일 쿼터(RPD) 소진 의심. 중단 (한도 리셋 후 재실행, resume-safe).'); break; } continue; }
    const { error: uErr } = await sb.from('evidence_papers')
      .update({ korean_summary: summary.korean_summary, key_finding: summary.key_finding }).eq('pmid', r.pmid);
    if (uErr){ fail++; console.warn('update fail:', r.pmid, uErr.message); }
    else { ok++; consecFail=0; if (ok%20===0) console.log(`  ...${ok}/${data.length}`); }
    await sleep(BASE_SLEEP);
  }
  console.log(`done. ok=${ok} fail=${fail} (of ${data.length})`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
