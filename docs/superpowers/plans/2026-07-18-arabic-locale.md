# 아랍어(ar) 로케일 추가 — 구현 계획

> 🚧 **진행 중** (2026-07-18 시작, 브랜치 `claude/arabic-language-addition-47df55`). 직전 세션은 브랜치/워크트리만 만들고 코드는 0 이었음(전수 확인). 이 계획은 **중국어 로케일 추가**(`docs/superpowers/plans/2026-07-17-chinese-locales.md`, 완료)를 **아랍어로 적응**한 것.

**사용자 결정 (2026-07-18):**
- **완전 RTL** — `dir="rtl"` + 레이아웃 미러링 (ko/th/vi/en/zh 는 전부 LTR 이라 이 인프라가 코드에 **없다** = 아랍어 고유 최대 작업)
- **WHO 국제표준** — 계산기 성장표준. 아랍어는 다국(사우디/UAE/이집트…) 대상이라 WHO 다국가 기준이 중립적. ★과거 WHO(NCHS 1977 재구성)는 반려된 적 있으므로 **정식 WHO 2006(2–5세)+2007(5–19세) LMS** 를 소싱한다(날조 금지 — [[feedback_verify_dont_speculate]]).
- **홈 페이지 먼저** — index/clinic/cases/calculator 4p + 상담(consult) + RTL. **블로그·마케팅 콘텐츠는 다음 단계**(중국어 Task 18/19-blog·17b 에 해당하는 것은 이번 스코프 밖).

**Goal:** `/ar/` 홈 4페이지 + 상담 페이지를 en 과 동급으로, **완전 RTL** + **WHO 표준 계산기**로 배포한다.

**⚠️ 이 작업의 성질 (중국어 계획에서 그대로):** 틀리면 시끄럽게 죽지 않는다. 계산기는 조용히 한국어가 되고, 픽셀은 조용히 한국 광고 픽셀을 쏘고, 분석은 조용히 한국어에 합산되고, hreflang 은 조용히 `undefined` 가 된다. **"에러 없음"을 통과 신호로 쓰지 말 것.** 매 task 검증은 "값이 맞나"를 본다. 언어 목록이 ~7곳에 중복돼 있고 대부분 조용히 폴백한다. **TS 가 잡는 건 `Record<Key,…>` 리터럴뿐** — 평범한 배열·`return []`·정규식은 컴파일 통과+오작동.

**활성화 순서:** ① 맵 등록·자산·콘텐츠를 다 채운 뒤 ② `ACTIVE_LANGS` 활성화를 **맨 마지막**. 그전까지 사이트는 6개 언어 그대로라 언제 멈춰도 안전.

**안전망 상태:** 중국어 때 깐 것(Task 1~3: sitemap 상수 `constants.mjs` 단일화, hreflang 커버리지 테스트, zh-tw 정리)은 **이미 main 에 있음**(`sitemap.mjs:4` 가 `constants.mjs` import 확인). → 이 계획은 **중국어 Task 4 부터** 시작.

---

## 결정: 코드 매핑 (중국어 §매핑 대응)

- **사이트 로케일 = `ar`** (URL·hreflang·`ACTIVE_LANGS`). hreflang=`ar`(지역 중립 — 범아랍 대상). og:locale=`ar_AR`.
- **익명 예측 국적 = `AR`** (언어권 버킷 관행 계승 — `EN`='영어권/기타' 처럼 `AR`='아랍어권/기타'. ISO 국가코드 아님).
- **메신저 = WhatsApp** (MENA 지배 채널). en 과 동일하게 `wa.me/821066932838`. consult_channels 는 WhatsApp 단독(또는 +LINE 없이 1개 — MENA 에 LINE·Kakao 무의미).
- **계산기 표준 = WHO** (신규 `GrowthStandard='WHO'`).
- **RTL = `dir="rtl"`** — 정적 HTML 에 baked(빌드 후처리) + `_shell.js` 런타임 + calc/cases React 루트.

