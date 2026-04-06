// Growth Guide data types

export interface GrowthGuideData {
  growth_guide: {
    version: string;
    last_updated: string;
    categories: GuideCategory[];
  };
}

export interface GuideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  cards: GuideCard[];
}

export interface GuideCard {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  category: string;
  thumbnail: string;
  thumbnail_alt: string;
  icon: string;
  summary: string;
  key_points: string[];
  cta: string;
  reading_time: string;
  tags: string[];
  detail: {
    sections: GuideSection[];
    highlight?: string;
  };
}

// Union type for all section types
export type GuideSection =
  | IntroSection
  | ExplanationSection
  | ChecklistSection
  | GuideStepsSection
  | CtaSection
  | StageSection
  | MethodSection
  | HighlightSection
  | RatioSection
  | CaseStudySection
  | BadHabitSection
  | WarningSection
  | ActionPlanSection
  | NutrientSection
  | PyramidLevelSection
  | MealGuideSection
  | TipSection
  | WarningSignSection
  | OptimalTimingSection
  | PreparationSection
  | BenefitsSection
  | SleepRequirementSection
  | GoldenTimeSection
  | SleepDeprivationSection
  | SleepPrinciplesSection
  | AvoidListSection
  | SleepChecklistSection
  | ExerciseCategorySection
  | ExerciseRoutineSection
  | PostureProblemSection
  | CorrectionExerciseSection
  | StressImpactSection
  | StressManagementSection
  | CommunicationSection
  | CoreMessageSection
  | GenericSection;

interface BaseSection {
  type: string;
  title?: string;
}

export interface IntroSection extends BaseSection {
  type: 'intro';
  content: string;
}

export interface ExplanationSection extends BaseSection {
  type: 'explanation';
  content: Array<{ label: string; description: string }>;
  highlight?: string;
}

export interface ChecklistSection extends BaseSection {
  type: 'checklist';
  items: Array<{ status: 'good' | 'warning'; text: string }>;
}

export interface GuideStepsSection extends BaseSection {
  type: 'guide';
  steps: Array<{ number: number; title: string; description: string }>;
}

export interface CtaSection extends BaseSection {
  type: 'cta';
  description: string;
  button: { text: string; action: string };
}

export interface StageSection extends BaseSection {
  type: 'stage';
  stage_number: number;
  badge: string;
  description?: string;
  growth_data?: Array<{ period?: string; gender?: string; growth: string }>;
  management_points: string[];
  warnings?: string[];
  caution?: string;
  closure_time?: { female: string; male: string };
}

export interface MethodSection extends BaseSection {
  type: 'method';
  method_number: number;
  reliability: number;
  reliability_label: string;
  description?: string;
  formula?: { male: string; female: string };
  example?: Record<string, number>;
  analysis_methods?: Array<{ name: string; description: string }>;
  pros: string[];
  cons?: string[];
  interpretation?: Array<{ condition: string; meaning: string }>;
  error_range?: string;
}

export interface HighlightSection extends BaseSection {
  type: 'highlight';
  content: string;
  description?: string;
}

export interface RatioSection extends BaseSection {
  type: 'ratio';
  genetics: {
    percentage: string;
    factors: string[];
    note: string;
  };
  environment: {
    percentage: string;
    note: string;
    factors: Array<{
      name: string;
      weight: string;
      good: string[];
      bad: string[];
    }>;
  };
}

export interface CaseStudySection extends BaseSection {
  type: 'case_study';
  cases: Array<{
    type: string;
    title: string;
    predicted: number;
    actual: number;
    difference: string;
    result: string;
  }>;
}

export interface BadHabitSection extends BaseSection {
  type: 'bad_habit';
  category: string;
  warning_level: string;
  checklist: string[];
  why_bad: string[];
  solution: string[];
}

export interface WarningSection extends BaseSection {
  type: 'warning';
  content: string;
}

export interface ActionPlanSection extends BaseSection {
  type: 'action_plan';
  weekly_plan: Array<{ week: number; goal: string }>;
  note?: string;
}

