# 환자 셀프 설문지(공개 인테이크) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 처음 연락 온 환자에게 국적별 언어로 번역된 셀프 설문 페이지를 제공하고, 제출물을 대기함에 모아 어드민이 검토·승인하면 정식 환자(`children`)로 전환(해외는 `th0001` 자동 채번)하는 파이프라인을 구축한다.

**Architecture:** React 공개 라우트 `/intake/:lang`(스텝 마법사) → 브라우저에서 anon key로 `intake_submissions` staging 테이블 insert + `intake-uploads` 비공개 버킷 업로드 → 어드민 `/admin/intake` 검토함에서 승인 시 `children` 생성 + 파일을 정식 버킷으로 복사 + `intake_survey` 이식. 번역은 `intakeLabels.ts`(lang별 타입 객체, `calcLabels.ts` 패턴).

**Tech Stack:** React 19 + TS + Vite, Tailwind 4, Supabase(JS client, anon key, permissive RLS), Postgres 함수(채번). 스펙: `docs/superpowers/specs/2026-06-04-patient-intake-survey-design.md`.

**테스트 현실(중요):** v4는 React 단위테스트 러너가 없다(`node --test`는 `scripts/test/*.mjs` 빌드 스크립트 전용). 본 계획은 검증을 **(1) `npx tsc --noEmit` 타입체크 (2) Supabase MCP `execute_sql`로 DB/함수 검증 (3) `npm run dev` 스모크 테스트**로 한다. 새 테스트 프레임워크는 도입하지 않는다(범위 밖).

**커밋 정책(중요):** 이 프로젝트는 사용자 **"업데이트"** 키워드로만 커밋/푸시한다. 아래 각 Task의 "Checkpoint" 스텝은 *작업 완료 + staging 준비* 의미이며, 실제 `git commit`은 사용자가 "업데이트" 할 때 일괄 수행한다. (executor는 임의 커밋 금지.)

---

## File Structure

신규:
- `v4/scripts/migrations/018_intake_submissions.sql` — 테이블 + 채번 함수 + 버킷/정책 SQL.
- `v4/src/features/intake/types.ts` — `IntakeSubmission`, `UploadMeta`, 폼 상태 타입.
- `v4/src/features/intake/intakeLabels.ts` — lang별 번역 객체(ko/th/vi/en) + `LANG_DEFAULT_COUNTRY`.
- `v4/src/features/intake/publicIntakeService.ts` — 파일 업로드 + submission insert.
- `v4/src/features/intake/components/StepBasic.tsx` — 1 기본정보.
- `v4/src/features/intake/components/StepGrowth.tsx` — 2 과거 성장기록.
- `v4/src/features/intake/components/StepFamily.tsx` — 3 가족·관심.
- `v4/src/features/intake/components/StepMedical.tsx` — 4 의료문진.
- `v4/src/features/intake/components/StepCauses.tsx` — 5 키 작은 원인.
- `v4/src/features/intake/components/StepUploads.tsx` — 6 업로드.
- `v4/src/features/intake/components/fields.tsx` — 공용 입력 프리미티브(Text/Number/Select/YesNo/Date3).
- `v4/src/features/intake/pages/PublicIntakePage.tsx` — 스텝 마법사 오케스트레이터 + 완료 화면.
- `v4/src/features/admin/services/intakeSubmissionService.ts` — 목록/승인/반려 + 채번 헬퍼.
- `v4/src/features/admin/components/IntakeSubmissionDetail.tsx` — 상세 + 승인/반려 모달.
- `v4/src/pages/admin/AdminIntakePage.tsx` — 접수함 목록.

수정:
- `v4/src/shared/types/index.ts` — `IntakeSubmission` 재노출(또는 features/intake/types에서 import).
- `v4/src/app/router.tsx` — `/intake/:lang` 공개 + `/admin/intake` 어드민 라우트.
- `v4/src/features/admin/services/adminService.ts` — `createPatient` 확장(country·name_en·연락처·intake_survey 옵셔널).
- `v4/src/features/admin/AdminLayout.tsx` — 사이드바 "📥 설문 접수" + 대기 뱃지.

---

## Task 1: DB 마이그레이션 + 채번 함수 + 버킷

