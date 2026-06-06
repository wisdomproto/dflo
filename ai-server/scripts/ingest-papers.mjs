// ai-server/scripts/ingest-papers.mjs
// 주제축별 PubMed 초록 수집 → 인종 태깅 → 임베딩 → evidence_papers upsert.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { searchPmids, fetchAbstracts } from '../dist/services/pubmed.js';
import { tagPopulation } from '../dist/services/populationTagger.js';
import { embedText } from '../dist/services/gemini.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 주제축 → PubMed 쿼리 (아시아 인구 우선 bias)
const TOPICS = {
  growth_hormone: 'growth hormone therapy children final height',
  bone_age: 'bone age prediction adult height children',
  precocious_puberty: 'central precocious puberty GnRH agonist height',
  aromatase_inhibitor: 'aromatase inhibitor short stature boys height',
  obesity_growth: 'childhood obesity growth puberty timing',
  sleep_growth: 'sleep growth hormone secretion children',
  nutrition_growth: 'nutrition catch-up growth children stature',
  vitamin_d_growth: 'vitamin D children growth bone',
};
const PER_TOPIC = Number(process.argv[2] || 8);

for (const [topic, query] of Object.entries(TOPICS)) {
  const pmids = await searchPmids(query, PER_TOPIC);
  const arts = await fetchAbstracts(pmids);
  let n = 0;
  for (const a of arts) {
    if (!a.abstract || a.abstract.length < 80) continue;
    const pop = tagPopulation({ abstract: a.abstract, affiliation: a.affiliation });
    let embedding = null;
    try { embedding = await embedText(`${a.title}\n${a.abstract}`); } catch (e) { console.warn('embed fail', a.pmid, e.message); }
    const { error } = await sb.from('evidence_papers').upsert({
      pmid: a.pmid, title: a.title, abstract: a.abstract, journal: a.journal, year: a.year,
      url: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, topic,
      pop_group: pop.group, pop_country: pop.country, pop_confidence: pop.confidence, embedding,
    }, { onConflict: 'pmid' });
    if (!error) n++;
    await new Promise((r) => setTimeout(r, 400)); // rate limit (PubMed + Gemini)
  }
  console.log(`${topic}: stored ${n}/${arts.length}`);
}
console.log('done.');
