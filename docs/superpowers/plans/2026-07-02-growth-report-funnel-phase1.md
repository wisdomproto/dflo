# 성장 리포트 퍼널 1단계 Implementation Plan

> **✅ 구현 완료 (2026-07-03)** — 브랜치 `feat/growth-report-phase1`, 전 청크 subagent-driven-development로 구현. tsc 0 · 신호테스트 8/8 · 전체 코드리뷰 통과(나이 롤오버·URL NaN 가드·폴백 게이트 픽스). **+Phase 1.5**(원안 밖 추가): 영구 리포트 링크 `/report/r/{token}` + Web Share(카톡) 공유 + security-definer RPC(migration 066) + `/report?demo=1` 감수용 데모. 검사 톤 다듬기(수면=문진/비만=BMI/사춘기=진찰). ⚠️ main 머지·배포 전 **원장 감수 + migration 065/066 수동적용**.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예측키 계산기 결과 → 설문(저장) → 실제 측정·설문값으로 동적 렌더되는 맞춤 성장 리포트를 화면에 무료로 노출한다.

**Architecture:** iframe 계산기 결과에 리포트 진입 버튼(`target=_top`+URL params) → 기존 `/diagnosis` 설문 재사용(계산값 프리필·저장 배선) → 신규 `/report` SPA 라우트가 `location.state`(폴백 sessionStorage)로 렌더. 숫자는 순수 계산(`shared/utils/growth.ts` 재사용, 런타임 RAG 없음), 신호 블록은 순수 함수 `selectSignalBlocks`로 조건부 노출. 비주얼은 `growth-report-sample.html`을 스코프 CSS + JSX로 포팅.

**Tech Stack:** React 19 + TS + Vite, React Router, Tailwind(레이아웃) + 스코프 CSS(리포트 비주얼), Supabase anon(fire-and-forget INSERT), Node `node:test`(순수 함수).

**Spec:** `docs/superpowers/specs/2026-07-02-growth-report-funnel-phase1-design.md`

---

## File Structure

**신규**
- `v4/scripts/migrations/065_growth_reports.sql` — 테이블 + RLS(anon insert).
- `v4/src/features/website/report/types.ts` — `ReportMeasurement`, `ReportSurvey`(=IntakeForm 재사용), `BlockId`.
- `v4/src/features/website/report/signalBlocks.ts` — 순수 `selectSignalBlocks(m, s): BlockId[]` (의존성 0 → tsx 테스트 가능, `@/` import 금지).
- `v4/src/features/website/report/signalContent.tsx` — 10개 신호 블록 콘텐츠(제목/본문/근거/help/운동 유튜브칩) 데이터.
- `v4/src/features/website/report/report.css` — 샘플 `<style>` 이식(스코프).
- `v4/src/features/website/report/ReportPage.tsx` — 데이터 로드/가드 + 섹션 조립(default export).
- `v4/src/features/website/report/sections/{Hero,DoctorIntro,Methods,SignalSection,HospitalGallery,Closing}.tsx` — 섹션 컴포넌트(named export).
- `v4/src/features/website/services/growthReportService.ts` — anon INSERT(anonymousPredictionService 패턴 미러).
- `v4/scripts/test/signal-blocks.test.mjs` — `selectSignalBlocks` 단위 테스트.

**수정**
- `v4/src/features/website/components/HeightCalculatorResult.tsx` — 리포트 진입 버튼.
- `v4/src/features/website/pages/IntakeDiagnosisPage.tsx` — URL 파라미터 프리필 + `handleSubmit` 저장/이동 + 완료 스텝.
- `v4/src/app/router.tsx` — `/report` lazy 라우트.

**재사용(비수정)**
- `v4/src/shared/utils/growth.ts` — `calculateMidParentalHeight`, `calculatePercentile`, `calculateBMI`.
- `v4/src/shared/data/growthStandard.ts` — 백분위 곡선용 LMS.
- `v4/public/growth-report-sample.html` — 포팅 소스(비주얼·카피·pmid의 정본).
- `v4/src/features/website/components/HeightCalculator.tsx` — 진입 위치 참고(계산기 → 결과).

---

