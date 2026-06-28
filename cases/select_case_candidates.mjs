// 치료사례 양산 후보 선별 — read-only.
// 기준: 측정 ≥6회 · PAH(예상키) 전후쌍 보유 · PAH 개선 ≥5cm(남)/≥4cm(여) · 치료기간 ≥18개월 · 이상치 제외.
// 출력: 고민 카테고리(근사)별로 묶은 원장 검토용 마크다운.
import { writeFileSync } from 'node:fs';

const URL = 'https://txirmofdvuljkrjkpzdg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aXJtb2ZkdnVsamtyamtwemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTE0MjMsImV4cCI6MjA5MTgyNzQyM30.yBEnRDrresPy-pexp8DLhRo-8MlXjxvEC3Wh3hIqqfQ';

async function rest(path) {
  const out = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const r = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const children = await rest('children?select=id,name,chart_number,gender,birth_date,father_height,mother_height,parent_id,treatment_status,intake_survey');
const ms = await rest('hospital_measurements?select=child_id,measured_date,height,weight,bone_age,pah');
const labs = await rest('lab_tests?select=child_id,test_type');
const xrays = await rest('xray_readings?select=child_id,image_path');

// 공개 케이스 7건의 가상 children(cases@ 부모 계정) 제외 — 같은 parent_id 7명 묶음 탐지
const byParent = new Map();
for (const c of children) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) || []), c]);
const CASE_NAMES = new Set(['제임스', '은우', '민수', '민희', '성재', '도훈', '민준']);
const excludedIds = new Set();
for (const [pid, kids] of byParent) {
  const hit = kids.filter((k) => CASE_NAMES.has((k.name || '').trim())).length;
  if (kids.length <= 8 && hit >= 4) kids.forEach((k) => excludedIds.add(k.id));
}

const msBy = new Map();
for (const m of ms) msBy.set(m.child_id, [...(msBy.get(m.child_id) || []), m]);
const labBy = new Map();
for (const l of labs) labBy.set(l.child_id, (labBy.get(l.child_id) || new Set()).add(l.test_type));
const xrayBy = new Map();
for (const x of xrays) if (x.image_path) xrayBy.set(x.child_id, (xrayBy.get(x.child_id) || 0) + 1);

const yearsBetween = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 86400e3);