**Files:**
- Create: `v4/scripts/migrations/018_intake_submissions.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`v4/scripts/migrations/018_intake_submissions.sql`:
```sql
-- ============================================================
-- 018: intake_submissions (환자 셀프 설문 대기함) + 국가별 채번 함수
-- 공개 폼(/intake/:lang) 제출 → 대기함 → 어드민 승인 시 children 생성.
-- spec: docs/superpowers/specs/2026-06-04-patient-intake-survey-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS intake_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text UNIQUE NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  lang              text NOT NULL,
  country           text,
  status            text NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  name              text,
  name_en           text,
  gender            text,
  birth_date        date,
  father_height     numeric,
  mother_height     numeric,
  desired_height    numeric,
  grade             text,
  class_height_rank text,
  phone             text,
  email             text,
  address           text,
  intake_survey     jsonb,
  uploads           jsonb NOT NULL DEFAULT '[]'::jsonb,
  child_id          uuid REFERENCES children(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  reject_reason     text
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_status
  ON intake_submissions (status, created_at DESC);

-- permissive RLS (기존 임상 테이블과 동일 포스처)
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS intake_submissions_all ON intake_submissions;
CREATE POLICY intake_submissions_all ON intake_submissions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 국가별 채번: chart_number ~ '^{cc}[0-9]+$' 중 최대 + 1, 4자리 zero-pad.
CREATE OR REPLACE FUNCTION next_country_chart_number(cc text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text := lower(cc);
  maxnum int;
BEGIN
  SELECT COALESCE(MAX( (substring(chart_number from '^' || prefix || '([0-9]+)$'))::int ), 0)
    INTO maxnum
    FROM children
   WHERE chart_number ~ ('^' || prefix || '[0-9]+$');
  RETURN prefix || lpad((maxnum + 1)::text, 4, '0');
END;
$$;

SELECT 'intake_submissions + next_country_chart_number created' AS status;
```

- [ ] **Step 2: 마이그레이션 적용 (Supabase MCP)**

dflo Supabase 프로젝트(주의: tangobook `fxzwigjkbsptvsjraqwa` 아님 — dflo 프로젝트 ref를 `v4/.env`의 `VITE_SUPABASE_URL`에서 확인)에 `apply_migration` 또는 `execute_sql`로 위 SQL 실행. MCP 권한 차단 시 사용자에게 Dashboard 수동 실행 요청.

- [ ] **Step 3: 테이블/함수 검증 (SQL)**

`execute_sql`:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='intake_submissions' ORDER BY ordinal_position;
SELECT next_country_chart_number('th');  -- 기존 th 환자 없으면 'th0001'
```
Expected: 컬럼 목록 출력 + `th0001` 반환.

- [ ] **Step 4: `intake-uploads` 비공개 버킷 생성**

Supabase Dashboard 또는 `setup_storage.mjs` 패턴으로 비공개 버킷 `intake-uploads` 생성. anon insert 허용(기존 xray-images anon 업로드 정책과 동일하게 storage.objects RLS):
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('intake-uploads','intake-uploads', false)
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS intake_uploads_insert ON storage.objects;
CREATE POLICY intake_uploads_insert ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'intake-uploads');
DROP POLICY IF EXISTS intake_uploads_read ON storage.objects;
CREATE POLICY intake_uploads_read ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'intake-uploads');
```

- [ ] **Step 5: Checkpoint** — `018_intake_submissions.sql` 저장 완료, DB에 테이블·함수·버킷 적용 확인. (커밋은 "업데이트" 시)

---

## Task 2: 타입 + 번역(intakeLabels) + lang→country

**Files:**
- Create: `v4/src/features/intake/types.ts`
- Create: `v4/src/features/intake/intakeLabels.ts`
- Modify: `v4/src/shared/types/index.ts` (IntakeSubmission 재노출)

- [ ] **Step 1: `types.ts` 작성**

```ts
import type { IntakeSurvey } from '@/shared/types';

export type IntakeLang = 'ko' | 'th' | 'vi' | 'en';
export const INTAKE_LANGS: IntakeLang[] = ['ko', 'th', 'vi', 'en'];

export interface UploadMeta {
  kind: 'xray' | 'lab';
  path: string;       // intake-uploads 내 경로
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
}

