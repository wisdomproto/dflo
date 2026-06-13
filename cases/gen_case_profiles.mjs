// 치료사례 양산 후보 — 1인 1카드 상세 프로필 HTML 생성 (read-only).
// select_case_candidates.mjs 와 동일한 선별 기준 + 환자별 상세(측정 이력·SVG 성장그래프·
// 내원사유·문진 발췌·알러지 강반응·스토리 포인트 초안)를 전부 미리 렌더한다.
// JS 는 필터/체크/복사 enhancement 만 — 스크립트 차단 환경에서도 내용 전부 보임.
// 환자 이름은 전부 가명(차트번호 순 결정적 배정) — 식별은 차트번호로. 배포 가능 전제로 noindex.
//
// 원장 화자 풀 스토리: cases/case_stories.json ({chart: {title, story}}) 이 있으면 카드에
// "🩺 원장 스토리" 접힘 섹션으로 렌더. 스토리 생성용 입력은 cases/_story_inputs.json 으로
// 덤프(가명 적용 후) — PATIENT_STORY_GUIDE.md 톤으로 Claude 가 작성한다.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

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

const children = await rest('children?select=id,name,chart_number,gender,birth_date,father_height,mother_height,desired_height,grade,class_height_rank,parent_id,treatment_status,intake_survey');
const ms = await rest('hospital_measurements?select=child_id,measured_date,height,weight,bone_age,pah');
const labs = await rest('lab_tests?select=child_id,test_type,result_data,visit_id');
const visitRows = await rest('visits?select=id,visit_date');
const visitDateById = new Map(visitRows.map((v) => [v.id, v.visit_date]));
const xrays = await rest('xray_readings?select=child_id,image_path');
const visits = await rest('visits?select=child_id,visit_date,chief_complaint,notes,is_intake');
const meds = await rest('medications?select=id,name');
const medLegend = await rest('medication_legend?select=medication_id,drug_class').catch(() => []);
const rxAll = await rest('prescriptions?select=child_id,medication_id');

// ── 공개 케이스 가상 children 제외 ──
const byParent = new Map();
for (const c of children) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) || []), c]);
const CASE_NAMES = new Set(['제임스', '은우', '민수', '민희', '성재', '도훈', '민준']);
const excludedIds = new Set();
for (const [, kids] of byParent) {
  const hit = kids.filter((k) => CASE_NAMES.has((k.name || '').trim())).length;
  if (kids.length <= 8 && hit >= 4) kids.forEach((k) => excludedIds.add(k.id));
}

const msBy = new Map();
for (const m of ms) msBy.set(m.child_id, [...(msBy.get(m.child_id) || []), m]);
const xrayBy = new Map();
for (const x of xrays) if (x.image_path) xrayBy.set(x.child_id, (xrayBy.get(x.child_id) || 0) + 1);
const allergyBy = new Map();
for (const l of labs) if (l.test_type === 'allergy' && l.result_data?.items) allergyBy.set(l.child_id, l.result_data.items);

// 혈액검사 특이 신호 — 검사기관의 공식 H/L 플래그만 사용 (자체 기준 판정 금지).
// 성호르몬은 '높음'만 신호로 (소아 Testosterone [L]은 정상이라 제외).
// ★ 피검사는 ~6개월마다 반복되므로 "어느 시점 검사의 신호인지"가 중요 — 검사를 날짜순으로
//   보고 신호마다 (a) 첫 혈액검사부터였는지 / 치료 중 검사부터였는지 (b) 그 항목을 잰 가장
//   최근 검사에서 정상으로 돌아왔는지(=검증 가능한 호전)를 함께 기록한다.
const SIGNAL_DEFS = [
  { key: 'thyroid', label: '갑상선 호르몬 수치 이상', match: (it) => it.flag && (it.panel === 'Thyroid' || /^(TSH|T3|T4|Free T[34])$/i.test((it.name || '').trim())), measured: (it) => it.panel === 'Thyroid' || /^(TSH|T3|T4|Free T[34])$/i.test((it.name || '').trim()) },
  { key: 'pubHormone', label: '성호르몬 수치 높음(사춘기 진행 신호)', match: (it) => it.flag === 'H' && /Estradiol|Free Testosterone|^LH$/i.test((it.name || '').trim()), measured: (it) => /Estradiol|Free Testosterone|^LH$/i.test((it.name || '').trim()) },
  { key: 'metabolic', label: '혈당·지질 수치 높음', match: (it) => it.flag === 'H' && /^HbA1c|Triglyceride|Cholesterol,Total/i.test((it.name || '').trim()), measured: (it) => /^HbA1c|Triglyceride|Cholesterol,Total/i.test((it.name || '').trim()) },
  { key: 'anemia', label: '빈혈·철분 부족 신호', match: (it) => it.flag === 'L' && /^(Hb|Ferritin)$/i.test((it.name || '').trim()), measured: (it) => /^(Hb|Ferritin)$/i.test((it.name || '').trim()) },
];
const bloodTestsBy = new Map();
for (const l of labs) {
  if (l.test_type !== 'blood' || !l.result_data?.items) continue;
  const date = visitDateById.get(l.visit_id) || '';
  bloodTestsBy.set(l.child_id, [...(bloodTestsBy.get(l.child_id) || []), { date, items: l.result_data.items }]);
}
const bloodSignalsBy = new Map();
const bloodTimelineBy = new Map();
for (const [cid, tests] of bloodTestsBy) {
  tests.sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = [];
  for (const def of SIGNAL_DEFS) {
    const measured = tests.filter((t) => t.items.some(def.measured));
    if (!measured.length) continue;
    const flaggedTests = measured.filter((t) => t.items.some(def.match));
    if (!flaggedTests.length) continue;
    const fromFirstTest = measured[0] === flaggedTests[0] && flaggedTests[0].date === measured[0].date;
    const lastMeasured = measured[measured.length - 1];
    const resolved = measured.length >= 2 && !lastMeasured.items.some(def.match) && flaggedTests[flaggedTests.length - 1].date < lastMeasured.date;
    const timing = fromFirstTest ? '초진 무렵 검사부터' : '치료 중 검사에서';
    const trend = resolved ? '최근 검사에선 정상 범위(호전)' : '최근 검사까지 관찰됨';
    out.push(`${def.label} — ${timing}, ${trend}`);
  }
  if (out.length) bloodSignalsBy.set(cid, new Set(out));

  // 피검사 연대기 — 신호 집합이 바뀐 검사만 기록 (좋아짐/새 문제 등장 비트의 근거)
  const SHORT = { thyroid: '갑상선', pubHormone: '성호르몬↑', metabolic: '혈당지질', anemia: '빈혈철분' };
  const timeline = [];
  let prev = null;
  for (const t of tests) {
    const cur = new Set(SIGNAL_DEFS.filter((d) => t.items.some(d.match)).map((d) => d.key));
    const measuredKeys = new Set(SIGNAL_DEFS.filter((d) => t.items.some(d.measured)).map((d) => d.key));
    if (prev === null) {
      timeline.push(`${t.date.slice(2, 7)} 첫 피검사: ${cur.size ? [...cur].map((k) => SHORT[k]).join('·') : '특이 신호 없음'}`);
    } else {
      const added = [...cur].filter((k) => !prev.has(k));
      const cleared = [...prev].filter((k) => !cur.has(k) && measuredKeys.has(k));
      if (added.length || cleared.length) {
        const parts = [];
        if (cleared.length) parts.push(`${cleared.map((k) => SHORT[k]).join('·')} 정상화`);
        if (added.length) parts.push(`${added.map((k) => SHORT[k]).join('·')} 새로 관찰`);
        timeline.push(`${t.date.slice(2, 7)} ${parts.join(' / ')}`);
      }
      // 측정 안 된 항목의 이전 상태는 유지
      for (const k of prev) if (!measuredKeys.has(k)) cur.add(k);
    }
    prev = cur;
  }
  if (timeline.length) bloodTimelineBy.set(cid, timeline);
}
const visitsBy = new Map();
for (const v of visits) visitsBy.set(v.child_id, [...(visitsBy.get(v.child_id) || []), v]);

