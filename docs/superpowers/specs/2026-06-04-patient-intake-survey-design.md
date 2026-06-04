# 환자 셀프 설문지(공개 인테이크) — 설계 스펙

- 날짜: 2026-06-04
- 상태: 승인됨 (브레인스토밍 완료)
- 범위: 처음 연락 온 환자에게 보내는 국적별(언어별) 셀프 설문 페이지 + 어드민 검토/승인 파이프라인

## 1. 배경 · 목표

처음 연락이 온 환자(국내·해외)에게 **국적에 맞는 언어로 번역된 설문 페이지 링크**를 보내고, 환자가 직접 기본 정보·문진·검사자료(X-ray·기타 검사)를 입력/업로드하게 한다. 제출물은 **대기함**에 쌓이고, 어드민이 검토 후 **승인**하면 정식 환자(`children`) 레코드가 생성된다. 해외 환자는 승인 시 **국가별 환자번호**(예: `th0001`)가 자동 부여된다.

기존 어드민 "기본 정보" 탭(`IntakeSurveyPanel`, 5섹션)을 환자가 직접 채우는 셀프 버전 + 검사자료 업로드가 본질이다.

### 확정된 의사결정
1. **접근 방식**: 국적별 공개 링크 (로그인 없음). 예 `/intake/th`.
2. **제출 처리**: 제출 → 별도 staging 테이블(대기함) → 어드민 승인 시 `children` 생성.
3. **항목 범위**: 전체 문진 (어드민 '기본 정보' 탭 5섹션 전체) + X-ray·기타 검사 업로드.
4. **환자번호**: **해외 환자만** 국가 prefix(`th0001`) 자동 채번. 한국 신규는 기존 숫자 체계로 어드민 수동 입력.
5. **구현**: React 공개 라우트 + 타입 번역 파일(`intakeLabels.ts`). (정적 i18n/ai-server 방식 기각.)
6. **폼 UX**: **스텝 마법사**(다단계). 완료 화면은 각 언어로 "감사합니다".
7. **언어**: 입력·표시 모두 각국어. 라벨/옵션/검증/안내문 전부 ko·th·vi·en 4개 번역. 환자가 입력한 값은 각국어 원문 그대로 저장·표시.
8. **보안/RLS**: 기존 앱과 동일한 permissive 모델(Supabase Auth 미사용, `users` 테이블 + anon key). 이 기능이 새 노출을 만들지 않음(기존 포스처 답습).

## 2. 데이터 모델

### 2.1 신규 테이블 `intake_submissions` (migration 018)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | |
| `token` | text UNIQUE NOT NULL | 랜덤(업로드 경로 + 공개 참조용) |
| `created_at` | timestamptz default now() | |
| `lang` | text NOT NULL | 폼 언어 ko/th/vi/en |
| `country` | text | 폼에서 선택한 국적(ISO alpha-2/OTHER). lang→country 기본값 프리필(ko→KR, th→TH, vi→VN, en→US), 환자가 변경 가능 |
| `status` | text NOT NULL default 'pending' | pending / approved / rejected |
| `name` | text | 각국어 원문 |
| `name_en` | text | 선택(로마자/영문) — 스태프 편의, 필수 아님 |
| `gender` | text | male/female |
| `birth_date` | date | 년/월/일 분리 입력 후 조합 |
| `father_height` | numeric | |
| `mother_height` | numeric | |
| `desired_height` | numeric | |
| `grade` | text | |
| `class_height_rank` | text | |
| `phone` | text | |
| `email` | text | |
| `address` | text | 각국어 원문 |
| `intake_survey` | jsonb | 기존 `IntakeSurvey` 구조 그대로(Q4 성장기록 + growth_flags + Q9~16) |
| `uploads` | jsonb | `[{kind:'xray'|'lab', path, filename, size, contentType}]` |
| `child_id` | uuid | 승인 시 생성된 children FK |
| `reviewed_at` | timestamptz | 승인/반려 시각 |
| `reject_reason` | text | 반려 사유(선택) |

