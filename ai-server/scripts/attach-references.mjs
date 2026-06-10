// ai-server/scripts/attach-references.mjs
// evidence_papers(임베딩) ↔ marketing_articles 블로그를 의미매칭해 blog_references 스냅샷 저장.
//   - 토픽별 en(또는 ko) 블로그 대표텍스트 임베딩 → 코사인 → sim>=threshold top-N.
//   - 기본은 blog_references 비어있는 토픽만 채움(수동편집 보존). --force 로 덮어씀.
//   - embedding IS NOT NULL 만 로드 + 커버리지 검증(< 95% 면 --allow-partial 없이는 abort).
// 사용: node scripts/attach-references.mjs [--dry-run] [--force] [--threshold 0.72] [--top 5] [--only <sort_order>] [--allow-partial]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { cosineSim, selectReferences } from '../dist/services/evidenceMatch.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FORCE = args.includes('--force');
const ALLOW_PARTIAL = args.includes('--allow-partial');
function argVal(name){ const eq=args.find(a=>a.startsWith(`${name}=`)); if(eq) return eq.split('=')[1]; const i=args.indexOf(name); return (i>=0&&args[i+1]&&!args[i+1].startsWith('--'))?args[i+1]:''; }
const THRESHOLD = Number(argVal('--threshold')) || 0.72;
const TOP_N = Number(argVal('--top')) || 5;
const ONLY = argVal('--only');
const EXPECTED_PAPERS = 281;

let _embedText = null;
async function getEmbed(){ if(!_embedText){ _embedText=(await import('../dist/services/gemini.js')).embedText; } return _embedText; }
function toVec(v){ return Array.isArray(v) ? v : JSON.parse(v); } // pgvector → string|array
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

// en(없으면 ko) 블로그 대표 텍스트: h1 + primary + secondary + 섹션 제목들.
function repText(blog){
  const pick = (blog && (blog.en || blog.ko)) || null;
  if (!pick) return '';
  const parts = [pick.h1, pick.primaryKeyword, ...(pick.secondaryKeywords||[]), ...((pick.sections||[]).map(s=>s.heading))];
  return parts.filter(Boolean).join(' \n ').trim();
}

async function main(){
  // 1) 논문 로드 (embedding IS NOT NULL) + 커버리지 검증
  const { data: papers, error: pErr } = await sb
    .from('evidence_papers').select('pmid,title,journal,year,doi,url,embedding').not('embedding','is',null);
  if (pErr){ console.error('papers fetch:', pErr.message); process.exit(1); }
  const corpus = papers.map(p=>({ ...p, vec: toVec(p.embedding) }));
  const cov = corpus.length / EXPECTED_PAPERS;
  console.log(`papers with embedding: ${corpus.length}/${EXPECTED_PAPERS} (${(cov*100).toFixed(0)}%)`);
  if (cov < 0.95 && !ALLOW_PARTIAL){ console.error('임베딩 커버리지 < 95% — 백필 미완 의심. --allow-partial 로 강행 가능.'); process.exit(1); }

  // 2) 아티클 로드
  const { data: arts, error: aErr } = await sb
    .from('marketing_articles').select('id,sort_order,blog,blog_references').order('sort_order');
  if (aErr){ console.error('articles fetch:', aErr.message); process.exit(1); }

  let processed=0, stored=0;
  for (const a of arts){
    if (ONLY && String(a.sort_order)!==String(ONLY)) continue;
    const existing = Array.isArray(a.blog_references) ? a.blog_references : [];
    if (existing.length && !FORCE) continue; // 수동편집 보존
    const text = repText(a.blog);
    if (!text){ console.warn(`#${a.sort_order}: en/ko 블로그 없음 — skip`); continue; }
    processed++;
    let qv;
    try { const ef = await getEmbed(); qv = await ef(text); }
    catch(e){ console.warn(`#${a.sort_order} embed fail: ${e.message}`); continue; }
    const scored = corpus.map(p=>({ pmid:p.pmid, title:p.title, journal:p.journal, year:p.year, doi:p.doi, url:p.url, sim: cosineSim(qv, p.vec) }));
    const refs = selectReferences(scored, { threshold: THRESHOLD, topN: TOP_N });

    if (DRY){
      const top = [...scored].sort((x,y)=>y.sim-x.sim).slice(0,8);
      console.log(`\n#${a.sort_order} (선택 ${refs.length} @>=${THRESHOLD}) 상위8:`);
      for (const s of top) console.log(`   ${s.sim.toFixed(3)} | ${(s.title||'').slice(0,66)}`);
      continue;
    }
    const { error: uErr } = await sb.from('marketing_articles')
      .update({ blog_references: refs, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (uErr) console.warn(`#${a.sort_order} update fail: ${uErr.message}`);
    else { stored++; console.log(`#${a.sort_order}: ${refs.length} refs`); }
    await sleep(400);
  }
  console.log(`\ndone. processed=${processed} stored=${stored} dry=${DRY}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
