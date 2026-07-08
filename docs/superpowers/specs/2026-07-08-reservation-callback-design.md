# 예약(콜백) 신청 기능 — 설계 (2026-07-08)

> **상태: 구현 완료 (2026-07-08)** — 하단 바·예약 뷰·ai-server 저장/알림·마케팅 로그·병원 대표번호(ko 1599-0741) 전부 반영·검증(tsc·i18n 빌드·shell 문법). ⚠️ **migration 068 수동 적용** + 알림 env(SMTP/텔레그램) 설정은 운영자 액션으로 남음. 상세 memory `reservation_callback_feature.md`.

## 목표
한글(ko) 홈페이지에 **"예약하기"** 리드 캡처 경로를 추가한다. 부모가 카카오톡 채팅을 여는 마찰 없이 **이름·전화번호만 남기면 병원이 연락**하는 콜백 모델. 기존 "측정 → 카톡 상담" 퍼널을 대체하지 않고 **병행**한다.

두 개의 표면:
1. 한글 하단 바를 화면 꽉 찬 플랫 바로 바꾸고 `예상키 측정` 오른쪽에 `예약하기` 추가.
2. 레퍼런스(전체화면 예약 폼) 스타일의 예약 신청 뷰 → DB 저장 + 이메일·텔레그램 즉시 알림.

## 비목표 (YAGNI)
- 날짜·시간 슬롯 예약(스케줄러) — 콜백 모델이라 불필요. "다음으로" 다단계 없음, 단일 제출.
- th/vi/en 예약 기능 — 한글만. 다른 언어 하단 바는 기존 4칸 pill 그대로 유지.
- 생년월일 수집 — 받지 않음.
- 카카오 알림톡 — 이번 범위 밖(추후 알림 채널 추가 가능한 구조로).

## 결정 사항 (사용자 합의)
- 하단 바: **한글만, 엣지투엣지 플랫 바**. 모바일 꽉 채움, 데스크톱은 중앙 캡.
- 폼 필드: **성명(필수) · 휴대전화번호(필수) · 상담 방식(전화상담/문자상담, 기본 전화상담) · 상담 내용(선택)**. (희망 연락 시간대는 상담 방식으로 대체)
- 처리: **DB 저장 + 이메일 & 텔레그램 즉시 알림** (둘 다 env 없으면 graceful 스킵).
- 조회: 실전화번호 PII이므로 **anon SELECT 열지 않고 ai-server(service_role) 경유**로 조회.
- 폼 UX: 레퍼런스처럼 **전용 전체화면 뷰** + 약관동의 블록 + 하단 풀폭 CTA.

---

## A. 하단 바 (`v4/public/_shell.js` + `v4/public/_shell.css`)

현재: `.t-bottom-nav`는 전 언어 공용. 떠 있는 둥근 pill(`max-width:460px`, 좌우 12px, `bottom:14px`, `grid-template-columns: repeat(4,1fr)`), 4칸(성장 프로그램 / 병원 소개 / 치료 사례 / 예상키 측정[보라 강조]). 로케일은 `__I18N_LOCALE = window.__I18N__.locale`.

변경:
- `_shell.js`에서 `__I18N_LOCALE === 'ko'`일 때만:
  - `.t-bottom-nav`에 `t-bottom-nav--full` 클래스 추가.
  - 5번째 항목 `예약하기`를 **`<button type="button" data-open-reservation>`**로 추가(링크 아님 → 예약 뷰 오픈). 위치는 `예상키 측정` 다음(우측 끝).
  - `예약하기` 아이콘(캘린더/전화 계열 SVG) + 라벨. 강조색은 카톡톤/딥그린 계열로 `예상키 측정`(보라)과 구분.
- `_shell.css`에 `.t-bottom-nav--full` 규칙:
  - `left:0; right:0; bottom:0; max-width:none; margin:0; border-radius:0;`
  - `grid-template-columns: repeat(5, 1fr);`
  - `padding-bottom: env(safe-area-inset-bottom);` (iOS 홈 인디케이터)
  - `@media (min-width:768px)`에서는 데스크톱 중앙 캡 유지(예: `max-width:640px; margin:0 auto; border-radius:999px; bottom:18px;` — 데스크톱은 플랫 대신 기존 pill 톤 유지, 5칸).
