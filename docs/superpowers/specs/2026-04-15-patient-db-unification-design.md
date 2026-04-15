# 환자 DB 통합 + BoneAgeAI 관리자 페이지 통합 설계

**작성일:** 2026-04-15
**범위:** dflo_0.1 v4 에 환자 DB 를 단일 진실원(single source of truth)으로 구축하고, BoneAgeAI 를 원장님 관리자 페이지로 포팅 통합
**관련 프로젝트:** `C:\projects\dflo_0.1` (v4), `C:\projects\BoneAgeAI`

---

## 1. 배경 & 문제

187 성장케어는 현재 3개의 독립된 영역이 있음:
- **v4 앱 (환자/보호자용)** — 생활습관 기록 (식사, 운동, 수면, 영양제 등)
- **v4 홈페이지** — 치료 사례 JSON 에 손으로 입력
- **BoneAgeAI (원장님용, standalone Next.js)** — X-ray → 뼈나이 판독 툴, 저장 기능 없음

데이터가 여기저기 흩어져 있어서 원장님이 "이 환자가 언제 왔고 뭘 측정했고 뭘 처방했는지" 를 한 화면에서 못 본다. 또 BoneAgeAI 판독 결과가 환자 레코드에 붙지 않는다.

## 2. 목표 & 비목표

### 목표
- **환자 DB 를 단일 진실원으로 재정렬**: 모든 생활습관/병원 데이터/처방이 `children` 테이블 기준으로 연결됨
- **원장님 관리자 페이지** 를 환자 차트 중심으로 정비 (visits 타임라인 + 측정 + X-ray + 검사 + 처방)
- **BoneAgeAI 를 v4 로 포팅** 해서 관리자 페이지 안에서 네이티브로 작동, 판독 결과는 `xray_readings` 테이블에 저장
- **마이그레이션 안전**: 기존 `measurements` 데이터는 더미 `visits` 생성으로 보존

### 비목표 (나중 단계)
- 홈페이지 치료사례를 real `visits` 데이터와 연결 (Phase E, 이번 범위 밖)
- 인증 개편 (현재 legacy plaintext 방식 그대로)
- doctor 와 admin 롤 분리 (admin 으로 통합)
- 환자 앱 기능 추가/수정 (생활습관 테이블은 그대로)

## 3. 사용자 / 권한 모델

### 롤
- `admin` — 원장님 + 병원 스태프. 모든 환자 데이터 CRUD
- `parent` — 환자 보호자. 자기 자녀의 데이터만 read

### RLS 원칙
| 테이블 | admin | parent |
|---|---|---|
| `children` | 전체 CRUD | 자기 자녀 CRUD |
| `visits`, `hospital_measurements`, `xray_readings`, `lab_tests`, `prescriptions` | CRUD | 자기 자녀 것만 read |
| `medications` (drug master) | CRUD | read 없음 |
| `daily_routines`, `meals`, `exercise_logs` (기존 생활습관) | read (전체) | 자기 자녀 CRUD (기존 그대로) |

### 스토리지
| 버킷 | 용도 | 접근 |
|---|---|---|
| `xray-images` (신규) | X-ray 원본 | admin full · parent signed URL read (자기 자녀 것) |
| `meal-photos` (기존) | 식사 사진 | 기존 그대로 |
| `content-images` (기존) | 콘텐츠 | 기존 그대로 |

## 4. 데이터 모델

### 4.1 identity (기존 유지)
```
users (id, email, name, role, password)
  └ role: 'admin' | 'parent'
children (id, parent_id, name, gender, birth_date, father_height, mother_height)
  └ is_patient 플래그 제거 (앱 = 환자 전용 정책이므로 모든 child 가 환자)
```

### 4.2 생활습관 (기존 유지)
```
daily_routines (child_id, routine_date, daily_height, daily_weight, sleep_*, water_intake_ml,
                basic_supplements, extra_supplements, growth_injection, mood, ...)
meals (daily_routine_id, meal_type, ...)
meal_photos (meal_id, photo_url, ...)
meal_analyses (meal_id, calories, carbs, protein, fat, growth_score, advice)
exercise_logs (daily_routine_id, exercise_key, sets, reps, memo)
```
생활습관 데이터는 환자 입력, 자기측정. 그대로 유지.