## Chunk 1: 데이터 계층 (테이블 · 타입 · 저장 서비스)

### Task 1: 마이그레이션 `065_growth_reports.sql`

**Files:** Create `v4/scripts/migrations/065_growth_reports.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- 065: growth_reports — 설문까지 진행한 고관심 방문자 1행(측정+설문).
-- anonymous_predictions(측정=전원)와 상보. Phase 2 계정 연결 앵커 + 마케팅 인사이트.
-- 실명·연락처 없음(PHI 아님). anon INSERT만 — 조회는 어드민(anon SELECT 정책 추가 시).
create table if not exists public.growth_reports (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lang         text not null default 'ko',
  measurement  jsonb not null,   -- { age, gender, currentHeight, predicted, percentile, standard, fatherHeight?, motherHeight? }
  survey       jsonb not null,   -- IntakeForm 전체
  utm          jsonb,            -- { utm_source, utm_medium, utm_campaign, utm_content, referrer }
  account_id   uuid              -- Phase 2 (nullable)
);
alter table public.growth_reports enable row level security;

drop policy if exists growth_reports_anon_insert on public.growth_reports;
create policy growth_reports_anon_insert
  on public.growth_reports for insert to anon with check (true);

create index if not exists growth_reports_created_at_idx on public.growth_reports (created_at desc);
```

- [ ] **Step 2: 적용 안내 주석 확인** — 수동 적용(Dashboard) 대기여도 서비스가 graceful(아래 Task 3 fire-and-forget). 커밋.

```bash
git add v4/scripts/migrations/065_growth_reports.sql
git commit -m "feat(growth-report): migration 065 growth_reports table (anon insert)"
```

### Task 2: 리포트 타입 `report/types.ts`

**Files:** Create `v4/src/features/website/report/types.ts`

- [ ] **Step 1: 타입 정의** — `ReportSurvey`는 설문 `IntakeForm`을 재사용(중복 정의 금지). `IntakeDiagnosisPage`의 `IntakeForm`을 export 해서 import 하거나, 공통 타입으로 이동.

```ts
export interface ReportMeasurement {
  gender: 'male' | 'female';
  age: number;            // 소수 나이
  currentHeight: number;  // cm
  predicted: number;      // cm (계산기 전달)
  percentile: number;     // 0-100
  standard: 'KR' | 'TH';
  fatherHeight?: number;  // cm (설문)
  motherHeight?: number;  // cm (설문)
}

export type BlockId =
  | 'sleep' | 'inflammation' | 'nutrition' | 'exercise' | 'puberty'
  | 'genetics' | 'obesity' | 'growthVelocity' | 'sga' | 'stress';
```

- [ ] **Step 2: `IntakeForm` 공유** — `IntakeDiagnosisPage.tsx`의 `IntakeForm` 인터페이스를 `report/types.ts`로 옮기고 export, 페이지는 여기서 import(단일 소스). `ReportSurvey = IntakeForm` alias.

- [ ] **Step 3: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/report/types.ts v4/src/features/website/pages/IntakeDiagnosisPage.tsx
git commit -m "refactor(growth-report): shared report types + IntakeForm single source"
```

### Task 3: 저장 서비스 `growthReportService.ts`

**Files:** Create `v4/src/features/website/services/growthReportService.ts` (mirror `anonymousPredictionService.ts`)

- [ ] **Step 1: fire-and-forget INSERT 작성** — 실패 전부 swallow(UX 안 깨짐). UTM은 `anonymousPredictionService`의 `attribution()` 로직 복제(작은 헬퍼, 10줄).

```ts
import { supabase } from '@/shared/lib/supabase';
import type { ReportMeasurement, ReportSurvey } from '../report/types';

function attribution() {
  const ref = (typeof document !== 'undefined' && document.referrer) || '';
  let refSearch = '';
  try { refSearch = new URL(ref).search; } catch { /* noop */ }
  const fromRef = new URLSearchParams(refSearch);
  const here = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pick = (k: string) => fromRef.get(k) || here.get(k) || null;
  return {
    utm_source: pick('utm_source'), utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'), utm_content: pick('utm_content'),
    referrer: ref || null,
  };
}