// 처방 → 치료 테마 신호. GH·아로마타제·수면제는 전 환자 프로토콜이라 "보유 여부"는 신호가
// 아니고, 구분력 있는 것만: 루프린(GnRH, legend 미등록 코드가 있어 이름으로 매칭) ·
// 수면 처방 "비중"(>20% = 수면 문제가 큰 축) · 식욕 촉진(트레스탄) · 위장/장 케어.
const medNameById = new Map(meds.map((m) => [m.id, m.name || '']));
const sleepMedIds = new Set(medLegend.filter((l) => l.drug_class === 'sleep_aid').map((l) => l.medication_id));
const rxSignalsBy = new Map();
{
  const acc = new Map();
  for (const p of rxAll) {
    const e = acc.get(p.child_id) || { total: 0, sleep: 0, gnrh: 0, appetite: 0, gut: 0 };
    e.total++;
    const name = medNameById.get(p.medication_id) || '';
    if (sleepMedIds.has(p.medication_id)) e.sleep++;
    if (/루프린|류프로렐린/.test(name)) e.gnrh++;
    if (/트레스탄/.test(name)) e.appetite++;
    if (/스티올렌|노르믹스|프로바이오/.test(name)) e.gut++;
    acc.set(p.child_id, e);
  }
  for (const [cid, e] of acc) {
    const sig = [];
    if (e.gnrh > 0) sig.push('사춘기 억제 주사(GnRH) 치료 병행 — 성조숙 적극 치료');
    if (e.total >= 20 && e.sleep / e.total > 0.2) sig.push('수면 보조 처방 비중이 유난히 높음 — 수면 문제가 치료의 큰 축');
    if (e.appetite > 0) sig.push('식욕 촉진 처방 — 입이 짧아 먹는 일부터 과제였던 아이');
    if (e.gut >= 10) sig.push('위장·장 케어 처방이 꾸준함 — 소화·흡수 관리 병행');
    if (sig.length) rxSignalsBy.set(cid, sig);
  }
}

const yearsBetween = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 86400e3);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CAUSE_LABELS = {
  parents_short: '부모 키가 작음', picky_eating: '편식', insufficient_sleep: '수면 부족',
  lack_of_exercise: '운동 부족', exercise_lack: '운동 부족', obesity: '비만', stress: '스트레스',
  digestive_issues: '소화 문제', allergy: '알러지', premature_birth: '미숙아', late_bloomer: '늦게 크는 체질',
};