### 4.3 병원 데이터 (신규 + 변경)

**`visits`** (신규, 병원 데이터 허브)
```sql
id              uuid PK
child_id        uuid FK → children.id
visit_date      date NOT NULL
doctor_id       uuid FK → users.id (role='admin')
chief_complaint text   -- 주호소 (단문)
plan            text   -- 플랜 (단문)
notes           text   -- 자유 진료 메모
created_at, updated_at
```
원장님 차트 UI 의 "1줄 = 1 visit" 단위. 모든 병원 데이터는 `visit_id` FK 필수.

**`hospital_measurements`** (변경: 기존 `measurements` 리네임 + FK 추가)
```sql
id              uuid PK
visit_id        uuid FK → visits.id  NOT NULL    -- 신규, 필수
child_id        uuid FK → children.id NOT NULL    -- 유지 (쿼리 최적화)
measured_date   date
height          numeric
weight          numeric
bone_age        numeric
pah             numeric   -- predicted adult height
doctor_notes    text
created_at, updated_at
```
마이그레이션: 기존 `measurements` row 마다 (child_id, measured_date) 조합으로 dummy `visits` row 생성 후 FK 연결. 이후 `measurements` → `hospital_measurements` 리네임.

**`xray_readings`** (신규)
```sql
id                     uuid PK
visit_id               uuid FK → visits.id NOT NULL
child_id               uuid FK → children.id NOT NULL
xray_date              date
image_path             text     -- Supabase storage: 'xray-images/{child_id}/{id}.webp'
bone_age_result        numeric  -- 원장님 최종 판독값
atlas_match_younger    text     -- atlas 파일명 (e.g. "M_10-5.webp")
atlas_match_older      text
doctor_memo            text
created_at, updated_at
```
BoneAgeAI 판독 결과 저장. 같은 visit 의 `hospital_measurements.bone_age` 와 동기화 (X-ray 판독 저장 시 measurement 의 bone_age 도 업데이트).

**`lab_tests`** (신규, 단일 테이블 + JSONB)
```sql
id              uuid PK
visit_id        uuid FK → visits.id NOT NULL
child_id        uuid FK → children.id NOT NULL
test_type       text CHECK (test_type IN ('allergy', 'organic_acid', 'blood'))
collected_date  date
result_date     date
result_data     jsonb     -- 타입별 구조:
                          --  allergy: { danger: string[], caution: string[] }
                          --  organic_acid: { note: string, ... (나중에 구조화) }
                          --  blood:        { note: string, ... (나중에 구조화) }
attachments     jsonb     -- [{url, name, mime}]  (검사지 PDF 등)
doctor_memo     text
created_at, updated_at
```
알러지는 현재 `CasesSlide.allergyData` 구조 그대로 재사용. 유기산/혈액은 초기엔 free-text + PDF 첨부, 나중에 필요한 필드 생기면 JSONB 안에서 스키마 확장.

**`medications`** (신규, drug master)
```sql
id              uuid PK
code            text UNIQUE NOT NULL    -- 원장님이 정하는 자체 코드
name            text NOT NULL
default_dose    text                    -- e.g. "5mg"
unit            text                    -- e.g. "mg", "mL"
notes           text                    -- 용법/주의사항 메모
is_active       boolean DEFAULT true
created_at, updated_at
```
원장님이 `/admin/medications` 에서 약품을 먼저 등록. 처방 시 이 마스터에서 선택.

**`prescriptions`** (신규)
```sql
id               uuid PK
visit_id         uuid FK → visits.id NOT NULL
child_id         uuid FK → children.id NOT NULL
medication_id    uuid FK → medications.id NOT NULL
dose             text             -- 실제 처방 용량 (default_dose 덮어쓰기 가능)
frequency        text             -- e.g. "1일 2회", "식후"
duration_days    integer
notes            text
created_at, updated_at
```
한 visit 에 여러 `prescriptions` row 가능.

### 4.4 관계도 (요약)

```
users
 ├─ children ─ daily_routines ─ meals ─ meal_photos / meal_analyses
 │              └── exercise_logs
 │
 └─ children ─ visits ─ hospital_measurements
                 ├──── xray_readings ─ (storage: xray-images)
                 ├──── lab_tests
                 └──── prescriptions ─ medications
```

