// 인테이크 설문(초진기록지 PDF + docx 성장문진표, cases/intake_surveys_consolidated.json)을
// admin 치료사례 후보(select_case_candidates 와 동일 선별 기준)와 이름+생년월일로 매칭.
// read-only. 출력: 콘솔 요약 + cases/intake_candidate_matches.json
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';

async function rest(path) {
  const out = []; let from = 0; const PAGE = 1000;
  while (true) {
    const r = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
    const rows = await r.json(); out.push(...rows);
    if (rows.length < PAGE) break; from += PAGE;
  }
  return out;
}

const normName = (s) => (s || '').toString().replace(/\s+/g, '').trim();
const normBirth = (b) => {
  if (!b) return '';
  let parts = String(b).split(/[^0-9]+/).filter(Boolean);
  if (parts.length !== 3) {
    const d = String(b).replace(/\D/g, '');
    if (d.length === 8) parts = [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)];
    else if (d.length === 6) parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6)];
    else return '';
  }
  let [y, m, dd] = parts.map(Number);
  if (y < 100) y = y <= 25 ? 2000 + y : 1900 + y;
  if (m < 1 || m > 12 || dd < 1 || dd > 31 || y < 1990 || y > 2025) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};
function lev(a, b) {
  a = a || ''; b = b || ''; const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const yearsBetween = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 86400e3);

// ── 치료사례 후보 선별 (select_case_candidates.mjs 와 동일 기준) ──
const children = await rest('children?select=id,name,chart_number,gender,birth_date,treatment_status,parent_id');
const ms = await rest('hospital_measurements?select=child_id,measured_date,pah');

// 공개 케이스 7건(cases@ 부모) 제외
const byParent = new Map();
for (const c of children) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) || []), c]);
const CASE_NAMES = new Set(['제임스', '은우', '민수', '민희', '성재', '도훈', '민준']);
const excluded = new Set();
for (const [, kids] of byParent) { const hit = kids.filter((k) => CASE_NAMES.has((k.name || '').trim())).length; if (kids.length <= 8 && hit >= 4) kids.forEach((k) => excluded.add(k.id)); }

const msBy = new Map();
for (const m of ms) msBy.set(m.child_id, [...(msBy.get(m.child_id) || []), m]);

const candRows = [];
for (const c of children) {
  if (excluded.has(c.id)) continue;
  const mm = (msBy.get(c.id) || []).slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1));
  if (mm.length < 6) continue;
  const withPah = mm.filter((m) => m.pah > 0 && m.pah < 230);
  if (withPah.length < 2) continue;
  const pahDelta = +(withPah[withPah.length - 1].pah - withPah[0].pah).toFixed(1);
  if (pahDelta < 5) continue;
  const months = Math.round(yearsBetween(mm[0].measured_date, mm[mm.length - 1].measured_date) * 12);
  if (months < 18) continue;
  candRows.push({ chart: c.chart_number, name: c.name, gender: c.gender === 'male' ? '남' : '여', birth: (c.birth_date || '').slice(0, 10), nMs: mm.length, status: c.treatment_status });
}
// dedup by name+birthYear+gender (측정 많은 쪽)
const seen = new Map();
for (const r of candRows) { const k = `${normName(r.name)}|${r.birth.slice(0, 4)}|${r.gender}`; const p = seen.get(k); if (!p || r.nMs > p.nMs) seen.set(k, r); }
const candidates = [...seen.values()];

// ── 인테이크 로드 + 인덱스 ──
const intake = JSON.parse(readFileSync('cases/intake_surveys_consolidated.json', 'utf8'));
const candByBirth = new Map(), candByName = new Map(), candByChart = new Map();
for (const c of candidates) {
  if (c.birth) candByBirth.set(c.birth, [...(candByBirth.get(c.birth) || []), c]);
  const n = normName(c.name); if (n) candByName.set(n, [...(candByName.get(n) || []), c]);
  if (c.chart != null && c.chart !== '') candByChart.set(String(c.chart), c);
}

// ── 매칭 ──
const TYPES = {
  CHART: '확실 (차트번호 일치)',
  STRONG: '확실 (이름+생일 일치)',
  LIKELY: '유력 (생일일치+이름 1글자차)',
  BIRTH: '생일만 (이름상이→우연 가능)',
  NAME: '이름만 (생일상이→동명이인?)',
};
const matches = [];
const matchedCand = new Set();
for (const p of intake) {
  const n = normName(p.name), b = normBirth(p.birth_date);
  const charts = (p.chart_numbers || []).map(String);
  if (!n && !b && !charts.length) continue;
  const byB = b ? (candByBirth.get(b) || []) : [];
  const byN = n ? (candByName.get(n) || []) : [];
  let cand = null, type = null, dist = null;
  const chartHit = charts.map((ch) => candByChart.get(ch)).find(Boolean);
  if (chartHit) { cand = chartHit; type = TYPES.CHART; dist = 0; }
  else {
    const both = byB.find((c) => normName(c.name) === n);
    if (both) { cand = both; type = TYPES.STRONG; dist = 0; }
    else if (byB.length) { cand = byB[0]; dist = lev(n, normName(cand.name)); type = (n && dist <= 1) ? TYPES.LIKELY : TYPES.BIRTH; }
    else if (byN.length) { cand = byN[0]; type = TYPES.NAME; dist = 0; }
  }
  if (!cand) continue;
  matchedCand.add(cand.chart || cand.name);
  matches.push({
    type, name_dist: dist,
    intake_name: p.name, intake_birth: p.birth_date, intake_birth_norm: b, intake_chart: charts[0] || null,
    intake_source: (p.sources || []).join('+'), intake_ref: (p.page_refs || [])[0] || (p.chart_numbers || [])[0] || p.id,
    cand_chart: cand.chart, cand_name: cand.name, cand_birth: cand.birth, cand_gender: cand.gender, cand_status: cand.status,
  });
}
const order = { [TYPES.CHART]: 0, [TYPES.STRONG]: 1, [TYPES.LIKELY]: 2, [TYPES.BIRTH]: 3, [TYPES.NAME]: 4 };
matches.sort((a, b) => (order[a.type] - order[b.type]) || String(a.cand_chart || '').localeCompare(String(b.cand_chart || '')));

writeFileSync('cases/intake_candidate_matches.json', JSON.stringify(matches, null, 2), 'utf8');

// ── 요약 ──
const c = (t) => matches.filter((m) => m.type === t).length;
console.log(`치료사례 후보: ${candidates.length}명 | 인테이크: ${intake.length}명`);
console.log(`매칭 ${matches.length}건 — 차트 ${c(TYPES.CHART)} · 확실 ${c(TYPES.STRONG)} · 유력 ${c(TYPES.LIKELY)} · 생일만 ${c(TYPES.BIRTH)} · 이름만 ${c(TYPES.NAME)}`);
console.log(`매칭된 후보: ${matchedCand.size}/${candidates.length}명`);
console.log('');
const pad = (s, n) => String(s ?? '').padEnd(n);
console.log(pad('유형', 22) + pad('인테이크(이름/생일/출처)', 34) + '↔  후보(차트/이름/생일/성별/단계)');
for (const m of matches) {
  console.log(pad(m.type, 22)
    + pad(`${m.intake_name || '(이름?)'} ${m.intake_birth || ''} [${m.intake_source}]`, 34)
    + `↔  #${m.cand_chart || '-'} ${m.cand_name} ${m.cand_birth} ${m.cand_gender} ${m.cand_status === 'completed' ? '완료' : '치료중'}`);
}
console.log('\n-> cases/intake_candidate_matches.json');