// ── 선별 + 상세 빌드 ──
const rows = [];
for (const c of children) {
  if (excludedIds.has(c.id)) continue;
  const mm = (msBy.get(c.id) || []).slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1));
  if (mm.length < 6) continue;
  const withPah = mm.filter((m) => m.pah > 0 && m.pah < 230);
  if (withPah.length < 2) continue;
  const first = withPah[0], last = withPah[withPah.length - 1];
  const pahDelta = +(last.pah - first.pah).toFixed(1);
  if (pahDelta < 5) continue;
  const months = Math.round(yearsBetween(mm[0].measured_date, mm[mm.length - 1].measured_date) * 12);
  if (months < 18) continue;

  const firstH = mm.find((m) => m.height > 0);
  const lastH = [...mm].reverse().find((m) => m.height > 0);
  const ageAtFirst = c.birth_date ? +yearsBetween(c.birth_date, mm[0].measured_date).toFixed(1) : null;
  const isMale = c.gender === 'male';

  const baRows = mm.filter((m) => m.bone_age > 0).map((m) => {
    const age = c.birth_date ? +yearsBetween(c.birth_date, m.measured_date).toFixed(1) : null;
    return { ...m, age, gap: age != null ? +(m.bone_age - age).toFixed(1) : null };
  });
  const firstBA = baRows[0], lastBA = baRows[baRows.length - 1];
  const mph = c.father_height && c.mother_height ? +(((c.father_height + c.mother_height) / 2 + (isMale ? 6.5 : -6.5))).toFixed(1) : null;
  const bmi = firstH?.weight && firstH?.height ? +(firstH.weight / ((firstH.height / 100) ** 2)).toFixed(1) : null;
  const bmiLast = lastH?.weight && lastH?.height ? +(lastH.weight / ((lastH.height / 100) ** 2)).toFixed(1) : null;

  // 알러지 강반응/경계
  const items = allergyBy.get(c.id) || [];
  const danger = items.filter((i) => parseInt(i.class, 10) >= 5).map((i) => i.name.split('(')[0]);
  const caution = items.filter((i) => { const cl = parseInt(i.class, 10); return cl >= 3 && cl <= 4; }).map((i) => i.name.split('(')[0]);

  // 내원 사유(초진 visit 우선) — OCR/임포트 아티팩트·무의미 라벨 제외.
  // visits.notes 는 OCR 손글씨 산출물이라 노이즈가 심함 — 카드에는 안 싣고,
  // 스토리 재료로만 "수면·식습관·꿈(운동선수/연습생)·가족" 키워드 매칭 줄만 발췌한다.
  const ARTIFACT = /OCR|임포트|import|auto-created|C\.C\.|^초진/i;
  const vv = (visitsBy.get(c.id) || []).slice().sort((a, b) => (a.visit_date < b.visit_date ? -1 : 1));
  const chiefCands = [vv.find((v) => v.is_intake)?.chief_complaint, ...vv.map((v) => v.chief_complaint)]
    .map((s) => (s || '').trim()).filter((s) => s && !ARTIFACT.test(s));
  const chief = chiefCands[0] || '';
  const notes = [];
  const STORY_KW = /운동선수|연습생|배우|모델|아이돌|축구|야구|농구|골프|발레|수영|태권도|쌍둥이|남매|형제|수면|늦게 잔|새벽|핸드폰|게임|라면|편식|야식|식욕|입이 짧/;
  const noteSnippets = [];
  const seenSnip = new Set();
  for (const v of vv) {
    for (const t of [v.chief_complaint, v.notes]) {
      const s = (t || '').replace(/\r?\n/g, ' · ').trim();
      if (!s || s.length > 90 || ARTIFACT.test(s) || !STORY_KW.test(s)) continue;
      if (seenSnip.has(s)) continue;
      seenSnip.add(s);
      noteSnippets.push(s);
      if (noteSnippets.length >= 4) break;
    }
    if (noteSnippets.length >= 4) break;
  }

  // 문진 발췌 (contact/raw_files 등 PII 제외)
  const sv = c.intake_survey || {};
  const intake = {
    flags: sv.growth_flags ? Object.entries(sv.growth_flags).filter(([, v]) => v).map(([k]) =>
      ({ slowed: '성장 느려짐', rapid_growth: '급성장(사춘기 의심)', puberty_concern: '사춘기 걱정' }[k] || k)) : [],
    tanner: sv.tanner_stage ?? null,
    causes: Array.isArray(sv.short_stature_causes) ? sv.short_stature_causes.map((k) => CAUSE_LABELS[k] || k) : [],
    chronic: sv.chronic_conditions || '',
    athlete: sv.sports_athlete === true,
    sportsEvent: sv.sports_event || '',
  };

  // 자동 태그
  const tags = [];
  if (firstBA?.gap != null && firstBA.gap >= 1.5) tags.push(`성조숙(뼈나이 +${firstBA.gap}년)`);
  if (mph != null && ((isMale && mph <= 170) || (!isMale && mph <= 158))) tags.push(`유전키 작음(MPH ${mph})`);
  if (bmi != null && bmi >= 23) tags.push(`비만 동반(BMI ${bmi})`);
  if (ageAtFirst != null && ((isMale && ageAtFirst >= 13) || (!isMale && ageAtFirst >= 11.5))) tags.push('늦은 시작');
  if (danger.length || caution.length) tags.push('알러지검사');
  if (firstBA?.gap != null && firstBA.gap <= -1.0) tags.push(`성장지연(뼈나이 ${firstBA.gap}년)`);

  // 성장 리듬 — 정체기(6개월 환산 <2cm)·스퍼트(>5cm) 구간. 150~240일 간격 측정쌍 기준
  const hms = mm.filter((m) => m.height > 0);
  let slowPhase = null, spurtPhase = null;
  for (let i = 0; i < hms.length; i++) {
    for (let j = i + 1; j < hms.length; j++) {
      const days = (new Date(hms[j].measured_date) - new Date(hms[i].measured_date)) / 86400e3;
      if (days < 150) continue;
      if (days > 240) break;
      const rate = ((hms[j].height - hms[i].height) / days) * 182.6;
      if (rate < -1) continue; // 키가 줄 수는 없음 — 측정/입력 오류 쌍은 제외
      const span = `${hms[i].measured_date.slice(2, 7)}~${hms[j].measured_date.slice(2, 7)}`;
      if (!slowPhase || rate < slowPhase.rate) slowPhase = { span, rate };
      if (!spurtPhase || rate > spurtPhase.rate) spurtPhase = { span, rate };
    }
  }
  const fmtRate = (r) => `${Math.max(0, r).toFixed(1)}cm`;
  const growthRhythm = [];
  if (slowPhase && slowPhase.rate < 2) growthRhythm.push(`정체기 ${slowPhase.span}: 6개월 환산 +${fmtRate(slowPhase.rate)}`);
  if (spurtPhase && spurtPhase.rate > 5) growthRhythm.push(`스퍼트 ${spurtPhase.span}: 6개월 환산 +${fmtRate(spurtPhase.rate)}`);

  const hDelta = firstH && lastH ? +(lastH.height - firstH.height).toFixed(1) : 0;
  const score = Math.round(pahDelta * 3 + Math.min(hDelta, 35) + months / 6 + (xrayBy.get(c.id) ? 5 : 0) + (danger.length || caution.length ? 3 : 0));

  // 헤드라인 초안 (엄마 언어, rule-based)
  let headline;
  const aFirst = ageAtFirst != null ? Math.round(ageAtFirst) : null;
  if (firstBA?.gap >= 1.5) headline = `${aFirst}살인데 뼈나이는 ${Math.round(firstBA.bone_age)}살이었습니다 — 예상키 +${pahDelta}cm`;
  else if (tags.some((t) => t.startsWith('유전키'))) headline = `유전 기대키 ${mph}cm의 한계 — 예상키 ${last.pah}cm까지`;
  else if (tags.includes('늦은 시작')) headline = `${aFirst}세, 늦었다고 생각했지만 — 예상키 +${pahDelta}cm`;
  else if (firstBA?.gap <= -1.0) headline = `또래보다 ${Math.abs(firstBA.gap)}년 어린 뼈나이 — 천천히, 그러나 ${last.pah}cm까지`;
  else headline = `치료 ${months < 12 ? months + '개월' : Math.floor(months / 12) + '년'} — 예상키 ${first.pah}cm → ${last.pah}cm`;

  // 스토리 포인트 (rule-based bullets)
  const points = [];
  if (firstBA && lastBA && firstBA !== lastBA) {
    const d1 = firstBA.gap, d2 = lastBA.gap;
    if (d1 != null && d2 != null && d1 - d2 >= 0.5) points.push(`뼈나이 격차 ${d1 >= 0 ? '+' : ''}${d1}년 → ${d2 >= 0 ? '+' : ''}${d2}년으로 억제 (사춘기 관리 효과)`);
  }
  if (mph != null && last.pah - mph >= 3) points.push(`유전 기대키(MPH ${mph}cm)보다 +${(last.pah - mph).toFixed(1)}cm — "유전 한계 돌파" 서사 가능`);
  const yearsTotal = months / 12;
  if (yearsTotal >= 1) points.push(`연평균 성장 ${(hDelta / yearsTotal).toFixed(1)}cm/년 (총 +${hDelta}cm)`);
  if (danger.length) points.push(`알러지 강반응: ${danger.slice(0, 4).join('·')} — "매일 먹이던 음식이 문제였다" 식단 교정 서사 가능`);
  const bloodSignals = [...(bloodSignalsBy.get(c.id) || [])];
  if (bloodSignals.length) points.push(`혈액검사 신호: ${bloodSignals.join(', ')}`);
  const rxSignals = rxSignalsBy.get(c.id) || [];
  if (rxSignals.length) points.push(`처방 신호: ${rxSignals.map((s) => s.split(' — ')[0]).join(', ')}`);
  if (noteSnippets.length) points.push(`진료 메모 단서: ${noteSnippets.slice(0, 2).join(' / ')}`);
  if (xrayBy.get(c.id)) points.push(`X-ray ${xrayBy.get(c.id)}장 보유 — 성장판 전후 비교 슬롯 가능`);
  if (intake.athlete || /운동선수|연습생|배우|모델/.test(chief)) points.push(`꿈/직업 서사: ${chief || '운동선수'}`);
  if (c.desired_height) points.push(`희망 키 ${c.desired_height} — 목표 대비 진행 표현 가능`);

  rows.push({
    id: c.id, chart: c.chart_number, name: c.name, gender: isMale ? '남' : '여',
    birth: (c.birth_date || '').slice(0, 4), birthDate: c.birth_date, ageAtFirst, months,
    fa: c.father_height, mo: c.mother_height, mph, bmi, bmiLast, desired: c.desired_height,
    grade: c.grade, rank: c.class_height_rank,
    nMs: mm.length, nBA: baRows.length,
    hFirst: firstH?.height, hLast: lastH?.height, hDelta,
    pahFirst: first.pah, pahLast: last.pah, pahDelta,
    xray: xrayBy.get(c.id) || 0, danger, caution, bloodSignals, rxSignals, noteSnippets,
    bloodTimeline: bloodTimelineBy.get(c.id) || [], growthRhythm,
    chief, notes, intake, status: c.treatment_status, tags, score, headline, points,
    mm: mm.map((m) => ({
      date: m.measured_date, h: m.height, w: m.weight, ba: m.bone_age, pah: (m.pah > 0 && m.pah < 230) ? m.pah : null,
      age: c.birth_date ? +yearsBetween(c.birth_date, m.measured_date).toFixed(1) : null,
    })),
    baRows,
  });
}

// 동일 환자 중복 제거 + 공개 케이스 원본 표시
const seen = new Map();
for (const r of rows) {
  const k = `${r.name}|${r.birth}|${r.gender}`;
  const prev = seen.get(k);
  if (!prev || r.nMs > prev.nMs) seen.set(k, r);
}
const list = [...seen.values()];
for (const r of list) if (r.name === '다나카고키') r.tags.push('⚠️ 공개 케이스(제임스) 원본 추정');
list.sort((a, b) => b.score - a.score);

// ── 가명 처리 ──
// 차트번호 오름차순으로 성별 이름 풀에서 결정적 배정(같은 후보 셋이면 재실행해도 동일 가명).
// 기존 공개 케이스 가명(제임스·은우·민수·민희·성재·도훈·민준)과 겹치지 않는 풀 사용.
const BOY_POOL = ['서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준우', '건우',
  '현우', '우진', '선우', '연우', '유준', '정우', '승현', '시윤', '준서', '은찬',
  '수호', '이안', '태윤', '지안', '윤우', '승우', '지환', '승민', '시현', '진우',
  '민재', '현준', '원준', '서진', '민성', '준혁', '태민', '규민', '동현', '재윤',
  '시원', '지율', '태현', '민규', '재원'];