## 5. BoneAgeAI 포팅 상세

### 5.1 파일 맵

| from (BoneAgeAI) | to (v4) | 비고 |
|---|---|---|
| `webapp/lib/types.ts` | `v4/src/features/bone-age/lib/types.ts` | 그대로 |
| `webapp/lib/atlas.ts` | `v4/src/features/bone-age/lib/atlas.ts` | 그대로 |
| `webapp/lib/matcher.ts` | `v4/src/features/bone-age/lib/matcher.ts` | 그대로 |
| `webapp/lib/growthPrediction.ts` | `v4/src/features/bone-age/lib/growthPrediction.ts` | 그대로 |
| `webapp/lib/growthStandard.ts` | **포팅 안 함** | v4 `src/shared/data/growthStandard.ts` 에 이미 유사 로직 존재. 차이점 확인 후 v4 것으로 통일. `heightAtSamePercentile`, `calculateHeightPercentileLMS`, `predictAdultHeightLMS` 없으면 추가 |
| `webapp/components/PatientForm.tsx` | `v4/src/features/bone-age/components/PatientForm.tsx` | 수정: child prop 받아서 성별/DOB 자동 주입 |
| `webapp/components/XrayUpload.tsx` | `v4/src/features/bone-age/components/XrayUpload.tsx` | 수정: 드롭 시 Supabase storage 업로드 + xray_readings insert |
| `webapp/components/XrayPreview.tsx` | `v4/src/features/bone-age/components/XrayPreview.tsx` | 그대로 |
| `webapp/components/MatchResultView.tsx` | `v4/src/features/bone-age/components/MatchResultView.tsx` | 그대로 |
| `webapp/components/BoneAgeInput.tsx` | `v4/src/features/bone-age/components/BoneAgeInput.tsx` | 그대로 |
| `webapp/components/PredictionResult.tsx` | `v4/src/features/bone-age/components/PredictionResult.tsx` | 그대로 (`next/dynamic` SSR 회피 제거 — Vite 는 SSR 없음) |
| `webapp/components/GrowthChart.tsx` | `v4/src/features/bone-age/components/BoneAgeChart.tsx` | **리네임 필수**: v4 에 이미 `shared/components/GrowthChart.tsx` 존재 |
| `webapp/public/atlas/*` (54 WebP) | `v4/public/atlas/{male,female}/*` | 복사 |
| `webapp/public/atlas.json` | `v4/public/atlas.json` | 복사 |
| `webapp/scripts/prepare-atlas.mjs` | BoneAgeAI 쪽에 유지 | 재생성 필요 시만 사용 |

### 5.2 새로 만들 것

- `v4/src/features/bone-age/services/xrayReadingService.ts`
  - `uploadXrayImage(childId, file) → { path, url }` (Supabase storage)
  - `createXrayReading({ visitId, childId, xrayDate, imagePath, boneAgeResult, ...atlasMatches, doctorMemo })`
  - `updateHospitalMeasurementBoneAge(visitId, boneAge)` — 같은 visit 의 measurement 에 bone_age 동기화
- `v4/src/features/bone-age/components/BoneAgeTool.tsx` — 관리자 페이지 임베드용 단일 컨테이너 (기존 BoneAgeAI `app/page.tsx` 의 5-섹션 레이아웃을 하나의 컴포넌트로 통합, child prop + visit prop 받음)

### 5.3 Dependencies
BoneAgeAI 가 쓰는 것 중 v4 에 없는 것만 추가:
- `chart.js` + `react-chartjs-2` — v4 에 이미 있음 (확인 필요)
- `chartjs-plugin-zoom` — BoneAgeAI 가 dep 에 있지만 실사용 없음 → 포팅 안 함
- `sharp` — 전처리 스크립트용, v4 런타임엔 불필요

## 6. 관리자 UI 화면

### 6.1 라우트
| 경로 | 화면 | 주요 데이터 |
|---|---|---|
| `/admin/patients` | 환자 리스트 (기존 확장) | `children` + 최근 visit 요약 |
| `/admin/patients/:childId` | 환자 차트 (개편) | visits 타임라인 + 성장곡선 + 생활습관 요약 |
| `/admin/patients/:childId/visits/new` | 새 내원 입력 | 측정/주호소/플랜 폼 |
| `/admin/patients/:childId/visits/:visitId` | 내원 상세 | measurements / xray / labs / rx 한 화면 |
| `/admin/patients/:childId/visits/:visitId/bone-age` | BoneAgeAI 판독 | atlas 매칭 + 예측 |
| `/admin/medications` | 약품 마스터 CRUD | medications |