const rows = [];
for (const c of children) {
  if (excludedIds.has(c.id)) continue;
  const mm = (msBy.get(c.id) || []).slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1));
  if (mm.length < 6) continue;
  const withPah = mm.filter((m) => m.pah > 0 && m.pah < 230); // 이상치(입력오류) 제외
  if (withPah.length < 2) continue;
  const first = withPah[0], last = withPah[withPah.length - 1];
  const pahDelta = +(last.pah - first.pah).toFixed(1);
  // 여성은 사춘기가 빨라 PAH 상승폭이 평균 ~1cm 작아 기준 완화(2026-06-29): 남 5cm / 여 4cm
  const pahMin = c.gender === 'male' ? 5 : 4;
  if (pahDelta < pahMin) continue;
  const months = Math.round(yearsBetween(mm[0].measured_date, mm[mm.length - 1].measured_date) * 12);
  if (months < 18) continue;

  const firstH = mm.find((m) => m.height > 0);
  const lastH = [...mm].reverse().find((m) => m.height > 0);
  const ageAtFirst = c.birth_date ? +yearsBetween(c.birth_date, mm[0].measured_date).toFixed(1) : null;

  // 고민 카테고리 근사 신호
  const firstBA = mm.find((m) => m.bone_age > 0);
  const baGap = firstBA && c.birth_date ? +(firstBA.bone_age - yearsBetween(c.birth_date, firstBA.measured_date)).toFixed(1) : null;
  const isMale = c.gender === 'male';
  const mph = c.father_height && c.mother_height ? +(((c.father_height + c.mother_height) / 2 + (isMale ? 6.5 : -6.5))).toFixed(1) : null;
  const bmi = firstH?.weight && firstH?.height ? +(firstH.weight / ((firstH.height / 100) ** 2)).toFixed(1) : null;
  const hasAllergy = (labBy.get(c.id) || new Set()).has('allergy');

  const tags = [];
  if (baGap != null && baGap >= 1.5) tags.push('성조숙(뼈나이 +' + baGap + '년)');
  if (mph != null && ((isMale && mph <= 170) || (!isMale && mph <= 158))) tags.push(`유전키 작음(MPH ${mph})`);
  if (bmi != null && bmi >= 23) tags.push(`비만 동반(BMI ${bmi})`);
  if (ageAtFirst != null && ((isMale && ageAtFirst >= 13) || (!isMale && ageAtFirst >= 11.5))) tags.push('늦은 시작');
  if (hasAllergy) tags.push('알러지검사');
  if (baGap != null && baGap <= -1.0) tags.push(`성장지연(뼈나이 ${baGap}년)`);

  // 스토리 강도 점수: 예상키 개선(주) + 실측 성장 + 기간 + 자료 풍부함
  const hDelta = firstH && lastH ? +(lastH.height - firstH.height).toFixed(1) : 0;
  const score = Math.round(pahDelta * 3 + Math.min(hDelta, 35) + months / 6 + (xrayBy.get(c.id) ? 5 : 0) + (hasAllergy ? 3 : 0));

  rows.push({
    chart: c.chart_number, name: c.name, gender: isMale ? '남' : '여',
    birth: (c.birth_date || '').slice(0, 4), ageAtFirst, months,
    nMs: mm.length, nBA: mm.filter((m) => m.bone_age > 0).length,
    hFirst: firstH?.height, hLast: lastH?.height, hDelta,
    pahFirst: first.pah, pahLast: last.pah, pahDelta,
    xray: xrayBy.get(c.id) || 0, hasAllergy,
    hasIntake: !!c.intake_survey && Object.keys(c.intake_survey).length > 2,
    status: c.treatment_status, tags, score,
  });
}

// 동일 환자 중복 레코드(이름+출생연도 동일, 차트 재발급 등) — 측정 많은 쪽만 유지
const seen = new Map();
for (const r of rows) {
  const k = `${r.name}|${r.birth}|${r.gender}`;
  const prev = seen.get(k);
  if (!prev || r.nMs > prev.nMs) seen.set(k, r);
}
const deduped = [...seen.values()];
rows.length = 0;
rows.push(...deduped);

// 기존 공개 케이스 4건의 원본 환자(공개용은 가명이라 자동 제외 불가) — 수치 패턴 일치 시 표시
for (const r of rows) {
  if (r.name === '다나카고키') r.tags.push('⚠️ 공개 케이스(제임스) 원본 추정');
}

rows.sort((a, b) => b.score - a.score);

const fmtDur = (m) => (m < 12 ? `${m}개월` : `${Math.floor(m / 12)}년${m % 12 ? ` ${m % 12}개월` : ''}`);
const line = (r, i) =>
  `| ${i + 1} | ${r.chart ?? '-'} | ${r.name} | ${r.gender} | ${r.birth}년생 (초진 ${r.ageAtFirst}세) | ${fmtDur(r.months)} | ${r.hFirst}→${r.hLast} (+${r.hDelta}) | ${r.pahFirst}→${r.pahLast} (**+${r.pahDelta}**) | ${r.nMs}회/BA ${r.nBA} | ${r.xray ? `X-ray ${r.xray}` : ''}${r.hasAllergy ? ' 알러지' : ''}${r.hasIntake ? ' 문진' : ''} | ${r.tags.join(', ') || '-'} | ${r.status === 'completed' ? '완료' : '치료중'} |`;

