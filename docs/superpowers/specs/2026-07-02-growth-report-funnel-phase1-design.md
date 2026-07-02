# 성장 리포트 퍼널 1단계 — 계산기 → 설문 → 맞춤 리포트 (설계)

- **날짜**: 2026-07-02
- **상태**: 설계 승인 (구현 대기)
- **범위**: Phase 1 (리포트 기반). Phase 2(카카오 로그인 게이트·성장 트래커)는 별도 스펙.

## 1. 배경 / 문제

예측키 계산기 측정은 급증(하루 ~20명)하나 **상담 전환이 병목**이다([[calc_measurement_spike]]). 측정자의 ~59%가 "안심군"(≥50%ile)이라 상담 동기가 약하다. 측정 직후의 관심을 붙잡아 **가치를 주고(맞춤 리포트) 신뢰를 쌓는** 퍼널이 필요하다.

전략 방향(사용자 확정): 측정 → **더 자세한 리포트** → 설문 → 맞춤 리포트를 **화면에 무료로** 보여준다. 그 다음(Phase 2) "저장·추적하려면 가입"으로 리드를 자연스럽게 캡처한다. **관심 없는 사람을 억지로 가입시키지 않는다**(self-selection).

현재 상태:
- 리포트: `v4/public/growth-report-sample.html` = 하드코딩 정적 샘플(서연), 미배포. 카피·10개 신호블록·원장소개·병원갤러리·참고문헌이 이미 작성됨([[growth_report_feature]]).
- 설문: `/diagnosis`(`IntakeDiagnosisPage`) = 7-스텝 위저드. **계산기와 연결이 끊긴 고아 상태**(아무 데서도 `location.state`를 안 넘김) + `handleSubmit`이 `console.log` 스텁(저장·분석·리포트 없음).
- 계산기 결과 = iframe(`/calc.html`) 안의 `HeightCalculatorResult`. CTA는 카톡·치료사례 링크만, **리포트 진입 없음**.
- 소비자 회원가입/Supabase Auth 없음(레거시 `users` 평문 인증만). → Phase 1은 인증 불필요.
- `anonymous_predictions`(migration 060/061) = 측정 익명 로그(전원 발사, anon INSERT + 어드민 SELECT).

## 2. 목표 / 비목표

**목표 (Phase 1)**
- 계산기 결과에서 리포트 퍼널로 진입하는 배선.
- `/diagnosis` 설문을 살려 재사용 + 계산값 프리필(URL 파라미터).
- 설문 응답을 서버에 저장(fire-and-forget, 비크리티컬).
- 정적 샘플을 **동적 React 리포트**(`/report`)로 포팅 — 실제 측정+설문값으로 렌더, 신호 블록 조건부 노출.
- 의료법 컴플라이언스 유지(참고용·비진단, 보장·공포·유인 금지).

**비목표 (Phase 2 이후)**
- 카카오 로그인·회원가입·성장 트래커·계정 연결.
- 리포트 영구 URL·재열람·공유 링크("한번 보기" 모델 유지).
- 다국어 리포트(Phase 1은 한국어만).
- AI 런타임 생성(결정론 유지 — 절대 안 함).

## 3. 아키텍처 / 데이터 흐름

```
calc iframe (HeightCalculatorResult)
  │  [📋 더 자세한 성장 리포트 받기]  target=_top + URL params
  ▼
/diagnosis (설문, 계산값 프리필)
  │  완료 → fire-and-forget INSERT(growth_reports) + navigate(state)
  ▼
/report (React 동적 렌더 — measurement + survey)
  │  화면 무료 노출 (view-once)
  └  하단: 카톡 상담 CTA  [Phase 2 자리: "저장·추적하려면 가입"]
```

**경계별 데이터 전달**
- calc(iframe) → `/diagnosis`(SPA): iframe 탈출이 full-page 이동이라 React Router state가 안 살아남음 → **URL 파라미터**(`g,h,age,ph,pct,std,lang`).
- `/diagnosis` → `/report`(동일 SPA): `navigate('/report', { state })` — 같은 번들이라 state OK. 새로고침 대비 `sessionStorage` 백업 후 우선순위 state → sessionStorage.

## 4. 컴포넌트

