// ai-server/scripts/build-insights.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { aggregateCohort, passesKAnonymity } from '../dist/services/clinicalStats.js';
import { buildCompositeCasePrompt } from '../dist/services/insightPrompts.js';
import { generateText, embedText } from '../dist/services/gemini.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 처방 코드명 로드 (med id → name)
const { data: meds } = await sb.from('medications').select('id,name');
const medName = Object.fromEntries((meds||[]).map(m=>[m.id,m.name]));
// child → topMeds
async function topMedsByChild() {
  const map = {};
  for (let f=0;;f+=1000){ const {data}=await sb.from('prescriptions').select('child_id,medication_id').range(f,f+999); if(!data?.length)break;
    data.forEach(r=>{ if(!r.child_id||!r.medication_id)return; (map[r.child_id]=map[r.child_id]||{}); const n=medName[r.medication_id]; if(n)map[r.child_id][n]=(map[r.child_id][n]||0)+1; });
    if(data.length<1000)break; }
  const out={}; Object.entries(map).forEach(([id,freq])=>{ out[id]=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n])=>n); });
  return out;
}
const topMeds = await topMedsByChild();

// children + first/last measurement
const { data: kids } = await sb.from('children').select('id,gender,intake_survey,father_height,mother_height');
async function measFor(id){ const {data}=await sb.from('hospital_measurements').select('height,bone_age,measured_date').eq('child_id',id).order('measured_date',{ascending:true}); return data||[]; }

// 최소 카테고리 분류 (핵심만; full parity는 후속)
function categorize(child, ms){
  const cats=[];
  const fh=+child.father_height||0, mh=+child.mother_height||0;
  if (fh && mh && ((fh+mh)/2) < 165) cats.push('parents_short');
  const firstBA=ms[0]?.bone_age; if (typeof firstBA==='number' && firstBA>0) cats.push('bone_age_recorded');
  const iv=child.intake_survey||{}; const ivs=JSON.stringify(iv);
  if (/성조숙|조기사춘기|precocious/i.test(ivs)) cats.push('precocious_suspect');
  if (/비만|과체중|obes/i.test(ivs)) cats.push('obesity');
  if (cats.length===0) cats.push('general_growth');
  return cats;
}

// 카테고리별 코호트 집계
const cohort = {}; // cat -> rows[]
for (const k of kids||[]) {
  const ms = await measFor(k.id);
  const row = { gender: k.gender, initialHeight: ms[0]?.height, latestHeight: ms[ms.length-1]?.height, initialBoneAge: ms[0]?.bone_age, topMeds: topMeds[k.id]||[] };
  for (const c of categorize(k, ms)) (cohort[c]=cohort[c]||[]).push(row);
}

let stored = 0;
for (const [category, rows] of Object.entries(cohort)) {
  const stats = aggregateCohort(rows);
  if (!passesKAnonymity(stats.n)) { console.log(`skip ${category} (n=${stats.n} < k)`); continue; }
  let composite = '';
  try { composite = (await generateText(buildCompositeCasePrompt(category, stats))).trim(); } catch (e) { console.warn('composite fail', category, e.message); }
  const summary = `[${category}] n=${stats.n}, 평균성장 ${stats.avgGrowthCm}cm, 흔한관리 ${stats.commonMeds.slice(0,4).join('/')}`;
  let embedding=null; try { embedding = await embedText(`${summary}\n${composite}`); } catch (e) { console.warn('embed fail', category, e.message); }
  // 카테고리당 1 레코드 (upsert by category)
  const { data: existing } = await sb.from('clinical_insights').select('id').eq('category', category).maybeSingle();
  const payload = { category, cohort_n: stats.n, stats, composite_case: composite, summary, embedding };
  if (existing) await sb.from('clinical_insights').update(payload).eq('id', existing.id);
  else await sb.from('clinical_insights').insert(payload);
  stored++; console.log(`stored ${category} (n=${stats.n})`);
}
console.log(`done. insights stored: ${stored}`);
