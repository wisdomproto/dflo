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
// Clinical signals — derived from real hospital data (measurements,
// prescriptions, lab panels) and fed into the classifier alongside the
// intake survey. Built in adminService.fetchPatients so classifyPatient
// stays a pure, synchronous function.

export interface ClinicalSignals {
  /** medication_legend.drug_class set for this child's prescriptions. */
  drugClasses: Set<string>;
  /** Any allergy panel positive — manual danger/caution OR IgG4/MAST class≥1. */
  allergyPositive: boolean;
  /** Organic-acid panel abnormal markers in the gut-dysbiosis/yeast family. */
  organicAcidAbnormal: boolean;
  /** Blood panel has any flagged (H/L) result. Loaded for completeness; no
   *  single category maps cleanly to it, so currently informational only. */
  bloodAbnormal: boolean;
  /** Largest (bone age − chronological age) across visits, in years. */
  maxBoneAgeAdvanceYears: number | null;
  /** Most recent measured bone age, in years. */
  latestBoneAge: number | null;
  /** Annualized height gain (cm/yr) between earliest and latest measurement. */
  heightVelocityCmPerYear: number | null;
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** Reduce one lab row's result_data to category-relevant booleans. Pure. */
export function analyzeLabRow(
  testType: string,
  rd: Record<string, unknown> | null | undefined,
): { allergy: boolean; organicAcid: boolean; blood: boolean } {
  const none = { allergy: false, organicAcid: false, blood: false };
  if (!rd) return none;
  const panel = (rd.panel_type as string | undefined) || testType;

  // Manual allergy editor stores danger/caution name arrays. Only the explicit
  // "danger" list counts as a positive; "caution" is too weak to drive a category.
  const danger = Array.isArray(rd.danger) ? rd.danger : [];
  if (danger.length) return { ...none, allergy: true };

  const items = Array.isArray(rd.items) ? (rd.items as Array<Record<string, unknown>>) : [];
  const maxClass = items.reduce((mx, i) => Math.max(mx, parseInt(String(i.class ?? '0'), 10) || 0), 0);

  if (panel === 'food_intolerance') {
    // IgG4 food panels are notoriously over-sensitive — almost every tested
    // child shows class≥1. Require an extreme reaction (class≥5) to count as a
    // meaningful inflammation signal, not just "the test was ordered".
    return { ...none, allergy: maxClass >= 5 };
  }
  if (panel === 'mast_allergy' || testType === 'allergy') {
    // MAST = true IgE allergy; class≥3 is clinically significant.
    return { ...none, allergy: maxClass >= 3 };
  }
  if (panel === 'blood' || testType === 'blood') {
    return { ...none, blood: items.some((i) => !!i.flag) };
  }
  if (panel === 'organic_acid' || testType === 'organic_acid') {
    const markers = Array.isArray(rd.abnormal_markers)
      ? (rd.abnormal_markers as Array<Record<string, unknown>>)
      : [];
    // Only gut-dysbiosis / yeast markers are inflammation-adjacent; other OAP
    // abnormalities (mitochondrial, neurotransmitter) don't map to a category.
    const dysbiosis = markers.some((m) => {
      const t = `${m.category ?? ''} ${m.marker ?? ''}`;
      return /장내|세균|곰팡이|효모|칸디다|이스트|yeast|bacter|dysbios|candida|클로스/i.test(t);
    });
    return { ...none, organicAcid: dysbiosis };
  }
  return none;
}

/** Derive bone-age + height-velocity signals from a child's measurements. Pure. */
export function deriveGrowthSignals(
  child: Pick<Child, 'birth_date'>,
  measurements: Array<{ measured_date: string; height?: number | null; bone_age?: number | null }>,
): Pick<
  ClinicalSignals,
  'maxBoneAgeAdvanceYears' | 'latestBoneAge' | 'heightVelocityCmPerYear'
> {
  const birth = child.birth_date ? new Date(child.birth_date).getTime() : null;

  // Height velocity: earliest → latest measurement with a height value.
  const withHeight = measurements
    .filter((m) => m.height != null && m.measured_date)
    .sort((a, b) => a.measured_date.localeCompare(b.measured_date));
  let velocity: number | null = null;
  if (withHeight.length >= 2) {
    const a = withHeight[0]!;
    const b = withHeight[withHeight.length - 1]!;
    const yrs = (new Date(b.measured_date).getTime() - new Date(a.measured_date).getTime()) / YEAR_MS;
    if (yrs >= 0.5) velocity = (b.height! - a.height!) / yrs;
  }

  let maxAdvance: number | null = null;
  let latestBoneAge: number | null = null;
  let latestBoneAgeDate = '';
  for (const m of measurements) {
    if (m.bone_age == null) continue;
    if (m.measured_date >= latestBoneAgeDate) {
      latestBoneAgeDate = m.measured_date;
      latestBoneAge = m.bone_age;
    }
    if (birth != null && m.measured_date) {
      const ca = (new Date(m.measured_date).getTime() - birth) / YEAR_MS;
      const advance = m.bone_age - ca;
      if (maxAdvance == null || advance > maxAdvance) maxAdvance = advance;
    }
  }

  return {
    maxBoneAgeAdvanceYears: maxAdvance,
    latestBoneAge,
    heightVelocityCmPerYear: velocity,
  };
}

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

/**
 * Compute categories from a child row (children + intake_survey jsonb) and,
 * when available, real clinical signals (measurements / prescriptions / labs).
 * `signals` is optional so callers without enriched data still get the
 * survey-only classification.
 */
export function classifyPatient(child: Child, signals?: ClinicalSignals): PatientCategoryId[] {
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

  // ── Clinical-data overlays (only when enriched signals are supplied) ──
  if (signals) {
    // 성장 느림 — 실제 측정 키 성장속도 < 4cm/년.
    if (signals.heightVelocityCmPerYear != null && signals.heightVelocityCmPerYear < 4) {
      out.add('slow_growth');
    }

    // 성조숙 의심 — 뼈나이가 만나이보다 1.5년+ 앞섬, 또는 GnRH agonist 처방.
    // (성장호르몬·아로마타제 억제제·수면보조제는 이 클리닉의 표준 성장 프로토콜
    //  약물이라 거의 전 환자가 복용 → 카테고리 신호로 쓰면 의미 없음. GnRH
    //  agonist 만 성조숙 치료에 특이적이라 신호로 유지.)
    if (signals.maxBoneAgeAdvanceYears != null && signals.maxBoneAgeAdvanceYears >= 1.5) {
      out.add('precocious');
    }
    if (signals.drugClasses.has('gnrh_agonist')) out.add('precocious');

    // 치료 시기 놓침 — 뼈나이가 골단 폐쇄 임박(여 14 / 남 15세+).
    if (signals.latestBoneAge != null) {
      const closingBA = child.gender === 'female' ? 14 : 15;
      if (signals.latestBoneAge >= closingBA) out.add('late_start');
    }

    // 염증/알레르기 — 실제 알러지 강반응(IgG4 class≥5 / MAST class≥3 / danger)
    // 또는 유기산 장내이상.
    if (signals.allergyPositive || signals.organicAcidAbnormal) out.add('inflammation');
  }

  return CATEGORY_ORDER.filter((id) => out.has(id));
}