RLS: 기존 임상 테이블과 동일하게 permissive (anon insert + select/update 허용). 앱 레벨에서 공개 폼은 insert만, 어드민 라우트는 앱 로그인 뒤 노출.

### 2.2 신규 Storage 버킷 `intake-uploads` (비공개)

- 경로 규칙: `{token}/xray-{n}.{ext}`, `{token}/lab-{n}.{ext}`.
- anon insert-only 정책 (migration 006이 xray 익명 업로드 연 패턴과 동일).
- 승인 시 → X-ray는 `xray-images`, 기타 검사는 `raw-records`로 **복사**하고 `children.intake_survey.raw_files` 메타에 기록(기존 구조 재사용). staging 버킷 원본은 정리 정책 별도(당장은 보존).

### 2.3 채번 함수 (migration 018에 포함)

- Postgres 함수 `next_country_chart_number(cc text) returns text`:
  - 입력 `cc`(소문자 국가코드, 예 'th')에 대해 `chart_number ~ '^{cc}[0-9]+$'` 중 최대 숫자 + 1, 4자리 zero-pad → `th0001`.
  - 동시성 안전(승인은 어드민 1건씩이라 충돌 가능성 낮지만 함수로 원자화).
- 한국(country = 'KR' 또는 미지정): 함수 미사용. 어드민이 승인 모달에서 수동 입력(다음 번호 제안만 표시).

## 3. 공개 폼 (환자용)

### 3.1 라우트 / 모듈 구조
- 신규 lazy 공개 라우트 `/intake/:lang` (lang ∈ ko·th·vi·en, 잘못된 값은 ko fallback). `router.tsx`에 등록(로그인 불필요).
- 신규 모듈 `features/intake/`:
  - `pages/PublicIntakePage.tsx` — 스텝 마법사 오케스트레이터(진행 상태, 검증, 제출).
  - `components/` — 스텝별 폼 섹션 컴포넌트(로컬 controlled state, blur 저장 아님).
  - `intakeLabels.ts` — lang별 타입 번역 객체(`calcLabels.ts` 패턴): 섹션 제목·필드 라벨·옵션·검증 메시지·완료 문구.
  - `publicIntakeService.ts` — 파일 업로드 + submission insert.

### 3.2 스텝 구성 (어드민 5섹션 미러 + 업로드)
1. **기본정보** — 이름(각국어)·영문이름(선택)·성별·생년월일(년/월/일 분리, Chromium date lang 이슈 회피)·국적(폼 언어 기본값, 변경가능)·부모키·희망키·학년·키번호·연락처(전화/이메일/주소)
2. **과거 성장기록(Q4)** — 8~16세 키 입력 테이블(셀프용 간소화: 아는 값만, **빈칸 허용**) + 급성장/둔화/사춘기 체크
3. **가족·관심(Q9~13)** — 예/아니오 + 운동 종목
4. **의료문진(Q14~15)** — 만성질환 서술 + 사춘기(Tanner) 설명형 보기
5. **키 작은 원인(Q16)** — 다중선택 칩 + 기타
6. **업로드** — X-ray 이미지(다중) + 기타 검사기록(다중, 이미지/PDF)

### 3.3 UX · 검증 · 제출
- 모바일 우선 **스텝 마법사**: 상단 진행 표시(스텝 n/6), 이전/다음, 마지막 스텝에 제출.
- 필수: 이름·성별·생년월일·국적·연락처(전화). 나머지 선택. lang별 인라인 검증 메시지. 필수 미충족 시 다음 단계 진행 차단.
- 제출 흐름: 검증 통과 → `intake-uploads/{token}`에 파일 업로드 → `intake_submissions` insert(uploads 메타 포함) → 각 언어 완료 화면 **"감사합니다"**(짧은 안내). 업로드/네트워크 실패 시 재시도 버튼.
- 모든 텍스트(라벨·옵션·검증·완료)는 4개 언어. ko를 소스로 작성, th·vi·en 초벌 번역 포함.

