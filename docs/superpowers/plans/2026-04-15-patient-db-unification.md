# Patient DB Unification + BoneAgeAI Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify patient data under a single DB schema, rebuild the admin patient chart as a visit-centric view, and port BoneAgeAI (standalone Next.js) into the v4 admin pages with DB persistence.

**Architecture:** Supabase (Postgres + Storage + RLS) stays the backend. `children` remains patient identity. New `visits` table is the hospital-data hub; all hospital tables FK to it. `measurements` is renamed to `hospital_measurements` and gets a `visit_id`. BoneAgeAI `lib/` + components are ported into `v4/src/features/bone-age/` and mounted at admin routes. Atlas 54 WebP images copied into `v4/public/atlas/`.

**Tech Stack:** React 19 + TypeScript 5 + Vite 7 (no SSR); Supabase JS v2; Chart.js 4 + react-chartjs-2; Tailwind 4; Zustand. **No test framework installed** — verification is via `npx tsc --noEmit` + dev-server manual checks + eslint.

**Spec:** `docs/superpowers/specs/2026-04-15-patient-db-unification-design.md`

**Conventions in this plan:**
- Each task ends with type-check + commit.
- SQL migration files live in `v4/scripts/migrations/NNN_<name>.sql`, applied via Supabase SQL Editor.
- Commits use Conventional Commits (feat/fix/refactor/chore/docs).
- "Verify" steps mean: `cd v4 && npm run dev`, open browser, exercise the specific flow, check console clean.

---

## Chunk 1: Phase A — Database Migration

**Outcome:** All new tables live in Supabase with RLS. `measurements` is renamed `hospital_measurements` with a `visit_id` FK. Existing measurement rows preserved via dummy visits. `xray-images` storage bucket ready. Types in `shared/types/index.ts` updated. App still boots.

**Files created:**
- `v4/scripts/migrations/001_create_medications.sql`
- `v4/scripts/migrations/002_create_visits.sql`
- `v4/scripts/migrations/003_rename_measurements_add_visit.sql`
- `v4/scripts/migrations/004_create_xray_readings.sql`
- `v4/scripts/migrations/005_create_lab_tests.sql`
- `v4/scripts/migrations/006_create_prescriptions.sql`
- `v4/scripts/migrations/007_rls_policies.sql`
- `v4/scripts/migrations/008_storage_xray_images.sql`
- `v4/scripts/migrations/README.md` (순서·실행법)
- `v4/src/features/hospital/services/visitService.ts`
- `v4/src/features/hospital/services/hospitalMeasurementService.ts`

**Files modified:**
- `v4/src/shared/types/index.ts` — add Visit, HospitalMeasurement, XrayReading, LabTest, Medication, Prescription; keep Measurement type as alias during transition
- `v4/src/features/growth/services/measurementService.ts` — point to `hospital_measurements`
- `v4/src/stores/childrenStore.ts`, `v4/src/pages/CasesListPage.tsx`, `v4/src/pages/InfoPage.tsx`, `v4/src/pages/RoutinePage.tsx` — table name refs
- `v4/CLAUDE.md` — DB tables section updated

### Task A1: Draft SQL migrations (all tables, no RLS yet)

**Files:**
- Create: `v4/scripts/migrations/001_create_medications.sql`
- Create: `v4/scripts/migrations/002_create_visits.sql`
- Create: `v4/scripts/migrations/004_create_xray_readings.sql`
- Create: `v4/scripts/migrations/005_create_lab_tests.sql`
- Create: `v4/scripts/migrations/006_create_prescriptions.sql`

- [ ] **Step 1: Write `001_create_medications.sql`**

```sql
-- 001: medications (drug master)
CREATE TABLE IF NOT EXISTS medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  default_dose  text,
  unit          text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medications_code ON medications(code);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(is_active) WHERE is_active = true;
```

- [ ] **Step 2: Write `002_create_visits.sql`**

```sql
-- 002: visits (hospital-data hub)
CREATE TABLE IF NOT EXISTS visits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  visit_date       date NOT NULL,
  doctor_id        uuid REFERENCES users(id),
  chief_complaint  text,
  plan             text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visits_child ON visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
```

- [ ] **Step 3: Write `004_create_xray_readings.sql`**

```sql
-- 004: xray_readings
CREATE TABLE IF NOT EXISTS xray_readings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id              uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  xray_date             date NOT NULL,
  image_path            text,
  bone_age_result       numeric(4,2),
  atlas_match_younger   text,
  atlas_match_older     text,
  doctor_memo           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xray_visit ON xray_readings(visit_id);
CREATE INDEX IF NOT EXISTS idx_xray_child_date ON xray_readings(child_id, xray_date DESC);
```

- [ ] **Step 4: Write `005_create_lab_tests.sql`**

```sql
-- 005: lab_tests (single-table polymorphic via test_type + result_data JSONB)
CREATE TABLE IF NOT EXISTS lab_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  test_type       text NOT NULL CHECK (test_type IN ('allergy','organic_acid','blood')),
  collected_date  date,
  result_date     date,
  result_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctor_memo     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_visit ON lab_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_child_type ON lab_tests(child_id, test_type, collected_date DESC);
```

- [ ] **Step 5: Write `006_create_prescriptions.sql`**

```sql
-- 006: prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id),
  dose            text,
  frequency       text,
  duration_days   integer,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_rx_child ON prescriptions(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_medication ON prescriptions(medication_id);
```

- [ ] **Step 6: Commit**

```bash
git add v4/scripts/migrations/001_create_medications.sql v4/scripts/migrations/002_create_visits.sql v4/scripts/migrations/004_create_xray_readings.sql v4/scripts/migrations/005_create_lab_tests.sql v4/scripts/migrations/006_create_prescriptions.sql
git commit -m "feat(db): add migration SQL for medications/visits/xray/lab/rx tables"
```

### Task A2: Migration SQL for `measurements` → `hospital_measurements` + dummy visits

**Files:**
- Create: `v4/scripts/migrations/003_rename_measurements_add_visit.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 003: rename measurements → hospital_measurements, add visit_id
BEGIN;

-- Step A: add visit_id column (nullable first)
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES visits(id) ON DELETE CASCADE;

-- Step B: create one dummy visit per (child_id, measured_date), backfill visit_id
WITH grouped AS (
  SELECT DISTINCT child_id, measured_date FROM measurements WHERE visit_id IS NULL
),
inserted AS (
  INSERT INTO visits (child_id, visit_date, chief_complaint)
  SELECT child_id, measured_date, '(legacy migration)'
  FROM grouped
  RETURNING id, child_id, visit_date
)
UPDATE measurements m
   SET visit_id = i.id
  FROM inserted i
 WHERE m.child_id = i.child_id AND m.measured_date = i.visit_date AND m.visit_id IS NULL;

-- Step C: enforce NOT NULL
ALTER TABLE measurements ALTER COLUMN visit_id SET NOT NULL;

-- Step D: rename table
ALTER TABLE measurements RENAME TO hospital_measurements;

-- Step E: rename indexes to match new table
ALTER INDEX IF EXISTS measurements_pkey RENAME TO hospital_measurements_pkey;
-- (other indexes: leave unchanged; they auto-follow the table)

COMMIT;
```

- [ ] **Step 2: Dry-run check**

Open Supabase SQL Editor, paste the migration, do NOT run it. Click "Explain" or review row counts via:
```sql
SELECT COUNT(*) FROM measurements;
SELECT COUNT(DISTINCT (child_id, measured_date)) FROM measurements;
```
Expected: second count ≤ first (grouped by date). Note the numbers.

- [ ] **Step 3: Commit the SQL file**

```bash
git add v4/scripts/migrations/003_rename_measurements_add_visit.sql
git commit -m "feat(db): add rename-measurements migration with dummy visits backfill"
```

### Task A3: RLS policies

**Files:**
- Create: `v4/scripts/migrations/007_rls_policies.sql`

- [ ] **Step 1: Write the RLS SQL**

```sql
-- 007: RLS for new hospital tables + medications
-- Assumes users.role ∈ ('parent','admin'), and auth.uid() returns users.id
-- IMPORTANT: v4 uses legacy auth (users table, not Supabase auth). RLS here
-- assumes service_role bypasses for admin pages, and parent-side reads use
-- Supabase auth once wired. For now, policies are permissive for authenticated
-- role; tighten in a follow-up.

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xray_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Service role (admin pages) full access
CREATE POLICY "service_role_all_visits" ON visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_hm" ON hospital_measurements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_xray" ON xray_readings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_lab" ON lab_tests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_med" ON medications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rx" ON prescriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated anon reads (temporary permissive; follow-up will tighten to
-- parent-of-child via a users lookup)
CREATE POLICY "auth_read_visits" ON visits FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_hm" ON hospital_measurements FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_xray" ON xray_readings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_lab" ON lab_tests FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_rx" ON prescriptions FOR SELECT TO authenticated, anon USING (true);
-- medications: admin-only (no public read)
```

- [ ] **Step 2: Note RLS follow-up in spec §9 "open issues"**

