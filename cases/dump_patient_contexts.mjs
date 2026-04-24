// Dump a compact "story context" for every child with clinical data.
// Used when Claude writes patient stories manually (Gemini fallback).
// Output: cases/_patient_contexts.json (gitignored).
//
// Per-child fields (see summarise* helpers) are the same shape as the
// Gemini prompt in generate_patient_stories.mjs.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const AI_ENV = resolve(ROOT, 'ai-server', '.env');
const OUT = resolve(HERE, '_patient_contexts.json');

const env = {};
for (const line of readFileSync(AI_ENV, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchPaged(table, cols, childId) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from(table)
      .select(cols)
      .eq('child_id', childId)
      .range(from, from + 999);
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

function summariseMeasurements(ms) {
  if (ms.length === 0) return '측정 기록 없음';
  const first = ms[0];
  const last = ms[ms.length - 1];
  const dH = first.height != null && last.height != null ? (last.height - first.height).toFixed(1) : null;
  const months = first.measured_date && last.measured_date
    ? Math.round((new Date(last.measured_date) - new Date(first.measured_date)) / (30 * 86400_000))
    : null;
  const baFirst = ms.find((m) => m.bone_age != null);
  const baLast = [...ms].reverse().find((m) => m.bone_age != null);
  const pahLast = [...ms].reverse().find((m) => m.pah != null);
  const parts = [
    `첫 측정 ${first.measured_date} ${first.height ?? '-'}cm`,
    `최근 측정 ${last.measured_date} ${last.height ?? '-'}cm`,
  ];
  if (dH != null && months != null) parts.push(`${months}개월 +${dH}cm`);
  if (baFirst?.bone_age != null && baLast?.bone_age != null) {
    parts.push(`뼈나이 ${baFirst.bone_age.toFixed(1)}→${baLast.bone_age.toFixed(1)}`);
  }
  if (pahLast?.pah != null) parts.push(`최근 PAH ${pahLast.pah.toFixed(1)}cm`);
  return parts.join(', ');
}

function summarisePrescriptions(rxList) {
  if (rxList.length === 0) return '처방 없음';
  const top = rxList.slice(0, 5).map((r) => `${r.name}×${r.count}회`).join(', ');
  const cats = { MED: 0, INJ: 0, PRO: 0 };
  for (const r of rxList) {
    const prefix = (r.code || '').slice(0, 3);
    if (cats[prefix] != null) cats[prefix] += r.count;
  }
  const catStr = Object.entries(cats)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => ({ MED: '약품', INJ: '주사', PRO: '시술' }[k] + ` ${n}회`))
    .join(' · ');
  return `총 ${rxList.length}종, ${catStr}. 주요: ${top}`;
}

function summariseLabs(labs) {
  if (labs.length === 0) return '검사 없음';
  const byType = {};
  const flagged = new Set();
  for (const l of labs) {
    byType[l.panel_type] = (byType[l.panel_type] ?? 0) + 1;
    for (const f of l.flagged) flagged.add(f);
  }
  const typeStr = Object.entries(byType).map(([k, n]) => `${k}×${n}`).join(', ');
  const flagStr = [...flagged].slice(0, 6).join(', ');
  return flagStr ? `${typeStr} (이상: ${flagStr})` : typeStr;
}

function summariseIntake(intake) {
  if (!intake) return '설문 없음';
  const parts = [];
  if (intake.growth_flags?.slowed) parts.push('성장 둔화 체크');
  if (intake.growth_flags?.rapid_growth) parts.push('급성장 체크');
  if (intake.growth_flags?.puberty_concern) parts.push('사춘기 걱정 체크');
  if (intake.tanner_stage) parts.push(`Tanner ${intake.tanner_stage}`);
  if (intake.chronic_conditions) parts.push(`과거력: ${intake.chronic_conditions}`);
  if (Array.isArray(intake.short_stature_causes) && intake.short_stature_causes.length) {
    parts.push(`부모 판단 원인: ${intake.short_stature_causes.join(', ')}`);
  }
  if (intake.sports_athlete) parts.push('체육 특기생');
  return parts.length ? parts.join(' | ') : '-';
}

async function buildContext(child) {
  const [visits, measRows, rxRows, labRows] = await Promise.all([
    fetchPaged('visits', 'id, visit_date, notes, is_intake, chief_complaint', child.id),
    fetchPaged('hospital_measurements', 'visit_id, measured_date, height, weight, bone_age, pah', child.id),
    fetchPaged('prescriptions', 'medication_id, dose, duration_days, visit_id, created_at', child.id),
    fetchPaged('lab_tests', 'collected_date, test_type, result_data', child.id),
  ]);

  const nonIntakeVisits = visits.filter((v) => !v.is_intake).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const visitById = new Map(nonIntakeVisits.map((v) => [v.id, v]));
  const measurements = measRows
    .filter((m) => visitById.has(m.visit_id))
    .sort((a, b) => a.measured_date.localeCompare(b.measured_date));

  const medIds = [...new Set(rxRows.map((r) => r.medication_id).filter(Boolean))];
  const meds = [];
  for (let i = 0; i < medIds.length; i += 100) {
    const { data } = await s.from('medications').select('id, code, name').in('id', medIds.slice(i, i + 100));
    if (data) meds.push(...data);
  }
  const medMap = new Map(meds.map((m) => [m.id, m]));
  const rxAgg = new Map();
  for (const r of rxRows) {
    const med = medMap.get(r.medication_id);
    if (!med) continue;
    const key = med.code;
    const cur = rxAgg.get(key) ?? { code: med.code, name: med.name, count: 0 };
    cur.count += 1;
    rxAgg.set(key, cur);
  }
  const prescriptions = [...rxAgg.values()].sort((a, b) => b.count - a.count);

  const labs = labRows
    .map((l) => {
      const pt = l.result_data?.panel_type || l.test_type;
      const rows = l.result_data?.rows || [];
      const flagged = rows
        .filter((r) => r.flag && r.flag !== 'N' && r.flag !== 'normal' && r.flag !== '')
        .map((r) => r.name)
        .filter(Boolean);
      return { date: l.collected_date, panel_type: pt, flagged };
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    id: child.id,
    chart: child.chart_number,
    name: child.name,
    gender: child.gender === 'male' ? '남' : child.gender === 'female' ? '여' : '-',
    ageNow: calcAge(child.birth_date),
    birth: child.birth_date,
    fatherH: child.father_height,
    motherH: child.mother_height,
    desiredH: child.desired_height,
    firstVisit: nonIntakeVisits[0]?.visit_date ?? null,
    lastVisit: nonIntakeVisits[nonIntakeVisits.length - 1]?.visit_date ?? null,
    visitCount: nonIntakeVisits.length,
    meas: summariseMeasurements(measurements),
    rx: summarisePrescriptions(prescriptions),
    labs: summariseLabs(labs),
    intake: summariseIntake(child.intake_survey),
  };
}

async function main() {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from('children')
      .select('id, chart_number, name, gender, birth_date, father_height, mother_height, desired_height, intake_survey')
      .order('chart_number', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Loaded ${all.length} children`);

  const out = [];
  let processed = 0;
  for (const c of all) {
    const ctx = await buildContext(c);
    if (ctx.visitCount === 0) continue;
    out.push(ctx);
    processed += 1;
    if (processed % 25 === 0) console.log(`  ${processed} contexts built`);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n✓ Wrote ${out.length} contexts to ${OUT}`);
  console.log(`  (skipped ${all.length - out.length} patients with no visits)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
