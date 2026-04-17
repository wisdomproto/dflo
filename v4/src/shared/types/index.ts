// ================================================
// 공통 타입 정의 - 187 성장케어 v4
// ================================================

export type Gender = 'male' | 'female';
export type UserRole = 'parent' | 'doctor' | 'admin';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SleepQuality = 'good' | 'normal' | 'bad';
export type Mood = 'happy' | 'normal' | 'sad' | 'tired' | 'sick';

// ================================================
// Database Models
// ================================================

export interface User {
  id: string;
  auth_id?: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  memo?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  name_en?: string;
  gender: Gender;
  birth_date: string;
  birth_week?: number;
  birth_weight?: number;
  birth_notes?: string;
  father_height?: number;
  mother_height?: number;
  desired_height?: number;
  chart_number: string;
  grade?: string;
  class_height_rank?: string;
  nationality?: 'KR' | 'CN';
  intake_survey?: IntakeSurvey | null;
  is_patient?: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// ================================================
// Initial Intake Survey (admin 기본 정보 탭)
// ================================================
export interface GrowthHistoryEntry {
  age: number;           // 8..16
  height: number | null; // cm; null = unknown
}

export type ShortStatureCause =
  | 'parents_short'
  | 'parents_height_gap'
  | 'picky_eating'
  | 'parents_early_stop'
  | 'insufficient_sleep'
  | 'chronic_illness';

export type TannerStage = 1 | 2 | 3 | 4 | 5;

export interface IntakeSurvey {
  /** Q4: 과거 성장 기록 (8~16세 9항목) */
  growth_history: GrowthHistoryEntry[];
  /** Q4 체크박스 */
  growth_flags: {
    rapid_growth: boolean;
    slowed: boolean;
    puberty_concern: boolean;
  };
  /** Q9 과거 성장 클리닉 상담 여부 */
  past_clinic_consult: boolean | null;
  /** Q10 양측 부모 관심 여부 */
  parents_interested: boolean | null;
  /** Q12 체육 특기생 여부 */
  sports_athlete: boolean | null;
  /** Q12 종목 */
  sports_event: string;
  /** Q13 아이 본인 관심 여부 */
  child_interested: boolean | null;
  /** Q14 과거/지속 치료중 질환 */
  chronic_conditions: string;
  /** Q15 사춘기(Tanner) 단계 1~5 */
  tanner_stage: TannerStage | null;
  /** Q16 키가 작은 원인 (다중 선택) */
  short_stature_causes: ShortStatureCause[];
  /** Q16 기타 원인 자유 서술 */
  short_stature_other: string;
  /** ISO timestamp, 마지막 저장 시각 */
  updated_at: string;
}

export type LabTestType = 'allergy' | 'organic_acid' | 'blood' | 'attachment';

export interface Visit {
  id: string;
  child_id: string;
  visit_date: string;
  doctor_id?: string;
  chief_complaint?: string;
  plan?: string;
  notes?: string;
  is_intake?: boolean;
  created_at: string;
  updated_at: string;
}

export interface HospitalMeasurement {
  id: string;
  visit_id: string;
  child_id: string;
  measured_date: string;
  height: number;
  weight?: number;
  actual_age?: number;
  bone_age?: number;
  pah?: number;
  height_percentile?: number;
  weight_percentile?: number;
  bmi?: number;
  notes?: string;
  doctor_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface XrayReading {
  id: string;
  visit_id: string;
  child_id: string;
  xray_date: string;
  image_path?: string;
  bone_age_result?: number;
  atlas_match_younger?: string;
  atlas_match_older?: string;
  doctor_memo?: string;
  created_at: string;
  updated_at: string;
}

export interface LabTestAttachment {
  url: string;
  name: string;
  mime: string;
}

export interface AllergyLabResult {
  danger: string[];
  caution: string[];
}

export interface LabTest {
  id: string;
  visit_id: string;
  child_id: string;
  test_type: LabTestType;
  collected_date?: string;
  result_date?: string;
  result_data: AllergyLabResult | Record<string, unknown>;
  attachments: LabTestAttachment[];
  doctor_memo?: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  code: string;
  name: string;
  default_dose?: string;
  unit?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  visit_id: string;
  child_id: string;
  medication_id: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use HospitalMeasurement. Alias kept for backwards compatibility during migration. */
export type Measurement = HospitalMeasurement;

export interface DailyRoutine {
  id: string;
  child_id: string;
  routine_date: string;
  daily_height?: number;
  daily_weight?: number;
  sleep_time?: string;
  wake_time?: string;
  sleep_quality?: SleepQuality;
  sleep_notes?: string;
  water_intake_ml?: number;
  basic_supplements?: string[];
  extra_supplements?: string[];
  growth_injection: boolean;
  injection_time?: string;
  injection_notes?: string;
  daily_notes?: string;
  mood?: Mood;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  daily_routine_id: string;
  meal_type: MealType;
  meal_time?: string;
  description?: string;
  is_healthy?: boolean;
  portion_size?: string;
  created_at: string;
  updated_at: string;
}

export interface MealPhoto {
  id: string;
  meal_id: string;
  photo_url: string;
  file_name?: string;
  file_size?: number;
  uploaded_at: string;
}

export interface MealAnalysis {
  id: string;
  meal_id: string;
  menu_name: string;
  ingredients: string[];
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  growth_score: number;
  advice: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  category: string;
  name: string;
  description?: string;
  youtube_url?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  difficulty?: string;
  target_age_min?: number;
  target_age_max?: number;
  order_index: number;
  is_active: boolean;
}

export interface ExerciseLog {
  id: string;
  daily_routine_id: string;
  exercise_name: string;
  duration_minutes?: number;
  completed: boolean;
  created_at: string;
}

export interface Recipe {
  id: string;
  recipe_number: string;
  title: string;
  image_url: string;
  key_benefits: string;
  main_nutrients?: string[];
  ingredients?: string[];
  steps?: string[];
  tips?: Record<string, unknown>[];
  growth_info?: Record<string, unknown>;
  cooking_time_minutes?: number;
  difficulty?: string;
  order_index: number;
  is_featured?: boolean;
  is_published: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GrowthCase {
  id: string;
  patient_name: string;
  gender: Gender;
  birth_date?: string;
  father_height?: number;
  mother_height?: number;
  target_height?: number;
  special_notes?: string;
  treatment_memo?: string;
  image_url?: string;
  measurements?: CaseMeasurement[];
  order_index: number;
  is_featured?: boolean;
  is_published?: boolean;
}

export interface CaseMeasurement {
  date: string;
  age: number;
  height: number;
  weight?: number;
  bone_age?: number;
  pah?: number;
  notes?: string;
}

export interface GrowthGuide {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  category?: string;
  image_url?: string;
  content: string;
  banner_color?: string;
  order_index: number;
  is_featured?: boolean;
  is_published: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ================================================
// Growth Standard Types
// ================================================

export interface PercentileData {
  age: number;
  p3: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p97: number;
}

export interface GrowthStandardData {
  male: {
    height: PercentileData[];
    weight: PercentileData[];
  };
  female: {
    height: PercentileData[];
    weight: PercentileData[];
  };
}

// ================================================
// UI Types
// ================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ChildWithMeasurements extends Child {
  measurements: Measurement[];
  latestMeasurement?: Measurement;
}