### 4.1 퍼널 진입 (`HeightCalculatorResult.tsx`)
- 카톡 CTA 위에 **"📋 더 자세한 성장 리포트 받기"** 버튼 추가.
- `href = \`/diagnosis?g=${gender}&h=${currentHeight}&age=${age}&ph=${predicted}&pct=${percentile}&std=${standard}&lang=${lang}\``, `target="_top"`.
- GA4/픽셀 이벤트 발사(예: `report_start`) — 기존 트래킹 패턴 재사용.

### 4.2 설문 (`IntakeDiagnosisPage.tsx`) — 최소 수정
1. **계산값 소스 확장**: `location.state` 없으면 `useSearchParams`에서 읽어 `CalcState` 구성(iframe 진입 지원). 둘 다 없으면 기존처럼 graceful(빈 폼).
2. **`handleSubmit` 교체**: 스텁 제거 → (a) `growth_reports` fire-and-forget INSERT, (b) `navigate('/report', { state: { measurement, survey } })` + sessionStorage 백업.
3. **완료 스텝 교체**: "AI 진단 곧 추가" 문구 → **"내 리포트 보기"** 버튼(리포트로 이동). (제출 시 바로 리포트로 보내므로 완료 스텝은 단순화하거나 제거 가능.)
4. 문항·스텝 구조는 **유지**(이미 리포트 신호와 매칭됨). 슬림화는 하지 않음(YAGNI 역방향 — 이미 다 쓸모 있음).

### 4.3 저장 — 신규 테이블 `growth_reports`
```sql
create table public.growth_reports (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lang         text not null default 'ko',
  measurement  jsonb not null,   -- { age, gender, currentHeight, predicted, percentile, standard, fatherHeight, motherHeight }
  survey       jsonb not null,   -- IntakeForm 전체
  utm          jsonb,            -- { source, medium, campaign, referrer }
  account_id   uuid              -- Phase 2 (nullable)
);
alter table public.growth_reports enable row level security;
create policy growth_reports_anon_insert on public.growth_reports for insert to anon with check (true);
-- 어드민 조회(로그 뷰)용 SELECT 정책은 anonymous_predictions(061) 패턴 따름
```
- **anon INSERT만**(측정 익명 로그와 동일 신뢰수준, PHI 없음 — 실명·연락처 없음).
- migration 파일: `v4/scripts/migrations/065_growth_reports.sql` (다음 빈 번호 확인 후 배정). **수동 적용 대기 허용**(미적용이어도 INSERT 실패를 fire-and-forget이 삼켜 리포트는 정상).
- 조회 클라이언트: anon 키 REST/`supabase-js` (`anonymous_predictions` 로깅과 동일 패턴, [[calc_measurement_spike]] DB 조회법).

**왜 신규 테이블**: `anonymous_predictions`(측정=전원, GA 로그)는 깨끗이 유지. `growth_reports`(설문까지=고관심 subset)는 (a) Phase 2 "계정 연결" 앵커, (b) 마케팅 인사이트(측정자 실제 수면/영양/사춘기 분포), (c) 퍼널 신호(측정→설문→가입).

### 4.4 리포트 렌더러 (`/report`) — 핵심
- **위치**: SPA 라우트 `/report`(lazy). 데이터 = `location.state`(우선) → `sessionStorage`(폴백). 둘 다 없으면 안내 후 계산기로 유도.
- **비주얼 소스**: `growth-report-sample.html`을 React/Tailwind로 포팅. 카피·구조 이미 존재 → **새 작성 아님, 포팅 + 동적화**.
- **동적 숫자 (순수 계산, 런타임 RAG 절대 안 씀)**:
  - MPH = `(fatherHeight + motherHeight)/2 ∓ 6.5` (남 +6.5 / 여 −6.5). 부모키 미입력 시 MPH 블록 숨김.
  - 백분위·성장곡선 = `shared/data/growthStandard`.
  - 예측키 = 계산기 전달값.
  - bell curve·백분위 SVG·성장곡선 = `ConsultationRecordView`/`GrowthChart`의 기존 로직 재사용.