export async function saveGrowthReport(
  measurement: ReportMeasurement, survey: ReportSurvey, lang = 'ko',
): Promise<void> {
  try {
    await supabase.from('growth_reports').insert({
      lang, measurement, survey, utm: attribution(),
    });
  } catch { /* tracking must never break UX */ }
}
```

- [ ] **Step 2: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/services/growthReportService.ts
git commit -m "feat(growth-report): growthReportService anon fire-and-forget insert"
```

---

## Chunk 2: 신호 블록 선택 로직 (TDD)

### Task 4: `selectSignalBlocks` 순수 함수 + 테스트

**Files:**
- Create `v4/src/features/website/report/signalBlocks.ts`
- Test `v4/scripts/test/signal-blocks.test.mjs`

> ★ `signalBlocks.ts`는 **의존성 0**(no `@/`, no React) — tsx 테스트가 상대경로로 import 가능해야 함. BMI/부모키 비교는 인라인 산술.

- [ ] **Step 1: 실패 테스트 작성** (`scripts/test/signal-blocks.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSignalBlocks, ALWAYS_SHOW } from '../../src/features/website/report/signalBlocks.ts';

const base = { gender: 'male', age: 10, currentHeight: 140, predicted: 175, percentile: 50 };
const emptySurvey = {};

test('안심군: 트리거 없어도 보편 블록(수면·영양·운동)은 노출', () => {
  const ids = selectSignalBlocks(base, emptySurvey);
  for (const id of ALWAYS_SHOW) assert.ok(ids.includes(id));
});

test('늦은 취침 → sleep', () => {
  assert.ok(selectSignalBlocks(base, { sleepTime: '23:30' }).includes('sleep'));
});

test('비염/알러지 → inflammation', () => {
  assert.ok(selectSignalBlocks(base, { pastConditions: '알러지성 비염' }).includes('inflammation'));
});

test('성장 느려짐 / 연 4cm 미만 → growthVelocity', () => {
  assert.ok(selectSignalBlocks(base, { growthPattern: '거의 안 자라는 것 같음' }).includes('growthVelocity'));
  assert.ok(selectSignalBlocks(base, { yearlyGrowth: '3' }).includes('growthVelocity'));
});

test('저출생/조산 → sga', () => {
  assert.ok(selectSignalBlocks(base, { birthWeight: '2.3' }).includes('sga'));
  assert.ok(selectSignalBlocks(base, { gestationalWeeks: '35' }).includes('sga'));
});

test('부모키 작음 → genetics (부모키 있을 때만)', () => {
  assert.ok(selectSignalBlocks({ ...base, fatherHeight: 165, motherHeight: 152 }, {}).includes('genetics'));
  assert.ok(!selectSignalBlocks(base, {}).includes('genetics')); // 부모키 없으면 숨김
});

test('사춘기 이른 신호 → puberty (여아 초경/유방발달 조기)', () => {
  const girl = { gender: 'female', age: 8.5, currentHeight: 130, predicted: 158, percentile: 50 };
  assert.ok(selectSignalBlocks(girl, { breastDevelopment: '봉우리 시작' }).includes('puberty'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && node --import tsx --test scripts/test/signal-blocks.test.mjs`
Expected: FAIL (모듈 없음 / export 없음)

- [ ] **Step 3: 구현** (`report/signalBlocks.ts`)

```ts
import type { BlockId, ReportMeasurement, ReportSurvey } from './types';

// 보편 블록: 트리거 무관 항상 노출(승인된 설계). 순수 조건 블록은 아래 트리거로.
export const ALWAYS_SHOW: BlockId[] = ['sleep', 'nutrition', 'exercise'];

const num = (v?: string) => { const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : NaN; };

/** 취침 HH:MM 이 늦은지(>=22:30, 새벽 0~4시는 매우 늦음으로 간주) */
function lateBedtime(t?: string): boolean {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  const mins = h * 60 + m;
  return (h < 5) || mins >= 22 * 60 + 30; // 22:30 이후 or 새벽
}

export function selectSignalBlocks(m: ReportMeasurement, s: ReportSurvey): BlockId[] {
  const set = new Set<BlockId>(ALWAYS_SHOW);

  // (보편 블록은 이미 포함 — 아래는 조건부 강조/추가)
  if (lateBedtime(s.sleepTime)) set.add('sleep');
  if (/비염|알러지|알레르기|천식|아토피/.test(s.pastConditions || '')) set.add('inflammation');

  // 사춘기 이른 신호(나이 대비)
  const early =
    (m.gender === 'female' && ((s.menarche?.includes('시작') && m.age < 11) ||
      (/봉우리|뚜렷/.test(s.breastDevelopment || '') && m.age < 9))) ||
    (m.gender === 'male' && (s.voiceChange === '시작됨' && m.age < 11)) ||
    (/초기|중기/.test(s.pubertyStage || '') && m.age < (m.gender === 'female' ? 9 : 10));
  if (early) set.add('puberty');

  // 유전(부모키 있을 때만): MPH 낮음 또는 부모키 낮음
  if (m.fatherHeight && m.motherHeight) {
    const mph = (m.fatherHeight + m.motherHeight + (m.gender === 'male' ? 13 : -13)) / 2;
    if (mph < (m.gender === 'male' ? 168 : 156) || m.fatherHeight < 168 || m.motherHeight < 155) set.add('genetics');
    else set.add('genetics'); // 부모키 있으면 항상 유전 범위 설명(카피는 위치별 분기 — signalContent에서)
  }

  // 과체중·비만: 간이 BMI 휴리스틱(BMI-for-age 데이터 없음 → 대략치, 구현 시 튜닝/후속)
  const w = num(s.currentWeight);
  if (Number.isFinite(w) && m.currentHeight > 0) {
    const bmi = w / Math.pow(m.currentHeight / 100, 2);
    if (bmi >= 23) set.add('obesity'); // 소아 과체중 근사 임계 — TODO 백분위 정밀화
  }

  // 성장 속도 저하
  if (/느려|안 자라/.test(s.growthPattern || '') || (Number.isFinite(num(s.yearlyGrowth)) && num(s.yearlyGrowth) < 4)) set.add('growthVelocity');

  // 저출생/조산(SGA)
  if ((Number.isFinite(num(s.birthWeight)) && num(s.birthWeight) < 2.5) ||
      (Number.isFinite(num(s.gestationalWeeks)) && num(s.gestationalWeeks) < 37)) set.add('sga');

  // 스트레스(약신호): 보호자가 스트레스 언급
  if (/스트레스|불안|긴장/.test(s.growthConcerns || '')) set.add('stress');

  // 정렬(리포트 노출 순서 고정)
  const order: BlockId[] = ['sleep', 'inflammation', 'nutrition', 'exercise', 'puberty', 'genetics', 'obesity', 'growthVelocity', 'sga', 'stress'];
  return order.filter((id) => set.has(id));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd v4 && node --import tsx --test scripts/test/signal-blocks.test.mjs`
Expected: PASS (전 케이스)

- [ ] **Step 5: 커밋**

```bash
git add v4/src/features/website/report/signalBlocks.ts v4/scripts/test/signal-blocks.test.mjs
git commit -m "feat(growth-report): selectSignalBlocks pure fn + unit tests"
```

> ⚠️ 섹션 부제 카피는 보편 블록(항상 노출) 정책과 일치해야 함 — "설문에서 확인된 항목만" 대신 "성장에 영향을 주는 핵심 항목과 설문에서 확인된 신호"류로(Task 8 SignalSection에서 반영).

---

## Chunk 3: 퍼널 배선 (진입 버튼 · 설문)

### Task 5: 계산기 결과 → 리포트 진입 버튼

**Files:** Modify `v4/src/features/website/components/HeightCalculatorResult.tsx`

- [ ] **Step 1:** 카톡 CTA(`<a href={messenger.url}...>`) **위**에 리포트 진입 버튼 추가. iframe 탈출 `target="_top"`, 계산값 URL 파라미터. 한국어 우선(lang==='ko'에서 강조; 그 외 언어는 후속이라 노출 조건 판단 — 우선 전 언어 노출하되 리포트는 ko만이면 lang!=='ko'는 숨김 권장).

```tsx
{lang === 'ko' && (
  <a
    href={`/diagnosis?g=${result.gender}&h=${result.currentHeight}&age=${result.age.toFixed(2)}&ph=${result.predicted.toFixed(1)}&pct=${result.percentile.toFixed(1)}&std=${result.standard ?? 'KR'}&lang=${lang}`}
    target="_top"
    className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0F6E56] py-3.5 md:py-4 text-white font-bold text-base md:text-lg hover:bg-[#0D5A47] active:scale-[0.98] transition-all"
  >
    📋 더 자세한 성장 리포트 받기
  </a>
)}
```

- [ ] **Step 2:** GA4/픽셀 이벤트(선택) — 기존 `trackKakaoConsult` 패턴 참고해 `report_start` onClick(무해). tsc + 커밋.

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/components/HeightCalculatorResult.tsx
git commit -m "feat(growth-report): report entry CTA in calculator result"
```

### Task 6: 설문 프리필(URL) + 저장/이동 + 완료 스텝

**Files:** Modify `v4/src/features/website/pages/IntakeDiagnosisPage.tsx`

- [ ] **Step 1: 계산값 소스 확장** — `location.state` 없으면 `useSearchParams`에서 구성.

```tsx
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
// ...
const [sp] = useSearchParams();
const calcState: CalcState | null = (location.state as CalcState) ?? (sp.get('h') ? {
  gender: (sp.get('g') === 'female' ? 'female' : 'male'),
  currentHeight: Number(sp.get('h')),
  age: Number(sp.get('age')),
  predictedHeight: Number(sp.get('ph')),
} : null);
const standard = (sp.get('std') === 'TH' ? 'TH' : 'KR');
const percentile = Number(sp.get('pct') ?? 50);
```

- [ ] **Step 2: `handleSubmit` 교체** — fire-and-forget 저장 + `/report`로 이동(state + sessionStorage 백업). 완료 스텝(step 7) 대신 바로 리포트로 이동.

```tsx
import { saveGrowthReport } from '../services/growthReportService';
// ...
const handleSubmit = () => {
  if (!calcState) return; // 계산값 없으면 진입 자체가 비정상
  const measurement = {
    gender, age: calcState.age, currentHeight: calcState.currentHeight,
    predicted: calcState.predictedHeight, percentile, standard,
    fatherHeight: form.fatherHeight ? Number(form.fatherHeight) : undefined,
    motherHeight: form.motherHeight ? Number(form.motherHeight) : undefined,
  };
  void saveGrowthReport(measurement, form, 'ko'); // 실패해도 계속
  try { sessionStorage.setItem('growth_report_data', JSON.stringify({ measurement, survey: form })); } catch { /* noop */ }
  navigate('/report', { state: { measurement, survey: form } });
};
```

- [ ] **Step 3: 완료 스텝 정리** — step 7("AI 진단 곧 추가") 제거 또는 "내 리포트 보기" 버튼으로 축소(제출이 바로 이동시키므로 도달 안 하는 게 기본). 헤더 "🔬 AI 성장 진단"은 "📋 성장 리포트 설문"류로 문구 조정(선택).

- [ ] **Step 4: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/pages/IntakeDiagnosisPage.tsx
git commit -m "feat(growth-report): survey URL prefill + save + navigate to report"
```

---

## Chunk 4: 리포트 렌더러

### Task 7: 스코프 CSS 이식 + 라우트

**Files:**
- Create `v4/src/features/website/report/report.css`
- Modify `v4/src/app/router.tsx`

- [ ] **Step 1:** `growth-report-sample.html`의 `<style>...</style>` 내용을 `report.css`로 복사. 클래스 충돌 방지 위해 최상위 래퍼 `.growth-report` 아래로 스코프(각 선택자 앞에 `.growth-report ` prefix 또는 CSS Modules 대신 단순 래핑 + 고유 클래스 유지). 폰트/색/`.sig`/`.help`/`.src`/`.cta`/`.kk`/bell gradient 등 그대로.

- [ ] **Step 2:** `router.tsx`에 lazy 라우트 추가(공개 영역, noindex). `HeightCalculator` 인접 공개 라우트 패턴 따름.

```tsx
const ReportPage = lazy(() => import('@/features/website/report/ReportPage'));
// routes 배열에:
{ path: '/report', element: <Suspense fallback={<LoadingSpinner/>}><ReportPage/></Suspense> },
```

- [ ] **Step 3: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/report/report.css v4/src/app/router.tsx
git commit -m "feat(growth-report): scoped report styles + /report route"
```

### Task 8: 리포트 페이지 + 섹션 컴포넌트 (정적 파트 포팅)

**Files:** Create `ReportPage.tsx` + `sections/{Hero,DoctorIntro,Methods,HospitalGallery,Closing}.tsx`

> 포팅 소스: `v4/public/growth-report-sample.html` (라인 참조). 동적 값만 props로. 이름은 `survey.childName || '우리 아이'`.

- [ ] **Step 1: `ReportPage.tsx`** — 데이터 가드 + 조립.

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import './report.css';
import type { ReportMeasurement, ReportSurvey } from './types';
// sections import ...

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  let data = location.state as { measurement: ReportMeasurement; survey: ReportSurvey } | null;
  if (!data) { try { const s = sessionStorage.getItem('growth_report_data'); if (s) data = JSON.parse(s); } catch { /* noop */ } }
  if (!data?.measurement) {
    return <EmptyState onBack={() => navigate('/')} />; // "계산기에서 먼저 측정해주세요"
  }
  const { measurement: m, survey: s } = data;
  return (
    <div className="growth-report">
      <Hero m={m} survey={s} />
      <DoctorIntro />
      <Methods m={m} />
      <SignalSection m={m} survey={s} />   {/* Task 9 */}
      <HospitalGallery />
      <Closing name={s.childName || '우리 아이'} />
    </div>
  );
}
```

- [ ] **Step 2: `Hero.tsx`** — 헤더 h1(`{name} 성장 리포트`) + **참고용·비진단 배너** + 3숫자(현재키/예측키 `m.predicted`/백분위 `m.percentile`). 소스 라인 137~147.

- [ ] **Step 3: `DoctorIntro.tsx`** — 원장 소개(정적, 소스 149~170): `/images/doctor.webp` + 이름·이력·방송칩. 그대로 포팅.

- [ ] **Step 4: `Methods.tsx`** — 3방법(소스 171~245):
  - **MPH**(179~204): `calculateMidParentalHeight(m.fatherHeight!, m.motherHeight!, m.gender)`. 부모키 둘 다 있을 때만 렌더(없으면 이 카드 숨김). 종형 SVG 포팅 + 예측(`m.predicted`)이 MPH±범위에서 어디인지 마커 위치 계산.
  - **표준성장도표**(205~231): `calculatePercentile(m.age, m.gender, m.currentHeight, <growthStandard rows>)` — `shared/data/growthStandard`에서 성별 LMS 행 가져와 백분위 곡선 SVG에 현재 위치 마커.
  - **뼈나이**(232~245): 정적 X-ray `/images/bone-age-xray.webp` + 캡션 그대로.

- [ ] **Step 5: `HospitalGallery.tsx`**(332~341) + **`Closing.tsx`**(343~380: closing hook + CTA(카톡 `_mxbWxfX` + 전화 010-6693-2838) + 참고문헌 refs). 전부 정적 포팅. 이름만 동적.

- [ ] **Step 6: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/report/
git commit -m "feat(growth-report): report page + static sections (hero/doctor/methods/gallery/closing)"
```

### Task 9: 신호 블록 (조건부)

**Files:** Create `report/signalContent.tsx` + `sections/SignalSection.tsx`

- [ ] **Step 1: `signalContent.tsx`** — `Record<BlockId, { title, body, src, help, youtube? }>`. 10개 블록 카피·pmid를 소스 248~330에서 그대로 이식(합니다체 유지). `exercise`는 6개 유튜브 칩 포함.

- [ ] **Step 2: `SignalSection.tsx`** — `selectSignalBlocks(m, survey)` → 매칭 블록만 렌더. 부제는 보편 블록 정책과 일치하는 문구(위 ⚠️). `genetics` 카피는 예측 위치(예측 vs MPH: 상단/중간/하단)로 분기(2~3 변형).

```tsx
import { selectSignalBlocks } from '../signalBlocks';
import { SIGNAL_CONTENT } from '../signalContent';
export function SignalSection({ m, survey }: { m: ReportMeasurement; survey: ReportSurvey }) {
  const ids = selectSignalBlocks(m, survey);
  return (
    <section>
      <div className="sec-t">🔎 {survey.childName || '우리 아이'} 설문 분석</div>
      <div className="sec-s">성장에 영향을 주는 핵심 항목과, 설문에서 확인된 신호를 함께 안내합니다.</div>
      {ids.map((id) => { const c = SIGNAL_CONTENT[id]; return (
        <div className="sig" key={id}>
          <h4>{c.title}</h4><p>{c.body}</p>
          {c.youtube && <div className="ytwrap">{/* chips */}</div>}
          <div className="src">{c.src}</div>
          <div className="help"><span className="h">🏥 병원에서는</span>{c.help}</div>
        </div>
      ); })}
    </section>
  );
}
```

- [ ] **Step 3: tsc + 커밋**

```bash
cd v4 && npx tsc -b --noEmit
git add v4/src/features/website/report/signalContent.tsx v4/src/features/website/report/sections/SignalSection.tsx
git commit -m "feat(growth-report): conditional signal blocks from survey"
```

---

## Chunk 5: 검증 · 마무리

### Task 10: 전체 검증

- [ ] **Step 1: 타입 게이트** — `cd v4 && npx tsc -b --noEmit` (0 에러)
- [ ] **Step 2: 단위 테스트** — `cd v4 && node --test scripts/test/signal-blocks.test.mjs` (통과)
- [ ] **Step 3: 수동 스모크(코드/논리 레벨, preview 브라우저 미사용 — [[preview_verification_preference]])**:
  - 계산기 결과 버튼 href의 URL 파라미터가 `/diagnosis` 파서와 정확히 매칭(g/h/age/ph/pct/std/lang).
  - `/diagnosis` 직접 진입(state 없음) → URL 파라미터로 프리필됨.
  - 부모키 미입력 시 MPH 카드 숨김.
  - 안심군(트리거 없음) → 보편 3블록 + 예측 3방법으로 리포트 안 빔.
  - `/report` 직접 진입(state·sessionStorage 없음) → EmptyState(계산기로 유도).
- [ ] **Step 4:** 사용자에게 배포/원장 감수 전 로컬 확인 요청(사용자 직접 브라우저 확인).

### Task 11: 문서 · 메모리 업데이트

- [ ] **Step 1:** `growth_report_feature.md` 메모리에 "동적 리포트 구현 완료(정적 샘플 → `/report` React)" 반영, `calc_measurement_spike.md`에 퍼널 1단계 완료 갱신, `blog_publish_pipeline.md`의 "리포트 내부 링크" 후속 표시.
- [ ] **Step 2:** 루트 `CLAUDE.md`에 성장 리포트 퍼널 1단계 배선(`/report`·`growth_reports` migration 065) 한 줄.
- [ ] **Step 3:** 커밋.

```bash
git add -A && git commit -m "docs(growth-report): update CLAUDE.md + memory for Phase 1 report funnel"
```

---

## 주의 / 미결

- **비만 블록 BMI**: BMI-for-age 백분위 데이터 없음 → 간이 raw BMI 임계(≥23) 근사. 오탐 가능 → 필요 시 이 블록만 후속(정밀 데이터 확보 후) 또는 임계 튜닝.
- **다국어**: Phase 1은 ko 전용. 진입 버튼은 `lang==='ko'`에서만 노출. th/vi/en 리포트는 후속.
- **영구 URL·재열람·공유·계정 연결·트래커·카카오 로그인**: 전부 Phase 2(별도 스펙).
- **블로그 내부 링크**: 각 신호 블록 → 매칭 발행 블로그 "📖 더 자세히" 링크는 후속([[blog_publish_pipeline]] 발행 상태 확인 후).
- **의료광고 사전심의**: 공개 배포 전 원장 감수 + 필요 시 심의([[M02]]).
