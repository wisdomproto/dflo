import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { IntakeSubmission, UploadMeta } from '@/features/intake/types';
import { createPatient } from './adminService';

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

/** intake-uploads 의 파일을 정식 버킷(xray-images / raw-records)으로 복사. 대상 경로 반환. */
async function copyUpload(u: UploadMeta, chartNumber: string): Promise<string> {
  const destBucket = u.kind === 'xray' ? 'xray-images' : 'raw-records';
  const destPath = `intake/${chartNumber}/${u.path.split('/').pop()}`;
  const { data, error } = await supabase.storage.from('intake-uploads').download(u.path);
  if (error || !data) {
    logger.error('intake file download failed', error);
    throw new Error('파일 복사 실패');
  }
  const { error: upErr } = await supabase.storage.from(destBucket).upload(destPath, data, {
    contentType: u.contentType || undefined,
    upsert: true,
  });
  if (upErr) {
    logger.error('intake file copy upload failed', upErr);
    throw new Error('파일 복사 실패');
  }
  return destPath;
}

/**
 * 제출 승인 → children 생성 + 파일 복사 + intake_survey(raw_files 포함) 이식.
 * 생성된 child id 반환.
 */
export async function approveSubmission(
  sub: IntakeSubmission,
  chartNumber: string,
): Promise<string> {
  if (!chartNumber.trim()) throw new Error('환자번호를 입력하세요.');

  // 1) 업로드 파일을 정식 버킷으로 복사 + raw_files 메타 구성
  const xray: string[] = [];
  const lab: string[] = [];
  for (const u of sub.uploads) {
    const dest = await copyUpload(u, chartNumber.trim());
    (u.kind === 'xray' ? xray : lab).push(dest);
  }
  const survey = {
    ...(sub.intake_survey ?? {}),
    raw_files: { pandokmun: [] as string[], lab, xray },
  };

  // 2) children 생성
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
    intake_survey: survey,
  });

  // 3) 제출 상태 갱신 (환자는 이미 생성됨 — 실패해도 로깅만)
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
