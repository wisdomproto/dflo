import { supabase } from '@/shared/lib/supabase';
import type { ReportMeasurement, ReportSurvey } from '../report/types';

function attribution() {
  const ref = (typeof document !== 'undefined' && document.referrer) || '';
  let refSearch = '';
  try { refSearch = new URL(ref).search; } catch { /* noop */ }
  const fromRef = new URLSearchParams(refSearch);
  const here = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pick = (k: string) => fromRef.get(k) || here.get(k) || null;
  return {
    utm_source: pick('utm_source'), utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'), utm_content: pick('utm_content'),
    referrer: ref || null,
  };
}

export async function saveGrowthReport(
  measurement: ReportMeasurement, survey: ReportSurvey, lang = 'ko', id?: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('growth_reports').insert({
      ...(id ? { id } : {}), lang, measurement, survey, utm: attribution(),
    });
    if (error) { /* 적재 실패는 무시 — 분석용 tracking, UX 영향 없음 */ }
  } catch { /* tracking must never break UX */ }
}

// 토큰(=저장 시 클라 생성 id)으로 저장된 리포트 1건 조회 — security-definer RPC(전체 스캔 차단).
// migration 066 미적용/오류/미존재면 null → 페이지가 '찾을 수 없음'(EmptyState) 처리.
export async function fetchGrowthReport(
  id: string,
): Promise<{ measurement: ReportMeasurement; survey: ReportSurvey } | null> {
  try {
    const { data, error } = await supabase.rpc('get_growth_report', { p_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.measurement) return null;
    return { measurement: row.measurement as ReportMeasurement, survey: row.survey as ReportSurvey };
  } catch {
    return null;
  }
}
