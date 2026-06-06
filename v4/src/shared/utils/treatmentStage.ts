// 환자 치료 단계(treatment_status) 3단계 정의 — 관리자 화면 표시/설정 공용.
// 'completed'(완료)는 환자앱에선 'treatment'와 동일 취급(진료기록 뷰 유지),
// 관리자 화면에서만 별도 단계로 구분한다.

export type TreatmentStatus = 'consultation' | 'treatment' | 'completed';

export interface TreatmentStage {
  value: TreatmentStatus;
  label: string;
  /** 배지/필터칩용 정적 색상 */
  badge: string;
  /** 토글에서 active 일 때 색상 */
  active: string;
}

export const TREATMENT_STAGES: TreatmentStage[] = [
  {
    value: 'consultation',
    label: '상담',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    active: 'bg-amber-500 text-white',
  },
  {
    value: 'treatment',
    label: '치료 중',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    active: 'bg-emerald-600 text-white',
  },
  {
    value: 'completed',
    label: '완료',
    badge: 'bg-slate-100 text-slate-600 border border-slate-300',
    active: 'bg-slate-700 text-white',
  },
];

/** treatment_status → 사람이 읽는 라벨 (미설정/null 은 '상담' 기본). */
export function stageLabel(status?: string | null): string {
  return TREATMENT_STAGES.find((s) => s.value === status)?.label ?? '상담';
}