---

## Chunk A: 맵 등록 + RTL 인프라 (아직 비활성)

### Task A1: 맵에 `ar` 등록 (ACTIVE_LANGS 는 안 건드림)
**Files:** `v4/scripts/lib/constants.mjs`
- [ ] `ALL_LANGS` 에 `'ar'` 추가
- [ ] `HREFLANG_MAP` 에 `ar: 'ar'`
- [ ] `OG_LOCALE_MAP` 에 `ar: 'ar_AR'`
- [ ] `cd v4 && npm test` → 통과 (미빌드 언어 누출 금지 테스트가 `ar` 를 자동으로 누출 금지 대상에 포함)
- [ ] 커밋

### Task A2: 로케일 카피 `en.yml` → `ar.yml`
**★원본은 `en.yml`(567줄).** ko 엔 `consult:` 블록이 없어 ko 기반이면 렌더러가 `missing key: consult.h1` 로 throw.
**Files:** Create `v4/i18n/locales/ar.yml`
- [ ] 22개 섹션 전부 아랍어(MSA, 표준어) 번역. **화자 = 남성 한국인 의사, 격식체**([[feedback_i18n_speaker_register]]). 아랍어는 성별 활용이 있으므로 **화자 = 남성형**(1인칭 동사·형용사 남성). 인용된 엄마/아이 대사만 여성형 허용.
- [ ] `meta.lang: ar` · `meta.og_locale: ar_AR` · **`meta.dir: rtl`**(신규 키 — 아래 Task A3 템플릿이 참조)
- [ ] 원격 상담 카피(`clinic.remote_consult`·`consult.remote`)는 **vi/en 판 기준**(온라인 상담 중심 + 면책). 방콕 같은 현지 인프라 없음.
- [ ] 길이 단위 = `سم`(cm). 숫자는 서양 아라비아 숫자(0-9) 유지(의료 맥락·계산기 일관성).
- [ ] 키 누락 검사(en 대비 0) + 한글 잔존 검사(값 0)
- [ ] ⚠️ **아랍어 카피는 원장/전문 감수 대기**(중국어 remote_consult 와 동일 성격). 배포 가능하나 감수 전제.
- [ ] 커밋

### Task A3: 🆕 RTL 인프라 (아랍어 고유)
기존 6언어는 전부 LTR. `dir` 개념이 코드에 없다.
**Files:** `v4/i18n/template/*.html`(7개) · `v4/scripts/lib/render.mjs` 또는 `build-i18n.mjs`(후처리) · `v4/public/_shell.css` · `v4/public/_shell.js` · calc/cases React 루트
- [ ] **정적 HTML `dir` 주입**: 7개 템플릿의 `<html lang="{{meta.lang}}">` → `<html lang="{{meta.lang}}" dir="{{meta.dir}}">`. 그러면 **모든 로케일 yml 에 `meta.dir` 필요**(렌더러 throw) → 기존 6언어 yml 에 `meta.dir: ltr` 한 줄씩 추가. (대안: build-i18n 후처리로 ar 만 `dir="rtl"` 주입 = yml 6개 무수정. **후처리 방식 채택** — logo/webp swap 과 같은 자리, 접촉면 최소.)
- [ ] **`_shell.css` RTL 규칙**: `html[dir="rtl"]` 스코프로 물리 속성(left/right·margin-left·text-align·absolute 위치) 미러링. 우선 `dir=rtl` 전역 적용(텍스트 방향·flex order·기본 정렬 자동 미러) → **깨지는 컴포넌트만 타겟 오버라이드**(헤더 pill·하단 네비 5칸·카드·화살표·차트 축). ★중국어 word-break 교훈처럼 **레이아웃을 조용히 부순다** → 명시 픽셀 폭 resize 후 실측.
- [ ] **`_shell.js` 런타임 dir**: 셸이 그리는 동적 부분(스위처·하단바·상담시트)도 RTL. `document.documentElement.dir` 는 정적 HTML 에 이미 있으나, 셸이 삽입하는 마크업이 물리 정렬을 쓰면 보정.
- [ ] **calc/cases React 루트**: `calc-main.tsx`·`CasesEmbedPage` 가 `lang==='ar'` 일 때 루트에 `dir="rtl"`.
- [ ] **검증**: `/ar/index.html` 을 명시 폭(390·768)으로 열어 텍스트 우측정렬·레이아웃 미러·하단바 5칸 균등 확인([[preview_verification_preference]] — 이 프리뷰 브라우저 `innerWidth=0` 함정).
- [ ] 커밋

