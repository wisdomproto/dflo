# 187 성장케어 플랫폼 - 리팩토링 PRD (v4.0)

> **문서 버전**: 1.0
> **작성일**: 2026-02-21
> **목적**: 현재 코드베이스의 구조적 문제를 정리하고, 리팩토링 방향과 우선순위를 정의한다.

---

## 목차

1. [현재 상태 진단](#1-현재-상태-진단)
2. [리팩토링 목표](#2-리팩토링-목표)
3. [기술 스택 전환](#3-기술-스택-전환)
4. [아키텍처 설계](#4-아키텍처-설계)
5. [모듈 구조](#5-모듈-구조)
6. [기능 명세 (유지/개선/삭제)](#6-기능-명세)
7. [데이터베이스 재설계](#7-데이터베이스-재설계)
8. [인증/보안 재설계](#8-인증보안-재설계)
9. [화면별 리팩토링 명세](#9-화면별-리팩토링-명세)
10. [마이그레이션 전략](#10-마이그레이션-전략)
11. [개발 페이즈](#11-개발-페이즈)

---

## 1. 현재 상태 진단

### 1.1 프로젝트 개요

- **서비스명**: 187 성장케어 (LPCare)
- **클라이언트**: 연세새봄의원 187 성장 클리닉
- **용도**: 소아 성장 관리 플랫폼 (부모용 + 의료진 관리용)
- **현재 버전**: v3.0 (Vanilla JS + Supabase + Cloudflare Pages)

### 1.2 현재 기능 목록

| 기능 | 설명 | 상태 |
|------|------|------|
| 로그인/인증 | email + password 기반 로그인 | 동작하지만 보안 취약 |
| 아이 관리 | 아이 추가/수정, 부모 신장 입력 | 동작 |
| 데일리 루틴 | 수면/식사/운동/영양제/수분/성장주사 기록 | 핵심 기능, 동작 |
| 성장 차트 | 한국 표준 성장곡선 기반 백분위 시각화 | 동작 |
| 예측키 계산 | Bayley-Pinneau 방식 성인키 예측 | 동작 |
| 체형 분석 | MediaPipe 기반 자세 분석 | 동작 |
| 관리자 대시보드 | 환자 목록, 루틴 캘린더, 측정 기록 관리 | 동작 |
| 교육 콘텐츠 | 성장 레시피, 성공 사례, 가이드 | 동작 |
| PWA | 모바일 설치, 오프라인 지원 | 부분 동작 |

### 1.3 핵심 문제 진단

#### CRITICAL - 즉시 수정 필요

| # | 문제 | 영향도 | 위치 |
|---|------|--------|------|
| C1 | **Supabase 키 하드코딩** - anon key가 13개 이상 파일에 평문 노출 | 데이터 유출 위험 | config.js, supabase-config.js, index.html 등 |
| C2 | **클라이언트 사이드 인증** - 비밀번호 평문 비교, 해싱 없음 | 계정 탈취 가능 | auth.js |
| C3 | **관리자 비밀번호 하드코딩** - `password === '1234'` | 관리자 페이지 무방비 | index.html:512 |
| C4 | **RLS 미적용** - Supabase에 Row Level Security 없음 | 모든 데이터 접근 가능 | supabase/ |
| C5 | **비밀번호 평문 저장** - DB에 해싱 없이 저장 | 전체 계정 유출 위험 | users 테이블 |

#### HIGH - 빠른 시일 내 수정

| # | 문제 | 영향도 | 위치 |
|---|------|--------|------|
| H1 | **God File** - home.js 2,753줄, 59개 함수 | 유지보수 불가 | js/home.js |
| H2 | **모듈 시스템 없음** - ES6 import/export 미사용, 전역 스코프 | 코드 충돌, 의존성 관리 불가 | 전체 |
| H3 | **전역 상태 난립** - routine.js에만 25개 전역 변수 | 버그 추적 불가 | 전체 JS 파일 |
| H4 | **코드 중복** - 나이 계산 4곳, 차트 생성 3곳, 모달 패턴 6곳 | 변경 시 누락 | home.js, routine.js, admin.js |
| H5 | **이중 저장소** - localStorage + sessionStorage + Supabase 혼용 | 데이터 불일치 | 전체 |
| H6 | **에러 처리 없음** - catch에서 console.error만, 사용자 피드백 없음 | 무응답 오류 | 전체 |

#### MEDIUM - 리팩토링 시 수정

| # | 문제 | 영향도 | 위치 |
|---|------|--------|------|
| M1 | **console.log 528개** - 프로덕션에 디버그 로그 | 성능, 보안 | 25개 파일 |
| M2 | **타입 안전성 없음** - TypeScript 미사용, JSDoc 없음 | 리팩토링 위험 | 전체 |
| M3 | **테스트 없음** - 단위/통합/E2E 테스트 0건 | 회귀 버그 | 전체 |
| M4 | **빌드 시스템 없음** - 번들링, 미니파이, 소스맵 없음 | 성능, DX | 전체 |
| M5 | **순차 API 호출** - for 루프 안에서 await | 로딩 느림 | home.js |
| M6 | **DOM 쿼리 반복** - 같은 요소 반복 조회 | 성능 | home.js (101개 getElementById) |

### 1.4 코드베이스 규모

| 항목 | 수치 |
|------|------|
| HTML 파일 | 35+ 페이지 |
| JS 파일 | 37개 (총 ~752KB) |
| CSS 파일 | 24개 |
| SQL 파일 | 25개 |
| 문서 파일 | 60+ |
| 가장 큰 JS 파일 | home.js (2,753줄) |
| 전역 변수 (추정) | 100+ |
| console.log 수 | 528개 |

---

## 2. 리팩토링 목표

### 2.1 핵심 원칙

1. **기능 유지 우선** - 기존 기능은 100% 보존한다. 새 기능은 추가하지 않는다.
2. **점진적 전환** - Big-bang 리팩토링이 아닌, 모듈 단위 점진적 교체.
3. **보안 최우선** - 인증/인가 시스템을 가장 먼저 수정한다.
4. **측정 가능한 개선** - 리팩토링 전후를 수치로 비교한다.

### 2.2 성공 기준

| 지표 | 현재 | 목표 |
|------|------|------|
| 가장 큰 파일 크기 | 2,753줄 | 300줄 이하 |
| 전역 변수 수 | 100+ | 0 (모듈 스코프만) |
| console.log 수 | 528 | 0 (로거 사용) |
| 테스트 커버리지 | 0% | 핵심 비즈니스 로직 80%+ |
| 인증 방식 | 평문 비밀번호 | Supabase Auth (JWT) |
| 빌드 시스템 | 없음 | Vite |
| 타입 안전성 | 없음 | TypeScript strict |
| 코드 중복률 | 높음 | 유틸 함수로 통합 |

---

## 3. 기술 스택 전환

### 3.1 스택 비교

| 영역 | 현재 (v3) | 목표 (v4) | 이유 |
|------|----------|----------|------|
| **언어** | JavaScript (ES6) | TypeScript 5.x | 타입 안전성, 리팩토링 안정성 |
| **프레임워크** | Vanilla JS (MPA) | React 19 + React Router | 컴포넌트 재사용, 상태 관리, 생태계 |
| **빌드** | 없음 | Vite 6 | 빠른 HMR, 번들링, 코드 스플리팅 |
| **스타일** | 24개 CSS 파일 | Tailwind CSS 4 | 유틸리티 퍼스트, 일관성, 번들 최적화 |
| **상태 관리** | 전역 변수 + localStorage | Zustand | 경량, 간단, React 친화적 |
| **인증** | 자체 구현 (평문) | Supabase Auth | JWT, 소셜 로그인, RLS 연동 |
| **DB** | Supabase (직접 쿼리) | Supabase + RLS | Row Level Security 적용 |
| **배포** | Cloudflare Pages | Cloudflare Pages (유지) | 변경 불필요 |
| **테스트** | 없음 | Vitest + Testing Library | Vite 네이티브, 빠른 실행 |
| **린트/포맷** | 없음 | ESLint + Prettier | 코드 품질 일관성 |
| **차트** | Chart.js | Chart.js (유지) 또는 Recharts | React 통합 고려 |
| **AI 자세분석** | MediaPipe | MediaPipe (유지) | 변경 불필요 |

### 3.2 Vanilla JS → React 전환 근거

**왜 프레임워크가 필요한가:**

1. **컴포넌트 재사용** - 모달 패턴 6곳 중복 → 1개 Modal 컴포넌트
2. **상태 관리** - 전역 변수 100+ → React state + Zustand store
3. **라우팅** - 35개 HTML 파일 → React Router SPA
4. **데이터 흐름** - localStorage/sessionStorage 혼용 → 단방향 데이터 흐름
5. **생태계** - 테스트, 린트, 빌드 도구 통합 용이

**왜 React인가 (vs Vue, Svelte):**

- 가장 큰 생태계, 라이브러리 호환성
- 의료/헬스케어 도메인에서 검증된 사례 다수
- TypeScript 지원 우수
- 향후 React Native로 네이티브 앱 확장 가능

---

## 4. 아키텍처 설계

### 4.1 현재 아키텍처 (문제점)

```
[브라우저]
  ├── index.html (인라인 JS 200줄 + 인증 로직)
  ├── home.html → home.js (2,753줄 God File)
  ├── routine.html → routine.js (1,918줄)
  ├── admin-dashboard.html → admin.js (1,641줄)
  ├── ... (35개 HTML 파일)
  │
  ├── localStorage (26곳에서 읽기/쓰기)
  ├── sessionStorage (별도 읽기/쓰기)
  │
  └── Supabase (RLS 없음, anon key 평문 노출)
```

**문제:**
- MPA 구조로 페이지 간 상태 공유가 localStorage에 의존
- 인증 없이 모든 API 호출 가능
- 비즈니스 로직, UI, 데이터 접근이 한 파일에 혼재

### 4.2 목표 아키텍처 (v4)

```
src/
├── app/                    # 앱 진입점, 라우팅
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx       # Auth, Theme 등 Context Provider
│
├── features/               # 기능 단위 모듈 (도메인별)
│   ├── auth/               # 인증
│   │   ├── components/     # LoginForm, ProtectedRoute
│   │   ├── hooks/          # useAuth, useUser
│   │   ├── services/       # authService (Supabase Auth 래핑)
│   │   └── types.ts
│   │
│   ├── children/           # 아이 관리
│   │   ├── components/     # ChildCard, ChildForm, ChildSelector
│   │   ├── hooks/          # useChildren, useChild
│   │   ├── services/       # childrenService
│   │   └── types.ts
│   │
│   ├── routine/            # 데일리 루틴
│   │   ├── components/     # RoutineCalendar, MealInput, SleepInput...
│   │   ├── hooks/          # useRoutine, useRoutineCalendar
│   │   ├── services/       # routineService
│   │   └── types.ts
│   │
│   ├── growth/             # 성장 분석
│   │   ├── components/     # GrowthChart, PercentileDisplay, PredictionModal
│   │   ├── hooks/          # useGrowthData, usePercentile
│   │   ├── services/       # growthService, koreaGrowthStandard
│   │   └── types.ts
│   │
│   ├── body-analysis/      # 체형 분석
│   │   ├── components/     # CameraView, PostureOverlay, AnalysisResult
│   │   ├── hooks/          # useMediaPipe, useCamera
│   │   ├── services/       # poseAnalysisService
│   │   └── types.ts
│   │
│   ├── admin/              # 관리자
│   │   ├── components/     # PatientList, PatientDetail, RoutineCalendar
│   │   ├── hooks/          # usePatients, useAdminRoutine
│   │   ├── services/       # adminService
│   │   └── types.ts
│   │
│   └── content/            # 교육 콘텐츠
│       ├── components/     # RecipeCard, CaseCard, GuideCard
│       ├── hooks/          # useRecipes, useCases
│       ├── services/       # contentService
│       └── types.ts
│
├── shared/                 # 공유 유틸리티
│   ├── components/         # Button, Modal, Card, Calendar, Loading...
│   ├── hooks/              # useLocalStorage, useDebounce...
│   ├── utils/              # dateUtils, ageCalculator, formatters
│   ├── lib/                # supabaseClient, logger
│   └── types/              # 공통 타입 정의
│
├── stores/                 # Zustand 스토어
│   ├── authStore.ts
│   ├── childrenStore.ts
│   └── uiStore.ts
│
└── styles/                 # 글로벌 스타일
    └── globals.css         # Tailwind base + 커스텀 변수
```

### 4.3 레이어 구조

```
┌─────────────────────────────────────────────┐
│                   Pages                      │  ← React Router 페이지
├─────────────────────────────────────────────┤
│              Feature Components              │  ← 기능별 UI 컴포넌트
├─────────────────────────────────────────────┤
│          Hooks (Custom React Hooks)          │  ← 비즈니스 로직 + 상태
├─────────────────────────────────────────────┤
│               Services                       │  ← Supabase API 호출
├─────────────────────────────────────────────┤
│            Supabase (with RLS)               │  ← 데이터 레이어
└─────────────────────────────────────────────┘
```

**규칙:**
- Pages → Feature Components → Hooks → Services → Supabase
- 상위 레이어는 하위 레이어만 호출 (역방향 금지)
- Services는 Supabase 클라이언트만 직접 접근
- Components는 절대 Supabase를 직접 호출하지 않음

---

## 5. 모듈 구조

### 5.1 현재 God File 분해 계획

#### home.js (2,753줄) → 분해 대상

| 현재 기능 | 이동 위치 | 예상 크기 |
|----------|----------|----------|
| 앱 초기화 | `app/App.tsx` | 30줄 |
| 아이 목록/선택 | `features/children/components/ChildSelector.tsx` | 80줄 |
| 배너 슬라이더 | `features/content/components/BannerSlider.tsx` | 100줄 |
| 레시피 목록 | `features/content/components/RecipeList.tsx` | 60줄 |
| 성공 사례 | `features/content/components/CaseList.tsx` | 60줄 |
| 성장 차트 (홈) | `features/growth/components/HomeGrowthChart.tsx` | 120줄 |
| 예측키 모달 | `features/growth/components/PredictionModal.tsx` | 150줄 |
| 아이 통계 | `features/children/components/ChildStats.tsx` | 100줄 |
| 나이 계산 | `shared/utils/ageCalculator.ts` | 40줄 |
| 모달 관리 | `shared/components/Modal.tsx` | 50줄 |
| StorageManager | Zustand store로 대체 | - |

#### routine.js (1,918줄) → 분해 대상

| 현재 기능 | 이동 위치 | 예상 크기 |
|----------|----------|----------|
| 캘린더 뷰 | `features/routine/components/RoutineCalendar.tsx` | 120줄 |
| 수면 입력 | `features/routine/components/SleepInput.tsx` | 80줄 |
| 식사 입력 (사진 포함) | `features/routine/components/MealInput.tsx` | 100줄 |
| 운동 입력 | `features/routine/components/ExerciseInput.tsx` | 100줄 |
| 영양제 입력 | `features/routine/components/SupplementInput.tsx` | 60줄 |
| 수분 입력 | `features/routine/components/WaterInput.tsx` | 50줄 |
| 성장주사 입력 | `features/routine/components/InjectionInput.tsx` | 40줄 |
| 루틴 CRUD | `features/routine/services/routineService.ts` | 80줄 |
| 전역 변수 25개 | `features/routine/hooks/useRoutine.ts` | 60줄 |

#### admin.js (1,641줄) → 분해 대상

| 현재 기능 | 이동 위치 | 예상 크기 |
|----------|----------|----------|
| 환자 목록 | `features/admin/components/PatientList.tsx` | 100줄 |
| 환자 상세 | `features/admin/components/PatientDetail.tsx` | 120줄 |
| 측정 기록 관리 | `features/admin/components/MeasurementTable.tsx` | 100줄 |
| 루틴 캘린더 (관리자) | `features/admin/components/AdminRoutineCalendar.tsx` | 150줄 |
| 콘텐츠 관리 | `features/admin/components/ContentManager.tsx` | 100줄 |
| 환자 가져오기 | `features/admin/components/PatientImport.tsx` | 80줄 |

### 5.2 공유 유틸리티 (중복 코드 통합)

```typescript
// shared/utils/ageCalculator.ts
// 현재 4곳에서 각각 다르게 구현된 나이 계산을 하나로 통합

export function calculateAge(birthDate: string | Date): {
  years: number;
  months: number;
  days: number;
  decimal: number;  // 소수점 나이 (예: 7.5)
} { ... }

export function calculateAgeAtDate(birthDate: string | Date, targetDate: Date): { ... }
```

```typescript
// shared/utils/growthCalculator.ts
// 성장 관련 계산 함수 통합

export function calculatePercentile(age: number, gender: Gender, height: number): number { ... }
export function calculatePAH(currentHeight: number, boneAge: number, gender: Gender): number { ... }
export function getPercentileRange(age: number, gender: Gender): PercentileData { ... }
```

```typescript
// shared/components/Modal.tsx
// 현재 6개 모달 패턴을 하나의 재사용 컴포넌트로

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}
```

---

## 6. 기능 명세

### 6.1 기능 분류 (유지 / 개선 / 삭제)

#### 유지 (기능 그대로, 구조만 리팩토링)

| 기능 | 설명 | 비고 |
|------|------|------|
| 아이 관리 | 추가/수정/삭제, 부모 키 입력 | 컴포넌트 분리만 |
| 데일리 루틴 | 수면/식사/운동/영양제/수분/성장주사 | 핵심 기능 |
| 성장 차트 | 한국 표준 성장곡선 시각화 | Chart.js 유지 또는 Recharts |
| 예측키 계산 | Bayley-Pinneau 방식 | 로직 그대로 |
| 교육 콘텐츠 | 레시피, 성공 사례, 가이드 | JSON 데이터 유지 |
| 관리자 대시보드 | 환자 관리, 루틴 모니터링 | 컴포넌트 분리만 |
| PWA | 모바일 설치 | 설정 유지 |

#### 개선 (기능 + 구조 개선)

| 기능 | 현재 문제 | 개선 방향 |
|------|----------|----------|
| 인증 | 평문 비밀번호, 클라이언트 인증 | Supabase Auth 전환 |
| 체형 분석 | 동작하지만 결합도 높음 | MediaPipe 래핑 서비스 분리 |
| 관리자 인증 | 하드코딩 '1234' | Role 기반 접근 제어 (RLS) |
| 오프라인 지원 | 부분적 | Service Worker + 오프라인 큐 |
| 에러 처리 | console.error만 | Toast 알림 + 재시도 로직 |

#### 삭제 (사용하지 않는 코드)

| 항목 | 이유 |
|------|------|
| Convex 관련 파일 (convex/) | 사용하지 않음, Supabase로 통합 |
| 중복 문서 60+ | 정리 후 핵심만 유지 |
| console.log 528개 | 프로덕션 불필요 |
| 미사용 CSS | 빌드 시 purge |
| scripts/ 내 임시 스크립트 | 정리 |

### 6.2 페이지 구조 (라우팅)

```
/ (root)
├── /login                    # 로그인 페이지
├── /                         # 홈 대시보드 (인증 필요)
│   ├── 아이 선택
│   ├── 성장 요약
│   └── 교육 콘텐츠 배너
├── /routine                  # 데일리 루틴 (인증 필요)
│   ├── /routine/input        # 루틴 입력
│   └── /routine/calendar     # 캘린더 뷰
├── /growth                   # 성장 분석 (인증 필요)
│   ├── 성장 차트
│   └── 예측키 계산
├── /body-analysis            # 체형 분석 (인증 필요)
├── /info                     # 교육 콘텐츠
│   ├── /info/recipes         # 레시피
│   ├── /info/cases           # 성공 사례
│   └── /info/guides          # 가이드
├── /admin                    # 관리자 (admin role 필요)
│   ├── /admin/patients       # 환자 목록
│   ├── /admin/patients/:id   # 환자 상세
│   ├── /admin/routines       # 루틴 모니터링
│   └── /admin/content        # 콘텐츠 관리
└── /404                      # 404 페이지
```

---

## 7. 데이터베이스 재설계

### 7.1 테이블 구조 (변경 사항)

기존 테이블 구조는 유지하되, 다음을 변경한다:

#### users 테이블 변경

```sql
-- 기존: 자체 password 필드
-- 변경: Supabase Auth 연동, password 필드 제거

ALTER TABLE users
  ADD COLUMN auth_id UUID REFERENCES auth.users(id),
  DROP COLUMN password;

-- auth_id는 Supabase Auth의 user ID와 매핑
```

#### RLS 정책 추가 (신규)

```sql
-- users: 본인 데이터만 조회 가능
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth_id = auth.uid());

-- children: 부모만 자기 아이 데이터 접근
CREATE POLICY "Parents can manage own children" ON children
  FOR ALL USING (
    parent_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- measurements: 부모는 자기 아이, admin은 전체
CREATE POLICY "Parents see own children measurements" ON measurements
  FOR SELECT USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN users u ON c.parent_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- admin은 모든 데이터 접근 가능
CREATE POLICY "Admins can access all data" ON children
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- daily_routines: children과 동일한 정책
CREATE POLICY "Parents manage own children routines" ON daily_routines
  FOR ALL USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN users u ON c.parent_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );
```

### 7.2 데이터 마이그레이션

1. 기존 users 테이블의 email/password로 Supabase Auth 계정 일괄 생성
2. auth_id 필드 매핑
3. 기존 password 필드 제거
4. RLS 정책 활성화
5. anon key 권한을 RLS에 위임

---

## 8. 인증/보안 재설계

### 8.1 인증 흐름 (변경 후)

```
[로그인 페이지]
    │
    ├── Email + Password 입력
    │
    ▼
[Supabase Auth]
    │
    ├── supabase.auth.signInWithPassword()
    ├── JWT 토큰 발급
    ├── 자동 세션 관리
    │
    ▼
[앱 진입]
    │
    ├── supabase.auth.getSession() → 세션 확인
    ├── users 테이블에서 role 조회 (RLS 적용)
    ├── 아이 데이터 조회 (RLS로 본인 아이만)
    │
    ▼
[라우트 보호]
    ├── ProtectedRoute: 로그인 필수
    ├── AdminRoute: role === 'admin' 필수
    └── 미인증 → /login 리다이렉트
```

### 8.2 보안 개선 체크리스트

| 항목 | 현재 | 목표 |
|------|------|------|
| 비밀번호 저장 | 평문 | Supabase Auth (bcrypt) |
| 비밀번호 비교 | 클라이언트 JS | 서버 사이드 (Supabase Auth) |
| 세션 관리 | sessionStorage | Supabase JWT + refresh token |
| API 키 관리 | 하드코딩 13곳 | 환경변수 1곳 (.env) |
| 관리자 인증 | `'1234'` 하드코딩 | RLS + role 기반 |
| 데이터 접근 | 무제한 | RLS 정책 |
| HTTPS | Cloudflare 자동 | 유지 |
| CSP | 부분 적용 | 강화 |

### 8.3 환경변수 관리

```env
# .env.local (gitignore 대상)
VITE_SUPABASE_URL=https://mufjnulwnppgvibmmbfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

```typescript
// shared/lib/supabase.ts - 유일한 Supabase 클라이언트 생성 지점
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 9. 화면별 리팩토링 명세

### 9.1 로그인 화면 (/login)

**현재 문제:**
- index.html에 200줄 인라인 JS
- 평문 비밀번호 비교
- 관리자 비밀번호 '1234' 하드코딩

**리팩토링:**

```tsx
// pages/LoginPage.tsx
// - Supabase Auth 사용
// - 이메일 + 비밀번호 로그인
// - 에러 메시지 표시
// - 로딩 상태 처리
// - 로그인 성공 시 / 로 리다이렉트
```

| 컴포넌트 | 설명 |
|----------|------|
| `LoginForm` | 이메일/비밀번호 폼 |
| `useAuth` hook | Supabase Auth 래핑 |
| `ProtectedRoute` | 미인증 시 리다이렉트 |

### 9.2 홈 대시보드 (/)

**현재 문제:**
- home.js 2,753줄에 모든 로직
- 차트, 모달, 배너, 통계 모두 한 파일

**리팩토링:**

| 컴포넌트 | 역할 | 예상 크기 |
|----------|------|----------|
| `HomePage` | 페이지 레이아웃 | 60줄 |
| `ChildSelector` | 아이 선택 드롭다운 | 80줄 |
| `GrowthSummaryCard` | 성장 요약 카드 | 80줄 |
| `BannerSlider` | 교육 콘텐츠 배너 | 100줄 |
| `QuickActions` | 빠른 액션 버튼 | 40줄 |
| `RecentRoutine` | 최근 루틴 요약 | 60줄 |

### 9.3 데일리 루틴 (/routine)

**현재 문제:**
- routine.js 1,918줄
- 전역 변수 25개
- 모든 입력 폼이 하나의 파일

**리팩토링:**

| 컴포넌트 | 역할 | 예상 크기 |
|----------|------|----------|
| `RoutinePage` | 레이아웃 + 탭 전환 | 50줄 |
| `RoutineInputForm` | 입력 폼 컨테이너 | 80줄 |
| `SleepSection` | 수면 시간/품질 입력 | 70줄 |
| `MealSection` | 식사 기록 (사진 포함) | 100줄 |
| `ExerciseSection` | 운동 기록 | 80줄 |
| `SupplementSection` | 영양제 체크리스트 | 50줄 |
| `WaterSection` | 수분 섭취량 | 40줄 |
| `InjectionSection` | 성장주사 기록 | 40줄 |
| `RoutineCalendar` | 월별 캘린더 뷰 | 120줄 |
| `useRoutine` hook | 루틴 상태 관리 + CRUD | 100줄 |
| `routineService` | Supabase API 호출 | 60줄 |

### 9.4 성장 분석 (/growth)

**현재 문제:**
- growth-diagnosis-modal.js 1,482줄
- 차트 로직과 계산 로직 혼재

**리팩토링:**

| 컴포넌트 | 역할 | 예상 크기 |
|----------|------|----------|
| `GrowthPage` | 성장 분석 메인 | 60줄 |
| `GrowthChart` | 성장 곡선 차트 | 150줄 |
| `PercentileDisplay` | 백분위 표시 | 60줄 |
| `PredictionModal` | 예측키 계산 모달 | 120줄 |
| `MeasurementHistory` | 측정 이력 테이블 | 80줄 |
| `useGrowthData` hook | 성장 데이터 관리 | 80줄 |
| `koreaGrowthStandard` | 한국 성장곡선 데이터 서비스 | 100줄 |

### 9.5 체형 분석 (/body-analysis)

**현재 문제:**
- 카메라 폴백 4단계 로직 복잡
- MediaPipe 초기화 + UI 혼재

**리팩토링:**

| 컴포넌트 | 역할 | 예상 크기 |
|----------|------|----------|
| `BodyAnalysisPage` | 페이지 레이아웃 | 50줄 |
| `CameraView` | 카메라 + 캔버스 오버레이 | 100줄 |
| `AnalysisResult` | 분석 결과 표시 | 80줄 |
| `PostureGuide` | 자세 가이드 안내 | 40줄 |
| `useMediaPipe` hook | MediaPipe 초기화 + 감지 | 120줄 |
| `useCamera` hook | 카메라 접근 + 폴백 | 80줄 |
| `poseAnalysisService` | 각도 계산 + 분석 로직 | 60줄 |

### 9.6 관리자 대시보드 (/admin)

**현재 문제:**
- admin.js 1,641줄
- 모든 관리 기능이 탭으로 한 파일에

**리팩토링:**

| 컴포넌트 | 역할 | 예상 크기 |
|----------|------|----------|
| `AdminLayout` | 관리자 레이아웃 + 네비게이션 | 50줄 |
| `PatientListPage` | 환자 목록 + 검색/필터 | 100줄 |
| `PatientDetailPage` | 환자 상세 정보 | 120줄 |
| `AdminRoutineCalendar` | 환자 루틴 캘린더 뷰 | 150줄 |
| `MeasurementEditor` | 측정 기록 입력/수정 | 80줄 |
| `ContentManagerPage` | 콘텐츠 관리 | 100줄 |
| `PatientImport` | CSV/엑셀 환자 일괄 등록 | 80줄 |
| `useAdminData` hook | 관리자 데이터 관리 | 80줄 |

---

## 10. 마이그레이션 전략

### 10.1 점진적 전환 원칙

**Big-bang 리팩토링을 하지 않는다.** 다음 순서로 점진적으로 전환한다:

1. 새 프로젝트 scaffolding (Vite + React + TypeScript)
2. 공유 유틸리티/타입 먼저 작성
3. 페이지 단위로 하나씩 전환
4. 전환된 페이지 테스트
5. 모든 페이지 전환 후 기존 코드 제거

### 10.2 데이터 마이그레이션

```
1. Supabase Auth 계정 생성 (기존 email 기준)
   └── 기존 사용자에게 비밀번호 재설정 이메일 발송

2. users 테이블에 auth_id 매핑
   └── auth.users.id → users.auth_id

3. RLS 정책 활성화
   └── 각 테이블별 SELECT/INSERT/UPDATE/DELETE 정책

4. 기존 password 필드 제거
   └── 데이터 마이그레이션 완료 후

5. localStorage/sessionStorage 의존성 제거
   └── Zustand store로 완전 대체
```

### 10.3 하위 호환성

- 기존 URL 구조는 리다이렉트 처리
- 기존 데이터는 100% 보존
- API 키 갱신 (기존 키 폐기 후 새 키 발급)

---

## 11. 개발 페이즈

### Phase 0: 프로젝트 설정 (1주)

- [ ] Vite + React + TypeScript 프로젝트 초기화
- [ ] ESLint + Prettier 설정
- [ ] Tailwind CSS 설정
- [ ] Supabase 클라이언트 설정 (.env)
- [ ] 디렉토리 구조 생성
- [ ] CI 파이프라인 (lint, type-check)

### Phase 1: 보안 (1주) — 최우선

- [ ] Supabase Auth 설정
- [ ] 기존 사용자 Auth 마이그레이션 스크립트
- [ ] RLS 정책 작성 및 테스트
- [ ] 환경변수 전환 (.env)
- [ ] 기존 하드코딩 키 제거
- [ ] ProtectedRoute, AdminRoute 구현

### Phase 2: 공유 레이어 (1주)

- [ ] 공통 타입 정의 (User, Child, Measurement, Routine...)
- [ ] 유틸리티 함수 (ageCalculator, growthCalculator, dateUtils)
- [ ] 공통 컴포넌트 (Modal, Card, Button, Calendar, Loading, Toast)
- [ ] Supabase 서비스 레이어 (각 테이블 CRUD)
- [ ] Zustand 스토어 (auth, children, ui)
- [ ] 로거 유틸리티 (console.log 대체)
- [ ] 유틸리티 테스트 작성

### Phase 3: 핵심 화면 (2주)

- [ ] 로그인 페이지
- [ ] 홈 대시보드
- [ ] 아이 관리 (추가/수정/삭제)
- [ ] 데일리 루틴 입력
- [ ] 데일리 루틴 캘린더
- [ ] 성장 차트
- [ ] 각 화면 테스트

### Phase 4: 부가 화면 (1주)

- [ ] 체형 분석 (MediaPipe)
- [ ] 교육 콘텐츠 (레시피, 사례, 가이드)
- [ ] 예측키 계산
- [ ] 각 화면 테스트

### Phase 5: 관리자 (1주)

- [ ] 관리자 레이아웃
- [ ] 환자 목록/상세
- [ ] 관리자 루틴 캘린더
- [ ] 콘텐츠 관리
- [ ] 환자 일괄 등록
- [ ] 관리자 기능 테스트

### Phase 6: 마무리 (1주)

- [ ] PWA 설정 (manifest, service worker)
- [ ] 성능 최적화 (코드 스플리팅, lazy loading)
- [ ] E2E 테스트
- [ ] 기존 코드 정리/제거
- [ ] 배포 파이프라인 설정
- [ ] 문서 정리 (60개 → 핵심 5-10개)

---

## 부록 A: 파일 매핑 (기존 → 신규)

| 기존 파일 | 신규 위치 | 비고 |
|----------|----------|------|
| index.html | pages/LoginPage.tsx | Supabase Auth 전환 |
| home.html + home.js | pages/HomePage.tsx + 10개 컴포넌트 | 2,753줄 → ~60줄/파일 |
| routine.html + routine.js | pages/RoutinePage.tsx + 10개 컴포넌트 | 1,918줄 분해 |
| growth.html + growth-diagnosis-modal.js | pages/GrowthPage.tsx + 6개 컴포넌트 | 1,482줄 분해 |
| body-analysis.html + body-analysis.js | pages/BodyAnalysisPage.tsx + 5개 컴포넌트 | MediaPipe 래핑 |
| admin-dashboard.html + admin.js | pages/admin/ + 7개 컴포넌트 | 1,641줄 분해 |
| info.html | pages/info/ + 3개 컴포넌트 | 교육 콘텐츠 |
| auth.js | features/auth/services/authService.ts | Supabase Auth |
| config.js | .env.local | 환경변수 |
| supabase-config.js | shared/lib/supabase.ts | 단일 클라이언트 |
| main.js (StorageManager) | stores/childrenStore.ts | Zustand |
| korea-growth-standard.js | features/growth/services/koreaGrowthStandard.ts | 타입 추가 |
| data/*.json | public/data/*.json 또는 DB 이전 | 정적 데이터 유지 |

## 부록 B: 삭제 대상

| 경로 | 이유 |
|------|------|
| convex/ | Supabase 사용, 미사용 코드 |
| docs/ 중 60개 중 ~50개 | 중복/구버전 문서 |
| scripts/local_api_server.py | Vite dev server로 대체 |
| css/ 24개 파일 | Tailwind CSS로 대체 |
| 528개 console.log | 로거로 대체 |

## 부록 C: 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 사용자 Auth 마이그레이션 실패 | 로그인 불가 | 비밀번호 재설정 이메일 일괄 발송 |
| MediaPipe 호환성 | 체형 분석 기능 장애 | 기존 코드 참고해 래핑만 진행 |
| 데이터 유실 | 환자 데이터 손실 | 마이그레이션 전 전체 백업 |
| 일정 초과 | 배포 지연 | Phase별 독립 배포 가능하도록 설계 |

---

---

## 12. AI 기능 확장 (Phase 6+)

> **2026-02-21 추가** — 리팩토링 + AI 기능 통합

### 12.1 AI 기능 개요

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 식단 사진 분석 | 사진 업로드 → Gemini Vision으로 음식 인식 + 영양소 추정 | P0 |
| 체형 사진 분석 | 사진 업로드 → Gemini Vision으로 체형/자세 분석 | P0 |
| AI RAG 챗봇 | 성장 관련 지식 기반 상담 챗봇 (추후 구현) | P2 |
| 전문 관리자 대시보드 | 환자 목록/상세 + 통계 대시보드 + 콘텐츠 관리 + 예약 | P1 |

### 12.2 기술 스택 (AI)

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  React App   │────▶│  Node.js AI Server  │────▶│  Gemini API  │
│  (Frontend)  │     │  (Express/Fastify)  │     │  (Google AI) │
└──────────────┘     └─────────────────────┘     └──────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Supabase DB    │
                     │  (분석 결과 저장) │
                     └─────────────────┘
```

- **AI 모델**: Google Gemini (Vision + Text)
- **AI 백엔드**: Node.js 별도 서버 (Express 또는 Fastify)
- **배포**: Cloudflare Workers 또는 별도 서버
- **RAG**: 추후 구현 예정

### 12.3 식단 사진 자동 분석

#### 흐름

```
[사용자] 식단 사진 촬영/업로드
    │
    ▼
[Frontend] 이미지 리사이즈 + base64 변환
    │
    ▼
[AI Server] POST /api/analyze/meal
    │
    ├── Gemini Vision API 호출
    │   └── 프롬프트: "이 음식 사진에서 메뉴명, 재료, 예상 칼로리,
    │       탄수화물/단백질/지방을 JSON으로 분석해주세요"
    │
    ├── 응답 파싱 + 검증
    │
    ▼
[Frontend] 분석 결과 표시 + 수정 가능
    │
    ▼
[Supabase] meals 테이블에 저장
```

#### 관련 컴포넌트

| 컴포넌트 | 역할 | 위치 |
|----------|------|------|
| `MealPhotoInput` | 사진 촬영/업로드 UI | `features/routine/components/` |
| `MealAnalysisResult` | AI 분석 결과 표시/수정 | `features/routine/components/` |
| `analyzeMeal()` | AI 서버 API 호출 | `features/routine/services/aiService.ts` |

#### DB 스키마 확장

```sql
ALTER TABLE meals
  ADD COLUMN ai_analysis JSONB,        -- Gemini 분석 원본
  ADD COLUMN calories_estimated INT,   -- 추정 칼로리
  ADD COLUMN nutrients JSONB;          -- { carbs, protein, fat }
```

### 12.4 체형 사진 자동 분석

#### 흐름

```
[사용자] 전신 사진 촬영 (정면/측면)
    │
    ▼
[Frontend] 이미지 전처리
    │
    ├── MediaPipe Pose (클라이언트 사이드) - 관절 좌표 추출
    │
    ▼
[AI Server] POST /api/analyze/body
    │
    ├── Gemini Vision API 호출
    │   └── 프롬프트: "아동의 전신 사진과 관절 좌표를 기반으로
    │       자세 분석, 척추 정렬, 체형 특이사항을 분석해주세요"
    │
    ├── MediaPipe 각도 데이터 + Gemini 분석 결합
    │
    ▼
[Frontend] 종합 분석 결과 표시
    ├── 관절 각도 시각화 (Canvas 오버레이)
    ├── AI 소견
    └── 이전 분석과 비교 (추세)
```

#### 관련 컴포넌트

| 컴포넌트 | 역할 | 위치 |
|----------|------|------|
| `CameraCapture` | 카메라 촬영 UI | `features/body/components/` |
| `PoseOverlay` | MediaPipe 관절 좌표 오버레이 | `features/body/components/` |
| `BodyAnalysisResult` | AI + MediaPipe 종합 결과 | `features/body/components/` |
| `useMediaPipe` | MediaPipe Pose 초기화 + 감지 | `features/body/hooks/` |
| `analyzeBody()` | AI 서버 API 호출 | `features/body/services/aiService.ts` |

### 12.5 전문 관리자 대시보드

#### 관리자 라우트 구조

```
/admin
├── /admin/dashboard          # 통계 대시보드 (메인)
├── /admin/patients           # 환자 목록 (검색/필터/정렬)
├── /admin/patients/:id       # 환자 상세 (성장/루틴/체형 이력)
├── /admin/patients/:id/growth    # 환자별 성장 차트
├── /admin/patients/:id/routine   # 환자별 루틴 캘린더
├── /admin/patients/:id/body      # 환자별 체형 분석 이력
├── /admin/content            # 콘텐츠 관리 (레시피/가이드/사례)
├── /admin/content/new        # 콘텐츠 작성
├── /admin/appointments       # 예약 관리
└── /admin/settings           # 관리자 설정
```

#### 통계 대시보드 기능

| 위젯 | 설명 |
|------|------|
| 총 환자 수 | 활성/비활성 환자 수 |
| 이번 달 신규 | 이번 달 신규 등록 환자 |
| 루틴 준수율 | 전체 환자 평균 루틴 기록률 |
| 성장 추세 차트 | 전체 환자 평균 성장 추세 |
| 최근 측정 | 최근 측정 기록 리스트 |
| 성장주사 현황 | 성장주사 투여 현황 |
| 예약 현황 | 오늘/이번주 예약 목록 |

#### 환자 상세 기능

| 탭 | 내용 |
|----|------|
| 기본정보 | 이름, 성별, 생년월일, 부모 키, 연락처 |
| 성장 기록 | 측정 이력 테이블 + 성장 차트 + 예측키 |
| 루틴 현황 | 캘린더 뷰 + 루틴 통계 (수면, 영양제, 주사 등) |
| 체형 분석 | 체형 사진 이력 + AI 분석 결과 |
| 식단 기록 | 식단 사진 + AI 영양 분석 결과 |
| 메모 | 의료진 메모/소견 기록 |

#### 관련 컴포넌트

| 컴포넌트 | 역할 | 위치 |
|----------|------|------|
| `AdminLayout` | 사이드바 + 관리자 레이아웃 | `features/admin/components/` |
| `StatsDashboard` | 통계 대시보드 메인 | `features/admin/components/` |
| `PatientList` | 환자 목록 + 검색/필터 | `features/admin/components/` |
| `PatientDetail` | 환자 상세 (탭 기반) | `features/admin/components/` |
| `MeasurementEditor` | 측정 기록 입력/수정 | `features/admin/components/` |
| `ContentManager` | 콘텐츠 CRUD | `features/admin/components/` |
| `AppointmentManager` | 예약 관리 | `features/admin/components/` |
| `AdminStatsCard` | 통계 카드 위젯 | `features/admin/components/` |

### 12.6 AI 서버 구조

```
ai-server/
├── src/
│   ├── index.ts              # 서버 엔트리
│   ├── routes/
│   │   ├── meal.ts           # POST /api/analyze/meal
│   │   ├── body.ts           # POST /api/analyze/body
│   │   └── chat.ts           # POST /api/chat (추후)
│   ├── services/
│   │   ├── gemini.ts         # Gemini API 클라이언트
│   │   ├── mealAnalyzer.ts   # 식단 분석 로직
│   │   └── bodyAnalyzer.ts   # 체형 분석 로직
│   ├── prompts/
│   │   ├── meal.ts           # 식단 분석 프롬프트
│   │   └── body.ts           # 체형 분석 프롬프트
│   └── middleware/
│       ├── auth.ts           # Supabase JWT 검증
│       └── rateLimit.ts      # API 호출 제한
├── package.json
├── tsconfig.json
└── .env                      # GEMINI_API_KEY
```

### 12.7 수정된 개발 페이즈

| Phase | 내용 | 비고 |
|-------|------|------|
| Phase 0~2 | 프로젝트 기반 + 보안 + 공유 레이어 | **완료** |
| Phase 3 | 홈/루틴/성장/아이관리 핵심 화면 | **완료** |
| Phase 4 | 체형 분석 + 교육 콘텐츠 | **진행 중** |
| Phase 5 | 전문 관리자 대시보드 | 통계 + 환자 관리 + 콘텐츠 관리 |
| Phase 6 | AI 서버 구축 + 식단/체형 AI 분석 | Node.js + Gemini |
| Phase 7 | PWA + 성능 최적화 + 배포 | 마무리 |
| Phase 8 | RAG 챗봇 (추후) | 지식 기반 구성 후 |

---

> **이 문서는 187 성장케어 v4 재구축 + AI 기능 확장의 전체 범위를 정의합니다.**