Append to `docs/superpowers/specs/2026-04-15-patient-db-unification-design.md` §9 (열린 이슈):
> - RLS 초기 정책은 permissive (authenticated/anon read). 환자 앱이 Supabase auth 로 전환되면 `parent_id = auth.uid()` 조건으로 tighten 필요 (follow-up migration).

- [ ] **Step 3: Commit**

```bash
git add v4/scripts/migrations/007_rls_policies.sql docs/superpowers/specs/2026-04-15-patient-db-unification-design.md
git commit -m "feat(db): add permissive RLS policies for new hospital tables"
```

### Task A4: Storage bucket `xray-images`

**Files:**
- Create: `v4/scripts/migrations/008_storage_xray_images.sql`

- [ ] **Step 1: Write storage SQL (mirror `setup_storage.sql`)**

```sql
-- 008: xray-images bucket (PRIVATE — not public like content-images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'xray-images',
  'xray-images',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Admin/authenticated users can upload
CREATE POLICY "xray_upload_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'xray-images');

-- Admin/authenticated users can read their signed URLs
CREATE POLICY "xray_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'xray-images');

-- Service role full access
CREATE POLICY "xray_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'xray-images') WITH CHECK (bucket_id = 'xray-images');
```

- [ ] **Step 2: Commit**

```bash
git add v4/scripts/migrations/008_storage_xray_images.sql
git commit -m "feat(db): add xray-images storage bucket migration"
```

### Task A5: Migration README

**Files:**
- Create: `v4/scripts/migrations/README.md`

- [ ] **Step 1: Write README**

```markdown
# SQL Migrations

Applied manually via Supabase Dashboard → SQL Editor, in numeric order.

## Order

1. `001_create_medications.sql`
2. `002_create_visits.sql`
3. `003_rename_measurements_add_visit.sql` — **irreversible-ish**: backfills dummy visits, renames table
4. `004_create_xray_readings.sql`
5. `005_create_lab_tests.sql`
6. `006_create_prescriptions.sql`
7. `007_rls_policies.sql`
8. `008_storage_xray_images.sql`

## Before 003

Back up the `measurements` table:
```sql
CREATE TABLE measurements_backup AS TABLE measurements;
```

## After 003

Verify:
```sql
SELECT COUNT(*) FROM hospital_measurements WHERE visit_id IS NULL; -- expect 0
SELECT COUNT(*) FROM hospital_measurements;                         -- expect = measurements_backup COUNT
SELECT COUNT(*) FROM visits WHERE chief_complaint = '(legacy migration)';
```

## Rollback (for 003)

```sql
-- Drop renamed table's dependents first in reverse order, then:
ALTER TABLE hospital_measurements RENAME TO measurements;
ALTER TABLE measurements DROP COLUMN visit_id;
-- Optionally: DELETE FROM visits WHERE chief_complaint = '(legacy migration)';
```
```

- [ ] **Step 2: Commit**

```bash
git add v4/scripts/migrations/README.md
git commit -m "docs(db): add migrations README with order and rollback"
```

### Task A6: Apply migrations in Supabase dashboard

**Not a code step.** Manual by the engineer.

- [ ] **Step 1:** In Supabase Dashboard → SQL Editor, run `CREATE TABLE measurements_backup AS TABLE measurements;`
- [ ] **Step 2:** Run `001`, `002` (independent).
- [ ] **Step 3:** Run `003`, verify with the SELECTs in README.
- [ ] **Step 4:** Run `004`, `005`, `006`, `007`, `008`.
- [ ] **Step 5:** In Table Editor, confirm all new tables exist and `measurements` is now `hospital_measurements`.

### Task A7: Update `shared/types/index.ts`

**Files:**
- Modify: `v4/src/shared/types/index.ts`

- [ ] **Step 1: Add new interfaces**

Add (near existing Measurement):
```typescript
export type LabTestType = 'allergy' | 'organic_acid' | 'blood';

export interface Visit {
  id: string;
  child_id: string;
  visit_date: string;
  doctor_id?: string;
  chief_complaint?: string;
  plan?: string;
  notes?: string;
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
```

- [ ] **Step 2: Mark old `Measurement` as deprecated alias**

Replace the existing `Measurement` interface body by extending `HospitalMeasurement`:
```typescript
/** @deprecated Use HospitalMeasurement. Alias kept for backwards compatibility during migration. */
export type Measurement = HospitalMeasurement;
```
This keeps existing call sites compiling.

- [ ] **Step 3: Type-check**

```bash
cd v4 && npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add v4/src/shared/types/index.ts
git commit -m "feat(types): add Visit/HospitalMeasurement/XrayReading/LabTest/Medication/Prescription types"
```

### Task A8: Point existing measurement code at `hospital_measurements`

**Files:**
- Modify: `v4/src/features/growth/services/measurementService.ts`
- Modify: `v4/src/stores/childrenStore.ts`
- Modify: `v4/src/pages/CasesListPage.tsx`, `v4/src/pages/InfoPage.tsx`, `v4/src/pages/RoutinePage.tsx` (only refs to table name)

- [ ] **Step 1: Swap table name in measurementService.ts**

Replace every `.from('measurements')` → `.from('hospital_measurements')`. There are ~5 occurrences (fetch list, fetch latest, create, update, delete).

- [ ] **Step 2: Swap table name in other call sites**

```bash
cd v4 && grep -rn "from('measurements')" src/ || echo "none found"
```
For each remaining hit, replace `measurements` → `hospital_measurements`.

- [ ] **Step 3: Type-check + lint**

```bash
cd v4 && npx tsc --noEmit && npm run lint
```
Expected: both pass.

- [ ] **Step 4: Run dev, verify app still loads patient measurement chart**