### Task A4: `seo.yml` + `messenger.yml`
**Files:** `v4/i18n/seo.yml` · `v4/i18n/messenger.yml` · `v4/scripts/test/messenger.test.mjs`
- [ ] seo.yml `ar` 블록(title/description/FAQ/og_image=`og/ar.jpg`). 없으면 `seo.mjs` 가 throw.
- [ ] messenger.yml `ar`: WhatsApp, `wa.me/821066932838?text=…`(아랍어 프리필), label "استشارة عبر واتساب", consult_channels=[*whatsapp].
- [ ] 의도 테스트: ar 는 WhatsApp 단독 채널.
- [ ] 커밋

### Task A5: 자산 (프로그램 이미지 · OG)
**Files:** `v4/public/programs/images/ar/` · `v4/public/og/ar.jpg`
- [ ] 영어판 인포그래픽 복사(`cp -r en ar`) — 리졸버가 `{lang}/` 먼저 보고 없으면 `_common` 폴백이라 복사만으로 동작. (아랍어 텍스트 인포그래픽 재생성은 다음 단계.)
- [ ] OG 1200×630 (en.jpg 방식 재사용).
- [ ] 로고 = 작업 없음(`lang!=='ko'` 분기라 자동 `-en` 자산).
- [ ] 커밋

### Task A6: 🆕 WHO 성장표준 (아랍어 고유)
**Files:** `v4/src/shared/data/growthStandard.ts` · 테스트
- [ ] `GrowthStandard` 유니온에 `'WHO'` 추가.
- [ ] **WHO 2006(2–5세)+2007(5–19세) 공식 LMS** 소싱 → 만 2~18세 6개월 단위(33행) 남/녀 `MALE/FEMALE_HEIGHT_LMS_WHO`. ★**LMS 값 날조 절대 금지** — WHO 공개 테이블(hfa boys/girls z/percentile expanded)에서 해당 월령(24,30,…216) 값을 가져온다. WebFetch/agent-reach 로 소싱.
- [ ] `heightTable` 에 WHO 분기.
- [ ] **검증(공허성 방지)**: WHO 원본 M 입력 시 50.0%ile · 곡선 단조증가(역전 0) · P3==heightFromLMS(-1.881) 가 원본 P3 와 <0.15cm 일치.
- [ ] 커밋

---

## Chunk B: 활성화 + 전수 검증

### Task B1: 🚦 활성화
**Files:** `v4/scripts/lib/constants.mjs`
- [ ] `ACTIVE_LANGS` 에 `'ar'` 추가 → `['ko','th','vi','en','zh-hant','zh-hans','ar']`
- [ ] `cd v4 && npm run build:i18n` → 경고 0, `public/ar/` 생성
- [ ] `node scripts/audit-hreflang.mjs` → **undefined 0 · 허공 0**, sitemap <loc> 증가(홈+1, 서브+3, 상담+1, 인덱스 ar 은 글 0이라 제외)
- [ ] `ls public/og/ar.jpg`
- [ ] `cd v4 && npm test` → 통과
- [ ] 커밋

---

## Chunk C: 앱 표면 (조용히 한국어가 되는 곳)

### Task C1: `_shell.js` — 스위처·경로판정·GA4 게이트
- [ ] `__LANGS` 에 `ar`(라벨 자국어 `العربية`) · `__PATH_LANG_RE` 에 `ar` · `allowed`(calc 이벤트) 에 `ar`
- [ ] 좌표 히트테스트로 스위처 검증([[shell_header_nav_2026_07]])

