// Patient story context dumper — Gemini 의존성 없이 한 환자의 임상 컨텍스트를
// stdout 으로 출력. Claude 가 그걸 읽고 직접 스토리를 쓴 다음
// upsert_patient_story.mjs 로 저장하는 흐름.
//
// Usage: node cases/dump_patient_story_context.mjs --chart=26198

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const aiEnv = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const v4Env = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const URL = aiEnv.SUPABASE_URL || v4Env.VITE_SUPABASE_URL;
const KEY =
  aiEnv.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.SUPABASE_SERVICE_ROLE_KEY ||
  v4Env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('× SUPABASE_URL / KEY 누락');
  process.exit(2);
}

const chart = process.argv.slice(2).find((a) => a.startsWith('--chart='))?.split('=')[1];
if (!chart) {
  console.error('Usage: node cases/dump_patient_story_context.mjs --chart=NNNNN');
  process.exit(2);
}

const s = createClient(URL, KEY, { auth: { persistSession: false } });

async function fetchPaged(table, cols, childId) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from(table).select(cols).eq('child_id', childId).range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age;
}

const { data: childRows, error } = await s
  .from('children')
  .select('id, chart_number, name, gender, birth_date, father_height, mother_height, desired_height, intake_survey')
  .eq('chart_number', chart);
if (error) throw error;
if (!childRows || childRows.length === 0) {
  console.error(`× chart_number=${chart} 환자 없음`);
  process.exit(2);
}
const child = childRows[0];

const [visits, meas, rx, labs] = await Promise.all([
  fetchPaged('visits', 'id, visit_date, notes, is_intake, chief_complaint', child.id),
  fetchPaged('hospital_measurements', 'visit_id, measured_date, height, weight, bone_age, pah', child.id),
  fetchPaged('prescriptions', 'medication_id, dose, duration_days, visit_id, created_at', child.id),
  fetchPaged('lab_tests', 'collected_date, test_type, result_data', child.id),
]);

const nonIntakeVisits = visits.filter((v) => !v.is_intake).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
const visitById = new Map(nonIntakeVisits.map((v) => [v.id, v]));
const measurements = meas
  .filter((m) => visitById.has(m.visit_id))
  .sort((a, b) => a.measured_date.localeCompare(b.measured_date));

// 처방 카테고리만 (시술 제외, 횟수도 일부 노출 — Claude 가 판단)
const medIds = [...new Set(rx.map((r) => r.medication_id).filter(Boolean))];
const meds = [];
for (let i = 0; i < medIds.length; i += 100) {
  const { data } = await s.from('medications').select('id, code, name').in('id', medIds.slice(i, i + 100));
  if (data) meds.push(...data);
}
const medMap = new Map(meds.map((m) => [m.id, m]));
const cats = { MED: 0, INJ: 0 };
for (const r of rx) {
  const med = medMap.get(r.medication_id);
  if (!med) continue;
  const prefix = (med.code || '').slice(0, 3);
  if (cats[prefix] != null) cats[prefix] += 1;
}

const visitNotes = nonIntakeVisits
  .filter((v) => v.notes && v.notes.trim() && !/Imported from eone|Auto-created/i.test(v.notes))
  .slice(0, 12)
  .map((v) => ({ date: v.visit_date, notes: v.notes.trim().slice(0, 200) }));

// PAH 골격: DB(hospital_measurements.pah) 에 저장된 값만 사용. 의사가 차트에
// 적어둔 진료 기록상의 예상키가 곧 환자 가족이 진료실에서 들은 그 숫자.
// LMS 재계산은 일관성·정확도 면에서 부적합이라 사용하지 않는다.
const measWithPah = measurements.filter((m) => m.pah != null && m.height != null);
const firstPahMeas = measWithPah[0] ?? null;
const lastPahMeas = measWithPah[measWithPah.length - 1] ?? null;
const firstPAH = firstPahMeas?.pah ?? null;
const lastPAH = lastPahMeas?.pah ?? null;