const GIRL_POOL = ['서연', '지유', '하은', '서현', '하윤', '지아', '수아', '예은', '소율', '채원',
  '다은', '은서', '시은', '예린', '윤서', '가은', '유나', '주아', '아린', '나윤',
  '채은', '수빈'];
{
  const byChart = list.slice().sort((a, b) => String(a.chart).localeCompare(String(b.chart)));
  let bi = 0, gi = 0;
  for (const r of byChart) {
    r.name = r.gender === '남' ? BOY_POOL[bi++ % BOY_POOL.length] : GIRL_POOL[gi++ % GIRL_POOL.length];
  }
}

// ── 원장 스토리 입력 덤프 + 작성본 로드 ──
// 입력 덤프는 가명 적용 후의 데이터만 담는다 (스토리 작성 에이전트가 실명을 볼 일 없게).
writeFileSync('C:/project/dflo/cases/_story_inputs.json', JSON.stringify(list.map((r) => ({
  chart: String(r.chart), name: r.name, gender: r.gender, birth: r.birth,
  ageAtFirst: r.ageAtFirst, months: r.months, status: r.status,
  firstDate: r.mm[0]?.date, lastDate: r.mm[r.mm.length - 1]?.date,
  hFirst: r.hFirst, hLast: r.hLast, hDelta: r.hDelta,
  pahFirst: r.pahFirst, pahLast: r.pahLast, pahDelta: r.pahDelta,
  baFirst: r.baRows[0] ? { date: r.baRows[0].measured_date, age: r.baRows[0].age, boneAge: r.baRows[0].bone_age, gap: r.baRows[0].gap } : null,
  baLast: r.baRows.length > 1 ? { date: r.baRows[r.baRows.length - 1].measured_date, age: r.baRows[r.baRows.length - 1].age, boneAge: r.baRows[r.baRows.length - 1].bone_age, gap: r.baRows[r.baRows.length - 1].gap } : null,
  mph: r.mph, fa: r.fa, mo: r.mo, bmiFirst: r.bmi, bmiLast: r.bmiLast,
  desired: r.desired, grade: r.grade, heightRank: r.rank,
  tags: r.tags, chief: r.chief, allergyDanger: r.danger, allergyCaution: r.caution.slice(0, 6),
  bloodSignals: r.bloodSignals, rxSignals: r.rxSignals, noteSnippets: r.noteSnippets,
  bloodTimeline: r.bloodTimeline, growthRhythm: r.growthRhythm,
  intake: r.intake,
})), null, 1), 'utf8');

const STORIES = existsSync('C:/project/dflo/cases/case_stories.json')
  ? JSON.parse(readFileSync('C:/project/dflo/cases/case_stories.json', 'utf8'))
  : {};

const girls = list.filter((r) => r.gender === '여').length;
const fmtDur = (m) => (m < 12 ? `${m}개월` : `${Math.floor(m / 12)}년${m % 12 ? ` ${m % 12}개월` : ''}`);
const fmtD = (d) => (d ? `${d.slice(2, 4)}.${d.slice(5, 7)}` : '');

