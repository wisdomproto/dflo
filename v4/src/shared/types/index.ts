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
  gender: Gender;
  birth_date: string;
  birth_week?: number;
  birth_weight?: number;
  birth_notes?: string;
  father_height?: number;
  mother_height?: number;
  is_patient?: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Measurement {
  id: string;
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
