# Initial Intake Survey — Admin Basic Info Tab

**Date**: 2026-04-17
**Status**: Approved
**Related**: 2026-04-15-patient-db-unification-design.md (Phase 11)

## Context

The clinic uses a paper intake form (성장클리닉 설문지, male/female variants) for first-visit patients. We need to digitize this into the admin patient detail page so clinicians can fill it per patient and reference it alongside clinical records.

Current `AdminPatientDetailPage` has a 3-column layout: visits | X-ray | growth chart. There is no dedicated place for patient-level intake data. The survey is completed once per patient (not per visit).

Six of the sixteen questions already map to existing `children` columns (name, birth_date, birth_week, birth_weight, birth_notes, father_height, mother_height, desired_height). Q17 (lab test selection) is out of scope.

## Goals

1. Add a tab at the top of `AdminPatientDetailPage`: `[기본 정보] [진료 기록]`
2. `[기본 정보]` tab consolidates existing `children` fields **and** new intake survey fields in a single editable form
3. `[진료 기록]` tab preserves the existing 3-column layout unchanged
4. Auto-save on blur/change (match existing `upsertMeasurementField` pattern — no explicit Save button)
5. Store intake survey in `children.intake_survey` JSONB (one row per patient)

## Non-goals

- Filling the questionnaire from the patient-facing web app (admin-only for now)
- Q17 lab test selection (handled separately via existing `lab_tests` table)
- Multiple survey versions / historical tracking (single current state only)
- Gender-split forms (male/female surveys are structurally identical)

## Data Model

### Schema changes
```sql
ALTER TABLE children
  ADD COLUMN grade text,
  ADD COLUMN class_height_rank text,
  ADD COLUMN intake_survey jsonb DEFAULT NULL;
```

`grade` (Q5) and `class_height_rank` (Q6) promoted to first-class columns because they may be surfaced elsewhere (case cards, dashboards). Everything else goes in the JSONB blob.

### TypeScript types (`v4/src/shared/types/index.ts`)

```ts
export interface GrowthHistoryEntry {
  age: number;           // 8..16
  height: number | null; // cm; null = unknown
}

export interface IntakeSurvey {
  growth_history: GrowthHistoryEntry[];     // Q4: length 9, ages 8..16
  growth_flags: {                           // Q4 checkboxes
    rapid_growth: boolean;
    slowed: boolean;
    puberty_concern: boolean;
  };
  past_clinic_consult: boolean | null;      // Q9
  parents_interested: boolean | null;       // Q10
  sports_athlete: boolean | null;           // Q12
  sports_event: string;                     // Q12 sub
  child_interested: boolean | null;         // Q13
  chronic_conditions: string;               // Q14 (asthma, allergy, rhinitis, sleep apnea, etc.)
  tanner_stage: 1 | 2 | 3 | 4 | 5 | null;   // Q15
  short_stature_causes: ShortStatureCause[]; // Q16 multi-select
  short_stature_other: string;              // Q16 free text
  updated_at: string;                       // ISO timestamp
}

export type ShortStatureCause =
  | 'parents_short'
  | 'parents_height_gap'
  | 'picky_eating'
  | 'parents_early_stop'
  | 'insufficient_sleep'
  | 'chronic_illness';

export interface Child {
  // ...existing fields...
  grade: string | null;
  class_height_rank: string | null;
  intake_survey: IntakeSurvey | null;
}
```

## UI Design

### Tab switcher
Placed at the top of `AdminPatientDetailPage`, above the 3-column layout. Simple two-tab component. Active tab in primary color (`#667eea`), inactive in neutral gray. Tab state is URL-synced via query param (`?tab=info|visits`, default `visits` to avoid regression).

### 기본 정보 탭 sections

**Section 1: 기본 정보** (children fields)
Two-column grid on desktop:
- 이름 (name) · 차트번호 (chart_number) · 성별 (gender) — read-only chips
- 생년월일 (birth_date) — date input
- 출생 임신주수 (birth_week) · 출생 몸무게 (birth_weight)
- 출생 시 특이사항 (birth_notes) — full-width textarea
- 아버지 키 (father_height) · 어머니 키 (mother_height)
- 희망 키 (desired_height)
- 학년 (grade) · 학급내 키번호 (class_height_rank)