/** 공개 폼 로컬 상태(제출 전). DB insert payload로 변환됨. */
export interface IntakeFormState {
  name: string;
  name_en: string;
  gender: 'male' | 'female' | '';
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  country: string;
  father_height: string;
  mother_height: string;
  desired_height: string;
  grade: string;
  class_height_rank: string;
  phone: string;
  email: string;
  address: string;
  survey: IntakeSurvey;
  xrayFiles: File[];
  labFiles: File[];
}
```

- [ ] **Step 2: `intakeLabels.ts` 작성 (ko 소스 + th/vi/en + lang→country)**

키 구조(모든 lang 동일 키, 값만 번역). ko를 소스로 작성하고 th/vi/en 번역을 채운다. 최소 키 집합:
```ts
import type { IntakeLang } from './types';

export const LANG_DEFAULT_COUNTRY: Record<IntakeLang, string> = {
  ko: 'KR', th: 'TH', vi: 'VN', en: 'US',
};

export interface IntakeLabelSet {
  pageTitle: string;
  stepOf: (n: number, total: number) => string;
  next: string; prev: string; submit: string; submitting: string;
  doneTitle: string;            // "감사합니다"
  doneBody: string;             // 짧은 안내
  retry: string;
  required: string;             // "필수 항목입니다"
  // step titles
  s1Title: string; s2Title: string; s3Title: string; s4Title: string; s5Title: string; s6Title: string;
  // step1 fields
  name: string; nameEn: string; gender: string; male: string; female: string;
  birth: string; year: string; month: string; day: string;
  country: string; fatherH: string; motherH: string; desiredH: string;
  grade: string; classRank: string; phone: string; email: string; address: string;
  // step2 growth
  growthHint: string; ageCol: string; heightCol: string;
  flagRapid: string; flagSlowed: string; flagPuberty: string;
  // step3 family (yes/no)
  yes: string; no: string;
  pastConsult: string; parentsInterested: string; sportsAthlete: string; sportsEvent: string; childInterested: string;
  // step4 medical
  chronic: string; tanner: string; tannerOpts: string[]; // 5 descriptions
  // step5 causes
  causes: string; causeOpts: { value: string; label: string }[]; causesOther: string;
  // step6 uploads
  xrayUpload: string; labUpload: string; uploadHint: string;
}

export const INTAKE_LABELS: Record<IntakeLang, IntakeLabelSet> = {
  ko: { /* 한국어 원문 — 아래 키 전부 채움 */ } as IntakeLabelSet,
  th: { /* ไทย */ } as IntakeLabelSet,
  vi: { /* Tiếng Việt */ } as IntakeLabelSet,
  en: { /* English */ } as IntakeLabelSet,
};

export function getLabels(lang: IntakeLang): IntakeLabelSet { return INTAKE_LABELS[lang]; }
```
실제 구현 시 ko 값을 어드민 `IntakeSurveyPanel`/문진표 문구에서 가져와 채우고, th/vi/en은 번역. (번역은 콘텐츠 — 4개 언어 모두 동일 키를 채운다. 빈 값/플레이스홀더 금지.)

`causeOpts.value`는 `ShortStatureCause` enum과 일치시킬 것(`src/shared/types`의 정의 확인 후 동일 value 사용).

- [ ] **Step 3: `shared/types/index.ts`에서 재노출**

```ts
export type { IntakeSubmission, UploadMeta, IntakeLang } from '@/features/intake/types';
```
(순환 import 주의 — `features/intake/types.ts`가 `IntakeSurvey`만 shared에서 가져오므로 OK.)

- [ ] **Step 4: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음(EXIT 0).

- [ ] **Step 5: Checkpoint** — 타입/번역 파일 컴파일 통과.

---

## Task 3: 공개 제출 서비스(업로드 + insert)

**Files:**
- Create: `v4/src/features/intake/publicIntakeService.ts`

- [ ] **Step 1: 서비스 작성**

```ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { IntakeFormState, IntakeLang, UploadMeta } from './types';

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

