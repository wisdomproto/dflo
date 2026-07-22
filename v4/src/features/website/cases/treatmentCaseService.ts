// 환자용 치료사례(/cases) 데이터 — ai-server 경유.
// treatment_cases 는 PHI라 RLS 전면 차단(anon 정책 없음) → Supabase 직접 조회 불가, service_role 을 쥔 ai-server만 읽는다.
// 반환은 published 된 비식별 snapshot 뿐(차트번호 없음).
import type { CaseData } from '@/features/hospital/lib/caseChartsStandalone';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface TreatmentCaseStory {
  title: string;
  story: string;
}

export interface TreatmentCase {
  name: string; // 가명
  gender: '남' | '여';
  ageAtFirst: number; // 만나이(소수) — 첫 뼈나이 회차
  ageAtLast: number; // 만나이(소수) — 마지막 뼈나이 회차(팔로우업 제외)
  months: number; // 치료기간(개월)
  tags: string[];
  headline: string;
  hFirst: number;
  hLast: number;
  hDelta: number;
  pahFirst: number;
  pahLast: number;
  pahDelta: number;
  mph: number | null; // 유전 기대키
  fa: number | null;
  mo: number | null;
  desired: number | null; // 희망키
  baGapFirst: number | null; // 뼈나이 − 실제나이 (초진)
  baGapLast: number | null; // 뼈나이 − 실제나이 (최종)
  highlights: string[]; // 우리 gen 스크립트가 만든 문구(<b> 강조 포함)
  chart: CaseData;
  story: TreatmentCaseStory | null;
}

export class PinError extends Error {}

export async function fetchTreatmentCases(pin: string): Promise<TreatmentCase[]> {
  // PIN 은 헤더로 — URL 쿼리에 실으면 액세스 로그·리퍼러에 남는다.
  const res = await fetch(`${BASE}/api/treatment-cases`, { headers: { 'x-showcase-pin': pin } });
  if (res.status === 401) throw new PinError('unauthorized');
  if (!res.ok) throw new Error(`치료사례를 불러오지 못했습니다 (${res.status})`);
  const json = (await res.json()) as { cases?: TreatmentCase[] };
  return json.cases ?? [];
}
