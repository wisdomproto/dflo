import type { Child } from '@/shared/types';
import { calculateAge } from '@/shared/utils/age';

// ────────────────────────────────────────────────────────────────
// Patient clinical categories — computed from children + intake_survey.
// Each child can have multiple categories (overlap expected).

export type PatientCategoryId =
  | 'parents_short'
  | 'slow_growth'
  | 'precocious'
  | 'inflammation'
  | 'late_start'
  | 'preterm'
  | 'picky_eating'
  | 'sleep_deficit';

export interface PatientCategory {
  id: PatientCategoryId;
  label: string;
  emoji: string;
  /** Tailwind classes for the badge pill. */
  color: string;
}

export const PATIENT_CATEGORIES: Record<PatientCategoryId, PatientCategory> = {
  parents_short: {
    id: 'parents_short',
    label: '부모키 작음',
    emoji: '🧬',
    color: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
  slow_growth: {
    id: 'slow_growth',
    label: '성장 느림',
    emoji: '🐢',
    color: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  precocious: {
    id: 'precocious',
    label: '성조숙 의심',
    emoji: '⚡',
    color: 'bg-rose-50 text-rose-700 border border-rose-200',
  },
  inflammation: {
    id: 'inflammation',
    label: '염증/알레르기',
    emoji: '🌿',
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  late_start: {
    id: 'late_start',
    label: '치료 시기 놓침',
    emoji: '⏰',
    color: 'bg-red-50 text-red-700 border border-red-200',
  },
  preterm: {
    id: 'preterm',
    label: '미숙아/저체중',
    emoji: '👶',
    color: 'bg-sky-50 text-sky-700 border border-sky-200',
  },
  picky_eating: {
    id: 'picky_eating',
    label: '편식',
    emoji: '🍎',
    color: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  sleep_deficit: {
    id: 'sleep_deficit',
    label: '수면 부족',
    emoji: '😴',
    color: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
};

// Fixed display order for the filter bar + badge list.
export const CATEGORY_ORDER: PatientCategoryId[] = [
  'parents_short',
  'slow_growth',
  'precocious',
  'inflammation',
  'late_start',
  'preterm',
  'picky_eating',
  'sleep_deficit',
];

// ────────────────────────────────────────────────────────────────
// Classifier

const INFLAMMATION_KEYWORDS = ['아토피', '비염', '천식', '알레르기', '알러지', '습진'];

function midParentalHeight(
  father?: number | null,
  mother?: number | null,
  gender?: string,
): number | null {
  if (!father || !mother) return null;
  return gender === 'female' ? (father + mother - 13) / 2 : (father + mother + 13) / 2;
}

/** Compute categories from a child row (children + intake_survey jsonb). */
export function classifyPatient(child: Child): PatientCategoryId[] {
  const out = new Set<PatientCategoryId>();
  const survey = child.intake_survey ?? null;
  const causes = new Set(survey?.short_stature_causes ?? []);
  const flags = survey?.growth_flags;

  // 1. 부모키 작음 — either cause flagged, or computed MPH below gender cutoff.
  const mph = midParentalHeight(child.father_height, child.mother_height, child.gender);
  const mphShort = mph != null && (child.gender === 'female' ? mph < 155 : mph < 170);
  if (causes.has('parents_short') || mphShort) out.add('parents_short');

  // 2. 성장 느림 — flag OR last year's growth_history delta <4cm.
  if (flags?.slowed) out.add('slow_growth');
  if (survey?.growth_history?.length) {
    const hs = survey.growth_history.filter((e) => e.height != null);
    if (hs.length >= 2) {
      const a = hs[hs.length - 2]!;
      const b = hs[hs.length - 1]!;
      const yrs = Math.max(1, b.age - a.age);
      if ((b.height! - a.height!) / yrs < 4) out.add('slow_growth');
    }
  }

  // 3. 성조숙 의심 — flag OR Tanner advanced for chronological age.
  if (flags?.puberty_concern) out.add('precocious');
  if (survey?.tanner_stage && child.birth_date) {
    const ageYears = calculateAge(child.birth_date).years;
    const tanner = survey.tanner_stage;
    // Rough threshold: Tanner 2 before age 9 (girls) / 10 (boys) → suspect
    const precociousAge = child.gender === 'female' ? 9 : 10;
    if (tanner >= 2 && ageYears < precociousAge) out.add('precocious');
  }

  // 4. 염증/알레르기 — chronic_conditions text contains allergy keywords.
  const chronic = survey?.chronic_conditions;
  if (chronic && INFLAMMATION_KEYWORDS.some((kw) => chronic.includes(kw))) {
    out.add('inflammation');
  }
  if (causes.has('chronic_illness')) out.add('inflammation');

  // 5. 치료 시기 놓침 — puberty already advanced.
  if (survey?.tanner_stage && survey.tanner_stage >= 4 && child.birth_date) {
    const ageYears = calculateAge(child.birth_date).years;
    const lateAge = child.gender === 'female' ? 12 : 14;
    if (ageYears >= lateAge) out.add('late_start');
  }

  // 6. 미숙아/저체중 — birth_week<37 or birth_weight<2.5
  if ((child.birth_week != null && child.birth_week < 37) ||
      (child.birth_weight != null && child.birth_weight < 2.5)) {
    out.add('preterm');
  }

  // 7. 편식
  if (causes.has('picky_eating')) out.add('picky_eating');

  // 8. 수면 부족
  if (causes.has('insufficient_sleep')) out.add('sleep_deficit');

  return CATEGORY_ORDER.filter((id) => out.has(id));
}
