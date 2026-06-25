// 초진기록지(intake) 221명을 전체 환자 DB(children)와 "생년월일" 기준으로 매칭.
// - 견고한 생년월일 정규화(단자리 월/일·2자리 연도·구분자 혼용 처리)
// - 이름 보조 신호: PDF 추출 이름이 초성(ㄱㅇㄱ)이면 DB 풀네임의 초성과 대조,
//   풀네임이면 직접 대조. 성별은 타이브레이커.
// read-only(조회만). 출력 = cases/intake_birthdate_matches.json + 콘솔 리포트.
const BASE = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';
import fs from 'node:fs';

async function rest(path) {
  const out = []; let from = 0; const P = 1000;
  while (true) {
    const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + P - 1}` } });
    if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + await r.text());
    const rows = await r.json(); out.push(...rows);
    if (rows.length < P) break; from += P;
  }
  return out;
}

// ── 생년월일 정규화: 모든 구분자 허용, 2자리 연도→20YY, 단자리 월/일 패딩 ──
function normBirth(s) {
  if (!s) return null;
  const parts = String(s).trim().split(/[^0-9]+/).filter(Boolean);
  if (parts.length < 3) return null;
  let [y, m, d] = parts;
  if (y.length <= 2) y = '20' + y.padStart(2, '0');
  if (y.length === 3) return null;
  m = m.padStart(2, '0'); d = d.padStart(2, '0');
  const Y = +y, M = +m, D = +d;
  if (Y < 1995 || Y > 2025) return null;
  if (M < 1 || M > 12) return null;
  if (D < 1 || D > 31) return null;
  return `${y}-${m}-${d}`;
}

// ── 한글 초성 추출 ──
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const COLLAPSE = { 'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ' };
function chosung(name) {
  let out = '';
  for (const ch of (name || '')) {
    const c = ch.codePointAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) out += CHO[Math.floor((c - 0xAC00) / 588)];
    else if (c >= 0x3131 && c <= 0x314E) out += ch; // 이미 자음
  }
  return out;
}
const collapse = (s) => [...(s || '')].map(c => COLLAPSE[c] || c).join('');
const hasChosungChar = (s) => !!s && [...s].some(ch => { const c = ch.codePointAt(0); return c >= 0x3131 && c <= 0x314E; });
const normName = (s) => (s || '').replace(/\s+/g, '').trim();

// intake 이름과 DB 풀네임 비교 → 'full'|'chosung'|'none'
//  - 마스킹(초성 포함)된 이름은 양쪽을 전부 초성으로 변환해 비교(이ㅊㄱ→ㅇㅊㄱ vs 이찬구→ㅇㅊㄱ)
//  - 풀네임끼리는 초성 비교 금지(강도윤/김도윤 처럼 초성만 우연히 같을 수 있어 오판)
function nameSignal(intakeName, dbName) {
  const inN = normName(intakeName), db = normName(dbName);
  if (!inN || !db) return 'none';
  if (hasChosungChar(inN)) {
    const a = collapse(chosung(inN)), b = collapse(chosung(db));
    return a.length === b.length && a === b ? 'chosung' : 'none';
  }
  return inN === db ? 'full' : 'none';
}

// 이름 유사도 0~1 (생일이 같을 때 OCR 오독 vs 우연한 동일생일 분리용)
function namePartial(intakeName, dbName) {
  const inN = normName(intakeName), db = normName(dbName);
  if (!inN || !db) return 0;
  if (hasChosungChar(inN)) { // 초성 위치 일치율
    const a = collapse(chosung(inN)), b = collapse(chosung(db)), n = Math.max(a.length, b.length);
    let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) s++;
    return n ? s / n : 0;
  }
  if (inN === db) return 1;
  const givenIn = inN.slice(1), givenDb = db.slice(1);
  if (givenIn && givenIn === givenDb) return 0.85;          // 이름(성 제외) 동일 = 성 오독 가능성
  const n = Math.max(inN.length, db.length);
  let s = 0; for (let i = 0; i < Math.min(inN.length, db.length); i++) if (inN[i] === db[i]) s++;
  return n ? s / n : 0;                                      // 앞에서부터 글자 일치율
}

const gNorm = (g) => { const s = String(g || '').toLowerCase(); if (s.startsWith('m') || s === '남' || s === '남자') return 'male'; if (s.startsWith('f') || s === '여' || s === '여자') return 'female'; return null; };

// ── 데이터 로드 ──
const intake = JSON.parse(fs.readFileSync(new URL('./intake_surveys_consolidated.json', import.meta.url)));
const children = await rest('children?select=id,name,chart_number,gender,birth_date,treatment_status');

const byBirth = new Map();
for (const c of children) {
  const b = (c.birth_date || '').slice(0, 10);
  if (!b) continue;
  byBirth.set(b, [...(byBirth.get(b) || []), c]);
}

const results = [];
for (let i = 0; i < intake.length; i++) {
  const p = intake[i];
  const birth = normBirth(p.birth_date) || (p.birth_date_norm || null);
  const rec = {
    idx: i, intake_name: p.name || null, intake_birth_raw: p.birth_date || null,
    intake_birth: birth, intake_gender: gNorm(p.gender),
    src: (p.sources || []).join(','), page_refs: p.page_refs || [], chart_numbers: p.chart_numbers || [],
    tier: '미매칭', matches: [],
  };
  if (birth && byBirth.has(birth)) {
    const cands = byBirth.get(birth);
    const scored = cands.map(c => {
      const ns = nameSignal(p.name, c.name);
      const gOk = rec.intake_gender && gNorm(c.gender) ? rec.intake_gender === gNorm(c.gender) : null;
      return { id: c.id, chart: c.chart_number, db_name: c.name, db_gender: gNorm(c.gender), db_birth: (c.birth_date||'').slice(0,10), ts: c.treatment_status, name_sig: ns, name_partial: +namePartial(p.name, c.name).toFixed(2), gender_ok: gOk };
    });
    // 이름 신호 우선 → 유사도 → 성별 → 차트번호 안정정렬
    scored.sort((a, b) => {
      const w = s => s.name_sig === 'full' ? 3 : s.name_sig === 'chosung' ? 2 : 0;
      return w(b) - w(a) || b.name_partial - a.name_partial || (b.gender_ok ? 1 : 0) - (a.gender_ok ? 1 : 0) || String(a.chart).localeCompare(String(b.chart));
    });
    rec.matches = scored;
    const top = scored[0];
    const nFull = scored.filter(s => s.name_sig === 'full').length;
    const nCho = scored.filter(s => s.name_sig === 'chosung').length;
    if (top.name_sig === 'full' && nFull === 1) rec.tier = '확실(이름일치)';
    else if (top.name_sig === 'chosung' && nCho === 1 && nFull === 0) rec.tier = '확실(초성일치)';
    else if (top.name_sig !== 'none') rec.tier = '후보(이름중복)';           // 이름 일치하는데 동일생일 ≥2
    else if (cands.length === 1) {                                          // 생일+단독 환자, 이름 불일치
      if (top.gender_ok === false) rec.tier = '주의(성별불일치)';
      else if (top.name_partial >= 0.5) rec.tier = '유력(이름유사)';        // OCR 오독 추정
      else rec.tier = '참고(생일만)';                                       // 우연한 동일생일 추정
    } else rec.tier = '후보(생일다수)';                                      // 동일생일 ≥2, 이름 못고름
  }
  results.push(rec);
}

// ── 집계 ──
const tiers = {};
for (const r of results) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
const order = ['확실(이름일치)','확실(초성일치)','유력(이름유사)','후보(이름중복)','후보(생일다수)','참고(생일만)','주의(성별불일치)','미매칭'];

console.log(`\n=== 생년월일 매칭 결과 (intake ${intake.length}명 vs children ${children.length}명) ===`);
for (const t of order) if (tiers[t]) console.log(`  ${t}: ${tiers[t]}`);
const confident = results.filter(r => r.tier.startsWith('확실'));
console.log(`\n총 확실 매칭: ${confident.length}명 (이름일치 ${tiers['확실(이름일치)']||0} + 초성일치 ${tiers['확실(초성일치)']||0})`);

function showLine(r) {
  const m = r.matches[0];
  const sim = m && m.name_sig === 'none' && m.name_partial ? ` ~${m.name_partial}` : '';
  const flag = m ? `→ #${m.chart} ${m.db_name}${sim}${m.gender_ok===false?' ⚠성별':''}` : '';
  const extra = r.matches.length > 1 ? ` [동일생일 ${r.matches.length}명: ${r.matches.map(x=>x.db_name).join('/')}]` : '';
  console.log(`  [${r.tier}] ${r.intake_name||'(이름없음)'} ${r.intake_birth||r.intake_birth_raw||'?'} (${r.src}) ${flag}${extra}`);
}
for (const t of order) {
  const rows = results.filter(r => r.tier === t);
  if (!rows.length || t === '미매칭') continue;
  console.log(`\n--- ${t} (${rows.length}) ---`);
  rows.sort((a,b)=>String(a.intake_name).localeCompare(String(b.intake_name))).forEach(showLine);
}
console.log(`\n--- 미매칭 ${tiers['미매칭']||0}명 (DB에 동일 생일 환자 없음) ---`);

fs.writeFileSync(new URL('./intake_birthdate_matches.json', import.meta.url), JSON.stringify(results, null, 2));
console.log('\n저장: cases/intake_birthdate_matches.json');