// ── SVG 성장 그래프 (실제키 라인 + 예상키 라인) ──
function growthSvg(r) {
  const W = 560, H = 180, P = { l: 38, r: 56, t: 14, b: 22 };
  const pts = r.mm.filter((m) => m.age != null && m.h > 0);
  const pahPts = r.mm.filter((m) => m.age != null && m.pah);
  if (pts.length < 2) return '';
  const xs = pts.map((p) => p.age);
  const ys = [...pts.map((p) => p.h), ...pahPts.map((p) => p.pah)];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.floor((Math.min(...ys) - 4) / 10) * 10, y1 = Math.ceil((Math.max(...ys) + 4) / 10) * 10;
  const X = (a) => P.l + ((a - x0) / Math.max(0.1, x1 - x0)) * (W - P.l - P.r);
  const Y = (h) => H - P.b - ((h - y0) / Math.max(1, y1 - y0)) * (H - P.t - P.b);
  let grid = '';
  for (let v = y0; v <= y1; v += 10) {
    grid += `<line x1="${P.l}" y1="${Y(v)}" x2="${W - P.r}" y2="${Y(v)}" stroke="#eee" stroke-width="1"/>`
      + `<text x="${P.l - 5}" y="${Y(v) + 3.5}" font-size="9" fill="#bbb" text-anchor="end">${v}</text>`;
  }
  const lineH = pts.map((p) => `${X(p.age).toFixed(1)},${Y(p.h).toFixed(1)}`).join(' ');
  const lineP = pahPts.map((p) => `${X(p.age).toFixed(1)},${Y(p.pah).toFixed(1)}`).join(' ');
  const cH = r.gender === '여' ? '#d6336c' : '#2563EB';
  const lastPt = pts[pts.length - 1], lastPah = pahPts[pahPts.length - 1], firstPah = pahPts[0];
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px">
  ${grid}
  ${lineP ? `<polyline points="${lineP}" fill="none" stroke="#10a572" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
  <polyline points="${lineH}" fill="none" stroke="${cH}" stroke-width="2.5"/>
  ${pts.map((p) => `<circle cx="${X(p.age).toFixed(1)}" cy="${Y(p.h).toFixed(1)}" r="2.2" fill="${cH}"/>`).join('')}
  ${pahPts.map((p) => `<circle cx="${X(p.age).toFixed(1)}" cy="${Y(p.pah).toFixed(1)}" r="2.4" fill="#10a572"/>`).join('')}
  ${lastPt ? `<text x="${Math.min(X(lastPt.age) + 4, W - 4)}" y="${Y(lastPt.h) + 3}" font-size="10" font-weight="700" fill="${cH}">${lastPt.h}</text>` : ''}
  ${lastPah ? `<text x="${Math.min(X(lastPah.age) + 4, W - 4)}" y="${Y(lastPah.pah) + 3}" font-size="10" font-weight="700" fill="#0b8a5e">${lastPah.pah}</text>` : ''}
  ${firstPah ? `<text x="${X(firstPah.age) - 4}" y="${Y(firstPah.pah) - 5}" font-size="9.5" fill="#0b8a5e" text-anchor="end">${firstPah.pah}</text>` : ''}
  <text x="${P.l}" y="${H - 6}" font-size="9" fill="#bbb">${x0.toFixed(1)}세</text>
  <text x="${W - P.r}" y="${H - 6}" font-size="9" fill="#bbb" text-anchor="end">${x1.toFixed(1)}세</text>
  <text x="${W - P.r}" y="${P.t}" font-size="9.5" fill="#0b8a5e" text-anchor="end">· · · 예상키(PAH)</text>
  <text x="${W - P.r}" y="${P.t + 12}" font-size="9.5" fill="${cH}" text-anchor="end">— 실제 키</text>
</svg>`;
}

// ── 카드 렌더 ──
function card(r, i) {
  const key = String(r.chart ?? r.name);
  const isF = r.gender === '여';
  // 환자 진료 차트 모듈(case-charts.js)에 넘길 데이터 — child 최소 필드 + 측정 이력.
  const chartData = {
    gender: isF ? 'female' : 'male',
    birth_date: r.birthDate,
    nationality: 'KR',
    measurements: r.mm.filter((m) => m.h > 0).map((m) => ({ measured_date: m.date, height: m.h, bone_age: m.ba ?? null })),
  };
  const cc = isF ? '#d6336c' : '#2563EB';
  const ccBg = isF ? '#fdeef4' : '#eef3ff';
  const tagHtml = r.tags.map((t) => {
    const cls = t.startsWith('성조숙') ? 't-prec' : t.startsWith('늦은') ? 't-late' : t.startsWith('비만') ? 't-obes'
      : t.startsWith('알러지') ? 't-alle' : t.startsWith('유전') ? 't-gene' : t.startsWith('성장지연') ? 't-slow' : 't-warn';
    return `<span class="tag ${cls}">${esc(t)}</span>`;
  }).join('');
  const baTable = r.baRows.map((b) => `<tr>
      <td>${fmtD(b.measured_date)}</td><td class="num">${b.age ?? '-'}</td>
      <td class="num ba">${b.bone_age.toFixed(1)}</td>
      <td class="num ${b.gap >= 1 ? 'bad' : b.gap <= -1 ? 'good2' : ''}">${b.gap >= 0 ? '+' : ''}${b.gap ?? '-'}</td>
      <td class="num">${b.height || '-'}</td><td class="num pah">${(b.pah > 0 && b.pah < 230) ? b.pah : '-'}</td>
    </tr>`).join('');
  const allTable = r.mm.map((m, j) => `<tr>
      <td>${j + 1}</td><td>${fmtD(m.date)}</td><td class="num">${m.age ?? '-'}</td>
      <td class="num">${m.h || '-'}</td><td class="num">${m.w || '-'}</td>
      <td class="num ba">${m.ba ? m.ba.toFixed(1) : '-'}</td><td class="num pah">${m.pah ?? '-'}</td>
    </tr>`).join('');
  const intakeBits = [];
  if (r.intake.flags.length) intakeBits.push(`걱정: ${r.intake.flags.join(', ')}`);
  if (r.intake.tanner) intakeBits.push(`Tanner ${r.intake.tanner}단계`);
  if (r.intake.causes.length) intakeBits.push(`원인 인식: ${r.intake.causes.join('·')}`);
  if (r.intake.chronic) intakeBits.push(`만성: ${esc(r.intake.chronic)}`);
  if (r.intake.athlete) intakeBits.push(`운동선수 준비${r.intake.sportsEvent ? `(${esc(r.intake.sportsEvent)})` : ''}`);

  return `<article class="card" data-key="${esc(key)}" data-g="${r.gender}" data-tags="${esc(r.tags.map((t) => t.split('(')[0]).join('|'))}" data-name="${esc(r.name)}" data-chart="${esc(r.chart ?? '')}">
  <header style="--cc:${cc};--ccbg:${ccBg}">
    <label class="pick"><input type="checkbox"> 채택</label>
    <div class="rank">#${i + 1}</div>
    <div class="who">
      <span class="nm">${isF ? '👧' : '👦'} ${esc(r.name)}</span>
      <span class="meta">차트 ${esc(r.chart ?? '-')} · ${r.birth}년생 · 초진 ${r.ageAtFirst}세 · ${r.status === 'completed' ? '치료 완료' : '치료 중'} · 점수 ${r.score}</span>
    </div>
  </header>
  <p class="headline">"${esc(r.headline)}"</p>
  ${r.chief ? `<p class="chief">📌 내원 사유: ${esc(r.chief)}</p>` : ''}
  <div class="kpis">
    <div class="kpi"><span>치료기간</span><b>${fmtDur(r.months)}</b></div>
    <div class="kpi"><span>실제 키</span><b>${r.hFirst}→${r.hLast}<i>+${r.hDelta}cm</i></b></div>
    <div class="kpi hl"><span>예상키</span><b>${r.pahFirst}→${r.pahLast}<i>+${r.pahDelta}cm</i></b></div>
    <div class="kpi"><span>부모 키(MPH)</span><b>${r.fa ?? '-'}/${r.mo ?? '-'}<i>${r.mph ? 'MPH ' + r.mph : ''}</i></b></div>
    <div class="kpi"><span>측정</span><b>${r.nMs}회<i>BA ${r.nBA}회</i></b></div>
  </div>
  <div class="tags">${tagHtml}${r.xray ? `<span class="asset">X-ray ${r.xray}장</span>` : ''}${r.desired ? `<span class="asset">희망 ${esc(r.desired)}</span>` : ''}</div>
  <div class="chart">
    <div class="ctabs">
      <button class="ctab on" data-t="g">성장 곡선</button>
      <button class="ctab" data-t="t">예측키 추세</button>
    </div>
    <div class="cpane cpane-g"><div class="cwrap"><canvas></canvas></div></div>
    <div class="cpane cpane-t" hidden><div class="cwrap"><canvas></canvas></div><div class="tgrid"></div></div>
    <script type="application/json" class="cdata">${JSON.stringify(chartData).replace(/</g, '\\u003c')}</script>
  </div>
  <div class="cols">
    <div class="col">
      <h4>🦴 뼈나이 회차 (${r.nBA}회)</h4>
      <table class="t"><thead><tr><th>날짜</th><th>나이</th><th>뼈나이</th><th>격차</th><th>키</th><th>예상키</th></tr></thead><tbody>${baTable}</tbody></table>
      <details><summary>전체 측정 ${r.nMs}회 보기</summary>
        <table class="t"><thead><tr><th>#</th><th>날짜</th><th>나이</th><th>키</th><th>체중</th><th>뼈나이</th><th>예상키</th></tr></thead><tbody>${allTable}</tbody></table>
      </details>
    </div>
    <div class="col">
      <h4>✍️ 스토리 포인트 (자동 초안)</h4>
      <ul class="pts">${r.points.map((p) => `<li>${esc(p)}</li>`).join('') || '<li>-</li>'}</ul>
      ${r.danger.length || r.caution.length ? `<h4>🍽️ 음식 알러지</h4>
        ${r.danger.length ? `<p class="alg"><b class="bad">강반응</b> ${r.danger.map((d) => `<span class="chipA d">${esc(d)}</span>`).join('')}</p>` : ''}
        ${r.caution.length ? `<p class="alg"><b class="warn2">경계</b> ${r.caution.slice(0, 8).map((d) => `<span class="chipA c">${esc(d)}</span>`).join('')}${r.caution.length > 8 ? ` 외 ${r.caution.length - 8}` : ''}</p>` : ''}` : ''}
      ${intakeBits.length ? `<h4>📋 문진 발췌</h4><ul class="pts">${intakeBits.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
      ${r.notes.length ? `<h4>📝 진료 메모 발췌</h4><ul class="pts dim">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>
  ${STORIES[String(r.chart)] ? `<details class="story">
    <summary>🩺 원장 스토리 — 「${esc(STORIES[String(r.chart)].title)}」 <span class="story-hint">펼쳐 읽기</span></summary>
    <div class="story-body">${STORIES[String(r.chart)].story.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join('')}</div>
  </details>` : ''}
</article>`;
}

const cardsHtml = list.map(card).join('\n');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>치료사례 후보 ${list.length}명 — 상세 프로필 (원장 검토용)</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif;
         background:#f3f1f7; color:#333; font-size:14px; line-height:1.6; word-break:keep-all; }
  .wrap { max-width:1060px; margin:0 auto; padding:26px 16px 90px; }
  h1 { font-size:21px; font-weight:900; color:#3a2a68; letter-spacing:-0.5px; }
  .sub { font-size:12.5px; color:#888; margin-top:5px; }
  .controls { position:sticky; top:0; z-index:20; background:#f3f1f7; padding:12px 0 10px;
              display:flex; flex-wrap:wrap; gap:7px; align-items:center; border-bottom:1px solid #e5e1ee; }
  .chip { border:1.5px solid #d9d4e8; background:#fff; border-radius:999px; padding:6px 14px;
          font-size:12.5px; font-weight:700; color:#666; cursor:pointer; }
  .chip.on { background:#4A2D6B; border-color:#4A2D6B; color:#fff; }
  select, input[type=search] { border:1.5px solid #d9d4e8; border-radius:999px; padding:6px 12px;
          font-size:12.5px; background:#fff; color:#555; font-weight:700; outline:none; }
  input[type=search] { width:150px; font-weight:500; }
  .selbar { margin-left:auto; display:flex; gap:8px; align-items:center; }
  .selcount { font-size:12.5px; font-weight:800; color:#4A2D6B; }
  .copybtn { border:none; background:#10a572; color:#fff; border-radius:999px; padding:7px 15px;
             font-size:12.5px; font-weight:800; cursor:pointer; }
  .card { background:#fff; border-radius:18px; box-shadow:0 2px 12px rgba(58,42,104,.07);
          padding:18px 20px 20px; margin-top:18px; }
  .card.checked { outline:3px solid #10a572; }
  .card header { display:flex; align-items:center; gap:12px; }
  .pick { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; color:#10a572;
          background:#effaf4; border:1.5px solid #bce5d2; border-radius:999px; padding:5px 13px; cursor:pointer; }
  .pick input { accent-color:#10a572; width:15px; height:15px; }
  .rank { font-size:13px; font-weight:900; color:#b9b3c9; }
  .who .nm { font-size:17px; font-weight:900; color:var(--cc); }
  .who .meta { display:block; font-size:11.5px; color:#999; }
  .headline { margin-top:10px; font-size:15.5px; font-weight:800; color:#3a2a68;
              background:linear-gradient(90deg,#f6f3fc,#fff); border-left:4px solid #764ba2;
              border-radius:8px; padding:8px 12px; }
  .chief { margin-top:6px; font-size:12.5px; color:#777; }
  .kpis { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .kpi { flex:1 1 110px; background:#faf9fc; border:1px solid #efecf5; border-radius:12px; padding:7px 11px; }
  .kpi span { font-size:10.5px; color:#999; font-weight:700; display:block; }
  .kpi b { font-size:14.5px; color:#333; font-variant-numeric:tabular-nums; }
  .kpi b i { font-style:normal; font-size:11.5px; color:#10a572; font-weight:800; margin-left:5px; }
  .kpi.hl { background:#e9f9f2; border-color:#c7ecd9; }
  .kpi.hl b { color:#0b8a5e; }
  .tags { margin-top:10px; }
  .tag, .asset { display:inline-block; font-size:11px; font-weight:700; border-radius:7px; padding:2.5px 9px; margin:2px 3px 0 0; }
  .tag.t-prec { background:#fdeef4; color:#d6336c; } .tag.t-late { background:#fff4e0; color:#c47b08; }
  .tag.t-obes { background:#fdf0e8; color:#d9480f; } .tag.t-alle { background:#e8f4fd; color:#1971c2; }
  .tag.t-gene { background:#f1ecfb; color:#6741d9; } .tag.t-slow { background:#e6fcf5; color:#0b8a5e; }
  .tag.t-warn { background:#ffe8e8; color:#c92a2a; }
  .asset { background:#f4f3f8; color:#777; }
  .chart { margin-top:12px; background:#fcfbfe; border:1px solid #f0edf6; border-radius:12px; padding:10px; }
  .ctabs { display:flex; gap:6px; margin-bottom:8px; }
  .ctab { border:1.5px solid #e3def0; background:#fff; color:#777; border-radius:999px; padding:4px 13px; font-size:12px; font-weight:700; cursor:pointer; }
  .ctab.on { background:#4A2D6B; border-color:#4A2D6B; color:#fff; }
  .cwrap { position:relative; height:230px; }
  .tgrid { margin-top:2px; }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:14px; }
  @media (max-width:720px) { .cols { grid-template-columns:1fr; } }
  h4 { font-size:12px; font-weight:800; color:#4A2D6B; margin:10px 0 5px; }
  .t { width:100%; border-collapse:collapse; font-size:12px; }
  .t th { background:#f6f4fa; color:#777; font-size:10.5px; padding:4px 6px; text-align:left; }
  .t td { padding:3.5px 6px; border-top:1px solid #f3f1f7; }
  .num { font-variant-numeric:tabular-nums; }
  .ba { color:#c47b08; font-weight:700; } .pah { color:#0b8a5e; font-weight:800; }
  .bad { color:#d6336c; font-weight:800; } .good2 { color:#0b8a5e; font-weight:800; }
  details { margin-top:8px; } summary { font-size:11.5px; color:#888; cursor:pointer; font-weight:700; }
  .pts { padding-left:18px; font-size:12.5px; color:#444; } .pts li { margin:2.5px 0; }
  .pts.dim { color:#888; font-size:12px; }
  .alg { font-size:12px; margin:3px 0; } .alg b { font-size:11px; margin-right:4px; }
  .warn2 { color:#c47b08; }
  .chipA { display:inline-block; font-size:11px; border-radius:6px; padding:1.5px 7px; margin:1.5px 2px; }
  .chipA.d { background:#ffe8e8; color:#c92a2a; border:1px solid #ffc9c9; }
  .chipA.c { background:#fff4e0; color:#c47b08; border:1px solid #ffe1a8; }
  .story { margin-top:14px; background:#fdfbf6; border:1px solid #efe7d4; border-radius:12px; padding:10px 14px; }
  .story summary { font-size:13px; font-weight:800; color:#8a6d1d; cursor:pointer; }
  .story-hint { font-size:11px; font-weight:600; color:#c2ab6e; margin-left:4px; }
  .story-body { margin-top:8px; }
  .story-body p { font-size:13.5px; color:#4a4438; line-height:1.85; margin:0 0 10px; }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#3a2a68; color:#fff;
           border-radius:999px; padding:10px 22px; font-size:13px; font-weight:700; opacity:0;
           transition:opacity .25s; pointer-events:none; max-width:90vw; }
  .toast.show { opacity:1; }
  .note { margin-top:12px; background:#fff; border:1px solid #e8e6f0; border-radius:12px; padding:11px 15px; font-size:12.5px; color:#666; }
  .note b { color:#4A2D6B; }
</style>
</head>
<body>
<div class="wrap">
  <h1>치료사례 후보 ${list.length}명 — 상세 프로필</h1>
  <p class="sub">생성 2026-06-12 · 점수순 · 카드의 <b style="color:#10a572">채택</b> 체크 → 하단 "선택 차트번호 복사" · 체크는 브라우저에 자동 저장</p>
  <div class="note"><b>읽는 법</b> : <b>환자 이름은 전부 가명</b>입니다 — 식별은 차트번호로 해주세요. 헤드라인·스토리 포인트는 데이터 기반 자동 초안입니다(최종 카피 아님).
  그래프 — <b>환자 진료 화면과 동일한 2탭</b>: [성장 곡선] 백분위 곡선+실측 다이아+예측 투영 / [예측키 추세] 회차별 예측키 라인+또래 백분위. 뼈나이 "격차"=뼈나이−실제나이(<b style="color:#d6336c">+빨강=조숙</b>, <b style="color:#0b8a5e">−초록=여유</b>). 문진·내원사유는 원본 발췌라 표현 그대로입니다.</div>

  <div class="controls">
    <button class="chip on" data-g="all">전체 ${list.length}</button>
    <button class="chip" data-g="여">👧 여아 ${girls}</button>
    <button class="chip" data-g="남">👦 남아 ${list.length - girls}</button>
    <select id="tagFilter">
      <option value="">고민 신호 전체</option>
      <option>성조숙</option><option>늦은 시작</option><option>비만 동반</option>
      <option>알러지검사</option><option>유전키 작음</option><option>성장지연</option>
    </select>
    <input type="search" id="q" placeholder="이름·차트번호 검색">
    <label class="chip" style="display:inline-flex;align-items:center;gap:5px"><input type="checkbox" id="onlySel" style="accent-color:#4A2D6B">선택만</label>
    <div class="selbar">
      <span class="selcount" id="selCount">선택 0명</span>
      <button class="copybtn" id="copySel">선택 차트번호 복사</button>
    </div>
  </div>

  ${cardsHtml}
</div>
<div class="toast" id="toast"></div>
<script src="case-charts.js"></script>
<script>
const store = {
  get() { try { return JSON.parse(localStorage.getItem('caseCandidates2026') || '[]'); } catch { return []; } },
  set(v) { try { localStorage.setItem('caseCandidates2026', JSON.stringify(v)); } catch {} },
};
const saved = new Set(store.get());
let genderF = 'all', tagF = '', q = '', onlySel = false;
const cards = [...document.querySelectorAll('.card')];
function apply() {
  cards.forEach(c => {
    const okG = genderF === 'all' || c.dataset.g === genderF;
    const okT = !tagF || c.dataset.tags.split('|').includes(tagF);
    const okQ = !q || c.dataset.name.includes(q) || c.dataset.chart.includes(q);
    const okS = !onlySel || saved.has(c.dataset.key);
    c.style.display = okG && okT && okQ && okS ? '' : 'none';
  });
  document.getElementById('selCount').textContent = '선택 ' + saved.size + '명';
}
cards.forEach(c => {
  const cb = c.querySelector('.pick input');
  if (saved.has(c.dataset.key)) { cb.checked = true; c.classList.add('checked'); }
  cb.addEventListener('change', () => {
    if (cb.checked) saved.add(c.dataset.key); else saved.delete(c.dataset.key);
    c.classList.toggle('checked', cb.checked);
    store.set([...saved]); apply();
  });
});
document.querySelectorAll('.chip[data-g]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.chip[data-g]').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); genderF = b.dataset.g; apply();
}));
document.getElementById('tagFilter').addEventListener('change', e => { tagF = e.target.value; apply(); });
document.getElementById('q').addEventListener('input', e => { q = e.target.value.trim(); apply(); });
document.getElementById('onlySel').addEventListener('change', e => { onlySel = e.target.checked; apply(); });
document.getElementById('copySel').addEventListener('click', () => {
  const v = [...saved].join(', ');
  const show = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };
  if (!v) return show('선택된 후보가 없습니다');
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(
    () => show('차트번호 ' + saved.size + '건 복사됨: ' + v),
    () => show('복사 실패 — 수동으로: ' + v));
});
apply();

// ── 차트 (환자 진료 모듈 재사용) — 58×2개라 뷰포트 진입 시 지연 렌더 ──
const CC = window.CaseCharts;
function cardData(card) {
  if (card._data !== undefined) return card._data;
  const el = card.querySelector('.cdata');
  try { card._data = el ? JSON.parse(el.textContent) : null; } catch { card._data = null; }
  return card._data;
}
function renderGrowth(card) {
  if (card._g || !CC) return;
  const d = cardData(card), cv = card.querySelector('.cpane-g canvas');
  if (!d || !cv) return;
  try { CC.renderGrowth(cv, d); card._g = true; } catch (e) { console.error('growth', e); }
}
function renderTrend(card) {
  if (card._t || !CC) return;
  const d = cardData(card), cv = card.querySelector('.cpane-t canvas'), grid = card.querySelector('.tgrid');
  if (!d || !cv) return;
  try { CC.renderTrend(cv, grid, d); card._t = true; } catch (e) { console.error('trend', e); }
}
const io = new IntersectionObserver((es) => {
  es.forEach(e => { if (e.isIntersecting) renderGrowth(e.target); });
}, { rootMargin: '300px' });
cards.forEach(c => io.observe(c));
document.querySelectorAll('.ctabs').forEach(tabs => {
  const card = tabs.closest('.card');
  tabs.querySelectorAll('.ctab').forEach(btn => btn.addEventListener('click', () => {
    tabs.querySelectorAll('.ctab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const t = btn.dataset.t;
    card.querySelector('.cpane-g').hidden = t !== 'g';
    card.querySelector('.cpane-t').hidden = t !== 't';
    if (t === 'g') renderGrowth(card); else renderTrend(card);
  }));
});
</script>
</body>
</html>`;

writeFileSync('C:/project/dflo/cases/케이스후보_상세프로필.html', html, 'utf8');
// 마케팅 페이지 전략 폴더 사본 — PHI 포함이라 v4/.gitignore 로 배포 차단(로컬 전용)
writeFileSync('C:/project/dflo/v4/public/marketing/strategy/case-candidates.html', html, 'utf8');
console.log(`done: ${list.length}명 (여 ${girls}) → 케이스후보_상세프로필.html + marketing/strategy/case-candidates.html (${Math.round(html.length / 1024)}KB)`);

// ════════════════════════════════════════════════════════════════════════════
// 비식별 외부 쇼케이스 — 치료사례_외부.html (웹 주소로 접근, PIN 8054)
// 공개 범위: 가명 + 고민태그 + 헤드라인 + KPI(키·예상키·치료기간·유전예상) + 2그래프(나이기준, 좌우 배치).
// 제외: 차트번호·생년월일·정확한 측정일·진료메모·문진·스토리포인트·알러지·원장스토리·채택/복사 컨트롤.
// 그래프는 만나이 기준이라 생일/측정일이 새지 않는다(case-charts.js 의 비식별 모드 ageDecimal/caY/caM).
// ════════════════════════════════════════════════════════════════════════════
function ageYM(birth, date) {
  const b = new Date(birth), d = new Date(date);
  if (isNaN(+b) || isNaN(+d)) return { years: 0, months: 0, decimal: 0 };
  let years = d.getFullYear() - b.getFullYear();
  let months = d.getMonth() - b.getMonth();
  if (d.getDate() < b.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  const decimal = +((d - b) / (365.25 * 86400000)).toFixed(2);
  return { years, months, decimal };
}
function extChartData(r) {
  return {
    gender: r.gender === '여' ? 'female' : 'male',
    measurements: r.mm.filter((m) => m.h > 0).map((m) => {
      const a = r.birthDate ? ageYM(r.birthDate, m.date) : { years: 0, months: 0, decimal: m.age ?? 0 };
      return { ageDecimal: a.decimal, caY: a.years, caM: a.months, height: m.h, bone_age: m.ba ?? null };
    }),
  };
}
function extTagCls(t) {
  return t.startsWith('성조숙') ? 't-prec' : t.startsWith('늦은') ? 't-late' : t.startsWith('비만') ? 't-obes'
    : t.startsWith('알러지') ? 't-alle' : t.startsWith('유전') ? 't-gene' : t.startsWith('성장지연') ? 't-slow' : 't-warn';
}
function cardExt(r, i) {
  const isF = r.gender === '여';
  const cc = isF ? '#d6336c' : '#2563EB';
  const ccBg = isF ? '#fdeef4' : '#eef3ff';
  // ⚠️ 내부 표식 태그 제외 + 괄호 속 수치(MPH 등) 제거 — 식별·내부정보 노출 차단.
  const tagHtml = r.tags.filter((t) => !t.startsWith('⚠️')).map((t) => {
    const base = t.split('(')[0].trim();
    return `<span class="tag ${extTagCls(t)}">${esc(base)}</span>`;
  }).join('');
  const chartData = extChartData(r);
  return `<article class="card" data-g="${r.gender}">
  <header style="--cc:${cc};--ccbg:${ccBg}">
    <span class="nm">${isF ? '👧' : '👦'} ${esc(r.name)}</span>
    <span class="meta">초진 만 ${r.ageAtFirst}세 · ${r.status === 'completed' ? '치료 완료' : '치료 중'}</span>
  </header>
  <p class="headline">"${esc(r.headline)}"</p>
  <div class="kpis">
    <div class="kpi"><span>치료 기간</span><b>${fmtDur(r.months)}</b></div>
    <div class="kpi"><span>실제 키</span><b>${r.hFirst}→${r.hLast}<i>+${r.hDelta}cm</i></b></div>
    <div class="kpi hl"><span>예상키</span><b>${r.pahFirst}→${r.pahLast}<i>+${r.pahDelta}cm</i></b></div>
    <div class="kpi"><span>유전 예상</span><b>${r.mph ? r.mph + 'cm' : '-'}</b></div>
  </div>
  <div class="tags">${tagHtml}</div>
  <div class="charts2">
    <div class="c2"><div class="clbl">📈 성장 곡선 (실제 키)</div><div class="cwrap cpane-g"><canvas></canvas></div></div>
    <div class="c2"><div class="clbl">🎯 예측키 추세</div><div class="cwrap cpane-t"><canvas></canvas></div><div class="tgrid"></div></div>
  </div>
  <script type="application/json" class="cdata">${JSON.stringify(chartData).replace(/</g, '\\u003c')}</script>
</article>`;
}

const extCards = list.map(cardExt).join('\n');
const extHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>187 성장클리닉 — 치료사례</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Noto Sans KR','Malgun Gothic',sans-serif; background:#f4f2f8; color:#1f2433; -webkit-text-size-adjust:100%; }
  .wrap { max-width:940px; margin:0 auto; padding:20px 16px 60px; }
  .top { text-align:center; padding:14px 0 6px; }
  .top h1 { margin:0; font-size:26px; color:#4A2D6B; letter-spacing:-0.5px; }
  .top p { margin:6px 0 0; color:#6b7280; font-size:13px; }
  .filters { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin:16px 0 20px; }
  .chip { border:1.5px solid #e3def0; background:#fff; color:#6b6677; border-radius:999px; padding:6px 16px; font-size:13px; font-weight:700; cursor:pointer; }
  .chip.on { background:#4A2D6B; border-color:#4A2D6B; color:#fff; }
  .card { background:#fff; border:1px solid #ece8f4; border-radius:16px; padding:18px 18px 20px; margin-bottom:18px; box-shadow:0 1px 3px rgba(40,30,70,.05); }
  .card header { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; border-left:4px solid var(--cc); background:var(--ccbg); padding:8px 12px; border-radius:9px; }
  .nm { font-size:18px; font-weight:800; color:#22252e; }
  .meta { font-size:12px; color:#6b7280; }
  .headline { font-size:16px; font-weight:700; color:#33294d; margin:14px 2px 12px; line-height:1.5; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:10px 0; }
  @media(max-width:560px){ .kpis{ grid-template-columns:repeat(2,1fr); } }
  .kpi { background:#f8f7fb; border:1px solid #efedf5; border-radius:10px; padding:8px 10px; }
  .kpi span { display:block; font-size:11px; color:#8b8a96; margin-bottom:3px; }
  .kpi b { font-size:15px; color:#262a36; font-weight:800; }
  .kpi b i { font-style:normal; font-size:12px; color:#10a572; font-weight:700; margin-left:4px; }
  .kpi.hl { background:#f0ecfa; border-color:#ded3f4; }
  .kpi.hl b { color:#5b3a9e; }
  .tags { display:flex; gap:5px; flex-wrap:wrap; margin:6px 0 4px; }
  .tag { font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; }
  .t-prec{background:#fff1f0;color:#d4380d}.t-late{background:#fff7e6;color:#d46b08}.t-obes{background:#fff0f6;color:#c41d7f}
  .t-alle{background:#fcffe6;color:#7cb305}.t-gene{background:#e6fffb;color:#08979c}.t-slow{background:#e6f4ff;color:#0958d9}.t-warn{background:#f0f0f0;color:#595959}
  .charts2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:14px; }
  @media(max-width:680px){ .charts2{ grid-template-columns:1fr; } }
  .clbl { font-size:13px; font-weight:700; color:#475569; margin-bottom:6px; }
  .cwrap { position:relative; height:280px; background:#fff; border:1px solid #eef0f4; border-radius:10px; padding:6px; }
  .tgrid { margin-top:4px; }
  /* PIN 게이트 */
  #gate { position:fixed; inset:0; background:linear-gradient(160deg,#4A2D6B,#764ba2); display:flex; align-items:center; justify-content:center; z-index:9999; }
  #gate .box { background:#fff; border-radius:18px; padding:34px 30px; width:300px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.3); }
  #gate h2 { margin:0 0 4px; font-size:20px; color:#4A2D6B; }
  #gate p { margin:0 0 18px; font-size:13px; color:#8b8a96; }
  #gate input { width:100%; padding:12px; font-size:18px; text-align:center; letter-spacing:6px; border:2px solid #e3def0; border-radius:10px; outline:none; }
  #gate input:focus { border-color:#764ba2; }
  #gate button { width:100%; margin-top:12px; padding:12px; font-size:15px; font-weight:700; color:#fff; background:#4A2D6B; border:0; border-radius:10px; cursor:pointer; }
  #gate .err { color:#e03131; font-size:12px; height:16px; margin-top:8px; }
  #content[hidden] { display:none; }
</style>
</head>
<body>
<div id="gate">
  <div class="box">
    <h2>🔒 치료사례</h2>
    <p>열람용 비밀번호를 입력하세요</p>
    <input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••">
    <button id="enter">입장</button>
    <div class="err" id="err"></div>
  </div>
</div>
<div id="content" hidden>
  <div class="wrap">
    <div class="top">
      <h1>187 성장클리닉 치료사례</h1>
      <p>실제 진료 데이터 기반 · 환자 이름은 모두 가명입니다 · 그래프는 만나이 기준</p>
    </div>
    <div class="filters">
      <button class="chip on" data-g="all">전체 ${list.length}</button>
      <button class="chip" data-g="남">👦 남아 ${list.length - girls}</button>
      <button class="chip" data-g="여">👧 여아 ${girls}</button>
    </div>
    <div id="cards">${extCards}</div>
  </div>
</div>
<script src="/marketing/strategy/case-charts.js"></script>
<script>
(function(){
  var PIN='8054', gate=document.getElementById('gate'), content=document.getElementById('content');
  function reveal(){ gate.style.display='none'; content.hidden=false; initCharts(); initFilters(); }
  function tryPin(v){ if(v===PIN){ try{sessionStorage.setItem('casePin',PIN);}catch(e){} reveal(); } else { document.getElementById('err').textContent='비밀번호가 올바르지 않습니다'; } }
  try{ if(sessionStorage.getItem('casePin')===PIN){ reveal(); return; } }catch(e){}
  var inp=document.getElementById('pin');
  document.getElementById('enter').addEventListener('click',function(){ tryPin(inp.value.trim()); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter') tryPin(inp.value.trim()); });
  inp.focus();

  var _started=false;
  function initFilters(){
    var cards=[].slice.call(document.querySelectorAll('#cards .card'));
    document.querySelectorAll('.chip[data-g]').forEach(function(b){
      b.addEventListener('click',function(){
        document.querySelectorAll('.chip[data-g]').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on'); var g=b.dataset.g;
        cards.forEach(function(c){ c.style.display=(g==='all'||c.dataset.g===g)?'':'none'; });
      });
    });
  }
  function initCharts(){
    if(_started) return; _started=true;
    var CC=window.CaseCharts;
    function dataOf(card){ if(card._d!==undefined) return card._d; var el=card.querySelector('.cdata'); try{card._d=el?JSON.parse(el.textContent):null;}catch(e){card._d=null;} return card._d; }
    function draw(card){
      if(card._done||!CC) return;
      var d=dataOf(card); if(!d) return;
      var g=card.querySelector('.cpane-g canvas'), t=card.querySelector('.cpane-t canvas'), grid=card.querySelector('.tgrid');
      try{ if(g) CC.renderGrowth(g,d); }catch(e){ console.error('growth',e); }
      try{ if(t&&grid) CC.renderTrend(t,grid,d); }catch(e){ console.error('trend',e); }
      card._done=true;
    }
    var cards=[].slice.call(document.querySelectorAll('#cards .card'));
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ draw(e.target); io.unobserve(e.target); } }); },{rootMargin:'400px'});
      cards.forEach(function(c){ io.observe(c); });
    } else { cards.forEach(draw); }
  }
})();
</script>
</body>
</html>`;

writeFileSync('C:/project/dflo/v4/public/치료사례_외부.html', extHtml, 'utf8');
console.log(`done: 치료사례_외부.html (비식별, ${Math.round(extHtml.length / 1024)}KB) → /치료사례_외부.html [PIN 8054]`);
