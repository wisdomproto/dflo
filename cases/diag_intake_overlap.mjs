// 진단: 인테이크(221) ↔ 전체 환자(children) 매칭률 + 매칭 환자의 측정횟수(치료 정도) 분포.
// "PDF 환자가 후보와 8명만 겹치는 게 매칭 실패인지 / 정말 후보가 적은 건지" 규명. read-only.
import { readFileSync } from 'node:fs';
const URL = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';
async function rest(path) { const out=[]; let from=0; const P=1000; while(true){ const r=await fetch(`${URL}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,Range:`${from}-${from+P-1}`}}); if(!r.ok)throw new Error(path+' '+r.status); const rows=await r.json(); out.push(...rows); if(rows.length<P)break; from+=P; } return out; }
const normName=(s)=>(s||'').toString().replace(/\s+/g,'').trim();
const normBirth=(b)=>{ if(!b)return ''; let p=String(b).split(/[^0-9]+/).filter(Boolean); if(p.length!==3){const d=String(b).replace(/\D/g,''); if(d.length===8)p=[d.slice(0,4),d.slice(4,6),d.slice(6,8)]; else if(d.length===6)p=[d.slice(0,2),d.slice(2,4),d.slice(4,6)]; else return '';} let[y,m,dd]=p.map(Number); if(y<100)y=y<=25?2000+y:1900+y; if(m<1||m>12||dd<1||dd>31||y<1990||y>2025)return ''; return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`; };
function lev(a,b){a=a||'';b=b||'';const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}

const children = await rest('children?select=id,name,chart_number,birth_date');
const ms = await rest('hospital_measurements?select=child_id');
const msCount = new Map(); for(const m of ms) msCount.set(m.child_id,(msCount.get(m.child_id)||0)+1);

const byBirth=new Map(), byName=new Map(), byChart=new Map();
for(const c of children){ const b=normBirth(c.birth_date); if(b)byBirth.set(b,[...(byBirth.get(b)||[]),c]); const n=normName(c.name); if(n)byName.set(n,[...(byName.get(n)||[]),c]); if(c.chart_number)byChart.set(String(c.chart_number),c); }

const intake = JSON.parse(readFileSync('cases/intake_surveys_consolidated.json','utf8'));
const isPdf=(p)=>(p.sources||[]).includes('pdf');
const stat={pdf:{},docx:{}}; const init=()=>({chart:0,strong:0,likely:0,birth:0,name:0,none:0,matchedTreated:0,matchedChild:new Set()});
stat.pdf=init(); stat.docx=init();
const unmatchedPdf=[];

for(const p of intake){
  const grp = isPdf(p)?stat.pdf:stat.docx;
  const n=normName(p.name), b=normBirth(p.birth_date), charts=(p.chart_numbers||[]).map(String);
  const byB=b?(byBirth.get(b)||[]):[], byN=n?(byName.get(n)||[]):[];
  let cand=null,type=null;
  const ch=charts.map(c=>byChart.get(c)).find(Boolean);
  if(ch){cand=ch;type='chart';}
  else{ const both=byB.find(c=>normName(c.name)===n); if(both){cand=both;type='strong';}
    else if(byB.length){cand=byB[0];type=lev(n,normName(cand.name))<=1?'likely':'birth';}
    else if(byN.length){cand=byN[0];type='name';} }
  if(!cand){grp.none++; if(isPdf(p))unmatchedPdf.push(`${p.name||'(?)'} ${p.birth_date||''}`); continue;}
  grp[type]++;
  if(type==='chart'||type==='strong'||type==='likely'){ grp.matchedChild.add(cand.id); if((msCount.get(cand.id)||0)>=6)grp.matchedTreated++; }
}

const show=(k,s)=>{ console.log(`[${k}] 총 ${Object.values(s).filter(v=>typeof v==='number').reduce((a,b)=>a+b,0)} — chart ${s.chart} · strong ${s.strong} · likely ${s.likely} · birth만 ${s.birth} · 이름만 ${s.name} · 매칭없음 ${s.none}`);
  console.log(`     → 확실매칭(chart+strong+likely) 환자 ${s.matchedChild.size}명, 그중 측정6회+ ${s.matchedTreated}명`); };
console.log(`children 전체 ${children.length}명 · 측정보유 ${msCount.size}명\n`);
show('PDF 185', stat.pdf);
show('docx 36', stat.docx);
console.log(`\nPDF 매칭 실패 ${unmatchedPdf.length}명 중 샘플 15:`);
unmatchedPdf.slice(0,15).forEach(x=>console.log('   '+x));