### 6.2 환자 차트 레이아웃 (핵심 화면)
- 상단: 환자 기본정보 (이름/성별/생년월일/부모 키)
- 좌측: visits 타임라인 (세로 리스트, 최근 순, 클릭 → 상세)
- 우측 상단: 성장 곡선 (hospital_measurements 만, 선택 시 daily_routines 자기측정 overlay)
- 우측 하단: 생활습관 요약 카드 (최근 7일/30일 수면 평균, 식사 영양 점수 등)
- 우상단 버튼: "새 내원 기록" / "성장 예측"

### 6.3 내원 상세 레이아웃
한 화면에 4개 블록:
1. **측정** — height/weight/bone_age inline 편집
2. **X-ray** — 업로드된 이미지 썸네일 + "판독 툴 열기" 버튼 → BoneAgeAI 페이지
3. **Lab** — 검사 타입별 탭 (알러지 / 유기산 / 혈액), 결과 JSON 편집 + PDF 첨부
4. **처방** — medications 검색(code/name) → 선택 → 용량/빈도/기간 입력 → row 추가

## 7. 마이그레이션 계획

### 7.1 DB 마이그레이션 순서
1. `medications` 테이블 생성 + RLS
2. `visits` 테이블 생성 + RLS
3. `measurements` → `hospital_measurements` 리네임, `visit_id uuid NULLABLE` 컬럼 추가
4. 기존 row 마다 dummy visit insert (visit_date = measured_date, doctor_id = admin 사용자 1명, chief_complaint = NULL), 해당 visit_id 로 `hospital_measurements.visit_id` 채움
5. `hospital_measurements.visit_id` NOT NULL 강제
6. `xray_readings`, `lab_tests`, `prescriptions` 테이블 생성 + RLS
7. Supabase Storage `xray-images` 버킷 생성 + 정책
8. Types 갱신: `v4/src/shared/types/index.ts`

### 7.2 코드 마이그레이션
- `features/growth/services/measurementService.ts` → `hospital_measurements` 테이블명 변경
- `features/admin/components/AdminPatientDetailPage.tsx` → 재작성 (차트 레이아웃)
- Website `CasesSlide` 는 **변경 없음** (Phase E 까지 기존 JSON 기반 유지)

## 8. 단계 (Phases)

| Phase | 내용 | 산출물 |
|---|---|---|
| **A** | DB 마이그레이션 (§7) | Supabase 테이블 · RLS · storage 버킷 · types.ts 갱신 |
| **B** | 원장님 환자 차트 기본 UI | 환자 리스트/차트 개편, visits CRUD, measurements inline 편집 |
| **C** | BoneAgeAI 포팅 | atlas 복사, lib/components 이식, `/admin/patients/:id/visits/:vid/bone-age`, xray_readings 저장 |
| **D** | Lab/처방 입력 UI | lab_tests 3종 탭, medications 마스터, prescriptions 입력 |
| **E (나중)** | 홈페이지 치료사례 → real visits 연결 | 이번 범위 밖 |

각 Phase 는 독립 커밋/배포. B 완료 시점에 원장님이 "visits 만 기록하는 간단 차트" 로 사용 가능.

## 9. 열린 이슈 (implementation plan 에서 해결)

- `users.is_patient` 플래그 vs `children.is_patient` 플래그 — 어디가 최종 truth 인지 정리 필요 (CLAUDE.md 상 `users.is_patient` 가 있다고 되어 있음)
- `daily_routines.daily_height/daily_weight` 와 `hospital_measurements` 의 overlay 차트 스펙 (색상/라벨)
- BoneAgeAI `growthStandard.ts` 와 v4 `growthStandard.ts` diff 검토 (LMS 데이터 동일? 함수 signature 다른지)
- RLS 정책 SQL 정확한 표현 (parent 는 child.parent_id = auth.uid() 조건)
- migration 의 "admin 사용자 1명" 결정 (기본 admin 계정 id 를 seed 로 박을지, 환경변수)
