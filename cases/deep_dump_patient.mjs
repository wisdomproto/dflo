// 환자 한 명의 임상 컨텍스트를 깊이 dump — 스토리 작성자가 그 환자만의
// 패턴(염증·갑상선·알러지·사춘기·수면·체형 변화 등)을 발견할 수 있게 한다.
// 기본 dump 가 가족용 추상화 신호라면, 이건 작성자용 raw 임상 데이터.
//
// Usage: node cases/deep_dump_patient.mjs --chart=NNNNN

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function loadEnv(p) {
  const o = {};
  try { for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
  return o;
}
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const URL = ai.SUPABASE_URL || v4.VITE_SUPABASE_URL;
const KEY = ai.SUPABASE_SERVICE_ROLE_KEY || v4.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY;
const s = createClient(URL, KEY, { auth: { persistSession: false } });

const chart = process.argv.slice(2).find((a) => a.startsWith('--chart='))?.split('=')[1];
if (!chart) { console.error('Usage: --chart=NNNNN'); process.exit(2); }

async function pg(table, cols, childId) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await s.from(table).select(cols).eq('child_id', childId).range(f, f + 999);
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function calcAge(b) {
  if (!b) return null;
  const d = new Date(b), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a -= 1;
  return a;
}

const { data: childRows, error: cErr } = await s
  .from('children')
  .select('*')
  .eq('chart_number', chart);
if (cErr) throw cErr;
if (!childRows?.length) { console.error('× 환자 없음'); process.exit(2); }
const child = childRows[0];

const [visits, meas, rx, labs, xrays] = await Promise.all([
  pg('visits', 'id, visit_date, chief_complaint, notes, plan, is_intake', child.id),
  pg('hospital_measurements', 'visit_id, measured_date, height, weight, bone_age, pah, doctor_notes', child.id),
  pg('prescriptions', 'medication_id, dose, duration_days, visit_id, created_at, notes', child.id),
  pg('lab_tests', 'collected_date, test_type, result_data, visit_id', child.id),
  pg('xray_readings', 'visit_id, xray_date, bone_age_result, doctor_memo, atlas_match_younger, atlas_match_older', child.id),
]);

const nonIntakeVisits = visits.filter((v) => !v.is_intake).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
const visitById = new Map(nonIntakeVisits.map((v) => [v.id, v]));
const measOnVisit = meas
  .filter((m) => visitById.has(m.visit_id))
  .sort((a, b) => a.measured_date.localeCompare(b.measured_date));

// ── Measurements progression: 키 / 체중 / BMI / BA / PAH 시간 순서
const progression = measOnVisit.map((m) => {
  const h = m.height && m.height > 0 ? m.height / 100 : null;
  const bmi = m.weight != null && h ? Math.round((m.weight / (h * h)) * 10) / 10 : null;
  return {
    date: m.measured_date,
    height: m.height,
    weight: m.weight,
    bmi,
    bone_age: m.bone_age,
    pah: m.pah,
  };
});

// ── Prescriptions: medication 별 집계
const medIds = [...new Set(rx.map((r) => r.medication_id).filter(Boolean))];
const meds = [];
for (let i = 0; i < medIds.length; i += 100) {
  const { data } = await s.from('medications').select('id, code, name').in('id', medIds.slice(i, i + 100));
  if (data) meds.push(...data);
}
const medMap = new Map(meds.map((m) => [m.id, m]));
const rxAgg = new Map();
for (const r of rx) {
  const m = medMap.get(r.medication_id);
  if (!m) continue;
  const k = m.code;
  const cur = rxAgg.get(k) ?? { code: m.code, name: m.name, count: 0, first_date: null, last_date: null };
  cur.count += 1;
  const d = visitById.get(r.visit_id)?.visit_date ?? null;
  if (d) {
    if (!cur.first_date || d < cur.first_date) cur.first_date = d;
    if (!cur.last_date || d > cur.last_date) cur.last_date = d;
  }
  rxAgg.set(k, cur);
}
const rxByCount = [...rxAgg.values()].sort((a, b) => b.count - a.count);

// ── Labs: panel 별로 정리 + flagged 항목 노출
const labsDetailed = labs
  .filter((l) => l.result_data)
  .map((l) => {
    const rd = l.result_data;
    const panel = rd?.panel_type || l.test_type;
    const rows = Array.isArray(rd?.items) ? rd.items : Array.isArray(rd?.rows) ? rd.rows : [];
    // flagged: H/L/이상 표기된 항목
    const flagged = rows
      .filter((r) => {
        const f = r?.flag;
        if (!f) return false;
        const s = String(f).trim();
        return s && !['N', 'normal', ''].includes(s);
      })
      .map((r) => ({
        name: r.name || r.item || r.code,
        value: r.value ?? r.result,
        unit: r.unit,
        flag: r.flag,
        ref: r.reference ?? r.ref ?? r.normal_range,
      }))
      .filter((r) => r.name);
    // 알러지/IgG4 식 panel 은 class 가 0 이상이면 의미 있는 결과
    const allergyHits = rows
      .filter((r) => {
        const cls = r?.class ?? r?.grade;
        if (cls == null) return false;
        const n = Number(cls);
        return Number.isFinite(n) && n >= 1;
      })
      .map((r) => ({ name: r.name || r.item, class: r.class ?? r.grade }))
      .filter((r) => r.name);
    return {
      date: l.collected_date,
      panel,
      flagged_count: flagged.length,
      flagged,
      allergy_hits: allergyHits.length ? allergyHits : undefined,
    };
  })
  .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

// ── Visit memos: placeholder 필터
const memos = nonIntakeVisits
  .filter((v) => {
    const txt = [v.chief_complaint, v.notes, v.plan].filter(Boolean).join(' ').trim();
    if (!txt) return false;
    if (/Imported from eone|Auto-created/i.test(txt)) return false;
    return true;
  })
  .map((v) => ({
    date: v.visit_date,
    chief_complaint: v.chief_complaint || null,
    notes: v.notes || null,
    plan: v.plan || null,
  }));

// ── X-ray memos
const xrayMemos = xrays
  .filter((x) => x.doctor_memo && x.doctor_memo.trim())
  .map((x) => ({ date: x.xray_date, memo: x.doctor_memo, ba: x.bone_age_result }));

const out = {
  child: {
    id: child.id,
    name: child.name,
    chart: child.chart_number,
    gender: child.gender === 'male' ? '남' : '여',
    birth_date: child.birth_date,
    age_now: calcAge(child.birth_date),
    father_height: child.father_height,
    mother_height: child.mother_height,
    desired_height: child.desired_height,
    nationality: child.nationality,
    grade: child.grade,
    class_height_rank: child.class_height_rank,
    treatment_status: child.treatment_status,
  },
  intake_survey: child.intake_survey
    ? (() => {
        // raw_files 같은 noise 제거 후 노출
        const { raw_files, ...rest } = child.intake_survey;
        return rest;
      })()
    : null,
  timeline: {
    first_visit: nonIntakeVisits[0]?.visit_date ?? null,
    last_visit: nonIntakeVisits[nonIntakeVisits.length - 1]?.visit_date ?? null,
    visit_count: nonIntakeVisits.length,
  },
  progression,
  pah_summary: (() => {
    const withPah = progression.filter((p) => p.pah != null);
    if (!withPah.length) return null;
    return {
      first: withPah[0],
      last: withPah[withPah.length - 1],
      change: Math.round((withPah[withPah.length - 1].pah - withPah[0].pah) * 10) / 10,
    };
  })(),
  bmi_summary: (() => {
    const withBmi = progression.filter((p) => p.bmi != null);
    if (!withBmi.length) return null;
    const f = withBmi[0], l = withBmi[withBmi.length - 1];
    const zones = withBmi.map((p) => p.bmi).reduce((acc, b) => {
      acc.min = Math.min(acc.min, b);
      acc.max = Math.max(acc.max, b);
      return acc;
    }, { min: Infinity, max: -Infinity });
    return { first: f, last: l, min: zones.min, max: zones.max };
  })(),
  prescriptions: {
    total_records: rx.length,
    unique_medications: rxByCount.length,
    by_count: rxByCount,
  },
  labs: {
    total: labs.length,
    detail: labsDetailed,
  },
  visit_memos: memos,
  xray_memos: xrayMemos,
};

console.log(JSON.stringify(out, null, 2));
