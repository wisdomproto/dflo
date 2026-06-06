// ai-server/scripts/seed-med-legend.mjs
// 알려진 코드 시드 + 미매핑 상위 처방약 목록 출력(원장 큐레이션용).
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 검증된 알려진 매핑 (프로토타입 + 원장 확인)
const KNOWN = [
  { match:'에이큐_G', generic:'somatropin(성장호르몬)', cls:'growth_hormone', core:true },
  { match:'루프린', generic:'leuprorelin(GnRH agonist)', cls:'gnrh_agonist', core:true },
  { match:'아리미덱스', generic:'anastrozole(aromatase inhibitor)', cls:'aromatase_inhibitor', core:true },
  { match:'멜라토닌', generic:'melatonin', cls:'sleep_aid', core:false },
  { match:'5-HTP', generic:'5-HTP', cls:'sleep_aid', core:false },
];
const NON_DRUG = ['get_photo','get_Review','일반 소견서','소견서','콜레스테롤','Posture Correction','Exer']; // 비약물 키워드

const { data: meds } = await sb.from('medications').select('id,code,name');
for (const m of meds || []) {
  const name = m.name || '';
  const k = KNOWN.find((x) => name.includes(x.match));
  const nonDrug = NON_DRUG.some((s) => name.includes(s));
  if (!k && !nonDrug) continue;
  await sb.from('medication_legend').upsert({
    medication_id: m.id, code: m.code, display_name: name,
    generic_name: k?.generic ?? '', drug_class: k?.cls ?? (nonDrug ? 'non_drug' : ''),
    is_growth_core: k?.core ?? false, is_non_drug: nonDrug,
  }, { onConflict: 'medication_id' });
}
console.log('seeded known + non-drug.');

// 미매핑 상위 처방약 (큐레이션 목록)
const rxCount = {};
for (let f=0;;f+=1000){ const {data}=await sb.from('prescriptions').select('medication_id').range(f,f+999); if(!data?.length)break; data.forEach(r=>{if(r.medication_id)rxCount[r.medication_id]=(rxCount[r.medication_id]||0)+1;}); if(data.length<1000)break; }
const { data: mapped } = await sb.from('medication_legend').select('medication_id');
const mappedSet = new Set((mapped||[]).map(x=>x.medication_id));
const byId = Object.fromEntries((meds||[]).map(m=>[m.id,m.name]));
const top = Object.entries(rxCount).filter(([id])=>!mappedSet.has(id)).sort((a,b)=>b[1]-a[1]).slice(0,40);
console.log('\n=== 미매핑 상위 40 (원장 큐레이션 필요) ===');
top.forEach(([id,n])=>console.log(`${n}\t${byId[id]||id}`));