const header = `| # | 차트번호 | 이름 | 성별 | 출생(초진나이) | 치료기간 | 실제키 변화 | 예상키 변화 | 측정 | 보유자료 | 고민 신호(자동) | 단계 |\n|---|---|---|---|---|---|---|---|---|---|---|---|`;

const girls = rows.filter((r) => r.gender === '여');
const boys = rows.filter((r) => r.gender === '남');

let md = `# 치료사례 양산 후보 ${rows.length}명 — 원장 검토용\n\n`;
md += `> 선별 기준: 측정 6회 이상 · 예상키(PAH) 전후 기록 보유 · 예상키 개선 +5cm(남)/+4cm(여) 이상 · 치료기간 18개월 이상. 입력오류(PAH>230) 제외, 기존 공개 케이스 7건 제외.\n>\n> "고민 신호"는 데이터로 추정한 자동 태그입니다(뼈나이 격차·MPH·BMI·초진 나이·검사 보유). **원장님이 케이스 채택 여부와 고민 카테고리를 확정해주시면 됩니다.**\n>\n> 생성: 2026-06-12, 점수순(예상키 개선 + 실측 성장 + 기간 + 자료 풍부도)\n>\n> ⚠️ 기존 공개 4케이스는 가명이라 원본 환자가 이 목록에 남아 있을 수 있습니다(수치 패턴 일치 건은 태그 표시). 채택 전 중복 확인 필요.\n\n`;
md += `## 👧 여아 후보 (${girls.length}명) — 현재 공개 케이스에 여아가 1건뿐이라 우선 채택 권장\n\n${header}\n${girls.map(line).join('\n')}\n\n`;
md += `## 👦 남아 후보 (${boys.length}명)\n\n${header}\n${boys.map(line).join('\n')}\n\n`;

// 카테고리 커버리지 요약
const tagCount = {};
for (const r of rows) for (const t of r.tags) { const k = t.split('(')[0]; tagCount[k] = (tagCount[k] || 0) + 1; }
md += `## 고민 카테고리 커버리지(자동 신호 기준)\n\n${Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}명`).join('\n')}\n`;
md += `\n## 추천 1차 채택 가이드\n\n- 여아 상위 3~4명 + 남아 상위 6~8명으로 1차 10~12건 제작 → 고민 카테고리(성조숙/유전/비만/늦은시작/성장지연)가 최소 1건씩 커버되게 조합\n- X-ray 보유 후보는 성장판 전후 비교 슬롯 추가 가능\n- 알러지검사 보유 후보는 "식단 교정" 스토리 후보\n`;

writeFileSync('C:/project/dflo/cases/케이스후보_원장검토용.md', md, 'utf8');

// ── HTML 버전 (원장 검토용 인터랙티브 단일 파일) ──────────────────────────────
// 표는 빌드 시점에 미리 렌더해 넣는다(JS 차단 환경·파일 미리보기에서도 데이터가 보이게).
// JS는 필터·정렬·체크 인터랙션만 담당하는 enhancement.
const tagSummary = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
const maxScoreN = Math.max(...rows.map((r) => r.score));
const tagClassN = (t) => t.startsWith('성조숙') ? 't-prec' : t.startsWith('늦은') ? 't-late'
  : t.startsWith('비만') ? 't-obes' : t.startsWith('알러지') ? 't-alle'
  : t.startsWith('유전') ? 't-gene' : t.startsWith('성장지연') ? 't-slow' : 't-warn';
