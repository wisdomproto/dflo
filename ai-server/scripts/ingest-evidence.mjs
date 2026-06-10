// ai-server/scripts/ingest-evidence.mjs
// 15 주제축 PubMed 발굴 → OpenAlex/iCite enrich → SCI 게이트 → 품질점수 랭킹 → top-N
//   → 인종 태깅 → (Gemini 키 있으면) 임베딩 → evidence_papers upsert.
// 사용:
//   node scripts/ingest-evidence.mjs                 # 전체 적재 (실 DB write)
//   node scripts/ingest-evidence.mjs --dry-run       # DB write 없이 랭킹 표만 출력
//   node scripts/ingest-evidence.mjs --dry-run --limit 5 --only growth_hormone  # 빠른 smoke
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { searchPmids, fetchAbstracts } from '../dist/services/pubmed.js';
import { fetchOpenAlexByPmid } from '../dist/services/openalex.js';
import { fetchICite } from '../dist/services/icite.js';
import { studyTypeFromPubTypes, isSci, computeBatchStats, qualityScore } from '../dist/services/journalQuality.js';
import { tagPopulation } from '../dist/services/populationTagger.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
// gemini.js 는 import 시점에 process.env.GEMINI_API_KEY 를 요구 → .env 를 process.env 로 먼저 주입 후 동적 import
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const MAILTO = env.OPENALEX_MAILTO || '';
let _embedText = null; // lazy: --no-embed(무키) 모드에선 gemini 를 import 조차 안 함
async function getEmbed(){ if(!_embedText){ _embedText = (await import('../dist/services/gemini.js')).embedText; } return _embedText; }

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_EMBED = args.includes('--no-embed'); // 무키: 임베딩 생략 (Phase 2 백필)
function argVal(name){ // "--name value" 와 "--name=value" 둘 다 지원
  const eq = args.find(a=>a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const i = args.indexOf(name);
  return (i>=0 && args[i+1] && !args[i+1].startsWith('--')) ? args[i+1] : '';
}
const LIMIT = Number(argVal('--limit')) || 0;   // PubMed 후보 수(retmax). ⚠️ 보존 수 아님(보존=KEEP_TOP)
const ONLY = argVal('--only');                  // 단일 테마만 실행
const CURRENT_YEAR = Number(env.INGEST_YEAR) || 2026; // Date.now 회피(재현성) — 필요시 .env 로 조정
const CANDIDATES = LIMIT || 50;   // 테마당 PubMed 후보 폭(발굴), SCI 게이트로 줄어듦
const KEEP_TOP = 18;              // SCI 게이트 후 보존 상위 N

const TOPICS = {
  // 기존 8 (clinical)
  growth_hormone: 'growth hormone therapy children final height',
  bone_age: 'bone age prediction adult height children',
  precocious_puberty: 'central precocious puberty GnRH agonist height',
  aromatase_inhibitor: 'aromatase inhibitor short stature boys height',
  obesity_growth: 'childhood obesity growth puberty timing',
  sleep_growth: 'sleep growth hormone secretion children',
  nutrition_growth: 'nutrition catch-up growth children stature',
  vitamin_d_growth: 'vitamin D children growth bone',
  // 신규 7 (마케팅 과학). PubMed 는 띄어쓴 단어를 전부 AND → 핵심어만 + 동의어는 OR 그룹.
  height_genetics: 'heritability of height children GWAS stature genetics',
  physical_activity: 'physical activity exercise jumping children height growth',
  psychosocial: 'psychosocial stress children growth',
  diet_specifics: '(milk OR dairy OR protein OR calcium) children growth height',
  puberty_environment: '(obesity OR environmental) early puberty children',
  catch_up_SGA: 'small for gestational age catch-up growth final height',
  final_height_prediction: 'adult height prediction children',
};

const sleep = (ms) => new Promise((r)=>setTimeout(r, ms));

async function run() {
  const themes = Object.entries(TOPICS).filter(([k]) => !ONLY || k === ONLY);
  for (const [topic, query] of themes) {
    const pmids = await searchPmids(query, CANDIDATES, 'relevance');
    const arts = await fetchAbstracts(pmids);
    const icite = await fetchICite(arts.map(a=>a.pmid));

    // enrich
    const enriched = [];
    for (const a of arts) {
      if (!a.abstract || a.abstract.length < 80) continue;
      let oa = null;
      try { oa = await fetchOpenAlexByPmid(a.pmid, MAILTO); } catch { /* graceful */ }
      const ic = icite.get(a.pmid);
      const issn = oa?.issn || '';
      const ifProxy = oa?.ifProxy ?? null;
      if (!isSci({ issn, ifProxy })) continue;             // SCI 게이트
      enriched.push({
        art: a,
        issn, ifProxy,
        openalexId: oa?.openalexId || '',
        doi: a.doi || oa?.doi || '',
        citationCount: ic?.citationCount ?? oa?.citedByCount ?? 0,
        rcr: ic?.rcr ?? null,
        year: a.year ?? oa?.year ?? null,
        studyType: studyTypeFromPubTypes(a.publicationTypes),
      });
      await sleep(120); // OpenAlex polite pacing
    }

    // 점수 랭킹
    const metrics = enriched.map(e => ({ rcr:e.rcr, ifProxy:e.ifProxy, citationCount:e.citationCount, year:e.year, studyType:e.studyType }));
    const stats = computeBatchStats(metrics);
    for (const e of enriched) e.score = qualityScore(
      { rcr:e.rcr, ifProxy:e.ifProxy, citationCount:e.citationCount, year:e.year, studyType:e.studyType }, stats, CURRENT_YEAR);
    enriched.sort((a,b)=>b.score-a.score);
    const kept = enriched.slice(0, KEEP_TOP);

    if (DRY) {
      console.log(`\n=== ${topic} (후보 ${arts.length} → SCI ${enriched.length} → top ${kept.length}) ===`);
      for (const e of kept) console.log(
        `${String(e.score).padStart(5)} | ${e.art.year} | rcr ${e.rcr ?? '-'} | cite ${e.citationCount} | if ${e.ifProxy ?? '-'} | ${e.studyType.padEnd(16)} | ${e.art.journal.slice(0,34)}`);
      continue;
    }

    // 적재
    let n = 0;
    for (const e of kept) {
      const pop = tagPopulation({ abstract: e.art.abstract, affiliation: e.art.affiliation });
      let embedding = null;
      if (!NO_EMBED) {
        try { const ef = await getEmbed(); embedding = await ef(`${e.art.title}\n${e.art.abstract}`); }
        catch (err) { console.warn('embed fail', e.art.pmid, err.message); }
      }
      const row = {
        pmid: e.art.pmid, title: e.art.title, abstract: e.art.abstract, journal: e.art.journal, year: e.year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${e.art.pmid}/`, topic,
        pop_group: pop.group, pop_country: pop.country, pop_confidence: pop.confidence,
        doi: e.doi, openalex_id: e.openalexId, journal_issn: e.issn,
        citation_count: e.citationCount, rcr: e.rcr, if_proxy: e.ifProxy,
        study_type: e.studyType, is_sci: true, quality_score: e.score,
      };
      if (embedding) row.embedding = embedding; // 임베딩 실패(키 만료) 시 기존 임베딩 보존 (null 덮어쓰기 방지)
      const { error } = await sb.from('evidence_papers').upsert(row, { onConflict: 'pmid' });
      if (!error) n++; else console.warn('upsert fail', e.art.pmid, error.message);
      await sleep(400);
    }
    const avg = kept.length ? (kept.reduce((s,e)=>s+e.score,0)/kept.length).toFixed(1) : '0';
    console.log(`${topic}: stored ${n}/${kept.length} (avg score ${avg})`);
  }
  console.log('done.');
}
run().catch((e)=>{ console.error(e); process.exit(1); });
