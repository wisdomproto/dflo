import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { IntakeSubmission } from '@/features/intake/types';
import { createPatient } from './adminService';
import { getOrCreateIntakeVisit } from '@/features/hospital/services/visitService';
import { upsertMeasurementField } from '@/features/hospital/services/hospitalMeasurementService';

export async function fetchSubmissions(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<IntakeSubmission[]> {
  let q = supabase
    .from('intake_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) {
    logger.error('fetchSubmissions failed', error);
    throw new Error('설문 접수 목록을 불러오지 못했습니다.');
  }
  return (data ?? []) as IntakeSubmission[];
}

export async function pendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from('intake_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

/**
 * 채번 제안. 해외(국가코드 있음, KR 아님)는 next_country_chart_number RPC로
 * `th0001` 형태 자동 생성. 한국/미지정은 순수 숫자 chart_number의 max+1을 제안.
 */
export async function suggestChartNumber(country?: string | null): Promise<string> {
  if (!country || country === 'KR') {
    const { data } = await supabase.from('children').select('chart_number');
    const nums = (data ?? [])
      .map((r) => (r as { chart_number: string }).chart_number)
      .filter((c) => /^[0-9]+$/.test(c))
      .map(Number);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return String(next);
  }
  const { data, error } = await supabase.rpc('next_country_chart_number', {
    cc: country.toLowerCase(),
  });
  if (error) {
    logger.error('next_country_chart_number rpc failed', error);
    return '';
  }
  return (data as string) ?? '';
}

/**
 * 제출 승인 → children 생성 + intake_survey 이식 + 제출에 child_id 연결.
 * 생성된 child id 반환.
 *
 * 업로드한 X-ray·검사 파일은 intake-uploads 버킷에 그대로 두고, 승인된 제출
 * (status='approved', child_id 연결)을 통해 어드민이 접수함에서 계속 열람한다.
 * 환자 진료 화면(visit + xray_readings/lab_tests)으로의 surfacing 은 후속 작업.
 */
export async function approveSubmission(
  sub: IntakeSubmission,
  chartNumber: string,
): Promise<string> {
  if (!chartNumber.trim()) throw new Error('환자번호를 입력하세요.');

  // 1) children 생성 (먼저 생성해 채번 충돌 등 실패 시 다른 부작용 없게)
  const child = await createPatient({
    chart_number: chartNumber.trim(),
    name: sub.name ?? '(미입력)',
    gender: (sub.gender ?? 'male') as 'male' | 'female',
    birth_date: sub.birth_date ?? '2010-01-01',
    father_height: sub.father_height,
    mother_height: sub.mother_height,
    desired_height: sub.desired_height,
    country: sub.country ?? undefined,
    name_en: sub.name_en ?? undefined,
    phone: sub.phone ?? undefined,
    email: sub.email ?? undefined,
    address: sub.address ?? undefined,
    grade: sub.grade ?? undefined,
    class_height_rank: sub.class_height_rank ?? undefined,
    intake_survey: sub.intake_survey ?? undefined,
  });

  // 1-b) 현재 키가 있으면 초진(is_intake) visit + 측정값 생성 →
  //      첫 상담 성장그래프·예측키가 채워진다. (실패해도 환자 생성은 유지)
  if (sub.current_height != null) {
    try {
      const measuredDate = (sub.created_at ?? new Date().toISOString()).slice(0, 10);
      const visit = await getOrCreateIntakeVisit(child.id, measuredDate);
      await upsertMeasurementField({
        visit_id: visit.id,
        child_id: child.id,
        measured_date: measuredDate,
        patch: { height: sub.current_height },
      });
    } catch (e) {
      logger.error('intake current-height seeding failed', e);
    }
  }

  // 2) 제출 상태 갱신 (환자는 이미 생성됨 — 실패해도 로깅만)
  const { error } = await supabase
    .from('intake_submissions')
    .update({
      status: 'approved',
      child_id: child.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sub.id);
  if (error) logger.error('submission approve update failed', error);

  return child.id;
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('intake_submissions')
    .update({
      status: 'rejected',
      reject_reason: reason || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    logger.error('reject failed', error);
    throw new Error('반려 처리에 실패했습니다.');
  }
}
