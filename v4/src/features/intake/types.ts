import type { IntakeSurvey } from '@/shared/types';

export type IntakeLang = 'ko' | 'th' | 'vi' | 'en' | 'zh-hans' | 'zh-hant' | 'ja' | 'es';
export const INTAKE_LANGS: IntakeLang[] = ['ko', 'th', 'vi', 'en', 'zh-hans', 'zh-hant', 'ja', 'es'];

export interface UploadMeta {
  kind: 'xray' | 'lab';
  path: string;       // path inside intake-uploads bucket
  filename: string;
  size: number;
  contentType: string;
}

export interface IntakeSubmission {
  id: string;
  token: string;
  created_at: string;
  lang: IntakeLang;
  country?: string;
  status: 'pending' | 'approved' | 'rejected';
  name?: string;
  name_en?: string;
  gender?: 'male' | 'female';
  birth_date?: string;
  father_height?: number;
  mother_height?: number;
  desired_height?: number;
  current_height?: number;
  current_weight?: number;
  grade?: string;
  class_height_rank?: string;
  phone?: string;
  email?: string;
  address?: string;
  intake_survey?: IntakeSurvey | null;
  uploads: UploadMeta[];
  child_id?: string | null;
  reviewed_at?: string | null;
  reject_reason?: string | null;
  admin_note?: string | null; // 어드민 내부 메모 (migration 069)
}

/** Local form state in the public wizard (before submit). Converted to a DB insert payload. */
export interface IntakeFormState {
  name: string;
  name_en: string;
  gender: 'male' | 'female' | '';
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  country: string;      // 거주국 — 광고 지역 데이터
  growth_ref: string;   // 성장 기준 국가 — 예측키 계산용(보통 country 와 같음)
  father_height: string;
  mother_height: string;
  desired_height: string;
  current_height: string;
  current_weight: string;
  grade: string;
  class_height_rank: string;
  phone: string;
  email: string;
  address: string;
  survey: IntakeSurvey;
  xrayFiles: File[];
  labFiles: File[];
}