- th/vi/en: 분기 밖이라 완전 무회귀.

책임 경계: `_shell.js`는 마크업/분기만, 스타일은 전부 `_shell.css`. 예약 뷰 오픈은 `data-open-reservation` 이벤트 위임 한 곳.

## B. 예약 전체화면 뷰 (`v4/public/_shell.js` 오버레이 + `_shell.css`, 한글만)

레퍼런스 룩. 새 라우트/i18n 템플릿을 만들지 않고 `_shell.js`가 주입하는 **전체화면 오버레이(fixed, 100dvh)**로 구현(빌드 부담 최소, 정적 사이트 무영향). `__I18N_LOCALE === 'ko'`일 때만 DOM 주입.

구조:
- 헤더 바: 뒤로(←, 오버레이 닫기) · 타이틀 "예약 신청" · 홈(🏠, `/ko/index.html`).
- 안내문: "원활한 예약을 위해\n고객님의 정보를 먼저 입력해 주세요."
- 필드:
  - **성명 \*** — text, `required`.
  - **휴대전화번호 \*** — `type="tel" inputmode="numeric"`, `required`, 간단 형식 검증(숫자/하이픈 10~11자리).
  - **상담 방식** — 라디오(전화상담 / 문자상담), 기본 전화상담. 병원이 올바른 채널로 첫 연락.
  - **상담 내용** (선택) — textarea, "아이 나이·키 고민을 간단히". 적으면 고관여 리드.
- 약관동의 블록:
  - `전체동의` 마스터 체크(두 항목 토글).
  - `(필수) 서비스 이용약관` [보기].
  - `(필수) 개인정보 수집·이용` [보기].
  - [보기] → 인라인 펼침 또는 바텀시트로 전문. 두 필수 미동의 시 제출 불가.
- 숨김 허니팟 input(스팸 봇 차단, 채워지면 조용히 무시).
- 하단 고정 풀폭 CTA "예약 신청하기"(제출).
- 제출 성공 화면: "예약이 접수됐어요. 곧 연락드릴게요." + 닫기.

제출 로직:
- 클라 검증 → `POST {window.__I18N__.aiServer}/api/reservation`.
- payload: `{ name, phone, contactMethod, message, locale:'ko', referrer:document.referrer, utm:(location.search 파싱), consent:true, hp:(honeypot) }`.
- 성공 시 성공 화면 전환. 실패 시 인라인 에러 + 재시도.
- 계측: 성공 시 GA4 `reservation_submit`(source='bottom_nav') + Meta Pixel `Lead`(`_shell.js`의 기존 `trackConsultClick`/pixel 패턴 옆에 헬퍼 추가).

약관 전문: 개인정보 수집·이용은 기존 `v4/public/privacy.html` 초안 문구 재활용(수집항목=성명·연락처, 목적=상담 예약 연락, 보유기간 명시). 서비스 이용약관은 짧게 신규 작성.

## C. 백엔드 + 알림 (ai-server)

새 공개 엔드포인트 `POST /api/reservation` (무인증 — `routes/analytics`·`metaAuth` 콜백처럼 공개 라우터에 등록).

`src/routes/reservation.ts`:
- 입력 검증: `name`, `phone`, `consent` 필수 / `phone` 형식 / `hp` 비어있어야 함(허니팟) / `contactMethod`는 화이트리스트(phone·text, 기본 phone) / `message`는 선택·1000자 컷.
- 간단 스팸 가드: 허니팟 + IP당 분당 소량 rate limit(인메모리, 베스트에포트).
- **service_role**로 `reservations` insert(ai-server의 `SUPABASE_SERVICE_ROLE_KEY` — 실제 service_role 확인됨).
- `notifyReservation(row)` 호출(await하되 실패 삼킴) → 접수는 항상 200.
- 응답 `{ ok:true, id }`.

