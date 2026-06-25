// 치료사례 후보 58명의 child id 추출 → 환자관리 즐겨찾기(localStorage) 일괄 별표 스니펫 생성.
// 후보 기준 = select_case_candidates.mjs 와 동일. read-only(조회만).
const URL = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';
async function rest(path) { const out=[]; let from=0; const P=1000; while(true){ const r=await fetch(`${URL}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,Range:`${from}-${from+P-1}`}}); if(!r.ok)throw new Error(path+' '+r.status); const rows=await r.json(); out.push(...rows); if(rows.length<P)break; from+=P; } return out; }
const yearsBetween=(a,b)=>(new Date(b)-new Date(a))/(365.25*86400e3);
const normName=(s)=>(s||'').replace(/\s+/g,'').trim();

const children = await rest('children?select=id,name,chart_number,gender,birth_date,treatment_status,parent_id');
const ms = await rest('hospital_measurements?select=child_id,measured_date,pah');

// 공개 케이스 7건(cases@ 부모) 제외
const byParent=new Map(); for(const c of children) byParent.set(c.parent_id,[...(byParent.get(c.parent_id)||[]),c]);
const CASE_NAMES=new Set(['제임스','은우','민수','민희','성재','도훈','민준']);
const excluded=new Set();
for(const [,kids] of byParent){ const hit=kids.filter(k=>CASE_NAMES.has((k.name||'').trim())).length; if(kids.length<=8&&hit>=4)kids.forEach(k=>excluded.add(k.id)); }

const msBy=new Map(); for(const m of ms) msBy.set(m.child_id,[...(msBy.get(m.child_id)||[]),m]);
const rows=[];
for(const c of children){
  if(excluded.has(c.id))continue;
  const mm=(msBy.get(c.id)||[]).slice().sort((a,b)=>a.measured_date<b.measured_date?-1:1);
  if(mm.length<6)continue;
  const wp=mm.filter(m=>m.pah>0&&m.pah<230); if(wp.length<2)continue;
  if(+(wp[wp.length-1].pah-wp[0].pah).toFixed(1)<5)continue;
  if(Math.round(yearsBetween(mm[0].measured_date,mm[mm.length-1].measured_date)*12)<18)continue;
  rows.push({id:c.id,chart:c.chart_number,name:c.name,gender:c.gender,birth:(c.birth_date||'').slice(0,4),nMs:mm.length});
}
// dedup name+birthYear+gender (측정 많은 쪽)
const seen=new Map();
for(const r of rows){ const k=`${normName(r.name)}|${r.birth}|${r.gender}`; const p=seen.get(k); if(!p||r.nMs>p.nMs)seen.set(k,r); }
const cands=[...seen.values()];
const ids=cands.map(c=>c.id);

console.log(`치료사례 후보 ${cands.length}명 (child id)\n`);
console.log('=== 아래 한 줄을 admin 페이지(환자관리) 브라우저 콘솔에 붙여넣기 ===\n');
console.log(`(function(){const K='admin.patients.favorites';const IDS=${JSON.stringify(ids)};const cur=new Set(JSON.parse(localStorage.getItem(K)||'[]'));const before=cur.size;IDS.forEach(i=>cur.add(i));localStorage.setItem(K,JSON.stringify([...cur]));window.dispatchEvent(new CustomEvent('admin-favorites-changed'));console.log('별표 추가:',IDS.length,'· 총 즐겨찾기:',before,'→',cur.size);})();`);
console.log('\n=== 후보 명단(참고) ===');
cands.sort((a,b)=>String(a.chart).localeCompare(String(b.chart))).forEach(c=>console.log(`  #${c.chart} ${c.name} (측정 ${c.nMs})`));