- **신호 블록 조건부 노출** — 순수 함수 `selectSignalBlocks(measurement, survey): BlockId[]` (단위 테스트 대상):

  | 블록 | 트리거(초안 — 구현 시 확정) |
  |------|------|
  | 수면 | 취침 ≥ 22:30 · **항상 노출**(보편) |
  | 운동 | exerciseFrequency ∈ {거의 안 함, 주 1~2회} · **항상 노출** |
  | 영양 | milkDaily=거의 안 먹음 OR mealRegularity=불규칙 · **항상 노출** |
  | 성조숙/사춘기 | 나이 대비 사춘기 빠름(여 초경<11·유방발달<9, 남 변성기<11, pubertyStage 초기+젊은 나이) |
  | 유전 | MPH 낮음 OR 부모키 낮음(부<168·모<155) |
  | 성장속도 | growthPattern ∈ {느려짐, 거의 안 자람} OR yearlyGrowth<4 |
  | 저출생(SGA) | birthWeight<2.5 OR gestationalWeeks<37 |
  | 비만 | BMI(현재키·몸무게) 높음(백분위 기준) |
  | 염증/알러지 | pastConditions에 아토피/천식/비염/알러지 |
  | 스트레스 | growthConcerns에 스트레스 언급(약신호, 선택) |

  - **안심군 대비**: 수면·운동·영양은 트리거 무관 항상 노출(보편 성장관리) → 리포트 안 빔. 임계값은 구현 시 확정·튜닝.
- **정적 파트**(전원 동일, 트리비얼 포팅): 원장 소개(사진·이력·방송칩), 병원 둘러보기 갤러리, 뼈나이 내원 후크(X-ray 이미지), 참고문헌[1..N].
- **CTA**: 카톡 상담(`_mxbWxfX`) + 치료사례 링크. 하단에 Phase 2 자리(주석/플레이스홀더).

## 5. 콘텐츠 · 컴플라이언스

- **콘텐츠 소스**: 신호 블록 설명 = 원장 저서 기반([[book_knowledge_rag]]) — 화면엔 **원장 책을 근거로 표기하지 않음**(자기참조=신뢰↓). 화면 근거 = 국제논문 pmid([[research_evidence_library]]). 전부 **정적 텍스트**(신호별 미리 작성됨), 런타임 생성 아님.
- **말투**: 신뢰감 있는 남자 의사 "합니다"체([[feedback_i18n_speaker_register]]). 헤딩 명사형.
- **의료법**([[M02]]): 상하단 "참고용 예측·의료 진단 아님" 배너. 금지 — 보장(100%/확실히), 공포(성장판 닫히기 전 서두르세요), 환자유인(무료 검사/진료). "권장/도와드립니다" 톤. ⚠️ 공개 시 의료광고 사전심의 대상 가능 → 원장 감수 전제.

## 6. 테스트

- `selectSignalBlocks` 순수 함수 단위 테스트(각 트리거 on/off, 안심군=보편 3블록만, 복합 케이스).
- MPH/백분위 계산 유틸 재사용분은 기존 테스트 커버 확인.
- 타입 게이트: `cd v4 && npx tsc -b --noEmit`.
- 수동 확인: 계산기 결과 → 리포트까지 iframe 경유 흐름(URL 파라미터 전달), 부모키 미입력 시 MPH 블록 숨김, 안심군 리포트 비지 않음. (preview 브라우저 미사용 — [[preview_verification_preference]], 코드/타입 레벨 + 사용자 직접 확인.)

## 7. Phase 2 훅 (이번엔 자리만)

- `growth_reports.account_id` 컬럼(nullable) 예약.
- 리포트 하단 CTA 영역에 "저장·추적하려면 가입" 플레이스홀더(주석).
- 익명 측정→계정 연결은 Phase 2에서 `growth_reports`/`anonymous_predictions`를 앵커로.

## 8. 파일 영향 요약

- 수정: `v4/src/features/website/components/HeightCalculatorResult.tsx`(진입 버튼), `v4/src/features/website/pages/IntakeDiagnosisPage.tsx`(URL 프리필·저장·이동), `v4/src/app/router.tsx`(`/report` 라우트).
- 신규: `/report` 페이지 + 리포트 컴포넌트들(`features/website/report/` 등), `selectSignalBlocks` + 테스트, `growthReportService`(anon INSERT), migration `065_growth_reports.sql`.
- 참조(비수정): `growth-report-sample.html`(비주얼 소스), `ConsultationRecordView`(MPH/bell/백분위 로직), `shared/data/growthStandard`.

관련 memory: [[growth_report_feature]] · [[calc_measurement_spike]] · [[book_knowledge_rag]] · [[research_evidence_library]] · [[feedback_i18n_speaker_register]] · [[blog_publish_pipeline]](리포트 내부 링크 대상, 후속).