`src/services/reservationNotify.ts` — 순수 팬아웃, 각 채널 env 가드:
- **이메일**: `RESERVATION_EMAIL_TO` + SMTP(`SMTP_HOST/PORT/USER/PASS`) 있을 때만. nodemailer 신규 의존성.
- **텔레그램**: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` 있을 때만. `sendMessage` fetch(무의존성).
- env 없으면 각 채널 no-op + 경고 로그. 어느 것도 실패가 요청을 깨지 않음.
- 메시지 본문: 접수시각·성명·전화·상담 방식(전화/문자)·상담 내용·유입(referrer/utm).

조회용(마케팅 로그) `GET /api/reservations` (service_role read + 마케팅 PIN 헤더 `x-marketing-pin` 검증). 목록 반환. 삭제 `DELETE /api/reservations/:id`.

정적 사이트 → ai-server URL: `v4/scripts/build-i18n.mjs`가 주입하는 `window.__I18N__`에 `aiServer` 필드 추가(env `SITE_AI_SERVER_URL`, 로컬 폴백 `http://localhost:3001`).

## D. DB (`v4/scripts/migrations/0XX_reservations.sql`)

```sql
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  contact_method text not null default 'phone',  -- phone(전화상담) | text(문자상담)
  message text,                                  -- 선택 상담 내용
  locale text not null default 'ko',
  referrer text,
  utm jsonb,
  status text not null default 'new',  -- new | contacted | done
  consent boolean not null default false
);
alter table reservations enable row level security;
-- anon 권한 부여 없음(SELECT/INSERT/DELETE 정책 미생성).
-- insert/select/delete 전부 ai-server service_role 경유 → PII(실전화번호) 공개 노출 차단.
```

PII 보호가 예측키/설문 로그(anon SELECT)와 다른 지점: 실명+실전화라 anon 키로 조회 가능하게 두지 않는다.

## E. 예약 로그 (마케팅, `v4/src/features/marketing`)

`/marketing/predictions` 페이지 상단 드롭다운(현재 📈 예측키 측정 / 📋 설문 완료)에 **📞 예약 신청** 3번째 뷰 추가.
- 새 컴포넌트 `ReservationsView`(패턴은 `SurveyReportsView`/`PredictionsLogPage` 재사용).
- 데이터: 신규 서비스 `reservationService.fetchReservations()` — anon Supabase 직접 read가 아니라 **ai-server `GET /api/reservations`(PIN 헤더)** 호출. 삭제도 동일 경유.
- 표: 접수시각 · 성명 · 전화 · 상담 방식 · 상담 내용 · 유입 · 상태 · 행 삭제. PIN 8054 게이트(기존 마케팅 게이트).

## 안전장치
- **의료광고법(M02)**: 버튼/안내/성공 문구를 M02 스킬로 점검("예약하기", "곧 연락드릴게요"는 안전선). 효과·보장·공포·무료강조 배제.
- **개인정보**: 필수 동의 없으면 제출 불가. 약관/개인정보 전문 [보기] 제공. 수집 최소화(생년월일 미수집).
- **graceful**: `aiServer` 미주입/알림 env 미설정/마이그레이션 미적용 어느 것도 사용자 흐름을 하드 크래시시키지 않음(기존 코드베이스 패턴).

## 파일 영향 요약
- `v4/public/_shell.js` — ko 하단 바 5칸 분기 + 예약 오버레이 주입 + 제출/계측.
- `v4/public/_shell.css` — `.t-bottom-nav--full` + 예약 뷰 스타일.
- `v4/scripts/build-i18n.mjs` — `window.__I18N__.aiServer` 주입.
- `v4/public/privacy.html` — 약관 [보기] 재활용(필요 시 문구 보강).
- `ai-server/src/routes/reservation.ts` (신규) + `index.ts` 라우터 등록.
- `ai-server/src/services/reservationNotify.ts` (신규).
- `v4/scripts/migrations/0XX_reservations.sql` (신규, 수동 적용).
- `v4/src/features/marketing/components/ReservationsView.tsx` (신규) + `PredictionsLogPage`(또는 상위) 드롭다운 연결 + `reservationService.ts` (신규).

## 열린 항목 (구현 중 확정)
- 마이그레이션 번호(현재 최신 067 이후 — 068 유력, 실제 확인 후 배정).
- 이메일 전송 방식(nodemailer + SMTP 앱비밀번호). 실제 수신 주소/봇 chat_id는 사용자 제공 env.
- 데스크톱 하단 바를 완전 엣지투엣지로 갈지, 중앙 캡 pill 톤 유지할지 최종 미세조정(모바일은 확정: 꽉 채움).