```bash
cd v4 && npm run dev
```
Open the app, log in as admin, navigate to a patient detail page with existing measurements. Chart should render unchanged. (Data comes from hospital_measurements now.)

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/growth/services/measurementService.ts v4/src/stores/childrenStore.ts v4/src/pages/CasesListPage.tsx v4/src/pages/InfoPage.tsx v4/src/pages/RoutinePage.tsx
git commit -m "refactor: point measurement queries at hospital_measurements table"
```

### Task A9: Create `visitService.ts`

**Files:**
- Create: `v4/src/features/hospital/services/visitService.ts`

- [ ] **Step 1: Write the service**

```typescript
import type { Visit } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchVisitsForChild(childId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('child_id', childId)
    .order('visit_date', { ascending: false });
  if (error) {
    logger.error('fetchVisitsForChild failed', error);
    throw new Error('내원 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as Visit[];
}

export async function fetchVisit(id: string): Promise<Visit | null> {
  const { data, error } = await supabase.from('visits').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('fetchVisit failed', error);
    throw new Error('내원 기록을 불러오지 못했습니다.');
  }
  return data as Visit;
}

export async function createVisit(input: {
  child_id: string;
  visit_date: string;
  doctor_id?: string;
  chief_complaint?: string;
  plan?: string;
  notes?: string;
}): Promise<Visit> {
  const { data, error } = await supabase.from('visits').insert(input).select().single();
  if (error) {
    logger.error('createVisit failed', error);
    throw new Error('내원 기록 저장에 실패했습니다.');
  }
  return data as Visit;
}

export async function updateVisit(
  id: string,
  patch: Partial<Omit<Visit, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Visit> {
  const { data, error } = await supabase
    .from('visits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateVisit failed', error);
    throw new Error('내원 기록 수정에 실패했습니다.');
  }
  return data as Visit;
}

export async function deleteVisit(id: string): Promise<void> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) {
    logger.error('deleteVisit failed', error);
    throw new Error('내원 기록 삭제에 실패했습니다.');
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd v4 && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/hospital/services/visitService.ts
git commit -m "feat(hospital): add visitService CRUD"
```

### Task A10: Create `hospitalMeasurementService.ts`

**Files:**
- Create: `v4/src/features/hospital/services/hospitalMeasurementService.ts`

- [ ] **Step 1: Write the service**

```typescript
import type { HospitalMeasurement } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchMeasurementsByVisit(visitId: string): Promise<HospitalMeasurement[]> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .select('*')
    .eq('visit_id', visitId)
    .order('measured_date', { ascending: false });
  if (error) {
    logger.error('fetchMeasurementsByVisit failed', error);
    throw new Error('측정 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as HospitalMeasurement[];
}

export async function createMeasurement(input: {
  visit_id: string;
  child_id: string;
  measured_date: string;
  height: number;
  weight?: number;
  bone_age?: number;
  pah?: number;
  doctor_notes?: string;
}): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .insert(input)
    .select()
    .single();
  if (error) {
    logger.error('createMeasurement failed', error);
    throw new Error('측정 기록 저장에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

export async function updateMeasurement(
  id: string,
  patch: Partial<Omit<HospitalMeasurement, 'id' | 'created_at' | 'updated_at'>>,
): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateMeasurement failed', error);
    throw new Error('측정 기록 수정에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

export async function updateMeasurementBoneAge(
  visitId: string,
  boneAge: number,
): Promise<void> {
  // Sync bone_age to the latest measurement of this visit
  const { error } = await supabase
    .from('hospital_measurements')
    .update({ bone_age: boneAge, updated_at: new Date().toISOString() })
    .eq('visit_id', visitId);
  if (error) {
    logger.error('updateMeasurementBoneAge failed', error);
    throw new Error('뼈나이 동기화에 실패했습니다.');
  }
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/services/hospitalMeasurementService.ts
git commit -m "feat(hospital): add hospitalMeasurementService with bone_age sync helper"
```

### Task A11: Update CLAUDE.md v4 DB table list

**Files:**
- Modify: `v4/CLAUDE.md`

- [ ] **Step 1: Edit the "Database Tables" section**

Replace the `measurements` row and append the new rows:

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `hospital_measurements` | id, visit_id, child_id, measured_date, height, weight, bone_age, pah | Renamed from `measurements` |
| `visits` | id, child_id, visit_date, doctor_id, chief_complaint, plan, notes | Hospital-data hub |
| `xray_readings` | id, visit_id, child_id, xray_date, image_path, bone_age_result | BoneAgeAI output |
| `lab_tests` | id, visit_id, child_id, test_type, result_data jsonb, attachments jsonb | allergy/organic_acid/blood |
| `medications` | id, code, name, default_dose, unit, is_active | Drug master |
| `prescriptions` | id, visit_id, child_id, medication_id, dose, frequency, duration_days | Per-visit prescriptions |

- [ ] **Step 2: Commit**

```bash
git add v4/CLAUDE.md
git commit -m "docs(v4): update DB tables section for patient DB unification"
```

---

## Chunk 2: Phase B — Admin Patient Chart UI

**Outcome:** Admin can browse patients, open a patient chart with visits timeline + growth curve + lifestyle summary, create a new visit, and open visit detail with measurement editing. Other visit blocks (X-ray, labs, rx) are stubbed for Chunks 3–4.

**Files created:**
- `v4/src/features/hospital/components/VisitsTimeline.tsx`
- `v4/src/features/hospital/components/VisitForm.tsx`
- `v4/src/features/hospital/components/MeasurementEditor.tsx`
- `v4/src/features/hospital/components/LifestyleSummary.tsx`
- `v4/src/pages/admin/AdminVisitNewPage.tsx`
- `v4/src/pages/admin/AdminVisitDetailPage.tsx`

**Files modified:**
- `v4/src/pages/admin/AdminPatientDetailPage.tsx` — rewrite to chart layout
- `v4/src/app/router.tsx` — add 2 new admin routes

### Task B1: `VisitsTimeline` component

**Files:**
- Create: `v4/src/features/hospital/components/VisitsTimeline.tsx`

- [ ] **Step 1: Write component**

```tsx
import { Link } from 'react-router-dom';
import type { Visit } from '@/shared/types';

export function VisitsTimeline({ childId, visits }: { childId: string; visits: Visit[] }) {
  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        내원 기록이 없습니다.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {visits.map((v) => (
        <li key={v.id}>
          <Link
            to={`/admin/patients/${childId}/visits/${v.id}`}
            className="block rounded-lg border p-3 hover:bg-gray-50"
          >
            <div className="text-sm font-semibold">{v.visit_date}</div>
            {v.chief_complaint && (
              <div className="text-xs text-gray-600 line-clamp-2">{v.chief_complaint}</div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/VisitsTimeline.tsx
git commit -m "feat(admin): add VisitsTimeline component"
```

### Task B2: `MeasurementEditor` component

**Files:**
- Create: `v4/src/features/hospital/components/MeasurementEditor.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useState } from 'react';
import type { HospitalMeasurement } from '@/shared/types';
import { createMeasurement, updateMeasurement }
  from '@/features/hospital/services/hospitalMeasurementService';

interface Props {
  visitId: string;
  childId: string;
  measurement: HospitalMeasurement | null; // null → create new on save
  onSaved: (m: HospitalMeasurement) => void;
}

export function MeasurementEditor({ visitId, childId, measurement, onSaved }: Props) {
  const [height, setHeight] = useState(measurement?.height?.toString() ?? '');
  const [weight, setWeight] = useState(measurement?.weight?.toString() ?? '');
  const [boneAge, setBoneAge] = useState(measurement?.bone_age?.toString() ?? '');
  const [pah, setPah] = useState(measurement?.pah?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        visit_id: visitId,
        child_id: childId,
        measured_date: measurement?.measured_date ?? new Date().toISOString().slice(0, 10),
        height: Number(height),
        weight: weight ? Number(weight) : undefined,
        bone_age: boneAge ? Number(boneAge) : undefined,
        pah: pah ? Number(pah) : undefined,
      };
      const saved = measurement
        ? await updateMeasurement(measurement.id, payload)
        : await createMeasurement(payload);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
      <label className="text-sm">
        키 (cm)
        <input
          type="number" step="0.1"
          value={height} onChange={(e) => setHeight(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="text-sm">
        몸무게 (kg)
        <input
          type="number" step="0.1"
          value={weight} onChange={(e) => setWeight(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="text-sm">
        뼈나이 (세)
        <input
          type="number" step="0.1"
          value={boneAge} onChange={(e) => setBoneAge(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="text-sm">
        PAH (cm)
        <input
          type="number" step="0.1"
          value={pah} onChange={(e) => setPah(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <div className="col-span-2 text-right">
        <button
          type="button" onClick={save} disabled={saving || !height}
          className="rounded bg-[#667eea] px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/MeasurementEditor.tsx
git commit -m "feat(admin): add MeasurementEditor for visit detail"
```

### Task B3: `VisitForm` component (new-visit form)

**Files:**
- Create: `v4/src/features/hospital/components/VisitForm.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useState } from 'react';

export interface VisitFormValues {
  visit_date: string;
  chief_complaint: string;
  plan: string;
  notes: string;
}

export function VisitForm({
  initial,
  onSubmit,
  submitLabel = '저장',
}: {
  initial?: Partial<VisitFormValues>;
  onSubmit: (values: VisitFormValues) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<VisitFormValues>({
    visit_date: initial?.visit_date ?? new Date().toISOString().slice(0, 10),
    chief_complaint: initial?.chief_complaint ?? '',
    plan: initial?.plan ?? '',
    notes: initial?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try { await onSubmit(values); } finally { setBusy(false); }
      }}>
      <label className="block text-sm">
        내원일
        <input
          type="date" required value={values.visit_date}
          onChange={(e) => setValues((v) => ({ ...v, visit_date: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="block text-sm">
        주호소 (chief complaint)
        <input
          type="text" value={values.chief_complaint}
          onChange={(e) => setValues((v) => ({ ...v, chief_complaint: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="block text-sm">
        플랜
        <input
          type="text" value={values.plan}
          onChange={(e) => setValues((v) => ({ ...v, plan: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="block text-sm">
        자유 진료 메모
        <textarea
          rows={5} value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <button
        type="submit" disabled={busy}
        className="rounded bg-[#667eea] px-4 py-2 text-sm text-white disabled:opacity-50">
        {busy ? '저장 중…' : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/VisitForm.tsx
git commit -m "feat(admin): add VisitForm component"
```

### Task B4: `LifestyleSummary` component (read-only card)

**Files:**
- Create: `v4/src/features/hospital/components/LifestyleSummary.tsx`

- [ ] **Step 1: Scope**

Show simple counts for a child over the last 30 days: routines logged, meals recorded, avg sleep hours. Uses existing `daily_routines` / `meals` tables.

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

export function LifestyleSummary({ childId }: { childId: string }) {
  const [stats, setStats] = useState<{ routines: number; meals: number; avgSleep: number | null } | null>(null);

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const [{ data: routines }, { data: meals }] = await Promise.all([
        supabase.from('daily_routines').select('id, sleep_time, wake_time').eq('child_id', childId).gte('routine_date', since),
        supabase.from('meals').select('id, daily_routine_id, daily_routines!inner(child_id, routine_date)').gte('daily_routines.routine_date', since).eq('daily_routines.child_id', childId),
      ]);
      const avgSleep = computeAvgSleep(routines ?? []);
      setStats({ routines: routines?.length ?? 0, meals: meals?.length ?? 0, avgSleep });
    }
    load();
  }, [childId]);

  function computeAvgSleep(rows: { sleep_time?: string | null; wake_time?: string | null }[]): number | null {
    const pairs = rows.filter(r => r.sleep_time && r.wake_time);
    if (pairs.length === 0) return null;
    const hours = pairs.map(r => {
      const [sh, sm] = r.sleep_time!.split(':').map(Number);
      const [wh, wm] = r.wake_time!.split(':').map(Number);
      let dur = (wh * 60 + wm) - (sh * 60 + sm);
      if (dur < 0) dur += 24 * 60;
      return dur / 60;
    });
    return Math.round((hours.reduce((a,b) => a+b, 0) / hours.length) * 10) / 10;
  }

  if (!stats) return <div className="rounded-lg border p-4 text-sm text-gray-400">로딩…</div>;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="최근 30일 루틴" value={`${stats.routines}건`} />
      <Stat label="식사 기록" value={`${stats.meals}건`} />
      <Stat label="평균 수면" value={stats.avgSleep !== null ? `${stats.avgSleep}h` : '—'} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-white p-3"><div className="text-xs text-gray-500">{label}</div><div className="text-lg font-semibold">{value}</div></div>;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/LifestyleSummary.tsx
git commit -m "feat(admin): add LifestyleSummary stat card for patient chart"
```

### Task B5: Rewrite `AdminPatientDetailPage` as the chart layout

**Files:**
- Modify: `v4/src/pages/admin/AdminPatientDetailPage.tsx`

- [ ] **Step 1: Read existing file first**

```bash
cat v4/src/pages/admin/AdminPatientDetailPage.tsx | head -60
```
Note which stores/hooks it imports and what it renders today.

- [ ] **Step 2: Rewrite with the new layout**

```tsx
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Child, Visit } from '@/shared/types';
import { fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { VisitsTimeline } from '@/features/hospital/components/VisitsTimeline';
import { LifestyleSummary } from '@/features/hospital/components/LifestyleSummary';
import { GrowthChart } from '@/shared/components/GrowthChart';
import { supabase } from '@/shared/lib/supabase';

export default function AdminPatientDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoading(true);
      const [{ data: c }, vs] = await Promise.all([
        supabase.from('children').select('*').eq('id', childId).single(),
        fetchVisitsForChild(childId),
      ]);
      setChild(c as Child);
      setVisits(vs);
      setLoading(false);
    })();
  }, [childId]);

  if (!childId) return null;
  if (loading) return <div className="p-6 text-sm text-gray-500">로딩…</div>;
  if (!child) return <div className="p-6 text-sm text-red-500">환자를 찾을 수 없습니다.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <div className="text-sm text-gray-500">
            {child.gender === 'male' ? '남' : '여'} · {child.birth_date}
            {child.father_height && ` · 父 ${child.father_height}cm`}
            {child.mother_height && ` · 母 ${child.mother_height}cm`}
          </div>
        </div>
        <div className="space-x-2">
          <Link
            to={`/admin/patients/${childId}/visits/new`}
            className="rounded bg-[#667eea] px-3 py-2 text-sm text-white">
            + 새 내원 기록
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">내원 기록</h2>
          <VisitsTimeline childId={childId} visits={visits} />
        </aside>
        <main className="space-y-4">
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">성장 곡선</h2>
            <GrowthChart childId={childId} gender={child.gender} birthDate={child.birth_date} />
          </section>
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">생활습관 요약</h2>
            <LifestyleSummary childId={childId} />
          </section>
        </main>
      </div>
    </div>
  );
}
```

> **If existing `GrowthChart` signature differs**, adjust props accordingly. The goal: reuse the same chart that renders measurements for the patient.

- [ ] **Step 3: Type-check**

```bash
cd v4 && npx tsc --noEmit
```
Fix any prop mismatches.

- [ ] **Step 4: Run dev + verify**

```bash
cd v4 && npm run dev
```
Log in as admin → `/admin/patients/<childId>`. See: name header, visits sidebar (empty OK), growth chart, lifestyle summary card.

- [ ] **Step 5: Commit**

```bash
git add v4/src/pages/admin/AdminPatientDetailPage.tsx
git commit -m "refactor(admin): rewrite patient detail as visit-centric chart layout"
```

### Task B6: New-visit page

**Files:**
- Create: `v4/src/pages/admin/AdminVisitNewPage.tsx`

- [ ] **Step 1: Write page**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { createVisit } from '@/features/hospital/services/visitService';
import { VisitForm } from '@/features/hospital/components/VisitForm';
import { useAuthStore } from '@/stores/authStore';

export default function AdminVisitNewPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  if (!childId) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-bold">새 내원 기록</h1>
      <VisitForm
        onSubmit={async (values) => {
          const v = await createVisit({
            child_id: childId,
            doctor_id: user?.id,
            ...values,
          });
          navigate(`/admin/patients/${childId}/visits/${v.id}`);
        }}
        submitLabel="내원 기록 저장" />
    </div>
  );
}
```

- [ ] **Step 2: Check auth store import path**

```bash
cd v4 && grep -r "useAuthStore" src/stores/ | head -3
```
Adjust the import if the hook is exported differently.

- [ ] **Step 3: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/pages/admin/AdminVisitNewPage.tsx
git commit -m "feat(admin): add AdminVisitNewPage"
```

### Task B7: Visit detail page (measurement editing + stubs)

**Files:**
- Create: `v4/src/pages/admin/AdminVisitDetailPage.tsx`

- [ ] **Step 1: Write page (measurement block working, others placeholder)**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { HospitalMeasurement, Visit } from '@/shared/types';
import { fetchVisit, updateVisit } from '@/features/hospital/services/visitService';
import { fetchMeasurementsByVisit } from '@/features/hospital/services/hospitalMeasurementService';
import { MeasurementEditor } from '@/features/hospital/components/MeasurementEditor';
import { VisitForm } from '@/features/hospital/components/VisitForm';

export default function AdminVisitDetailPage() {
  const { childId, visitId } = useParams<{ childId: string; visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [measurement, setMeasurement] = useState<HospitalMeasurement | null>(null);

  useEffect(() => {
    if (!visitId) return;
    (async () => {
      const v = await fetchVisit(visitId);
      setVisit(v);
      const ms = await fetchMeasurementsByVisit(visitId);
      setMeasurement(ms[0] ?? null);
    })();
  }, [visitId]);

  if (!childId || !visitId) return null;
  if (!visit) return <div className="p-6 text-sm text-gray-500">로딩…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내원 상세 · {visit.visit_date}</h1>
        <Link to={`/admin/patients/${childId}`} className="text-sm text-gray-500 hover:underline">
          ← 환자 차트
        </Link>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">내원 정보</h2>
        <VisitForm
          initial={{ visit_date: visit.visit_date, chief_complaint: visit.chief_complaint ?? '',
                     plan: visit.plan ?? '', notes: visit.notes ?? '' }}
          submitLabel="업데이트"
          onSubmit={async (values) => {
            const v = await updateVisit(visit.id, values);
            setVisit(v);
          }} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">측정 (키 / 몸무게 / 뼈나이 / PAH)</h2>
        <MeasurementEditor
          visitId={visit.id} childId={childId}
          measurement={measurement}
          onSaved={setMeasurement} />
      </section>

      <section className="rounded-lg border border-dashed bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">🦴 X-ray / 뼈나이</h2>
        <Link to={`/admin/patients/${childId}/visits/${visit.id}/bone-age`}
              className="text-sm text-[#667eea] hover:underline">
          판독 툴 열기 →
        </Link>
        <div className="mt-2 text-xs text-gray-400">(Phase C 에서 구현)</div>
      </section>

      <section className="rounded-lg border border-dashed bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">🧪 Lab tests</h2>
        <div className="text-xs text-gray-400">(Phase D 에서 구현)</div>
      </section>

      <section className="rounded-lg border border-dashed bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">💊 처방</h2>
        <div className="text-xs text-gray-400">(Phase D 에서 구현)</div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/pages/admin/AdminVisitDetailPage.tsx
git commit -m "feat(admin): add AdminVisitDetailPage with measurement editor (stubs for x-ray/lab/rx)"
```

### Task B8: Wire routes in `router.tsx`

**Files:**
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: Add the two new lazy imports near the admin block**

```tsx
const AdminVisitNewPage = lazy(() => import('@/pages/admin/AdminVisitNewPage'));
const AdminVisitDetailPage = lazy(() => import('@/pages/admin/AdminVisitDetailPage'));
```

- [ ] **Step 2: Add routes under the admin segment**

Inside the admin route array:
```tsx
{
  path: 'patients/:childId/visits/new',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <AdminVisitNewPage />
    </Suspense>
  ),
},
{
  path: 'patients/:childId/visits/:visitId',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <AdminVisitDetailPage />
    </Suspense>
  ),
},
```

- [ ] **Step 3: Type-check + dev-verify E2E**

```bash
cd v4 && npx tsc --noEmit && npm run dev
```
Flow: `/admin/patients` → click a patient → chart renders → click "새 내원 기록" → form appears → save → redirects to visit detail → edit measurement → save → reload → numbers persist. Visits sidebar shows the new row after navigating back.

- [ ] **Step 4: Commit**

```bash
git add v4/src/app/router.tsx
git commit -m "feat(admin): add routes for visits/new and visits/:visitId"
```

### Task B9: (optional) Overlay `daily_routines` self-measurements on chart

**Files:**
- Modify: `v4/src/shared/components/GrowthChart.tsx` (only if time allows)

- [ ] **Step 1: Skip for now** — mark as follow-up in spec §9

Append to spec:
> - 성장 차트에 `daily_routines.daily_height / daily_weight` 를 반투명 오버레이로 표시하는 기능은 Phase B 이후 follow-up.

```bash
git add docs/superpowers/specs/2026-04-15-patient-db-unification-design.md
git commit -m "docs(spec): defer lifestyle overlay on growth chart as follow-up"
```

---

## Chunk 3: Phase C — BoneAgeAI Port

**Outcome:** BoneAgeAI runs natively inside v4 under `/admin/patients/:childId/visits/:visitId/bone-age`. X-ray upload goes to the `xray-images` Supabase bucket. Reading saves into `xray_readings` and syncs `hospital_measurements.bone_age`.

**Files created (copied/ported):**
- `v4/src/features/bone-age/lib/types.ts`
- `v4/src/features/bone-age/lib/atlas.ts`
- `v4/src/features/bone-age/lib/matcher.ts`
- `v4/src/features/bone-age/lib/growthPrediction.ts`
- `v4/src/features/bone-age/components/PatientForm.tsx`
- `v4/src/features/bone-age/components/XrayUpload.tsx`
- `v4/src/features/bone-age/components/XrayPreview.tsx`
- `v4/src/features/bone-age/components/MatchResultView.tsx`
- `v4/src/features/bone-age/components/BoneAgeInput.tsx`
- `v4/src/features/bone-age/components/PredictionResult.tsx`
- `v4/src/features/bone-age/components/BoneAgeChart.tsx` (renamed from BoneAgeAI's GrowthChart)
- `v4/src/features/bone-age/components/BoneAgeTool.tsx` (new container)
- `v4/src/features/bone-age/services/xrayReadingService.ts`
- `v4/src/pages/admin/AdminBoneAgePage.tsx`
- `v4/public/atlas/` (54 WebP files)
- `v4/public/atlas.json`

**Files modified:**
- `v4/src/shared/data/growthStandard.ts` — add missing LMS helper functions (`heightAtSamePercentile`, `calculateHeightPercentileLMS`, `predictAdultHeightLMS`) if absent, or import from bone-age lib
- `v4/src/app/router.tsx` — add bone-age route

### Task C1: Copy atlas assets

**Files:**
- Create: `v4/public/atlas/male/*` (28 WebP), `v4/public/atlas/female/*` (26 WebP)
- Create: `v4/public/atlas.json`

- [ ] **Step 1: Copy files**

```bash
mkdir -p v4/public/atlas/male v4/public/atlas/female
cp -r C:/projects/BoneAgeAI/webapp/public/atlas/male/* v4/public/atlas/male/
cp -r C:/projects/BoneAgeAI/webapp/public/atlas/female/* v4/public/atlas/female/
cp C:/projects/BoneAgeAI/webapp/public/atlas.json v4/public/atlas.json
```

- [ ] **Step 2: Verify counts**

```bash
ls v4/public/atlas/male | wc -l   # expect 28
ls v4/public/atlas/female | wc -l # expect 26
cat v4/public/atlas.json | head -3
```

- [ ] **Step 3: Commit**

```bash
git add v4/public/atlas/ v4/public/atlas.json
git commit -m "chore(assets): copy BoneAgeAI atlas 54 WebP + atlas.json"
```

### Task C2: Port `lib/` files

**Files:**
- Create: `v4/src/features/bone-age/lib/{types,atlas,matcher,growthPrediction}.ts`

- [ ] **Step 1: Copy `lib/types.ts`, `lib/atlas.ts`, `lib/matcher.ts`, `lib/growthPrediction.ts` into `v4/src/features/bone-age/lib/`**

```bash
mkdir -p v4/src/features/bone-age/lib
cp C:/projects/BoneAgeAI/webapp/lib/types.ts v4/src/features/bone-age/lib/types.ts
cp C:/projects/BoneAgeAI/webapp/lib/atlas.ts v4/src/features/bone-age/lib/atlas.ts
cp C:/projects/BoneAgeAI/webapp/lib/matcher.ts v4/src/features/bone-age/lib/matcher.ts
cp C:/projects/BoneAgeAI/webapp/lib/growthPrediction.ts v4/src/features/bone-age/lib/growthPrediction.ts
```

- [ ] **Step 2: Fix import paths in ported files**

Open each file. Replace any `@/lib/...` with relative `./...`. Replace any Next-specific imports (unlikely in lib) with their standalone equivalents.

- [ ] **Step 3: Resolve `growthStandard` dependency**

Both `growthPrediction.ts` and BoneAgeAI's `matcher.ts` (if relevant) reference `./growthStandard`. Two options — pick (b):

(a) Copy `BoneAgeAI/lib/growthStandard.ts` into `v4/src/features/bone-age/lib/` (self-contained, duplicates v4's shared one).
(b) **Chosen:** port missing functions into `v4/src/shared/data/growthStandard.ts` and import from `@/shared/data/growthStandard` in the ported `growthPrediction.ts`.

Add to `v4/src/shared/data/growthStandard.ts` (if missing):
- `heightAtSamePercentile(height: number, atAge: number, targetAge: number, gender: Gender): number`
- `calculateHeightPercentileLMS(height: number, age: number, gender: Gender): number`
- `predictAdultHeightLMS(height: number, atAge: number, gender: Gender): number`

Copy implementations verbatim from `BoneAgeAI/webapp/lib/growthStandard.ts`. Ensure LMS tables present — v4's may already have compatible `MALE_HEIGHT_LMS/FEMALE_HEIGHT_LMS`. Diff and align. If v4's tables are the same, reuse; if different, keep v4's and point the ported functions at them.

- [ ] **Step 4: Type-check**

```bash
cd v4 && npx tsc --noEmit
```
Expected: passes. If unresolved, inspect specific errors and fix imports.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/bone-age/lib/ v4/src/shared/data/growthStandard.ts
git commit -m "feat(bone-age): port BoneAgeAI lib/ (types, atlas, matcher, growthPrediction)"
```

### Task C3: Port components

**Files:**
- Create: `v4/src/features/bone-age/components/*.tsx`

- [ ] **Step 1: Copy components except `GrowthChart.tsx`**

```bash
mkdir -p v4/src/features/bone-age/components
for f in PatientForm XrayUpload XrayPreview MatchResultView BoneAgeInput PredictionResult; do
  cp C:/projects/BoneAgeAI/webapp/components/${f}.tsx v4/src/features/bone-age/components/${f}.tsx
done
cp C:/projects/BoneAgeAI/webapp/components/GrowthChart.tsx v4/src/features/bone-age/components/BoneAgeChart.tsx
```

- [ ] **Step 2: Update imports in copied components**

In each file:
- Replace `'../lib/xxx'` or `'@/lib/xxx'` → `'@/features/bone-age/lib/xxx'`
- If any component imports `'./GrowthChart'`, change to `'./BoneAgeChart'` and update the exported component name
- If `PredictionResult.tsx` uses `next/dynamic`, replace the dynamic import with a normal import (`import { GrowthChart } from './BoneAgeChart'` or equivalent)
- Remove any `'use client'` directives (Vite doesn't need them)

- [ ] **Step 3: Rename `GrowthChart` → `BoneAgeChart` inside the file**

Inside `BoneAgeChart.tsx`, rename the component declaration and default/named export:
```tsx
export function BoneAgeChart(props: ...) { ... }
```
Update any internal references.

- [ ] **Step 4: Type-check**

```bash
cd v4 && npx tsc --noEmit
```
Fix any path / typing issues.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/bone-age/components/
git commit -m "feat(bone-age): port 7 BoneAgeAI components (GrowthChart→BoneAgeChart)"
```

### Task C4: Create `xrayReadingService.ts`

**Files:**
- Create: `v4/src/features/bone-age/services/xrayReadingService.ts`

- [ ] **Step 1: Write service**

```typescript
import type { XrayReading } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { updateMeasurementBoneAge }
  from '@/features/hospital/services/hospitalMeasurementService';

const BUCKET = 'xray-images';

export async function uploadXrayImage(childId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'webp';
  const path = `${childId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) {
    logger.error('uploadXrayImage failed', error);
    throw new Error('X-ray 업로드에 실패했습니다.');
  }
  return path;
}

export async function getXrayImageSignedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data) {
    logger.error('getXrayImageSignedUrl failed', error);
    throw new Error('X-ray 링크 생성에 실패했습니다.');
  }
  return data.signedUrl;
}

export async function fetchXrayReadingsByVisit(visitId: string): Promise<XrayReading[]> {
  const { data, error } = await supabase
    .from('xray_readings').select('*').eq('visit_id', visitId)
    .order('xray_date', { ascending: false });
  if (error) {
    logger.error('fetchXrayReadingsByVisit failed', error);
    throw new Error('X-ray 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as XrayReading[];
}

export async function createXrayReading(input: {
  visit_id: string;
  child_id: string;
  xray_date: string;
  image_path?: string;
  bone_age_result?: number;
  atlas_match_younger?: string;
  atlas_match_older?: string;
  doctor_memo?: string;
}): Promise<XrayReading> {
  const { data, error } = await supabase
    .from('xray_readings').insert(input).select().single();
  if (error) {
    logger.error('createXrayReading failed', error);
    throw new Error('X-ray 판독 저장에 실패했습니다.');
  }
  if (input.bone_age_result !== undefined) {
    // Sync to measurement's bone_age
    await updateMeasurementBoneAge(input.visit_id, input.bone_age_result);
  }
  return data as XrayReading;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/bone-age/services/xrayReadingService.ts
git commit -m "feat(bone-age): add xrayReadingService (upload + CRUD + bone_age sync)"
```

### Task C5: Build `BoneAgeTool` container

**Files:**
- Create: `v4/src/features/bone-age/components/BoneAgeTool.tsx`

- [ ] **Step 1: Assemble the 5-section flow**

Port the logic of `BoneAgeAI/webapp/app/page.tsx` into a single component that accepts `{ child, visitId }` props. It owns the state currently held in `page.tsx` (patient info, xray file, match, bone age input, prediction) and on "판독 저장" button calls `uploadXrayImage` + `createXrayReading`. Patient form auto-fills from the child prop (gender/DOB) and hides those fields.

Key hooks:
- `useEffect` on child → compute age via `computeAge(child.birth_date, new Date())`
- File drop → `uploadXrayImage(child.id, file)` returns `image_path`
- atlas match auto-select using matcher
- "판독 저장" handler calls `createXrayReading({ visit_id, child_id, xray_date, image_path, bone_age_result, atlas_match_*, doctor_memo })`

Layout: reuse the section order from the original `app/page.tsx` with `PatientForm`, `XrayUpload`, `XrayPreview`, `MatchResultView`, `BoneAgeInput`, `PredictionResult`. Swap any `GrowthChart` import to `BoneAgeChart`.

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/bone-age/components/BoneAgeTool.tsx
git commit -m "feat(bone-age): add BoneAgeTool container (child+visit context, save to DB)"
```

### Task C6: `AdminBoneAgePage` + route

**Files:**
- Create: `v4/src/pages/admin/AdminBoneAgePage.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Child } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { BoneAgeTool } from '@/features/bone-age/components/BoneAgeTool';

export default function AdminBoneAgePage() {
  const { childId, visitId } = useParams<{ childId: string; visitId: string }>();
  const [child, setChild] = useState<Child | null>(null);

  useEffect(() => {
    if (!childId) return;
    supabase.from('children').select('*').eq('id', childId).single()
      .then(({ data }) => setChild(data as Child));
  }, [childId]);

  if (!childId || !visitId) return null;
  if (!child) return <div className="p-6 text-sm text-gray-500">로딩…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🦴 뼈나이 판독 · {child.name}</h1>
        <Link to={`/admin/patients/${childId}/visits/${visitId}`}
              className="text-sm text-gray-500 hover:underline">← 내원 상세</Link>
      </header>
      <BoneAgeTool child={child} visitId={visitId} />
    </div>
  );
}
```

- [ ] **Step 2: Register route**

In `router.tsx`:
```tsx
const AdminBoneAgePage = lazy(() => import('@/pages/admin/AdminBoneAgePage'));

// ... inside admin block:
{
  path: 'patients/:childId/visits/:visitId/bone-age',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <AdminBoneAgePage />
    </Suspense>
  ),
},
```

- [ ] **Step 3: Type-check + dev-verify**

```bash
cd v4 && npx tsc --noEmit && npm run dev
```
Flow: patient chart → visit detail → "판독 툴 열기" → BoneAgeAI UI loads, atlas images render, X-ray upload succeeds (verify bucket in Supabase), save commits to `xray_readings` + updates `hospital_measurements.bone_age`.

- [ ] **Step 4: Commit**

```bash
git add v4/src/pages/admin/AdminBoneAgePage.tsx v4/src/app/router.tsx
git commit -m "feat(admin): mount BoneAgeAI at /admin/patients/:childId/visits/:visitId/bone-age"
```

### Task C7: Update v4/CLAUDE.md — note bone-age feature

**Files:**
- Modify: `v4/CLAUDE.md`

- [ ] **Step 1: Add to "Project Structure" the `bone-age/` feature dir and atlas public path.**

- [ ] **Step 2: Commit**

```bash
git add v4/CLAUDE.md
git commit -m "docs(v4): document bone-age feature in CLAUDE.md"
```

---

## Chunk 4: Phase D — Lab Tests + Medications + Prescriptions UI

**Outcome:** Admin can CRUD drug master (`/admin/medications`), record lab tests (3 types, JSONB + PDF attachments) and prescriptions inside visit detail page.

**Files created:**
- `v4/src/features/hospital/services/medicationService.ts`
- `v4/src/features/hospital/services/labTestService.ts`
- `v4/src/features/hospital/services/prescriptionService.ts`
- `v4/src/features/hospital/components/MedicationPicker.tsx`
- `v4/src/features/hospital/components/AllergyLabEditor.tsx`
- `v4/src/features/hospital/components/FreeformLabEditor.tsx` (유기산/혈액 공용)
- `v4/src/features/hospital/components/LabTestsBlock.tsx`
- `v4/src/features/hospital/components/PrescriptionsBlock.tsx`
- `v4/src/pages/admin/AdminMedicationsPage.tsx`

**Files modified:**
- `v4/src/pages/admin/AdminVisitDetailPage.tsx` — replace stubs with real blocks
- `v4/src/app/router.tsx` — add `/admin/medications`

### Task D1: `medicationService.ts`

**Files:**
- Create: `v4/src/features/hospital/services/medicationService.ts`

- [ ] **Step 1: Write service (CRUD)**

```typescript
import type { Medication } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchMedications(opts: { activeOnly?: boolean } = {}): Promise<Medication[]> {
  let q = supabase.from('medications').select('*').order('code');
  if (opts.activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) { logger.error('fetchMedications', error); throw new Error('약품 목록을 불러오지 못했습니다.'); }
  return (data ?? []) as Medication[];
}

export async function createMedication(input: Omit<Medication, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { is_active?: boolean }): Promise<Medication> {
  const { data, error } = await supabase.from('medications').insert(input).select().single();
  if (error) { logger.error('createMedication', error); throw new Error('약품 등록에 실패했습니다.'); }
  return data as Medication;
}

export async function updateMedication(id: string, patch: Partial<Omit<Medication, 'id' | 'created_at' | 'updated_at'>>): Promise<Medication> {
  const { data, error } = await supabase.from('medications').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { logger.error('updateMedication', error); throw new Error('약품 수정에 실패했습니다.'); }
  return data as Medication;
}

export async function deleteMedication(id: string): Promise<void> {
  // soft delete via is_active = false
  const { error } = await supabase.from('medications').update({ is_active: false }).eq('id', id);
  if (error) { logger.error('deleteMedication', error); throw new Error('약품 비활성화에 실패했습니다.'); }
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/services/medicationService.ts
git commit -m "feat(hospital): add medicationService CRUD"
```

### Task D2: `AdminMedicationsPage`

**Files:**
- Create: `v4/src/pages/admin/AdminMedicationsPage.tsx`

- [ ] **Step 1: Write page (list + inline create/edit)**

```tsx
import { useEffect, useState } from 'react';
import type { Medication } from '@/shared/types';
import { fetchMedications, createMedication, updateMedication, deleteMedication }
  from '@/features/hospital/services/medicationService';

export default function AdminMedicationsPage() {
  const [rows, setRows] = useState<Medication[]>([]);
  const [form, setForm] = useState({ code: '', name: '', default_dose: '', unit: '', notes: '' });
  const [editing, setEditing] = useState<string | null>(null);

  async function reload() { setRows(await fetchMedications()); }
  useEffect(() => { reload(); }, []);

  async function submit() {
    if (!form.code || !form.name) return;
    if (editing) await updateMedication(editing, form);
    else await createMedication(form);
    setForm({ code: '', name: '', default_dose: '', unit: '', notes: '' });
    setEditing(null);
    reload();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-xl font-bold">약품 마스터</h1>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">{editing ? '수정' : '신규 등록'}</h2>
        <div className="grid grid-cols-5 gap-2 text-sm">
          <input placeholder="코드" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="rounded border px-2 py-1"/>
          <input placeholder="약명" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded border px-2 py-1"/>
          <input placeholder="기본 용량" value={form.default_dose} onChange={(e) => setForm((f) => ({ ...f, default_dose: e.target.value }))} className="rounded border px-2 py-1"/>
          <input placeholder="단위" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="rounded border px-2 py-1"/>
          <button onClick={submit} className="rounded bg-[#667eea] px-3 py-1 text-white">{editing ? '저장' : '등록'}</button>
        </div>
        <input placeholder="메모 (선택)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-2 w-full rounded border px-2 py-1 text-sm"/>
      </section>

      <section className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">약명</th>
              <th className="px-3 py-2 text-left">기본 용량</th>
              <th className="px-3 py-2 text-left">단위</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className={m.is_active ? '' : 'opacity-40'}>
                <td className="px-3 py-2 font-mono">{m.code}</td>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.default_dose ?? '-'}</td>
                <td className="px-3 py-2">{m.unit ?? '-'}</td>
                <td className="px-3 py-2">{m.is_active ? '활성' : '비활성'}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => { setEditing(m.id); setForm({ code: m.code, name: m.name, default_dose: m.default_dose ?? '', unit: m.unit ?? '', notes: m.notes ?? '' }); }}
                          className="text-xs text-[#667eea] hover:underline">수정</button>
                  {m.is_active && (
                    <button onClick={async () => { if (confirm('비활성화?')) { await deleteMedication(m.id); reload(); } }}
                            className="text-xs text-red-500 hover:underline">비활성화</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Register route in `router.tsx`**

```tsx
const AdminMedicationsPage = lazy(() => import('@/pages/admin/AdminMedicationsPage'));
// ... admin block:
{ path: 'medications', element: <Suspense fallback={<SuspenseFallback />}><AdminMedicationsPage /></Suspense> },
```

- [ ] **Step 3: Type-check + dev-verify + commit**

```bash
cd v4 && npx tsc --noEmit && npm run dev
# visit /admin/medications, create a row, edit, deactivate
git add v4/src/pages/admin/AdminMedicationsPage.tsx v4/src/app/router.tsx
git commit -m "feat(admin): AdminMedicationsPage with inline CRUD"
```

### Task D3: `labTestService.ts`

**Files:**
- Create: `v4/src/features/hospital/services/labTestService.ts`

- [ ] **Step 1: Write service**

```typescript
import type { LabTest, LabTestType } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchLabTestsByVisit(visitId: string): Promise<LabTest[]> {
  const { data, error } = await supabase
    .from('lab_tests').select('*').eq('visit_id', visitId)
    .order('collected_date', { ascending: false });
  if (error) { logger.error('fetchLabTestsByVisit', error); throw new Error('검사 기록을 불러오지 못했습니다.'); }
  return (data ?? []) as LabTest[];
}

export async function createLabTest(input: {
  visit_id: string;
  child_id: string;
  test_type: LabTestType;
  collected_date?: string;
  result_date?: string;
  result_data?: Record<string, unknown>;
  attachments?: { url: string; name: string; mime: string }[];
  doctor_memo?: string;
}): Promise<LabTest> {
  const { data, error } = await supabase
    .from('lab_tests').insert({
      ...input,
      result_data: input.result_data ?? {},
      attachments: input.attachments ?? [],
    }).select().single();
  if (error) { logger.error('createLabTest', error); throw new Error('검사 기록 저장에 실패했습니다.'); }
  return data as LabTest;
}

export async function updateLabTest(id: string, patch: Partial<Omit<LabTest, 'id' | 'created_at' | 'updated_at'>>): Promise<LabTest> {
  const { data, error } = await supabase
    .from('lab_tests').update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) { logger.error('updateLabTest', error); throw new Error('검사 기록 수정에 실패했습니다.'); }
  return data as LabTest;
}

export async function deleteLabTest(id: string): Promise<void> {
  const { error } = await supabase.from('lab_tests').delete().eq('id', id);
  if (error) { logger.error('deleteLabTest', error); throw new Error('검사 기록 삭제에 실패했습니다.'); }
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/services/labTestService.ts
git commit -m "feat(hospital): add labTestService CRUD"
```

### Task D4: `AllergyLabEditor` component

**Files:**
- Create: `v4/src/features/hospital/components/AllergyLabEditor.tsx`

- [ ] **Step 1: Write component (danger + caution food lists)**

```tsx
import { useState } from 'react';

export interface AllergyResultData { danger: string[]; caution: string[]; }

export function AllergyLabEditor({ value, onChange }: {
  value: AllergyResultData;
  onChange: (v: AllergyResultData) => void;
}) {
  const [dangerInput, setDangerInput] = useState('');
  const [cautionInput, setCautionInput] = useState('');

  function addTo(key: 'danger' | 'caution', v: string) {
    const item = v.trim();
    if (!item) return;
    if (value[key].includes(item)) return;
    onChange({ ...value, [key]: [...value[key], item] });
    if (key === 'danger') setDangerInput(''); else setCautionInput('');
  }
  function removeFrom(key: 'danger' | 'caution', item: string) {
    onChange({ ...value, [key]: value[key].filter((x) => x !== item) });
  }

  return (
    <div className="space-y-3">
      <Bucket label="위험 식품" color="bg-red-100 text-red-700" items={value.danger}
              inputValue={dangerInput} onInput={setDangerInput}
              onAdd={(v) => addTo('danger', v)} onRemove={(v) => removeFrom('danger', v)} />
      <Bucket label="주의 식품" color="bg-amber-100 text-amber-700" items={value.caution}
              inputValue={cautionInput} onInput={setCautionInput}
              onAdd={(v) => addTo('caution', v)} onRemove={(v) => removeFrom('caution', v)} />
    </div>
  );
}

function Bucket({ label, color, items, inputValue, onInput, onAdd, onRemove }: {
  label: string; color: string; items: string[]; inputValue: string;
  onInput: (v: string) => void; onAdd: (v: string) => void; onRemove: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((x) => (
          <span key={x} className={`rounded px-2 py-0.5 text-xs ${color}`}>
            {x} <button onClick={() => onRemove(x)} className="ml-1">×</button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(inputValue); } }}
          placeholder="식품명 +Enter"
          className="rounded border px-2 py-0.5 text-xs" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/AllergyLabEditor.tsx
git commit -m "feat(hospital): add AllergyLabEditor component"
```

### Task D5: `FreeformLabEditor` (유기산/혈액 공용)

**Files:**
- Create: `v4/src/features/hospital/components/FreeformLabEditor.tsx`

- [ ] **Step 1: Write component (note textarea + PDF attachment list)**

```tsx
import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

export interface FreeformResultData { note: string; }
export interface LabAttachment { url: string; name: string; mime: string; }

export function FreeformLabEditor({
  childId, value, attachments, onChange, onAttachmentsChange,
}: {
  childId: string;
  value: FreeformResultData;
  attachments: LabAttachment[];
  onChange: (v: FreeformResultData) => void;
  onAttachmentsChange: (a: LabAttachment[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `labs/${childId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('content-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('content-images').getPublicUrl(path);
      onAttachmentsChange([...attachments, { url: data.publicUrl, name: file.name, mime: file.type }]);
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-600">결과 메모</label>
      <textarea rows={4} value={value.note}
                onChange={(e) => onChange({ note: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm" />
      <div>
        <div className="text-xs text-gray-600 mb-1">첨부</div>
        <ul className="text-xs text-gray-700 space-y-1">
          {attachments.map((a, i) => (
            <li key={i}>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-[#667eea] hover:underline">{a.name}</a>
              <button onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                      className="ml-2 text-red-500">삭제</button>
            </li>
          ))}
        </ul>
        <input type="file" accept="application/pdf,image/*"
               onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
               disabled={uploading}
               className="mt-1 text-xs" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/FreeformLabEditor.tsx
git commit -m "feat(hospital): add FreeformLabEditor with PDF attachments"
```

### Task D6: `LabTestsBlock` (tabs for the 3 types)

**Files:**
- Create: `v4/src/features/hospital/components/LabTestsBlock.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useEffect, useState } from 'react';
import type { LabTest, LabTestType } from '@/shared/types';
import { fetchLabTestsByVisit, createLabTest, updateLabTest } from '@/features/hospital/services/labTestService';
import { AllergyLabEditor, type AllergyResultData } from './AllergyLabEditor';
import { FreeformLabEditor, type FreeformResultData, type LabAttachment } from './FreeformLabEditor';

const TABS: { key: LabTestType; label: string }[] = [
  { key: 'allergy', label: '알러지' },
  { key: 'organic_acid', label: '유기산' },
  { key: 'blood', label: '혈액' },
];

export function LabTestsBlock({ visitId, childId }: { visitId: string; childId: string }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [tab, setTab] = useState<LabTestType>('allergy');

  async function reload() { setTests(await fetchLabTestsByVisit(visitId)); }
  useEffect(() => { reload(); }, [visitId]);

  const current = tests.find((t) => t.test_type === tab) ?? null;

  async function save(patch: { result_data: object; attachments?: LabAttachment[] }) {
    if (current) await updateLabTest(current.id, patch);
    else await createLabTest({
      visit_id: visitId, child_id: childId, test_type: tab,
      result_data: patch.result_data, attachments: patch.attachments ?? [],
    });
    reload();
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`rounded px-3 py-1 text-sm ${tab === t.key ? 'bg-[#667eea] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'allergy' ? (
        <AllergyLabEditor
          value={(current?.result_data as AllergyResultData) ?? { danger: [], caution: [] }}
          onChange={(v) => save({ result_data: v, attachments: current?.attachments ?? [] })} />
      ) : (
        <FreeformLabEditor
          childId={childId}
          value={(current?.result_data as FreeformResultData) ?? { note: '' }}
          attachments={current?.attachments ?? []}
          onChange={(v) => save({ result_data: v, attachments: current?.attachments ?? [] })}
          onAttachmentsChange={(a) => save({ result_data: current?.result_data ?? { note: '' }, attachments: a })} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/LabTestsBlock.tsx
git commit -m "feat(hospital): add LabTestsBlock (3-tab interface)"
```

### Task D7: `prescriptionService.ts`

**Files:**
- Create: `v4/src/features/hospital/services/prescriptionService.ts`

- [ ] **Step 1: Write service**

```typescript
import type { Prescription } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

export async function fetchPrescriptionsByVisit(visitId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions').select('*').eq('visit_id', visitId)
    .order('created_at', { ascending: false });
  if (error) { logger.error('fetchPrescriptionsByVisit', error); throw new Error('처방을 불러오지 못했습니다.'); }
  return (data ?? []) as Prescription[];
}

export async function createPrescription(input: {
  visit_id: string; child_id: string; medication_id: string;
  dose?: string; frequency?: string; duration_days?: number; notes?: string;
}): Promise<Prescription> {
  const { data, error } = await supabase.from('prescriptions').insert(input).select().single();
  if (error) { logger.error('createPrescription', error); throw new Error('처방 저장에 실패했습니다.'); }
  return data as Prescription;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) { logger.error('deletePrescription', error); throw new Error('처방 삭제에 실패했습니다.'); }
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/services/prescriptionService.ts
git commit -m "feat(hospital): add prescriptionService CRUD"
```

### Task D8: `MedicationPicker` component

**Files:**
- Create: `v4/src/features/hospital/components/MedicationPicker.tsx`

- [ ] **Step 1: Write component (code/name search select)**

```tsx
import { useEffect, useState, useMemo } from 'react';
import type { Medication } from '@/shared/types';
import { fetchMedications } from '@/features/hospital/services/medicationService';

export function MedicationPicker({ value, onChange }: { value: string | null; onChange: (id: string, m: Medication) => void }) {
  const [all, setAll] = useState<Medication[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => { fetchMedications({ activeOnly: true }).then(setAll); }, []);

  const filtered = useMemo(() =>
    all.filter((m) => {
      const q = query.toLowerCase();
      return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }).slice(0, 20), [all, query]);

  return (
    <div>
      <input placeholder="약품 검색 (코드/이름)"
             value={query} onChange={(e) => setQuery(e.target.value)}
             className="w-full rounded border px-2 py-1 text-sm" />
      <ul className="mt-1 max-h-40 overflow-y-auto rounded border bg-white text-sm">
        {filtered.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onChange(m.id, m)}
                    className={`w-full px-2 py-1 text-left hover:bg-gray-50 ${value === m.id ? 'bg-[#eef2ff]' : ''}`}>
              <span className="font-mono">{m.code}</span> · {m.name}
              {m.default_dose && <span className="text-xs text-gray-500"> ({m.default_dose}{m.unit ?? ''})</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/MedicationPicker.tsx
git commit -m "feat(hospital): add MedicationPicker component"
```

### Task D9: `PrescriptionsBlock` component

**Files:**
- Create: `v4/src/features/hospital/components/PrescriptionsBlock.tsx`

- [ ] **Step 1: Write component (list + add-row form)**

```tsx
import { useEffect, useState } from 'react';
import type { Prescription, Medication } from '@/shared/types';
import { fetchPrescriptionsByVisit, createPrescription, deletePrescription }
  from '@/features/hospital/services/prescriptionService';
import { MedicationPicker } from './MedicationPicker';

export function PrescriptionsBlock({ visitId, childId }: { visitId: string; childId: string }) {
  const [rows, setRows] = useState<Prescription[]>([]);
  const [medLabel, setMedLabel] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<{ id: string; m: Medication } | null>(null);
  const [dose, setDose] = useState(''); const [freq, setFreq] = useState('');
  const [dur, setDur] = useState(''); const [notes, setNotes] = useState('');

  async function reload() {
    const list = await fetchPrescriptionsByVisit(visitId);
    setRows(list);
  }
  useEffect(() => { reload(); }, [visitId]);

  async function add() {
    if (!picked) return;
    await createPrescription({
      visit_id: visitId, child_id: childId, medication_id: picked.id,
      dose: dose || picked.m.default_dose, frequency: freq, duration_days: dur ? Number(dur) : undefined,
      notes,
    });
    setMedLabel((prev) => ({ ...prev, [picked.id]: `${picked.m.code} · ${picked.m.name}` }));
    setPicked(null); setDose(''); setFreq(''); setDur(''); setNotes('');
    reload();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border px-2 py-1">
            <span><span className="font-mono text-xs text-gray-500">{medLabel[p.medication_id] ?? p.medication_id}</span>
              {p.dose && <> · {p.dose}</>} {p.frequency && <> · {p.frequency}</>} {p.duration_days && <> · {p.duration_days}일</>}
            </span>
            <button onClick={async () => { if (confirm('처방 삭제?')) { await deletePrescription(p.id); reload(); } }}
                    className="text-xs text-red-500">삭제</button>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-gray-400">처방 없음</li>}
      </ul>

      <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
        <div className="text-xs font-semibold">처방 추가</div>
        <MedicationPicker value={picked?.id ?? null} onChange={(id, m) => setPicked({ id, m })} />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <input placeholder="용량" value={dose} onChange={(e) => setDose(e.target.value)} className="rounded border px-2 py-1" />
          <input placeholder="빈도 (1일 2회)" value={freq} onChange={(e) => setFreq(e.target.value)} className="rounded border px-2 py-1" />
          <input placeholder="기간 (일)" type="number" value={dur} onChange={(e) => setDur(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <input placeholder="메모" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border px-2 py-1 text-xs" />
        <button onClick={add} disabled={!picked} className="rounded bg-[#667eea] px-3 py-1 text-xs text-white disabled:opacity-50">
          + 추가
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/hospital/components/PrescriptionsBlock.tsx
git commit -m "feat(hospital): add PrescriptionsBlock with MedicationPicker"
```

### Task D10: Wire blocks into `AdminVisitDetailPage`

**Files:**
- Modify: `v4/src/pages/admin/AdminVisitDetailPage.tsx`

- [ ] **Step 1: Replace the Lab/RX stub sections**

```tsx
import { LabTestsBlock } from '@/features/hospital/components/LabTestsBlock';
import { PrescriptionsBlock } from '@/features/hospital/components/PrescriptionsBlock';

// ... replace the lab stub:
<section className="rounded-lg border bg-white p-4">
  <h2 className="mb-2 text-sm font-semibold">🧪 Lab tests</h2>
  <LabTestsBlock visitId={visit.id} childId={childId} />
</section>

// ... replace the rx stub:
<section className="rounded-lg border bg-white p-4">
  <h2 className="mb-2 text-sm font-semibold">💊 처방</h2>
  <PrescriptionsBlock visitId={visit.id} childId={childId} />
</section>
```

Leave the X-ray section's "판독 툴 열기" link — that's already wired to Chunk 3's page.

- [ ] **Step 2: Type-check + dev E2E**

```bash
cd v4 && npx tsc --noEmit && npm run dev
```
Flow:
1. Visit detail → lab tabs work (allergy tag entry, organic_acid/blood free-text + PDF)
2. Prescriptions → pick medication → dose/freq/duration → row appears
3. Reload page → everything persists

- [ ] **Step 3: Commit**

```bash
git add v4/src/pages/admin/AdminVisitDetailPage.tsx
git commit -m "feat(admin): wire LabTestsBlock + PrescriptionsBlock into visit detail"
```

### Task D11: Admin nav update (add "약품 마스터" link)

**Files:**
- Modify: `v4/src/features/admin/components/AdminLayout.tsx`

- [ ] **Step 1: Add nav item**

Inside the admin sidebar/topbar, add a link to `/admin/medications` labeled "약품 마스터".

- [ ] **Step 2: Commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/admin/components/AdminLayout.tsx
git commit -m "feat(admin): add 약품 마스터 nav link"
```

### Task D12: Update v4/CLAUDE.md — full surface

**Files:**
- Modify: `v4/CLAUDE.md`

- [ ] **Step 1: In "Project Structure", add `features/hospital/` section**

```
hospital/
  components/   VisitsTimeline, VisitForm, MeasurementEditor, LifestyleSummary,
                LabTestsBlock, AllergyLabEditor, FreeformLabEditor,
                MedicationPicker, PrescriptionsBlock
  services/     visitService, hospitalMeasurementService,
                medicationService, labTestService, prescriptionService
bone-age/
  lib/          types, atlas, matcher, growthPrediction
  components/   PatientForm, XrayUpload, XrayPreview, MatchResultView,
                BoneAgeInput, PredictionResult, BoneAgeChart, BoneAgeTool
  services/     xrayReadingService
```

- [ ] **Step 2: In "App Navigation" add the new admin routes**

- [ ] **Step 3: Commit**

```bash
git add v4/CLAUDE.md
git commit -m "docs(v4): document hospital + bone-age feature surface"
```

---

## Post-Implementation Checklist

- [ ] All migrations applied in Supabase dashboard
- [ ] `npx tsc --noEmit` passes in `v4/`
- [ ] `npm run lint` passes in `v4/`
- [ ] `npm run build` passes
- [ ] Manual smoke: log in as admin → patients → chart → new visit → measurement save → bone-age tool → X-ray upload → reading save → lab tests 3 tabs → prescription add — all work, all persist across reload
- [ ] Memory + CLAUDE.md updated

## Rollback / Safety Notes

- `measurements` table backed up before running `003`. If anything breaks, restore with `DROP TABLE hospital_measurements; ALTER TABLE measurements_backup RENAME TO measurements;` (and revert code).
- Ported `growthStandard` additions are in `shared/data` — diff carefully against v4's existing LMS tables. If tables differ, the bone-age feature should use its own self-contained table copy to avoid regressing the patient app's growth chart.
- All new storage keys are in `xray-images` bucket; nothing else is touched.