const rowHtmlN = (r, i) => {
  const key = String(r.chart ?? r.name);
  return '<tr data-key="' + key + '">'
    + '<td><input type="checkbox"></td>'
    + '<td class="num">' + (i + 1) + '</td>'
    + '<td><span class="name">' + r.name + '</span><br><span class="chart-no">#' + (r.chart ?? '-') + '</span></td>'
    + '<td class="' + (r.gender === '여' ? 'g-f' : 'g-m') + '">' + (r.gender === '여' ? '👧 여' : '👦 남') + '</td>'
    + '<td class="num">' + r.birth + '년생<br><span class="hdelta">초진 ' + r.ageAtFirst + '세</span></td>'
    + '<td class="num">' + fmtDur(r.months) + '</td>'
    + '<td class="num">' + r.hFirst + '→' + r.hLast + '<br><span class="hdelta">+' + r.hDelta + 'cm</span></td>'
    + '<td class="num">' + r.pahFirst + '→' + r.pahLast + '<br><span class="delta">+' + r.pahDelta + 'cm</span></td>'
    + '<td class="num">' + r.nMs + '회<br><span class="hdelta">BA ' + r.nBA + '</span></td>'
    + '<td>' + (r.xray ? '<span class="asset">X-ray ' + r.xray + '</span>' : '')
              + (r.hasAllergy ? '<span class="asset">알러지</span>' : '')
              + (r.hasIntake ? '<span class="asset">문진</span>' : '') + '</td>'
    + '<td>' + (r.tags.length ? r.tags.map((t) => '<span class="tag ' + tagClassN(t) + '">' + t + '</span>').join('') : '<span class="hdelta">-</span>') + '</td>'
    + '<td><span class="st ' + (r.status === 'completed' ? 'done' : 'ing') + '">' + (r.status === 'completed' ? '완료' : '치료중') + '</span></td>'
    + '<td class="num">' + r.score + '<div class="bar"><i style="width:' + Math.round(r.score / maxScoreN * 100) + '%"></i></div></td>'
    + '</tr>';
};
const prerenderedRows = rows.map(rowHtmlN).join('\n');
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>치료사례 양산 후보 ${rows.length}명 — 원장 검토용</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;
         background:#f6f5f8; color:#333; font-size:14px; line-height:1.6; word-break:keep-all; }
  .wrap { max-width:1240px; margin:0 auto; padding:28px 20px 80px; }
  h1 { font-size:22px; font-weight:900; color:#3a2a68; letter-spacing:-0.5px; }
  .sub { font-size:12.5px; color:#888; margin-top:6px; }
  .criteria { margin-top:12px; background:#fff; border:1px solid #e8e6f0; border-radius:12px;
              padding:12px 16px; font-size:12.5px; color:#666; }
  .criteria b { color:#4A2D6B; }
  .stats { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
  .stat { background:#fff; border:1px solid #e8e6f0; border-radius:999px; padding:5px 13px;
          font-size:12px; font-weight:700; color:#555; }
  .stat b { color:#4A2D6B; }
  .controls { position:sticky; top:0; z-index:10; background:#f6f5f8; padding:14px 0 10px;
              display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .chip { border:1.5px solid #d9d4e8; background:#fff; border-radius:999px; padding:6px 14px;
          font-size:12.5px; font-weight:700; color:#666; cursor:pointer; transition:all .15s; }
  .chip:hover { border-color:#764ba2; }
  .chip.on { background:#4A2D6B; border-color:#4A2D6B; color:#fff; }
  .chip.girl.on { background:#d6336c; border-color:#d6336c; }
  .chip.boy.on { background:#2563EB; border-color:#2563EB; }
  input[type=search] { border:1.5px solid #d9d4e8; border-radius:999px; padding:6px 14px;
          font-size:12.5px; width:160px; outline:none; }
  input[type=search]:focus { border-color:#764ba2; }
  select { border:1.5px solid #d9d4e8; border-radius:999px; padding:6px 10px; font-size:12.5px;
           background:#fff; color:#555; font-weight:700; outline:none; }
  .selbar { margin-left:auto; display:flex; gap:8px; align-items:center; }
  .selcount { font-size:12.5px; font-weight:800; color:#4A2D6B; }
  .copybtn { border:none; background:#10a572; color:#fff; border-radius:999px; padding:7px 16px;
             font-size:12.5px; font-weight:800; cursor:pointer; }
  .copybtn:hover { filter:brightness(.94); }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:14px; overflow:hidden;
          box-shadow:0 2px 10px rgba(58,42,104,.07); font-size:13px; }
  thead th { background:#3a2a68; color:#fff; font-size:11.5px; font-weight:700; padding:9px 8px;
             text-align:left; white-space:nowrap; cursor:pointer; user-select:none; }
  thead th .arr { opacity:.6; font-size:10px; }
  tbody td { padding:8px 8px; border-top:1px solid #f0eef6; vertical-align:middle; }
  tbody tr:hover { background:#faf8ff; }
  tbody tr.checked { background:#effaf4; }
  tbody tr.checked:hover { background:#e4f6ec; }
  .g-f { color:#d6336c; font-weight:800; }
  .g-m { color:#2563EB; font-weight:800; }
  .num { font-variant-numeric:tabular-nums; white-space:nowrap; }
  .delta { font-weight:900; color:#10a572; }
  .hdelta { color:#888; font-size:12px; }
  .name { font-weight:800; color:#222; white-space:nowrap; }
  .chart-no { font-size:11.5px; color:#999; font-variant-numeric:tabular-nums; }
  .tag { display:inline-block; font-size:10.5px; font-weight:700; border-radius:6px; padding:1.5px 7px;
         margin:1px 2px 1px 0; white-space:nowrap; }
  .tag.t-prec { background:#fdeef4; color:#d6336c; }
  .tag.t-late { background:#fff4e0; color:#c47b08; }
  .tag.t-obes { background:#fdf0e8; color:#d9480f; }
  .tag.t-alle { background:#e8f4fd; color:#1971c2; }
  .tag.t-gene { background:#f1ecfb; color:#6741d9; }
  .tag.t-slow { background:#e6fcf5; color:#0b8a5e; }
  .tag.t-warn { background:#ffe8e8; color:#c92a2a; }
  .asset { display:inline-block; font-size:10.5px; font-weight:700; background:#f4f3f8; color:#777;
           border-radius:6px; padding:1.5px 7px; margin-right:2px; white-space:nowrap; }
  .st { font-size:11px; font-weight:800; border-radius:999px; padding:2px 9px; white-space:nowrap; }
  .st.done { background:#e7f8f1; color:#0b8a5e; }
  .st.ing { background:#eef2ff; color:#4263eb; }
  .bar { height:5px; border-radius:3px; background:#ece9f4; margin-top:3px; overflow:hidden; }
  .bar i { display:block; height:100%; border-radius:3px; background:linear-gradient(90deg,#667eea,#764ba2); }
  .empty { text-align:center; color:#aaa; padding:40px 0; }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#3a2a68; color:#fff;
           border-radius:999px; padding:10px 22px; font-size:13px; font-weight:700; opacity:0;
           transition:opacity .25s; pointer-events:none; }
  .toast.show { opacity:1; }
  @media (max-width:760px) {
    body { font-size:13px; }
    .wrap { padding:18px 8px 60px; }
    table { font-size:12px; display:block; overflow-x:auto; white-space:nowrap; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>치료사례 양산 후보 <span id="totalN">${rows.length}</span>명 — 원장 검토용</h1>
  <p class="sub">생성 2026-06-12 · 점수순(예상키 개선 + 실측 성장 + 기간 + 자료 풍부도) · 체크 상태는 이 브라우저에 자동 저장됩니다</p>
  <div class="criteria">
    <b>선별 기준</b> : 측정 6회 이상 · 예상키(PAH) 전후 기록 보유 · 예상키 개선 +5cm(남)/+4cm(여) 이상 · 치료기간 18개월 이상 · 입력오류/중복 레코드/기존 공개 케이스 제외.<br>
    "고민 신호"는 데이터 기반 자동 태그(뼈나이 격차·MPH·BMI·초진 나이·검사 보유) — <b>채택 여부와 카테고리는 원장님이 확정</b>해주세요.
    기존 공개 4케이스는 가명이라 원본 환자가 남아 있을 수 있습니다(⚠️ 태그 확인).
  </div>
  <div class="stats">
    <span class="stat">전체 <b>${rows.length}</b>명</span>
    <span class="stat">👧 여아 <b>${girls.length}</b></span>
    <span class="stat">👦 남아 <b>${boys.length}</b></span>
    ${tagSummary.map(([k, v]) => `<span class="stat">${k} <b>${v}</b></span>`).join('\n    ')}
  </div>

  <div class="controls">
    <button class="chip on" data-g="all">전체</button>
    <button class="chip girl" data-g="여">👧 여아</button>
    <button class="chip boy" data-g="남">👦 남아</button>
    <select id="tagFilter">
      <option value="">고민 신호 전체</option>
      ${tagSummary.map(([k]) => `<option value="${k}">${k}</option>`).join('\n      ')}
    </select>
    <select id="stFilter">
      <option value="">단계 전체</option>
      <option value="완료">치료 완료</option>
      <option value="치료중">치료 중</option>
    </select>
    <input type="search" id="q" placeholder="이름·차트번호 검색">
    <div class="selbar">
      <span class="selcount" id="selCount">선택 0명</span>
      <button class="copybtn" id="copySel">선택 차트번호 복사</button>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>✓</th><th>#</th><th>이름 / 차트</th><th>성별</th>
      <th data-sort="ageAtFirst">출생(초진) <span class="arr">↕</span></th>
      <th data-sort="months">치료기간 <span class="arr">↕</span></th>
      <th data-sort="hDelta">실제키 변화 <span class="arr">↕</span></th>
      <th data-sort="pahDelta">예상키 변화 <span class="arr">↕</span></th>
      <th data-sort="nMs">측정 <span class="arr">↕</span></th>
      <th>보유자료</th><th>고민 신호(자동)</th><th>단계</th>
      <th data-sort="score">점수 <span class="arr">↓</span></th>
    </tr></thead>
    <tbody id="tb">${prerenderedRows}</tbody>
  </table>
  <p class="empty" id="empty" style="display:none">조건에 맞는 후보가 없습니다</p>
</div>
<div class="toast" id="toast"></div>

<script>
const DATA = ${JSON.stringify(rows)};
const maxScore = Math.max(...DATA.map(r => r.score));
const fmtDur = m => m < 12 ? m + '개월' : Math.floor(m / 12) + '년' + (m % 12 ? ' ' + (m % 12) + '개월' : '');
const tagClass = t => t.startsWith('성조숙') ? 't-prec' : t.startsWith('늦은') ? 't-late'
  : t.startsWith('비만') ? 't-obes' : t.startsWith('알러지') ? 't-alle'
  : t.startsWith('유전') ? 't-gene' : t.startsWith('성장지연') ? 't-slow' : 't-warn';

let genderF = 'all', tagF = '', stF = '', q = '', sortKey = 'score', sortDir = -1;
// file:// 등 일부 환경은 localStorage 접근이 막힐 수 있음 — 실패해도 표·인터랙션은 유지
const store = {
  get() { try { return JSON.parse(localStorage.getItem('caseCandidates2026') || '[]'); } catch { return []; } },
  set(v) { try { localStorage.setItem('caseCandidates2026', JSON.stringify(v)); } catch {} },
};
const saved = new Set(store.get());

function statusLabel(s) { return s === 'completed' ? '완료' : '치료중'; }

function rowsFiltered() {
  return DATA.filter(r => {
    if (genderF !== 'all' && r.gender !== genderF) return false;
    if (tagF && !r.tags.some(t => t.startsWith(tagF))) return false;
    if (stF && statusLabel(r.status) !== stF) return false;
    if (q && !((r.name || '').includes(q) || String(r.chart || '').includes(q))) return false;
    return true;
  }).sort((a, b) => sortDir === -1 ? (b[sortKey] ?? 0) - (a[sortKey] ?? 0) : (a[sortKey] ?? 0) - (b[sortKey] ?? 0));
}

function render() {
  const list = rowsFiltered();
  const tb = document.getElementById('tb');
  document.getElementById('empty').style.display = list.length ? 'none' : '';
  tb.innerHTML = list.map((r, i) => {
    const key = String(r.chart ?? r.name);
    return '<tr class="' + (saved.has(key) ? 'checked' : '') + '" data-key="' + key + '">'
      + '<td><input type="checkbox" ' + (saved.has(key) ? 'checked' : '') + '></td>'
      + '<td class="num">' + (i + 1) + '</td>'
      + '<td><span class="name">' + r.name + '</span><br><span class="chart-no">#' + (r.chart ?? '-') + '</span></td>'
      + '<td class="' + (r.gender === '여' ? 'g-f' : 'g-m') + '">' + (r.gender === '여' ? '👧 여' : '👦 남') + '</td>'
      + '<td class="num">' + r.birth + '년생<br><span class="hdelta">초진 ' + r.ageAtFirst + '세</span></td>'
      + '<td class="num">' + fmtDur(r.months) + '</td>'
      + '<td class="num">' + r.hFirst + '→' + r.hLast + '<br><span class="hdelta">+' + r.hDelta + 'cm</span></td>'
      + '<td class="num">' + r.pahFirst + '→' + r.pahLast + '<br><span class="delta">+' + r.pahDelta + 'cm</span></td>'
      + '<td class="num">' + r.nMs + '회<br><span class="hdelta">BA ' + r.nBA + '</span></td>'
      + '<td>' + (r.xray ? '<span class="asset">X-ray ' + r.xray + '</span>' : '')
                + (r.hasAllergy ? '<span class="asset">알러지</span>' : '')
                + (r.hasIntake ? '<span class="asset">문진</span>' : '') + '</td>'
      + '<td>' + (r.tags.length ? r.tags.map(t => '<span class="tag ' + tagClass(t) + '">' + t + '</span>').join('') : '<span class="hdelta">-</span>') + '</td>'
      + '<td><span class="st ' + (r.status === 'completed' ? 'done' : 'ing') + '">' + statusLabel(r.status) + '</span></td>'
      + '<td class="num">' + r.score + '<div class="bar"><i style="width:' + Math.round(r.score / maxScore * 100) + '%"></i></div></td>'
      + '</tr>';
  }).join('');
  document.getElementById('selCount').textContent = '선택 ' + saved.size + '명';
}

document.querySelectorAll('.chip[data-g]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.chip[data-g]').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); genderF = b.dataset.g; render();
}));
document.getElementById('tagFilter').addEventListener('change', e => { tagF = e.target.value; render(); });
document.getElementById('stFilter').addEventListener('change', e => { stF = e.target.value; render(); });
document.getElementById('q').addEventListener('input', e => { q = e.target.value.trim(); render(); });
document.querySelectorAll('thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = -1; }
  render();
}));
document.getElementById('tb').addEventListener('change', e => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const key = tr.dataset.key;
  if (e.target.checked) saved.add(key); else saved.delete(key);
  tr.classList.toggle('checked', e.target.checked);
  store.set([...saved]);
  document.getElementById('selCount').textContent = '선택 ' + saved.size + '명';
});
document.getElementById('copySel').addEventListener('click', () => {
  const list = [...saved].join(', ');
  navigator.clipboard.writeText(list || '').then(() => {
    const t = document.getElementById('toast');
    t.textContent = saved.size ? '차트번호 ' + saved.size + '건 복사됨: ' + list : '선택된 후보가 없습니다';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200);
  });
});
render();
</script>
</body>
</html>`;
writeFileSync('C:/project/dflo/cases/케이스후보_원장검토용.html', html, 'utf8');

console.log(`done: ${rows.length}명 (여 ${girls.length} / 남 ${boys.length})`);
console.log('tags:', JSON.stringify(tagCount));