## 4. 어드민 검토·승인

### 4.1 라우트 / 진입
- 신규 `/admin/intake` — 설문 접수함. 사이드바 "📥 설문 접수" + 대기 건수 뱃지.

### 4.2 목록
- 대기 제출 리스트: 이름(현지어) · 국기 · 언어 · 제출일 · 업로드 수. status 필터(기본 pending).

### 4.3 상세 + 승인/반려
- 제출 전체 항목 표시 — **값은 환자가 쓴 각국어 원문**, 필드 라벨은 한국어 병기(스태프 가독성). 업로드 파일 미리보기(이미지 라이트박스 / PDF 다운로드).
- **승인**:
  - 국적 표시. 해외면 `next_country_chart_number(cc)` 결과를 미리보기(수정가능), 한국이면 수동 입력(다음 번호 제안).
  - 확정 시 `approveSubmission(id, { chart_number })`:
    1. `createPatient` 확장 호출 — country·연락처·이름·`intake_survey` 통째 이식.
    2. 업로드 파일을 `xray-images`(xray) / `raw-records`(lab)로 복사 + `children.intake_survey.raw_files` 메타 기록.
    3. `intake_submissions.status='approved'`, `child_id` 연결, `reviewed_at` 기록 → 환자 상세로 이동.
- **반려**: `status='rejected'`, `reject_reason`(선택), `reviewed_at`.

### 4.4 서비스 확장
- `createPatient` 를 `country`·`name_en`·연락처(phone/email/address)·`intake_survey` 받도록 확장(기존 호출부 호환 유지 — 신규 필드 옵셔널).
- `approveSubmission` 신규: 위 1~3 순차 처리. 부분 실패(파일 복사 등) 시 환자 생성은 유지하되 실패 항목 로깅 + 재시도 가능하도록 안전 처리.

## 5. 영향받는/신규 파일 (요약)

신규:
- `v4/scripts/migrations/018_intake_submissions.sql` (테이블 + 채번 함수 + 버킷 정책 노트)
- `v4/src/features/intake/pages/PublicIntakePage.tsx`
- `v4/src/features/intake/components/*` (스텝 섹션들)
- `v4/src/features/intake/intakeLabels.ts`
- `v4/src/features/intake/publicIntakeService.ts`
- `v4/src/features/admin/services/intakeSubmissionService.ts` (목록/승인/반려)
- `v4/src/pages/admin/AdminIntakePage.tsx`
- `v4/src/features/admin/components/IntakeSubmissionDetail.tsx`

수정:
- `v4/src/app/router.tsx` — `/intake/:lang` 공개 라우트 + `/admin/intake` 어드민 라우트
- `v4/src/features/admin/services/adminService.ts` — `createPatient` 확장
- `v4/src/features/admin/components/AdminLayout.tsx`(또는 사이드바) — "📥 설문 접수" 진입 + 대기 뱃지
- `v4/src/shared/types/index.ts` — `IntakeSubmission` 타입

## 6. 비범위 (YAGNI)
- X-ray 판독(atlas 매칭) 화면 — 공개 폼에 없음(업로드만).
- 토큰 기반 1환자 1링크 / 어드민 stub 사전생성 — 채택 안 함(공개 링크 방식).
- staging 버킷 자동 정리 / 만료 — 후속.
- 스팸 방지(captcha/rate-limit) — 후속(필요 시 추가).
- 한국 환자 자동 채번 — 수동 입력 유지.

## 7. 구현 시 확정(기본값 명시)
- 한국 환자 수동 채번 시 "다음 번호 제안" = 기존 `chart_number`가 순수 숫자인 행들의 max + 1.
- 업로드 제한: 이미지 10MB · PDF 10MB, 허용 확장자 jpg/jpeg/png/webp/heic/pdf, X-ray·기타 각 최대 10개.
- `lang` 경로가 ACTIVE_LANGS(ko/th/vi/en) 외 값이면 ko로 fallback.