### Task C2: 라우터 · 301
- [ ] `router.tsx I18N_LANGS` +`ar` · `vite.config.ts seoRedirects` 정규식 +`ar`(슬래시 없는 `/ar`→`/ar/` 301)
- [ ] `cd v4 && npx tsc -b --noEmit` → v4 오류 0

### Task C3: 계산기 — WHO 고정
- [ ] `calcLabels.ts CalcLang` +`ar` + ar 로케일 라벨 · **`isCalcLang` 게이트에 `ar` 추가**(★세트로: isCalcLang·isCasesLang·getLocale)
- [ ] `HeightCalculator.tsx` 삼항에 `lang==='ar' ? 'WHO'` 분기
- [ ] `HeightCalculatorResult MESSENGER` 맵에 ar → WhatsApp
- [ ] `/calc.html?lang=ar` 열어 아랍어 + WHO 출처 문구 + RTL 확인

### Task C4: 🔴 Meta 픽셀 — 한국 픽셀 오발사 차단
- [ ] `analyticsLocale.ts`/`analytics.ts SUPPORTED_LOCALES` 에 `ar`. 정규식 `[a-z]{2}(?:-[a-z]+)?` 는 `ar` 이미 매칭(2글자)이나 `getLocale('/ar/')`==='ar' 테스트로 고정.
- [ ] `pixelIdsForLocale('ar')` = 기본 픽셀(KO 아님)

### Task C5: 익명 예측 적재 — 영구 오염 차단
- [ ] `anonymousName.ts PredLocale`+`ar` · `asLocale` 배열 · `COUNTRY` 에 `ar:'AR'` · `NAMES` 아랍어 이름 풀(남/녀)
- [ ] `PredictionsLogPage` 국가 필터에 `AR`

---

## Chunk D: 분석 서버 (조용히 한국어에 합산)

### Task D1: 🔴 `classifyCountry` — 오염 차단
**Files:** `ai-server/src/services/ga4SiteBreakdown.ts` (Country·LANG_KEYS·classifyCountry·countryKeys·메인정규식·messengerChannel·Record 리터럴 4개) · 테스트
- [ ] 넷 다 고침(유니온만으론 LANG_KEYS·countryKeys 강제 안 됨). `ar` 버킷.
- [ ] messengerChannel 유니온에 whatsapp 이미 있음(중국어 때 추가) → ar `blankStats('whatsapp')`
- [ ] `cd ai-server && npm run build && npm test` ★build 먼저

### Task D2: 마케팅 CountryKey + 탭 · GSC 언어 필터
- [ ] `marketingAnalyticsService.ts CountryKey`+`ar` + 탭(العربية) → 그다음 `searchConsole.ts SearchLang`+`routes/analytics.ts LANGS`+UI 탭
- [ ] `cd v4 && npx tsc -b --noEmit` · `cd ai-server && npm run build && npm test`

---

## 완료 기준 (홈-우선 스코프)
- [ ] `/ar/` 4페이지 + 상담 페이지 렌더, **완전 RTL**(우측정렬·레이아웃 미러)
- [ ] hreflang undefined 0 · 허공 0 (audit-hreflang)
- [ ] 계산기가 아랍어 + **WHO 표준**, RTL
- [ ] 아랍어 페이지에서 **한국 광고 픽셀 미발사**
- [ ] GA4 언어 탭에 `ar` **독립 버킷**
- [ ] `npm test` v4 · ai-server 통과

## 다음 단계 (이번 스코프 밖)
- 아랍어 블로그(마케팅 `ar` 콘텐츠 생성 → `blog_published`)
- 아랍어 텍스트 인포그래픽 재생성(`programs/images/ar/`)
- 치료사례 per-case 콘텐츠 아랍어(CASES_I18N)
- 아랍어 카피 원장/전문 감수