const ALLOWED = ['jpg','jpeg','png','webp','heic','pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

function ext(name: string): string { return (name.split('.').pop() ?? '').toLowerCase(); }

export function validateFile(f: File): string | null {
  if (!ALLOWED.includes(ext(f.name))) return 'unsupported';
  if (f.size > MAX_BYTES) return 'too_large';
  return null;
}

async function uploadOne(token: string, kind: 'xray'|'lab', file: File, idx: number): Promise<UploadMeta> {
  const path = `${token}/${kind}-${idx}.${ext(file.name)}`;
  const { error } = await supabase.storage.from('intake-uploads').upload(path, file, {
    contentType: file.type || undefined, upsert: false,
  });
  if (error) { logger.error('intake upload failed', error); throw new Error('upload_failed'); }
  return { kind, path, filename: file.name, size: file.size, contentType: file.type };
}

/** birthYear/Month/Day → 'YYYY-MM-DD' (빈값이면 undefined). */
function composeBirth(s: IntakeFormState): string | undefined {
  if (!s.birthYear || !s.birthMonth || !s.birthDay) return undefined;
  const p = (v: string, n: number) => v.padStart(n, '0');
  return `${p(s.birthYear,4)}-${p(s.birthMonth,2)}-${p(s.birthDay,2)}`;
}

function num(v: string): number | undefined {
  const t = v.trim(); if (t === '') return undefined; const n = Number(t); return Number.isNaN(n) ? undefined : n;
}

export async function submitIntake(lang: IntakeLang, s: IntakeFormState): Promise<void> {
  const token = randomToken();
  const uploads: UploadMeta[] = [];
  let i = 0;
  for (const f of s.xrayFiles) uploads.push(await uploadOne(token, 'xray', f, i++));
  i = 0;
  for (const f of s.labFiles) uploads.push(await uploadOne(token, 'lab', f, i++));

  const payload = {
    token, lang,
    country: s.country || null,
    status: 'pending',
    name: s.name || null,
    name_en: s.name_en || null,
    gender: s.gender || null,
    birth_date: composeBirth(s) ?? null,
    father_height: num(s.father_height) ?? null,
    mother_height: num(s.mother_height) ?? null,
    desired_height: num(s.desired_height) ?? null,
    grade: s.grade || null,
    class_height_rank: s.class_height_rank || null,
    phone: s.phone || null,
    email: s.email || null,
    address: s.address || null,
    intake_survey: { ...s.survey, updated_at: new Date().toISOString() },
    uploads,
  };
  const { error } = await supabase.from('intake_submissions').insert(payload);
  if (error) { logger.error('intake submit failed', error); throw new Error('submit_failed'); }
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 3: Checkpoint** — 서비스 컴파일 통과.

---

## Task 4: 공용 입력 프리미티브 + 스텝 컴포넌트 + 마법사 페이지 + 라우트

**Files:**
- Create: `v4/src/features/intake/components/fields.tsx`
- Create: `v4/src/features/intake/components/Step{Basic,Growth,Family,Medical,Causes,Uploads}.tsx`
- Create: `v4/src/features/intake/pages/PublicIntakePage.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: `fields.tsx` — 공용 프리미티브**

controlled input 프리미티브 작성: `TextField`, `NumberField`, `SelectField`, `YesNoField`, `Date3Field`(년/월/일 3 number), `ChipMulti`(다중선택). 각 props `{label, value, onChange, required?, error?}`. Tailwind 모바일 우선 스타일(기존 IntakeBasicInfoSection 프리미티브 톤 재사용). 라벨 텍스트는 호출부에서 `getLabels(lang)`로 주입.

- [ ] **Step 2: 스텝 컴포넌트 6개**

각 스텝은 `{ state: IntakeFormState; set: (patch: Partial<IntakeFormState>) => void; L: IntakeLabelSet; errors: Record<string,string> }` props. fields 프리미티브로 해당 섹션 렌더:
- `StepBasic`: name·name_en·gender·Date3(birth)·country(SelectField, COUNTRIES from `@/shared/data/countries`)·부모키·희망키·grade·classRank·phone·email·address.
- `StepGrowth`: 8~16세 키 테이블(빈칸 허용 → `survey.growth_history`) + growth_flags 3 체크.
- `StepFamily`: YesNo(pastConsult/parentsInterested/sportsAthlete/childInterested) + sportsEvent text.
- `StepMedical`: chronic text + tanner SelectField(설명형 보기 `L.tannerOpts`).
- `StepCauses`: ChipMulti(`L.causeOpts`) → `survey.short_stature_causes` + causesOther text.
- `StepUploads`: xray 파일 input(다중, accept image/*) → `xrayFiles`; lab 파일 input(다중, accept image/*,application/pdf) → `labFiles`. 각 파일 `validateFile`로 거르고 거부 시 인라인 메시지. 선택 파일 목록 표시 + 개별 삭제.

- [ ] **Step 3: `PublicIntakePage.tsx` — 마법사**

```tsx
// 핵심 로직(요지): useParams lang → INTAKE_LANGS 검증, 아니면 'ko'.
// const L = getLabels(lang); const [step, setStep] = useState(0);
// const [state, setState] = useState<IntakeFormState>(초기값: country = LANG_DEFAULT_COUNTRY[lang], survey 기본 빈 구조);
// const STEPS = [StepBasic, StepGrowth, StepFamily, StepMedical, StepCauses, StepUploads];
// 검증: validateStep(step, state) → errors. step0 필수(name/gender/birth/country/phone), step6 파일은 선택.
// next: 검증 통과 시 setStep+1; 마지막 step에서 submit.
// submit: setSubmitting; await submitIntake(lang, state); setDone(true). 실패 시 error + retry.
// done이면 완료 화면(L.doneTitle "감사합니다" + L.doneBody) 렌더.
// 상단 진행 표시 L.stepOf(step+1, 6), 하단 prev/next/submit 버튼.
```
초기 `survey`는 `IntakeSurvey` 빈 구조: `{ growth_history: [], growth_flags:{rapid_growth:false,slowed:false,puberty_concern:false}, past_clinic_consult:null, parents_interested:null, sports_athlete:null, sports_event:'', child_interested:null, chronic_conditions:'', tanner_stage:null, short_stature_causes:[], short_stature_other:'', updated_at:'' }`.

- [ ] **Step 4: 라우트 등록 — `router.tsx`**

`IntakeDiagnosisPage` 라우트 인근에 lazy + public route 추가:
```tsx
const PublicIntakePage = lazy(() => import('@/features/intake/pages/PublicIntakePage'));
// routes 배열에:
{ path: '/intake/:lang', element: <Suspense fallback={<LoadingSpinner/>}><PublicIntakePage/></Suspense> },
{ path: '/intake', element: <Navigate to="/intake/ko" replace /> },
```
(기존 router의 Suspense/fallback 패턴에 맞춰 작성. ProtectedRoute로 감싸지 말 것 — 공개.)

- [ ] **Step 5: 타입체크 + 스모크**

Run: `cd v4 && npx tsc --noEmit` → EXIT 0.
Run: `cd v4 && npm run dev` 후 브라우저 `/intake/th` 접속 → 6스텝 진행 → 제출 → "감사합니다(태국어)" 확인. Supabase MCP `execute_sql`로 `SELECT token,lang,country,name,jsonb_array_length(uploads) FROM intake_submissions ORDER BY created_at DESC LIMIT 1;` 로 행 확인.

- [ ] **Step 6: Checkpoint** — 공개 폼 end-to-end(제출→DB행) 동작.

---

## Task 5: 어드민 서비스(목록/승인/반려) + createPatient 확장

**Files:**
- Modify: `v4/src/features/admin/services/adminService.ts` (createPatient 확장)
- Create: `v4/src/features/admin/services/intakeSubmissionService.ts`

- [ ] **Step 1: `createPatient` 확장**

`adminService.ts`의 `createPatient` input에 옵셔널 필드 추가(기존 호출 호환): `country?, name_en?, phone?, email?, address?, grade?, class_height_rank?, intake_survey?`. children insert payload에 해당 값(있을 때만) 포함. 반환 타입 유지.

- [ ] **Step 2: `intakeSubmissionService.ts` 작성**

```ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { IntakeSubmission, UploadMeta } from '@/features/intake/types';
import { createPatient } from './adminService';

export async function fetchSubmissions(status: 'pending'|'approved'|'rejected'|'all' = 'pending'): Promise<IntakeSubmission[]> {
  let q = supabase.from('intake_submissions').select('*').order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) { logger.error('fetchSubmissions failed', error); throw new Error('목록을 불러오지 못했습니다.'); }
  return (data ?? []) as IntakeSubmission[];
}

export async function pendingCount(): Promise<number> {
  const { count, error } = await supabase.from('intake_submissions')
    .select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

/** 해외=auto(th0001), KR/미지정은 빈 문자열 반환(어드민이 입력). */
export async function suggestChartNumber(country?: string | null): Promise<string> {
  if (!country || country === 'KR') {
    // 한국: 순수 숫자 chart_number의 max+1 제안
    const { data } = await supabase.from('children').select('chart_number');
    const nums = (data ?? [])
      .map((r) => (r as { chart_number: string }).chart_number)
      .filter((c) => /^[0-9]+$/.test(c)).map(Number);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return String(next);
  }
  const { data, error } = await supabase.rpc('next_country_chart_number', { cc: country.toLowerCase() });
  if (error) { logger.error('next_country_chart_number rpc failed', error); return ''; }
  return (data as string) ?? '';
}

async function copyUpload(u: UploadMeta, chartNumber: string): Promise<string> {
  const destBucket = u.kind === 'xray' ? 'xray-images' : 'raw-records';
  const destPath = `intake/${chartNumber}/${u.path.split('/').pop()}`;
  const { data, error } = await supabase.storage.from('intake-uploads').download(u.path);
  if (error || !data) { logger.error('intake file download failed', error); throw new Error('파일 복사 실패'); }
  const { error: upErr } = await supabase.storage.from(destBucket).upload(destPath, data, {
    contentType: u.contentType || undefined, upsert: true,
  });
  if (upErr) { logger.error('intake file copy upload failed', upErr); throw new Error('파일 복사 실패'); }
  return destPath;
}

export async function approveSubmission(sub: IntakeSubmission, chartNumber: string): Promise<string> {
  if (!chartNumber.trim()) throw new Error('환자번호를 입력하세요.');
  // 1) 파일을 정식 버킷으로 복사 + raw_files 메타 구성
  const xray: string[] = []; const lab: string[] = [];
  for (const u of sub.uploads) {
    const dest = await copyUpload(u, chartNumber.trim());
    (u.kind === 'xray' ? xray : lab).push(dest);
  }
  const survey = {
    ...(sub.intake_survey ?? {}),
    raw_files: { pandokmun: [], lab, xray },
  };
  // 2) children 생성
  const child = await createPatient({
    chart_number: chartNumber.trim(),
    name: sub.name ?? '(미입력)',
    gender: (sub.gender ?? 'male') as 'male' | 'female',
    birth_date: sub.birth_date ?? '2010-01-01',
    father_height: sub.father_height,
    mother_height: sub.mother_height,
    desired_height: sub.desired_height,
    country: sub.country ?? undefined,
    name_en: sub.name_en ?? undefined,
    phone: sub.phone ?? undefined,
    email: sub.email ?? undefined,
    address: sub.address ?? undefined,
    grade: sub.grade ?? undefined,
    class_height_rank: sub.class_height_rank ?? undefined,
    intake_survey: survey,
  });
  // 3) submission 상태 갱신
  const { error } = await supabase.from('intake_submissions')
    .update({ status: 'approved', child_id: child.id, reviewed_at: new Date().toISOString() })
    .eq('id', sub.id);
  if (error) logger.error('submission approve update failed', error); // 환자는 이미 생성됨 — 로깅만
  return child.id;
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await supabase.from('intake_submissions')
    .update({ status: 'rejected', reject_reason: reason || null, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { logger.error('reject failed', error); throw new Error('반려 처리 실패'); }
}
```
주의: `createPatient` 확장 시 위 호출 시그니처(추가 옵셔널 필드)와 정확히 일치시킬 것.

- [ ] **Step 3: 타입체크**

Run: `cd v4 && npx tsc --noEmit` → EXIT 0.

- [ ] **Step 4: 채번 RPC 스모크 (SQL)**

`execute_sql`: `SELECT next_country_chart_number('th');` → 현재 th 환자 수 기준 다음 번호 확인.

- [ ] **Step 5: Checkpoint** — 어드민 서비스 컴파일 통과 + RPC 동작.

---

## Task 6: 어드민 접수함 페이지 + 상세/승인 + 사이드바

**Files:**
- Create: `v4/src/pages/admin/AdminIntakePage.tsx`
- Create: `v4/src/features/admin/components/IntakeSubmissionDetail.tsx`
- Modify: `v4/src/app/router.tsx` (`/admin/intake`)
- Modify: `v4/src/features/admin/AdminLayout.tsx` (사이드바 + 뱃지)

- [ ] **Step 1: `IntakeSubmissionDetail.tsx`**

props `{ sub: IntakeSubmission; onApproved: (childId:string)=>void; onRejected: ()=>void }`.
- 제출 전체 항목 렌더: **라벨은 한국어(스태프용)**, 값은 `sub`의 각국어 원문 그대로. 섹션별 그룹(기본정보/성장기록/가족/의료/원인). 업로드: xray/lab 파일 — 이미지면 signed URL 썸네일+라이트박스, pdf면 다운로드 링크(`supabase.storage.from('intake-uploads').createSignedUrl(path, 600)`).
- 승인 버튼 → 모달: country 표시, `useEffect`로 `suggestChartNumber(sub.country)` 호출해 input 프리필(해외 자동/한국 제안). 확정 → `approveSubmission(sub, chartNumber)` → `onApproved(childId)`.
- 반려 버튼 → reason 입력 → `rejectSubmission(sub.id, reason)` → `onRejected()`.

- [ ] **Step 2: `AdminIntakePage.tsx`**

`fetchSubmissions(statusFilter)`로 목록. 행: 이름(현지어) + 국기(`countryFlag(sub.country)`) + lang + 제출일 + `sub.uploads.length`개. status 필터 탭(대기/승인/반려/전체, 기본 대기). 행 클릭 → `IntakeSubmissionDetail`(우측 패널 또는 모달). 승인 시 `navigate('/admin/patients/'+childId)`. 반려/승인 후 목록 refetch.

- [ ] **Step 3: 라우트 — `router.tsx`**

어드민 라우트 그룹(`/admin/*`, AdminRoute 보호)에 추가:
```tsx
const AdminIntakePage = lazy(() => import('@/pages/admin/AdminIntakePage'));
{ path: '/admin/intake', element: <AdminIntakePage/> }, // 기존 admin 패턴대로 Suspense/AdminRoute 적용
```

- [ ] **Step 4: 사이드바 — `AdminLayout.tsx`**

기존 nav 항목 패턴에 "📥 설문 접수" → `/admin/intake` 추가. `pendingCount()`를 mount 시 호출해 뱃지 표시(대기 건수 > 0이면 빨강 pill). 기존 사이드바 nav 구조/스타일에 맞춰 작성.

- [ ] **Step 5: 타입체크 + 스모크**

Run: `cd v4 && npx tsc --noEmit` → EXIT 0.
Run: `npm run dev` → `/admin/intake` 접속 → Task 4에서 만든 대기 제출 클릭 → 항목·파일 확인 → 승인(해외면 th000N 자동) → 환자 상세로 이동 + `children`에 행 생성 확인(SQL). 반려도 1건 테스트.

- [ ] **Step 6: Checkpoint** — 어드민 검토→승인→환자 생성 end-to-end 동작.

---

## Task 7: 통합 검증 + 문서

- [ ] **Step 1: 전체 타입체크 + 린트**

Run: `cd v4 && npx tsc --noEmit && npm run lint`
Expected: 타입 에러 0, lint 통과(신규 파일 경고 정리).

- [ ] **Step 2: end-to-end 시나리오 (수동)**

`/intake/th` 제출(파일 포함) → `/admin/intake` 대기함 노출 → 승인 → `th0001` 부여 + 환자 상세에 기본정보/문진/raw_files 반영 확인. `/intake/vi`·`/intake/en`·`/intake/ko` 각 1회 스모크(언어 표시·완료문구).

- [ ] **Step 3: 문서 갱신 준비**

`v4/CLAUDE.md` Database Tables에 `intake_submissions` 행 추가, Storage Buckets에 `intake-uploads` 추가, 라우트 표에 `/intake/:lang`·`/admin/intake` 추가, 루트 `CLAUDE.md`/`docs/PROGRESS.md`에 본 기능 1줄. (실제 반영·커밋은 사용자 "업데이트" 시.)

- [ ] **Step 4: Checkpoint** — 기능 완료. 사용자 "업데이트"로 docs 동기화 + 커밋/배포.

---

## Self-Review Notes (작성자 검증)

- **스펙 커버리지**: 공개 링크(Task4)·staging+승인(Task1/5/6)·전체 문진(Task2/4)·해외 채번(Task1/5)·React+intakeLabels(Task2/4)·스텝 마법사+감사 화면(Task4)·각국어 입력·표시(Task2/4/6)·permissive RLS(Task1) 모두 태스크 매핑됨.
- **placeholder**: 번역 *값*은 콘텐츠라 실행 시 채움(키 구조는 완비). 로직/시그니처 placeholder 없음.
- **타입 일관성**: `IntakeFormState`·`IntakeSubmission`·`UploadMeta` 정의(Task2)와 사용(Task3/5/6) 일치. `createPatient` 확장(Task5 Step1) 시그니처와 `approveSubmission` 호출 일치 필요(명시함). `causeOpts.value`는 `ShortStatureCause` enum과 일치(Task2에 명시).
- **확인 필요(실행 시)**: dflo Supabase 프로젝트 ref(`v4/.env`), `ShortStatureCause`/`TannerStage` 실제 enum 값, AdminLayout 사이드바 nav 구조.
