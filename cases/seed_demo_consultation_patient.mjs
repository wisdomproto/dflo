// 가상 환자 F9999 (상담 단계) 시드 데이터.
// children + intake_survey 채워넣기. 진료 visit/measurement 는 만들지 않아서
// 상담 단계 (consultation) UX 그대로 시연 가능.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';

const envTxt = readFileSync('./ai-server/.env', 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CHART = 'F9999';
const PARENT_EMAIL = 'ocr-import@187growth.com';

async function main() {
  // 1) parent 확보
  const { data: parent, error: pErr } = await s
    .from('users')
    .select('id, email')
    .eq('email', PARENT_EMAIL)
    .single();
  if (pErr || !parent) {
    throw new Error(`parent ${PARENT_EMAIL} not found`);
  }

  // 2) 기존 F9999 있으면 삭제 (idempotent 시드)
  const { data: existing } = await s
    .from('children')
    .select('id')
    .eq('chart_number', CHART)
    .maybeSingle();
  if (existing) {
    console.log(`기존 F9999 (${existing.id}) 발견 — 삭제 후 재생성`);
    // hospital_measurements / visits / 모든 종속 데이터 cascade 되는지 확인 안 됐으니
    // 일단 단순 delete.
    const { error: delErr } = await s.from('children').delete().eq('id', existing.id);
    if (delErr) throw delErr;
  }

  // 3) intake_survey JSONB
  const intakeSurvey = {
    growth_history: [
      { age: 8, height: 121 },
      { age: 9, height: 126 },
      { age: 10, height: 130 },
      { age: 11, height: 134 },
      { age: 12, height: 138 },
      { age: 13, height: 141 },
      { age: 14, height: null },
      { age: 15, height: null },
      { age: 16, height: null },
    ],
    growth_flags: {
      rapid_growth: false,
      slowed: true,
      puberty_concern: true,
    },
    past_clinic_consult: false,
    parents_interested: true,
    sports_athlete: false,
    sports_event: '',
    child_interested: true,
    chronic_conditions: '알레르기 비염, 가벼운 천식',
    tanner_stage: 3,
    short_stature_causes: ['parents_short', 'picky_eating', 'insufficient_sleep'],
    short_stature_other: '',
    updated_at: new Date().toISOString(),
  };

  // 4) children INSERT
  const childPayload = {
    parent_id: parent.id,
    name: '데모 환자',
    gender: 'female',
    birth_date: '2012-04-15', // 2026-05 기준 만 14세
    father_height: 167,
    mother_height: 156,
    desired_height: 165,
    chart_number: CHART,
    password: '1234',
    grade: '중학교 1학년',
    class_height_rank: '뒤에서 3번',
    nationality: 'KR',
    intake_survey: intakeSurvey,
    treatment_status: 'consultation',
    is_active: true,
  };

  const { data: created, error: cErr } = await s
    .from('children')
    .insert(childPayload)
    .select()
    .single();
  if (cErr) throw cErr;

  console.log('✅ F9999 가상 환자 생성 완료:');
  console.log(`  id: ${created.id}`);
  console.log(`  name: ${created.name}`);
  console.log(`  chart_number: ${created.chart_number}`);
  console.log(`  password: 1234`);
  console.log(`  birth_date: ${created.birth_date}`);
  console.log(`  treatment_status: ${created.treatment_status}`);
  console.log(`  부모 키: 父 ${created.father_height}cm / 母 ${created.mother_height}cm`);
  console.log(`  intake_survey:`);
  console.log(`    성장 이력: ${intakeSurvey.growth_history.filter((g) => g.height).length}개 입력`);
  console.log(`    Tanner: ${intakeSurvey.tanner_stage}단계`);
  console.log(`    키 작은 원인: ${intakeSurvey.short_stature_causes.join(', ')}`);
  console.log(`    만성: ${intakeSurvey.chronic_conditions}`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
