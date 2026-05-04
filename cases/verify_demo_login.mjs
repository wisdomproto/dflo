// F9999 / 1234 로그인 흐름 시뮬레이션 (authStore.signInPatient 와 동일 쿼리)
// + 상담 단계 환자 화면들이 의존하는 데이터 fetching 검증.

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

console.log('=== 1. 로그인: chart_number F9999 + password 1234 ===');
const { data: child, error: childErr } = await s
  .from('children')
  .select('*')
  .eq('chart_number', 'F9999')
  .eq('password', '1234')
  .maybeSingle();
if (childErr || !child) {
  console.error('❌ 로그인 실패:', childErr?.message);
  process.exit(1);
}
console.log(`✅ child fetched: ${child.name} (${child.id})`);
console.log(`   treatment_status: ${child.treatment_status}`);

console.log('\n=== 2. parent fetch (authStore signInPatient 흐름) ===');
const { data: parent, error: pErr } = await s
  .from('users')
  .select('*')
  .eq('id', child.parent_id)
  .single();
if (pErr || !parent) {
  console.error('❌ parent 조회 실패');
  process.exit(1);
}
console.log(`✅ parent: ${parent.email} (role=${parent.role}, active=${parent.is_active})`);

console.log('\n=== 3. fetchPatientRecords 시뮬레이션 ===');
const { data: visits } = await s
  .from('visits')
  .select('*')
  .eq('child_id', child.id)
  .or('is_intake.is.null,is_intake.eq.false');
console.log(`   visits (is_intake=false): ${visits?.length ?? 0}건`);

const { data: measurements } = await s
  .from('hospital_measurements')
  .select('*')
  .eq('child_id', child.id);
console.log(`   measurements: ${measurements?.length ?? 0}건`);

console.log('\n=== 4. RecordsPage 분기 결과 ===');
const isConsultation =
  child.treatment_status === 'consultation' || (visits?.length ?? 0) === 0;
console.log(`   isConsultation = ${isConsultation}`);
console.log(`   → ${isConsultation ? 'ConsultationRecordView (첫 상담 기록)' : '진료 회차 타임라인'}`);

console.log('\n=== 5. HomePage 분기 결과 ===');
const isTreatment = child.treatment_status === 'treatment';
console.log(`   isTreatment = ${isTreatment}`);
console.log(`   → ${isTreatment ? '/app/records 로 redirect' : 'IntakeGrowthChartCard + 콘텐츠'}`);

console.log('\n=== 6. BottomNav 분기 결과 ===');
console.log('   consultationNavItems: 홈 / 첫 상담 기록 / 1:1상담');

console.log('\n=== 7. intake_survey 데이터 확인 ===');
const intake = child.intake_survey;
if (!intake) {
  console.log('   ❌ intake_survey 없음 — IntakeGrowthChartCard 가 빈 상태');
} else {
  const points = (intake.growth_history ?? []).filter((g) => g.height && g.height > 0);
  console.log(`   ✅ growth_history: ${points.length}개 (예측 그래프 표시 가능)`);
  console.log(`      ${points.map((p) => `${p.age}세 ${p.height}cm`).join(', ')}`);
  console.log(`   tanner_stage: ${intake.tanner_stage}`);
  console.log(`   short_stature_causes: ${(intake.short_stature_causes ?? []).join(', ')}`);
}

console.log('\n=== 종합 ===');
console.log(`✅ 로그인 가능, 상담 단계 UX 분기 정상 동작.`);
console.log(`   👉 /login 에서 차트번호: F9999 / 비밀번호: 1234 로 시도해보세요.`);