export interface NutrientSection extends BaseSection {
  type: 'nutrient';
  number: number;
  name: string;
  subtitle: string;
  icon: string;
  roles: string[];
  food_sources: string[];
  daily_requirement: Record<string, string>;
  tip: string;
}

export interface PyramidLevelSection extends BaseSection {
  type: 'pyramid_level';
  level: string;
  description: string;
  color: string;
  foods: Array<{ name: string; amount: string; icon: string }>;
}

export interface MealGuideSection extends BaseSection {
  type: 'meal_guide';
  meals: Array<{
    type: string;
    time: string;
    composition: string[];
    example: string;
  }>;
}

export interface TipSection extends BaseSection {
  type: 'tip';
  content: string;
  items?: string[];
}

export interface WarningSignSection extends BaseSection {
  type: 'warning_sign';
  category: string;
  signs: Array<{ sign: string; detail?: string }>;
  action: string;
}

export interface OptimalTimingSection extends BaseSection {
  type: 'optimal_timing';
  timing: Array<{ age: string; reason: string }>;
  key_point?: string;
}

export interface PreparationSection extends BaseSection {
  type: 'preparation';
  category: string;
  icon: string;
  [key: string]: unknown;
}

export interface BenefitsSection extends BaseSection {
  type: 'benefits';
  benefits: string[];
}

export interface SleepRequirementSection extends BaseSection {
  type: 'sleep_requirement';
  age_groups: Array<{ age: string; hours: string }>;
  question?: string;
}

export interface GoldenTimeSection extends BaseSection {
  type: 'golden_time';
  peak_time: string;
  description: string;
  pattern: Array<{ time: string; secretion: string }>;
  key_point: string;
}

export interface SleepDeprivationSection extends BaseSection {
  type: 'sleep_deprivation';
  effects: Array<{ category: string; details: string[] }>;
}

export interface SleepPrinciplesSection extends BaseSection {
  type: 'sleep_principles';
  principles: Array<{
    number: number;
    title: string;
    guidelines: string[];
  }>;
}

export interface AvoidListSection extends BaseSection {
  type: 'avoid_list';
  items: Array<{
    item: string;
    reason: string;
    alternative?: string;
  }>;
}

export interface SleepChecklistSection extends BaseSection {
  type: 'sleep_checklist';
  categories: Array<{
    name: string;
    items: string[];
  }>;
}

export interface ExerciseCategorySection extends BaseSection {
  type: 'exercise_category';
  category: string;
  icon: string;
  description: string;
  exercises: Array<{
    name: string;
    method: string;
    frequency: string;
    effect: string;
  }>;
}

export interface ExerciseRoutineSection extends BaseSection {
  type: 'exercise_routine';
  routines: Array<{
    time: string;
    activities: string[];
  }>;
}

export interface PostureProblemSection extends BaseSection {
  type: 'posture_problem';
  problem: string;
  icon: string;
  hidden_height_loss: string;
  causes: string[];
  check_method: string;
}

export interface CorrectionExerciseSection extends BaseSection {
  type: 'correction_exercise';
  target: string;
  exercises: Array<{
    name: string;
    method: string;
    duration: string;
    frequency: string;
  }>;
}

export interface StressImpactSection extends BaseSection {
  type: 'stress_impact';
  impacts: Array<{ mechanism: string; result: string }>;
}

export interface StressManagementSection extends BaseSection {
  type: 'stress_management';
  category: string;
  strategies: Array<{
    name: string;
    method: string;
    frequency?: string;
  }>;
}

export interface CommunicationSection extends BaseSection {
  type: 'communication';
  [key: string]: unknown;
}

export interface CoreMessageSection extends BaseSection {
  type: 'core_message';
  message: string;
  ways_to_convey?: string[];
  conclusion?: string;
}

export interface GenericSection extends BaseSection {
  type: string;
  [key: string]: unknown;
}