// BMI progression — 비만 → 정상 회복 같은 체형 서브플롯 탐지용. 소아 percentile
// 분류는 KDCA LMS 가 따로 필요해서 일단 절대값 + 단순 zone 만 노출. 작성자가
// 변화의 크기·방향을 보고 판단.
function bmiZone(bmi) {
  if (bmi == null) return null;
  // 매우 단순한 zone — 소아엔 부정확할 수 있으나 "변화의 방향" 판단용.
  if (bmi < 18.5) return 'low';
  if (bmi < 23) return 'normal';
  if (bmi < 25) return 'overweight';
  return 'obese';
}
const bmiProgression = measurements
  .filter((m) => m.height != null && m.weight != null && m.height > 0)
  .map((m) => {
    const h = m.height / 100;
    const bmi = Math.round((m.weight / (h * h)) * 10) / 10;
    return {
      date: m.measured_date,
      height: m.height,
      weight: m.weight,
      bmi,
      zone: bmiZone(bmi),
    };
  });
const firstBmi = bmiProgression[0] ?? null;
const lastBmi = bmiProgression[bmiProgression.length - 1] ?? null;
const bmiTransition =
  firstBmi && lastBmi && firstBmi.zone !== lastBmi.zone
    ? `${firstBmi.zone} → ${lastBmi.zone} (${firstBmi.bmi} → ${lastBmi.bmi})`
    : null;

const ctx = {
  child_id: child.id,
  name: child.name,
  chart: child.chart_number,
  gender: child.gender === 'male' ? '남' : '여',
  birth_date: child.birth_date,
  age_now: calcAge(child.birth_date),
  father_height: child.father_height,
  mother_height: child.mother_height,
  desired_height: child.desired_height,
  intake_survey: child.intake_survey,
  first_visit: nonIntakeVisits[0]?.visit_date ?? null,
  last_visit: nonIntakeVisits[nonIntakeVisits.length - 1]?.visit_date ?? null,
  visit_count: nonIntakeVisits.length,
  first_measurement: measurements[0]
    ? {
        date: measurements[0].measured_date,
        height: measurements[0].height,
        bone_age: measurements[0].bone_age,
      }
    : null,
  last_measurement: measurements[measurements.length - 1]
    ? {
        date: measurements[measurements.length - 1].measured_date,
        height: measurements[measurements.length - 1].height,
        bone_age: measurements[measurements.length - 1].bone_age,
      }
    : null,
  // 스토리에 반드시 들어가야 하는 골격: 처음 들은 예상키 / 최종 들은 예상키.
  // DB hospital_measurements.pah 에 저장된 값 그대로. null 이면 본문에서 빼기.
  first_pah: firstPahMeas
    ? {
        date: firstPahMeas.measured_date,
        height_at_time: firstPahMeas.height,
        bone_age_at_time: firstPahMeas.bone_age,
        predicted_adult_height: firstPahMeas.pah,
      }
    : null,
  last_pah: lastPahMeas
    ? {
        date: lastPahMeas.measured_date,
        height_at_time: lastPahMeas.height,
        bone_age_at_time: lastPahMeas.bone_age,
        predicted_adult_height: lastPahMeas.pah,
      }
    : null,
  pah_change: firstPAH != null && lastPAH != null
    ? Math.round((lastPAH - firstPAH) * 10) / 10
    : null,
  // 비만 → 정상 같은 체형 변화 서브플롯용. zone 이 같으면 transition=null.
  // 작성자는 transition 이 의미있는 변화일 때만 본문에 한두 문장 곁들임.
  bmi_first: firstBmi,
  bmi_last: lastBmi,
  bmi_transition: bmiTransition,
  bone_age_progression: measurements
    .filter((m) => m.bone_age != null)
    .map((m) => ({ date: m.measured_date, bone_age: m.bone_age, height: m.height })),
  treatment_rhythm: {
    medication_doses: cats.MED,
    injection_doses: cats.INJ,
  },
  lab_count: labs.length,
  doctor_notes_sample: visitNotes,
};

console.log(JSON.stringify(ctx, null, 2));