**Section 2: 과거 성장표** (Q4)
- `[엑셀 붙여넣기]` button → modal with textarea accepting TSV (reuse existing pattern from cases measurement table)
- TSV format: 2 columns (age, height) OR 1 column (height, ages inferred 8..16)
- 9-row editable table below the button: age column (read-only) | height (editable) | 변화값 (auto-calculated diff from previous row)
- 3 checkbox chips below table: 최근 부쩍 성장 / 최근 급격 감속 / 성조숙증 걱정

**Section 3: 가족/관심도**
4 Yes/No segmented buttons:
- Q9 과거 성장 클리닉 상담 (예/아니오)
- Q10 양측 부모 관심 (예/아니오)
- Q12 체육 특기생 (예/아니오) → if 예, 종목 text input appears
- Q13 아이 본인 관심 (예/아니오)

**Section 4: 의료/발달**
- Q14 치료 중 질환: textarea with placeholder "천식, 알레르기, 만성비염, 수면 무호흡증 등"
- Q15 사춘기 단계 (Tanner): 5 buttons labeled 1~5, single-select

**Section 5: 키가 작은 원인** (Q16)
- 6 checkbox chips (multi-select): 부모 키 작음 / 부모 키 차이 큼 / 편식 / 부모 조기성장정지 / 수면 부족 / 지속치료질환
- 기타 원인: full-width textarea (always visible)

### Save indicator
Top-right of the tab content: "저장됨 · {relativeTime(updated_at)}" (e.g., "저장됨 · 방금 전"). Turns to "저장 중..." briefly during write.

## Persistence

### Service: `v4/src/features/hospital/services/intakeSurveyService.ts`

```ts
// Update a single children column (birth_week, grade, father_height, etc.)
export async function updateChildField(
  childId: string,
  patch: Partial<Child>,
): Promise<Child>

// Patch intake_survey JSONB (server merges with existing JSON)
export async function updateIntakeSurvey(
  childId: string,
  patch: Partial<IntakeSurvey>,
): Promise<Child>
```

`updateIntakeSurvey` fetches current `intake_survey`, merges patch, writes back with `updated_at` set to now. Single round-trip per field change is acceptable given admin-only, low-frequency usage.

### Auto-save pattern
- Text/number inputs: debounced 500ms `onChange` + flush on `onBlur`
- Checkboxes / Yes-No buttons / Tanner: immediate save on click
- Growth history table: save after each cell blur; paste action saves entire array at once

## File layout

```
v4/scripts/migrations/
  011_children_intake_survey.sql        (ALTER TABLE)

v4/src/shared/types/index.ts            (Child extension + IntakeSurvey)

v4/src/features/hospital/
  services/intakeSurveyService.ts       (new)
  components/intake/
    IntakeSurveyPanel.tsx               (tab root, orchestrates sections)
    IntakeBasicInfoSection.tsx          (Section 1 — children fields)
    IntakeGrowthHistoryTable.tsx        (Section 2 — Q4 table + paste)
    IntakeFamilySection.tsx             (Section 3 — Q9/Q10/Q12/Q13)
    IntakeMedicalSection.tsx            (Section 4 — Q14/Q15)
    IntakeCausesSection.tsx             (Section 5 — Q16)

v4/src/pages/admin/AdminPatientDetailPage.tsx   (add tab switcher)
```

Each section component is self-contained (~100-150 lines), accepts `child: Child` + `onSaved: (child: Child) => void`, and owns its own local state + save calls. Root `IntakeSurveyPanel.tsx` holds the child record and propagates updates.

## Error handling

- Network failure during save: inline error toast "저장 실패 — 재시도" with retry button. Local form state retains user input.
- Invalid numeric input (height not a number): field border turns red, save blocked until fixed.
- Migration idempotency: `ADD COLUMN IF NOT EXISTS` so re-running is safe.

## Testing

Manual QA flow:
1. Open existing patient → 기본 정보 tab loads existing children fields, intake_survey is null
2. Edit father_height → blur → "저장됨 · 방금 전" appears
3. Paste TSV into growth table → 9 rows populated, 변화값 calculated
4. Toggle Tanner 1→2→3 → immediate save per click
5. Refresh page → all values persist
6. Switch to 진료 기록 tab → existing 3-column layout unchanged

No unit tests required for this iteration (matches repo convention — admin features tested manually).

## Open questions

None blocking. Future extensions (out of scope now):
- Print-friendly view of completed survey
- Auto-populate intake from patient-facing 7-step diagnosis form if child links to a user account
- Gender-specific puberty sub-questions (voice change, menarche age) — not in current paper form but could be added later
