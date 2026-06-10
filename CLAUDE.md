# 187 성장케어 - Project Guide

## Project Overview
소아 성장 관리 플랫폼 (연세새봄의원 187 성장 클리닉)
- **v3** (legacy): `./` root에 Vanilla JS + Supabase + Cloudflare Pages
- **v4** (active): `./v4/` 디렉토리에 React + TypeScript + Vite
- **ai-server**: `./ai-server/` Express + Gemini AI

## Tech Stack
- React 19 + TypeScript 5 + Vite 7
- Tailwind CSS 4 (@tailwindcss/vite plugin, NO tailwind.config.js)
- Zustand (state), Supabase (DB/Auth/Storage), Chart.js (charts)
- Google Gemini 2.5 Flash (AI via ai-server)

## Commands
```bash
cd v4 && npm run dev          # Dev server
cd v4 && npm run build        # Production build (tsc → build:i18n → vite build)
cd v4 && npx tsc --noEmit     # Type check
cd v4 && npm run build:i18n   # 다국어 정적 HTML 빌드 (4개 언어)
cd v4 && npm run build:i18n -- --refetch  # ContentFlow에서 블로그 글 새로 fetch + 빌드
cd v4 && npm run test:i18n    # i18n 빌드 시스템 테스트
cd ai-server && npm run dev   # AI server (port 3001)
```

## i18n + Global SEO Infrastructure (2026-05-13, Phase 6 promoted 2026-05-18)

글로벌 진출(187개국 키워드 분석 → 7개 언어축 → 1차 ko/th/vi/en 활성화) 정적 다국어 빌드 파이프라인. Phase 6(`/test/` → `/` 승격) 완료.

### 파이프라인
```
v4/i18n/template/{index,clinic,cases,calculator,blog-index,blog-post}.html  ← {{placeholder}} 골격
        +
v4/i18n/locales/{ko,th,vi,en,ja,zh-tw,id}.yml   ← 언어별 카피 (ja/zh-tw/id는 stub)
        +
v4/i18n/messenger.yml         ← 국가별 메신저 (1차 전부 Kakao, LINE/Zalo/WhatsApp 계정 받으면 URL만 교체)
        +
v4/i18n/seo.yml               ← 언어별 title/description/FAQ
        ↓ build-i18n.mjs (Node + js-yaml, 프레임워크 X)
v4/public/{lang}/{index,clinic,cases,calculator}.html × 4 (활성)
v4/public/{lang}/blog/{slug}/index.html (ContentFlow fetch 시)
v4/public/sitemap.xml         ← hreflang = ACTIVE_LANGS(4) + x-default 자동 생성
```

### 핵심 파일 (`v4/scripts/`)
- `build-i18n.mjs`: 빌드 오케스트레이터 (async main, `--refetch` 플래그). 후처리로 프로그램 이미지를 1단계 fallback 해석(`lib/program-img.mjs`) + 비한국어는 `/images/logo.jpg` → `/images/logo_en.png` swap
- `lib/program-img.mjs`: 프로그램 이미지 경로 리졸버. 렌더된 HTML의 각 `/programs/images/{slug}/{file}` 참조를 `{lang}/{slug}/{file}` 있으면 그것, 없으면 `_common/{slug}/{file}`(한국어 기본본), 둘 다 없으면 빌드 경고. 순수 함수 `resolveProgramImgPath` + FS 후처리 `localizeProgramImages`
- `lib/render.mjs`: `{{placeholder}}` + `{{#each list}}` 미니 렌더러 (마커 누락 시 throw)
- `lib/messenger.mjs`: `getMessengerCTA(lang, {requireLiveUrl})` — TBD URL이 활성 언어에 있으면 빌드 실패
- `lib/seo.mjs`: meta/canonical/hreflang/OG/Twitter Card + `PATH_PREFIX` env-var (기본 `''`, staging에서 `/test` 오버라이드 가능). **`ACTIVE_LANGS`(ko/th/vi/en) 단일 소스** — `build-i18n.mjs`가 여기서 import. hreflang·sitemap·빌드 루프가 절대 어긋나지 않게(미빌드 ja/zh-tw/id 를 hreflang 으로 내보내면 404 타겟이라 클러스터 무효화). 언어 활성화 = 이 배열에만 추가
- `lib/jsonld.mjs`: MedicalClinic + Physician + FAQPage + BlogPosting. `areaServed` 는 th 만 `[KR,TH]`(방콕 원격상담 신호), 그 외 `KR`. Physician 에 image(`/images/doctor.jpg`)·url·jobTitle 포함
- `lib/sitemap.mjs`: `<xhtml:link rel="alternate">` 자동 삽입 + 홈·블로그 외 서브페이지(clinic/cases/calculator) × ACTIVE_LANGS 도 등재
- `lib/fetch-contentflow-posts.mjs`: ContentFlow API에서 블로그 fetch → `i18n/blog-cache/` JSON 캐시
- `lib/blog.mjs`: `renderPost` + `renderIndex` + `loadCachedPosts`

빌드 산출(`public/{ko,th,vi,en}/`, `sitemap.xml`, `i18n/blog-cache/`)은 `.gitignore`. 소스(`public/_shell.css`, `_shell.js`, `og/`, `robots.txt`, `images/logo_en.png`, `programs/images/{_common,th,vi,en}/{slug}/`)는 tracked.

### 환경변수
```
SITE_PATH_PREFIX=             # 기본값(루트 승격). staging에서만 /test 등 오버라이드
CONTENTFLOW_API_URL=          # 블로그 fetch용 (없으면 빌드 시 블로그 skip + 경고)
CONTENTFLOW_PROJECT_ID=       # 연세새봄의원 project UUID
```

### CTA 라우팅 + GA4
모든 메신저 버튼은 `messenger.yml`만 참조 (URL/라벨/색상). 5개 인라인 CTA(`case-cta-inline` × obesity/precocious/proportion/bodywork/late)는 `data-source="case_{section}"`. `_shell.js`의 `trackConsultClick`이 `data-source` 가진 모든 `<a>` 클릭 시 GA4 `consult_click` 이벤트 발사 (channel/locale/source/page_type 디멘션).

### 블로그 연동 (ContentFlow ↔ dflo)
ContentFlow 새 엔드포인트 `/api/blog/by-project/[projectId]/posts?lang={lang}` (service-role + `!inner` 조인으로 프로젝트 격리)가 published 글을 JSON 반환. dflo가 빌드 시 fetch → 캐시 → `blog-post.html`/`blog-index.html` 템플릿 → `/{lang}/blog/{slug}/index.html`.

**블로그 = 이 i18n 정적 빌드 단일 소스** (2026-06-05 정리). 과거 ko+th 전용 React-SPA 블로그(`src/pages/Blog/{BlogList,BlogPost}` + `usePosts` 클라 fetch + `scripts/build-blog.mjs` 프리렌더러)는 폐기. 그 라우트가 i18n 정적 빌드와 충돌했었음 — `router.tsx` flatMap 의 `/th/blog` HardRedirect 가 명시적 `/th/blog` React 라우트를 가려(같은 path → 배열 먼저 등록된 쪽이 매칭) 인덱스는 정적·글은 React 로 갈리던 버그. 수정: 옛 `/blog`·`/th/blog` React 라우트 제거, ko `/blog`·`/blog/:slug` 는 정적 `/ko/blog/…index.html` 로 리다이렉트(옛 유입 링크 보존, `BlogPostRedirect`), th 는 flatMap `/{lang}/blog` HardRedirect 로 정적 페이지 일원화. `package.json` build 체인에서 `build:blog` 제거(이게 `vite build` 뒤 실행돼 th 정적 글을 SPA 셸로 덮어쓰던 잠복 회귀도 함께 제거).

### 라우터 (Phase 6 후)
`v4/src/app/router.tsx`:
- `/` → `HardRedirect('/ko/index.html')`. 기존 React `WebsiteHomePage`는 `/home-legacy`에 보존 (롤백용)
- `/{ko,th,vi,en}` · `/{lang}/blog` · `/{lang}/` · `/{lang}/blog/` → `HardRedirect` 정적 `index.html` (4 lang × 4 변형 = 16 routes, `I18N_LANGS` 배열에서 flatMap)
- 레거시 `/blog` → `HardRedirect /ko/blog/index.html`, `/blog/:slug` → `BlogPostRedirect`(→ 정적 `/ko/blog/{slug}/index.html`). 폐기된 React-SPA 블로그의 ko 유입 링크 보존용 (th 라우트는 위 flatMap 으로 흡수)
- `/test`, `/test/`, `/test/:lang(/blog)?` → `Navigate(replace)` 새 경로로 (SEO + 북마크 보존)
- 기존 `/program/:slug`, `/guide`, `/diagnosis`, `/banner-admin`, `/app/*`, `/admin/*` 변동 없음

### 다국어 자산 처리
- **프로그램 이미지**: `_common/{slug}/` = 한국어 기본본(전 언어 fallback), `{lang}/{slug}/` = 번역 오버라이드만. 빌드(`lib/program-img.mjs`)가 참조마다 1단계 fallback 해석: `{lang}/{slug}/{file}` 있으면 그것, 없으면 `_common/{slug}/{file}`. 미번역 언어는 자동으로 한국어본 노출(404 차단). 별도 `ko/` 폴더 없음 — 한국어 빌드도 `_common`을 봄. 안 쓰는 orphan·정적 상세 HTML(폐기)·옛 사본은 정리 완료(2026-06-02)
- **로고**: 한국어 = `public/images/logo.jpg`. 비한국어 = `public/images/logo_en.png` (1832×560 PNG, ~860KB, 고해상도 영문 워드마크). `_shell.js`가 runtime `__I18N_LOCALE` 보고 분기, 빌드는 hero masthead용으로 URL swap
- **HeightCalculator 생년월일 input**: `<input type="date">`가 Chromium에서 lang 속성 무시하는 문제 회피 — 3개 number 필드(년/월/일)로 분리, `calcLabels.ts`의 `fieldBirthYear/Month/Day` 라벨로 locale별 placeholder
- **예측키 성장 표준 (계산기 전용)**: `growthStandard.ts` 에 `GrowthStandard='KR'|'TH'` 분기. th 는 TSPE 2022(WHO 2-5세 + 태국 국가 성장 기준 2020) PDF 차트를 P3/P50/P97 → LMS(L=1, M=P50, S=(P97-P3)/(3.7616·M)) 로 디지털화한 `MALE/FEMALE_HEIGHT_LMS_TH`. `HeightCalculator`/`Result` 가 `lang==='th'?'TH':'KR'` 로 전달. **계산기에만 적용** — 치료사례 차트(`SectionCarousel` cases)는 환자가 한국인이라 ko/th/vi/en 전부 한국 LMS 유지. `?` 도움말·footer 카피는 LMS 전문용어 제거하고 "국가 표준 성장 데이터 기반" 으로 톤다운
- **예측키 결과 CTA**: `HeightCalculatorResult.tsx` 의 `MESSENGER` 맵으로 언어별 분기 — th = LINE OA(#06C755), ko/vi/en = KakaoTalk(#FEE500). `messenger.yml` 과 동일 라우팅
- **치료사례 차트 라벨 i18n**: 공용 `GrowthChart` 에 `labels` prop(범례 실제키/초진·현재 예상 성장 + 축) 추가, `casesLabels.ts` 의 `chartActualHeight/InitialGrowth/CurrentGrowth/AxisAge/AxisHeight` 를 `SectionCarousel` 이 주입. 배너 title/subtitle 은 `CASES_BANNER_I18N` 으로 번역

### 1차 활성화 스코프 (Phase 6 완료)
- 시장 4개: 🇰🇷 ko / 🇹🇭 th / 🇻🇳 vi / 🇺🇸 en
- 메신저: ko/vi/en 은 KakaoTalk (`pf.kakao.com/_ZxneSb`), **th 는 LINE OA `@894qhqtu`** (2026-05-18 전환). `messenger.yml` 만 교체 → `_shell.js` 가 `window.__I18N__.messenger` 에서 읽어 헤더 pill·계산기 결과 CTA·5개 케이스 인라인 CTA 동적 렌더 (인라인 색상 + filter:brightness hover). 빌드가 `messenger_json` 으로 JSON-encode 해 안전 주입
- 프로그램 이미지: `_common`(한국어 기본본 + index 아이콘 세트 `need-1~6`·`pstep-1~7`) + **th 번역 오버라이드 6개**(`director`,`golden-time`,`fat-cell`,`arrow-illust`,`ratio`,`comparison`). vi/en 은 미번역 → `_common` fallback. 추후 번역 시 `{lang}/{slug}/`에 파일만 추가
- 남은 작업: vi/en 프로그램 이미지 + Railway 프로덕션 배포 검증

### 위성 콘텐츠 배포 정책
메인 블로그는 우리 도메인(`/blog/{lang}/`). 위성(네이버 블로그·FB·Pantip)은 발췌+`canonical` 메인 가리키기 (중복 콘텐츠 페널티 회피).

## Conventions
- **Language**: All UI text in Korean (한국어)
- **Component size**: Max ~200 lines (absolute max 350)
- **Styling**: Tailwind CSS only, mobile-first
- **State**: Zustand with individual selectors `useStore((s) => s.field)`
- **Imports**: `@/` path alias (maps to `src/`)
- **Services**: Supabase queries in `features/*/services/`
- **Types**: All shared types in `shared/types/index.ts`
- **Exports**: Named exports for feature components, default exports for pages/shared
- **Logging**: Use `logger` from `@/shared/lib/logger`

## Key Design Decisions (핵심)

> 상세 구현 결정 80여 개 + Phase 0~34 작업 이력은 **[`docs/PROGRESS.md`](docs/PROGRESS.md)** 로 분리. 아래는 코드 작업 시 알아야 할 핵심 아키텍처만.

- **인증/데이터 위치**: legacy `users` 테이블 plaintext password. RLS(부모=자기 자녀, admin=전체). 환자앱 데이터(users·children·measurements·meals)는 Supabase, 홈페이지 콘텐츠(website.json+이미지)는 Cloudflare R2 (ai-server `/api/r2/*`, PIN 보호)
- **구조/스타일**: feature-based 디렉토리, React Router lazy 페이지, `@/` alias. 테마 primary #667eea / secondary #764ba2. Typography 전체 Noto Sans KR. 이미지 업로드 전 1200×1200 JPEG 80% 압축. Storage 버킷: `content-images`·`meal-photos`·`raw-records`·`xray-images`
- **홈페이지(어드민 편집)**: 인스타 카드뉴스 스타일(4:5 카드 swipe). `website_sections`(JSONB slides, legacy fallback `website_banners`). per-slide 템플릿(banner/video/cases). PC=모바일 폭 카드 세로 스택. 어드민 split 프리뷰(좌 35% / 우 65%) + 섹션·슬라이드 inline 편집 + 👁️ 노출 토글
- **GA4**: 측정ID `G-Y5VKTKKEQ4` **단일 속성**. **정적 i18n 사이트(실운영)** = `build-i18n`(`seo.mjs gaSnippet`, 측정ID 형식 가드)이 모든 페이지 `<head>`에 gtag 주입 — 측정ID는 `.env.production`(레포)에서 공급, `build-i18n.mjs`가 `process.loadEnvFile`로 `.env` 로드. `_shell.js`가 메신저 클릭 `consult_click`(channel=kakao/line) + 예상키 측정완료 `height_calc_complete`(iframe `/calc-embed`→부모 postMessage) 발사. React SPA `analytics.ts`도 `trackKakaoConsult`→`consult_click` 통일(`trackHeightCalcComplete` 추가). 어드민 분석 `/banner-admin/analytics`(GA4 Data API OAuth, PIN). **마케팅 사이트 분석** `/marketing/site-analysis` = GA 전용 국가 탭(전체/한국/태국)+기간(7/14/30/90), 요약카드(사용자/신규/재방문/세션/PV/평균참여, 직전기간 증감)·일자별 추세차트·페이지별·이벤트·유입채널·디바이스. ai-server `fetchSiteBreakdown`(7 GA4 리포트, landingPage 국가귀속+pagePath 페이지/이벤트) → `/api/analytics/site-breakdown`. SEO 감사는 `/marketing/seo-audit` 분리. 상세 memory `marketing_ga4_site_analytics.md`
- **환자 임상 DB(어드민)**: `chart_number` UNIQUE. 환자상세 3-column = visit list │ `VisitDetailPanel`(4탭: 진료내역/X-ray/Lab/생활습관, sticky 헤더) │ `AdminPatientGrowthChart`. `visits.is_intake`=환자당 초진 가상 visit 1개(진료 리스트·그래프에서 제외). `children.intake_survey` JSONB(문진 Q1~16 + `raw_files` 메타). 테이블: `hospital_measurements`(키·뼈나이·PAH), `lab_tests`(panel_type별 + 첨부), 처방(`medications` MED/INJ/PRO 코드 + `prescriptions`)
- **환자 분류/단계**: 8종 카테고리(`patientCategories.ts`, Pure `classifyPatient(child, signals?)`) + 필터·정렬·즐겨찾기. **분류기가 설문뿐 아니라 실제 임상 신호까지 반영** — `adminService.fetchPatients`가 처방(약물계열 `medication_legend` 조인)·lab `result_data`(알러지/IgG4 class≥5/유기산 장내이상)·measurements(키 성장속도·뼈나이−만나이 격차·골성숙도)를 배치 로딩해 `ClinicalSignals`로 전달(성장느림=속도<4cm/년, 성조숙=뼈나이≥1.5년 앞섬, 시기놓침=뼈나이 폐쇄임박, 염증=알러지 강반응). GH·아로마타제·수면제는 거의 전 환자가 쓰는 프로토콜 약물이라 신호 제외. **성능**: `fetchPatients`는 검색 없는 전체 로스터를 모듈 캐시(`rosterCache`)에 담아 환자관리 재진입 시 즉시 렌더 후 백그라운드 갱신(stale-while-revalidate). `AdminPatientsPage`는 마운트+검색 effect 중복 fetch 제거(초기 2회→1회), children 조회는 `select('*')` 대신 분류·표시에 쓰는 컬럼만(password 등 미사용 제외). `children.treatment_status`(3단계 'consultation'|'treatment'|'completed', migration 014+043) 에 따라 BottomNav·HomePage·`/app` 라우팅 분기(completed=treatment 취급, 상담만 별도). 차트번호 로그인(244명 password='1234')
- **성장 그래프**: `AdminPatientGrowthChart`(BA 회차 주황 다이아 + `baOnly`·예측 토글) + `PredictedHeightTrend`(예측키 추세 탭). 공용 `GrowthChart` 에 `showPercentiles`/`yMin` prop(치료사례는 백분위 off, 환자앱은 유지). 성장표준 기본 KR LMS, **계산기만** th=TSPE / CN 근사(`growthStandardCN.ts`)
- **뼈나이**: 입력=년/개월 2칸(`shared/utils/boneAge.ts`). 진료내역 ↔ X-ray 양방향 동기화(`syncXrayReadingBoneAge` + `upsertMeasurementField`), 저장 시 PAH 자동 재계산(`syncPahForVisit`). X-ray 뷰어 `ZoomableImg`(줌·패닝·빨간 펜 마킹, view_state 저장)
- **첫 상담(FirstConsultPanel)**: PPT 슬라이드 덱(`firstConsultContent.ts` typed array, 11장, KO/EN). 환자앱 consultation 뷰는 동일 콘텐츠를 모바일 카드 스택으로 재구성
- **데이터 파이프라인(`cases/`)**: Lab OCR(Surya + `parse_eone.py`), 판독문 OCR, 처방 임포트, 원본 파일 Storage(`raw-records`), 주소→region 파서(`region.ts`), 환자 스토리 작성(`PATIENT_STORY_GUIDE.md` + 스크립트). 상세·통계는 PROGRESS.md
- **AI(ai-server)**: 환자 분석(`/api/patient-analysis`, Gemini 2.5 Flash, 캐시 `patient_analyses`), RAG 유사케이스/코칭(`/api/embeddings`·`/api/similar-cases`·`/api/coaching`, pgvector). 일부 임베딩 배치는 사용자 액션 대기
- **프로그램 페이지**: `v4/public/programs/` 정적 HTML(iframe 임베드). 이미지는 `_common/{slug}/`(전 언어 fallback) + `{lang}/{slug}/`(오버라이드), `program-img.mjs` 1단계 fallback 리졸버
- **수동 적용 대기 migration**: 008(lab CHECK 확장), 016(xray view_state) 등 일부는 MCP 권한 차단으로 Dashboard 수동 실행 필요(미적용이어도 graceful fallback 동작)

## Environment Variables
```
# v4/.env
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AI_SERVER_URL

# ai-server/.env
GEMINI_API_KEY, API_KEY, PORT=3001
```

## Deployment
- **Railway**: `dflo-production.up.railway.app` (root dir: `v4`)

## Current Progress

Phase 0~34 상세 작업 이력은 **[`docs/PROGRESS.md`](docs/PROGRESS.md)** 참조.

요약: 환자 임상 DB 통합 · 어드민 임상 대시보드(진료/X-ray/Lab/처방/생활습관) · OCR·처방 데이터 파이프라인 · AI 환자 분석 + RAG 유사케이스/코칭 · 다국어 홈페이지(ko/th/vi/en) + SEO · 프로그램 상세페이지 · Remotion 마케팅 릴까지 구축. **진행 중**: Phase 17/21(Gemini 배치·임베딩 실행 대기), migration 008/016 수동 적용 대기.

- **마케팅 ContentFlow 포팅**: `/marketing`(PIN `8054`) 별도 섹션에 ContentFlow(별도 Next.js 앱, Supabase 별개)의 마케팅 도구를 native 내재화. ContentFlow 사이드바 구조 미러. 완료: 콘텐츠허브(전략HTML 8+키워드72+주제78) · SP1 설정(`marketing_config` 020) · SP3a 블로그AI생성(021) · R0 구조재정렬 · 키워드 라이브(네이버HMAC+DataForSEO, 022, IdeasPage). **울트라코드 6도구 배치**(2026-06-03, research→build→ultra-review 멀티에이전트 — 리뷰 confirmed 0건·contract 0건): **site-analysis**(GA4 트래픽 재사용+cheerio 규칙 SEO감사 4엔진 google/naver/geo/tech+이력) · **channel-analytics**(GA4 채널·소스·국가 분해+채널 레지스트리 CRUD+YouTube 동기화 게이트) · **competitors**(레지스트리+AI 갭/강점 분석 게이트) · **publish**(큐·월캘린더 over articles+GA4 조회수 매칭+실제 push 게이트) · **monitoring**(멘션 트래커+AI 답글초안 게이트) · **ads**(캠페인 트래커+CTR/CPC/CPA/ROAS 파생+GA4 벤치마크+AI진단 게이트) + **키워드 슬라이스2**(IdeasPage 5탭: 황금 키워드 클라파생 goldenScore + AI 아이디어 게이트). ai-server 신규 서비스 7개(seoAudit/youtubeChannel/competitorAnalyzer/publishPush/commentDraft/adsInsights/keywordIdeas)+marketing.ts 8핸들러+ga4.fetchChannels+analytics GET /channels+cheerio. migration 023~028(신규 6도구; 마케팅 전체는 020~028). 모든 no-key 표면(DB CRUD/GA4 재사용/클라 파생)은 키 없이 동작, Gemini/YouTube/Meta 기능만 graceful 게이트. 외부키 ai-server `.env`만(NAVER_*·DATAFORSEO_*·GEMINI·YOUTUBE_API_KEY·META_*). 상세·resume는 memory `marketing_contentflow_port.md`. ⚠️ Gemini키 만료·migration 020~028 수동적용(인텐트 충돌로 016→020 renumber)·전부 로컬 미푸시. **⚠️ prod auth**: `/api/marketing/*` 라우터가 prod에서 authMiddleware 게이트인데 클라이언트(키워드/블로그/신규 6도구 전부)가 키 미전송 → **현재 dev(localhost)에서만 동작**, prod 배포 시 auth 일괄 처리 필요(기존 패턴, 신규 회귀 아님). 단 GA4 트래픽·채널 분해는 무인증 `/api/analytics/*` 라우터라 prod에서도 동작.

- **마케팅 콘텐츠 스튜디오** (2026-06-06, `/marketing/content`): ContentFlow 모델로 "콘텐츠 생성" 재구현. **콘텐츠 1항목 = 한국어 master, 비한국어는 `marketing_articles.translations` JSONB**(migration 033) — 상단 `LanguageSelector`(ko/th/vi/en) 탭으로 전환(행 분리 X). 채널 탭: **기본글**(TipTap `RichTextEditor` + AI 생성/주제추천/"이 부분 다시쓰기"/AI 번역/원장 컨펌) · **블로그**(통합 구글 SEO 위저드 — 아래 2026-06-08 항목 참조) · **카드뉴스**(`CardCanvas` 텍스트블록 드래그 + 템플릿 + AI 이미지→WebP→R2, migration 032). ai-server 신규: `contentPrompts.ts`(base/topic/rewrite/blog/cardnews/translate) + `imageGenerator.ts`(@google/genai) + marketing 라우트. ContentFlow 블로그 126글 import → 63 master+th translations 재그룹(th 본문은 R2 백필). admin 사이드바 "📣 마케팅"은 하단 별도 구역. 컴포넌트: `features/marketing/components/content/*`. 설계/계획: `docs/superpowers/{specs,plans}/2026-06-05-marketing-content-studio*`
- **클리니컬 RAG + AI 처방 추천** (2026-06-06, 개념검증 완료): 실제 진료 데이터 + 국제 논문을 **RAG 참조(파인튜닝 아님)** 로 융합한 지식 브레인 + 원장 의사결정 보조. **migration 034~036**: `medication_legend`(병원 약물코드→실제약물/계열 사전, 예 에이큐_G=성장호르몬) · `evidence_papers`(PubMed 초록 + 인종태그 + pgvector 768d) · `clinical_insights`(비식별 집계통계+합성케이스+k-익명성, pgvector). ai-server: `pubmed/populationTagger/clinicalStats/insightPrompts/medLegend/rxRecommend/knowledgeRetrieval.ts` + `routes/knowledge.ts`(`/api/knowledge/search`·`/rx-recommend`) + 스크립트 `scripts/{seed-med-legend,ingest-papers,build-insights}.mjs`. **admin 환자상세 "🧠 AI 처방 추천" 버튼**(`RxRecommendModal`, 현재 `VisitDetailPanel` 생활습관 탭 옆으로 이동 후 숨김 — 주석 해제로 부활) → 검사결과 입력 → 추천 레지멘 + 근거 논문 reference(인구 배지) + 의사 면책. 검증: 실제 환자로 임상적으로 타당한 추천 + 논문 인용 확인. 설계/계획: `docs/superpowers/specs/2026-06-06-clinical-rag-knowledge-brain-design.md`, `docs/superpowers/plans/2026-06-06-clinical-rag-foundation.md`. **후속**: 약물코드 원장 큐레이션 · full patientCategories 분류 · outcome 라벨(patient_analyses) · 유사케이스 임베딩 매칭 · Phase B(마케팅 RAG)/C(챗봇)/D(원본 PHI 로컬임베딩)
  - **임베딩 모델**: `gemini-embedding-001` (768d, outputDimensionality) — `text-embedding-004`는 현재 키 미지원. `gemini.ts` `embedText`
  - ⚠️ **ai-server `SUPABASE_SERVICE_ROLE_KEY`가 임시로 txirmof anon 키**(RLS 허용 테이블이라 동작). 정식 service_role 키 받으면 교체 권장

- **마케팅 발행/채널 재구조화 + Meta 연동** (2026-06-06): 마케팅을 **언어(시장) 축**으로 일원화. 채널은 언어(ko/en/th/vi) 단위, **지역은 광고에만**. (a) **채널 설정**(사이드바 상위 `/marketing/channels`, 옛 "채널 관리"→"채널 설정", 언어 select·활성·필터) (b) **발행 재설계**: 콘텐츠 편집기 "📥 발행 큐에 넣기"(실제 발행은 발행 페이지) → `PublishDialog`(언어 버전 + 등록 계정/자체사이트 타겟), 큐가 `channel_id`·`content_kind` 참조 (c) **블로그 자체사이트 임베드**(동적 미리보기 noindex + 정적 `build-i18n` `blog_published` 병합, 구글 SEO) (d) **카드뉴스 다중 이미지 업로드** (e) **광고 region**. 발행 채널은 IG/FB/Threads/website만(wordpress/youtube/naver 발행 제거). 콘텐츠 목록은 부모관점 정렬(성장과학A→생활습관B→부모공감C→기타D, sort_order 1~62, `fetchArticles` sort_order asc + 번호 표시). **migration 037~042**. **Meta 연동**: ContentFlow 포팅 — OAuth(`/api/auth/meta`+callback 공개), 토큰 AES-256-GCM 서버전용(`marketing_meta_connection`), Graph 발행(IG/Threads 캐러셀), 채널 meta_page_id/ig_id/threads_id 매핑. ai-server `services/{metaCrypto,metaOAuth,metaPublish,metaPublishPrep,metaConnectionStore}.ts` + `routes/metaAuth.ts`. env `META_APP_ID/SECRET·META_REDIRECT_BASE·META_TOKEN_ENC_KEY`. ⚠️ Meta 앱검수 필요·Threads는 FB id/토큰 사용이라 라이브 보정 필요·migration 037~042 수동적용. 설계/계획: `docs/superpowers/{specs,plans}/2026-06-06-marketing-publish-restructure*`, `...-meta-publishing-integration*`
  - **Meta 연결 라이브 + FB 앨범 발행** (2026-06-09): 187growup Thailand FB(`1162825793580038`) + `@187growup.thailand` IG 연결 완료, 카드뉴스 th를 IG 캐러셀·FB 앨범으로 발행 검증. `publishFacebook`을 **다중사진 앨범**으로 구현(각 사진 `published:false,temporary` 업로드→`media_fbid` 수집→`attached_media`로 1 피드 글, `added_photos`). `fetchPermalink`가 발행 후 공개 URL을 `published_url`에 기록(FB=`permalink_url`→`{pageId}/posts/{storyId}` 폴백, IG/Threads=`permalink`). IG/Threads 컨테이너 `waitMediaReady`(status_code=FINISHED 폴링)로 "Media ID is not available" 방지. FB 로그인 스코프에서 `threads_*` 제거(Invalid Scope)·`pages_manage_metadata` 추가, 비즈니스 소유 페이지는 `/me/accounts` 누락 → page ID 직접 조회 보강. 발행 큐 "보기↗" = `published_url`(없던 FB row backfill). ⚠️ `META_TOKEN_ENC_KEY`는 머신/환경 동일해야(다르면 기존 토큰 복호화 불가→재연결). 임시 `/api/auth/meta/dev-token` 제거. 상세 memory `meta_connection_publishing.md`
  - **⏳ 자동 예약 발행 스케줄러 — 설계·플랜만(미구현)**: ai-server node-cron 매분 → due claim → `publishExecutor`(meta+website 공용) → website면 Railway deploy hook. `docs/superpowers/{specs,plans}/2026-06-06-auto-publish-scheduler*`. 현재 예약 UI는 있으나 자동 실행기 없음(수동 발행만). **다음 작업 재개 지점** (memory `marketing_publish_meta_scheduler.md`)

- **카드뉴스 다국어(i18n) 재구현** (2026-06-07): `/marketing/content` 카드뉴스 탭을 **프롬프트 중심**으로 전환 — 콘텐츠 1개 = 슬라이드 N개(가변: 표지+본문+CTA), **언어공통 일러스트 + 5언어(ko/en/th/vi/ch) 텍스트**, 슬라이드별 GPT용 이미지 프롬프트 + 전체 복사, 캡션·해시태그 5언어, **섹션별/일괄 이미지 업로드**(R2). DB `marketing_cardnews_slides`(illustration/texts/role/is_cta) + `marketing_cardnews`(captions/hashtags_i18n) JSONB, **migration 044**. ai-server `/api/marketing/cardnews-i18n`·`/cardnews-captions`(`contentPrompts.ts`). 62토픽 카드뉴스 생성·import = `docs/cardnews/`(1024×1536). 로고는 사용자가 GPT에 직접 첨부, CTA 국가별 도메인. **CTA 로고 처리**(2026-06-08): illustration에는 로고·도메인을 넣지 않고(서버 프롬프트가 "로고 자리 비움/빌드 자동삽입" 류 표현 생성 금지), "📋 이 장 복사" 시 클라(`CardNewsPanel.tsx`)가 `[로고 처리]` 블록을 자동 첨부 — 첨부 로고를 투명 PNG로 취급 + 상단 아래→위 흰색 그라데이션 밴드 위 배치 + 보라(#667eea~#764ba2)/민트 톤 조화(붙여넣은 흰 박스 느낌 금지). 기존 62개 CTA 슬라이드는 DB 일괄 수정으로 옛 보일러플레이트 제거 완료. ⚠️ AI 재생성은 Gemini 키 필요.

- **글로벌 블로그 SEO 파이프라인 + 마케팅 "블로그(SEO)" 탭** (2026-06-07): 자체 블로그(dr187growup.com) **62토픽 × 4언어(ko/en/th/vi)=248편** 생성·DB 반영. (a) **키워드** = 언어별 네이티브 transcreation(직역 X, 네이버 무시·구글만): pillar 5~10 + 토픽별 primary 1+보조 2~3, 카니발 0. 전략HTML(`{th,vn,en}-operations`·`global-market`) + topics/keywords.json 활용. (b) **생성+게이트** = 멀티에이전트(sonnet) 워크플로우(`docs/blog/`): 원문 transcreation → **구글 SEO 자동점검**(`docs/blog/lib/seo-check.mjs`, 토큰 매칭·태국어 LCS 부분일치, 100점) → **85점 미만 자동수정(≤2회)** → 최고점. 최종 전부 ≥85, 평균 93(ko98/en93/th92/vi92). 섹션별 16:9 플랫 일러스트 **이미지 프롬프트** + FAQ. (c) **DB** = `marketing_articles.blog` JSONB(migration 045, 비파괴적 — base 글 안 건드림): 언어별 {seoTitle,slug,meta,h1,primary/secondary,sections[{heading,html,imagePrompt,imageUrl}],faq}. import는 sort_order 매칭 PATCH, 섹션 imageUrl 보존(재실행 안전). (d) **UI** = `/marketing/content` "블로그(SEO)" 탭. 게시는 추후 발행 스케줄러(blog_published→i18n 빌드). 상세 memory `blog_seo_pipeline.md`

- **통합 블로그 위저드** (2026-06-08, `/marketing/content` "블로그" 탭): 옛 2탭(네이버 카드형 "블로그" + "블로그(SEO)")을 **단일 구글 SEO 위저드**로 통합. 네이버 블로그 코드 전면 폐기(`BlogPanel`/`BlogSeoPanel`/`BlogCardItem`/`SeoScorePanel`/`WorkflowStepBar`/`blogChannelService`/`seoScorer` 삭제, types에서 `BlogChannel`·`BlogCard*`·`BlogContent` 제거). 데이터는 `marketing_articles.blog` JSONB 단일 소스(migration 045), **언어는 최상단 셀렉터만**(중첩 언어탭 없음). `BlogWizard` 3스텝: **키워드**(primary/secondary + AI 아웃라인) → **구조**(섹션 제목 편집·드래그앤드롭 순서변경) → **글쓰기**(`BlogSeoEditor` full + AI 본문 생성 + 섹션 드래그 재정렬·삭제 + **"📊 SEO 점수 측정" 버튼** 온디맨드 채점 → `BlogSeoScorePanel` + 약점 항목 "AI 수정"). **섹션 이미지 = 카드뉴스와 동일 운용** — 하드코딩 `BLOG_IMG_STYLE` 공통 스타일(16:9 플랫 일러스트) + 섹션별/전체 프롬프트 복사 시 자동 prepend + 상단 "📋 이미지 프롬프트 전체 복사" 버튼. 채점기 = 클라 순수함수 `utils/googleSeoScorer.ts`(구글 기준 11항목 100점, 태국어 무공백 LCS 부분점수). AI 생성/수정은 ai-server `contentPrompts.ts`(blogSeoOutline/blogSeoBody) + marketing 라우트, `marketingArticleService`(generateBlogSeoOutline/Body·saveBlogSeo). 설계/계획: `docs/superpowers/{specs,plans}/2026-06-08-unified-blog-workflow*`

- **릴스 탭 + 언어 셀렉터 통합 + 카드뉴스 이미지 언어별 + 中文 번체/간체** (2026-06-10, `/marketing/content`): (a) **릴스 탭 신규**(`ReelsPanel`) — 언어별 영상(mp4→R2 raw 업로드 `aiImageService.uploadVideoFile`, r2 한도 15→100MB) + `<video>` 미리보기 + 교체/삭제. **캡션·해시태그는 카드뉴스 단일 소스**(읽기 전용 표시, `cardnews.captions[lang]`/`hashtagsI18n[lang]`). 데이터 `marketing_articles.reels` JSONB `{[lang]:{videoUrl}}` (**migration 046** txirmof 수동적용 — 적용 전 읽기 graceful·저장만 에러). 발행은 추후(탭 발행버튼 비활성). (b) **언어 셀렉터 상단 1개로 통합 + 6언어** — `LanguageSelector` 가 ko/th/vi/en/**ch(🇹🇼번체)/cn(🇨🇳간체)** 제어, 전 탭(기본글·블로그·카드뉴스·릴스) 공통. 카드뉴스 **아래 자체 언어버튼 제거**(`CardNewsPanel` 이제 `language` prop, 상단 집합=CardLang 집합 정확히 일치). (c) **카드뉴스 완성 이미지 언어별** — 각 언어 이미지에 그 언어 텍스트가 박혀 있어 `canvas.imageUrl`(언어공통) → **`canvas.images[lang]`**(언어별, 교차 폴백 없음, DDL 없이 canvas JSONB 내 저장). 기존 101장(14 카드뉴스) → `images.th` 백필(비파괴적, `imageUrl` 백업 유지). `publishExecutor` 도 `images[lang]` 읽음. (d) **中文 번체(ch)/간체(cn) 분리** — AI 생성(`contentPrompts.ts` cardnews-i18n/captions)이 6언어로 둘 다 생성(글자체 구분). **타겟 전략**(memory `marketing_chinese_market_strategy.md`): 글자축(간체/번체) ⟂ 말축(만다린/광둥어). 번체=대만, 간체=동남아·미국 화교. 만다린 음성 1개 + 자막 번체/간체로 중화권 커버, 광둥어(홍콩)·대만어는 스킵. 미국 화교는 간체+영어(2세대 English-dominant), 채널 小红书 고려. 손댄 파일: `types.ts`(CardLang+cn·ReelsMap·CardCanvasData.images)·`marketingArticleService`(saveReels·reels 매핑)·`cardnewsService`·`CardNewsPanel`·`ContentTabs`·`LanguageSelector`·`ReelsPanel`(신규)·`aiImageService`·ai-server `r2.ts`·`publishExecutor`·`contentPrompts`. **(추가)** 릴스 탭 **서브탭 분리**(📋 스토리보드[HTML iframe 뷰어 — 생성은 추후·**전 언어 공용**, 지금은 빈 플레이스홀더] / 🎬 영상 제작[기존 영상+카드뉴스 공용 캡션]) · **블로그 섹션 이미지 전 언어 공통**(텍스트 없는 16:9 일러스트라 **카드뉴스와 반대**. `BlogWizard.applySectionImageAll` 로 업로드/삭제 시 같은 인덱스 전 언어 동기화(섹션 없는 언어 스킵), `BlogSeoEditor` "🌐 전 언어 공통" 안내. 기존 이미지 130장 → 22콘텐츠·387섹션 인덱스 백필(우선순위 th>ko>en>vi, 빈 칸만). ⚠️ 블로그 섹션 수가 언어별 ±1 어긋남 35/62 → 정렬된 앞쪽만 공통, 뒤쪽 1~2개는 개별. 마이그레이션 X).

- **릴스 스토리보드 62개 자동 생성 + 연결** (2026-06-10, `/marketing/content` 릴스 → 📋 스토리보드 탭): 콘텐츠 62개 전부에 **6언어 릴스 기획서(HTML)** 를 양산해 ReelsPanel에 연결. **시스템**: `docs/storyboards/render.mjs`(spec JSON → 강화 템플릿 HTML: 썸네일·핵심컨셉·내러티브아크·씬표(모션)·모션가이드·인포그래픽4·이모지·6언어탭·제작노트 — CSS·레이아웃 고정, 콘텐츠만 채움) + `build.mjs`(`specs/*.json` → `v4/public/storyboards/{sort_order}.html` + `index.json` 매니페스트). `ReelsPanel` storyboard 서브탭이 매니페스트 보고 `iframe src="/storyboards/{sortOrder}.html"` 로드(전 언어 공용 · **sortOrder = topic#n 1:1**, DB 조회로 검증). **spec 생성** = 멀티에이전트 워크플로우(`docs/blog/_src/{n}.json` 본문 읽고 → 구조화 spec). 각 spec: 10씬 × 6언어(ko/th/vi/en/cn/ch **네이티브 transcreation**, 대만 公分/본토 厘米) + 인포그래픽 4종(**텍스트 0 언어중립** AI 프롬프트 + 오버레이 라벨 ko/en/th) + **눈에 띄는 썸네일**(주어 필수 + 거대 숫자(길이별 폰트 자동) + 하단 187 로고, 얼굴 없음) + 씬별 모션 액센트. **★ 워크플로우 교훈**: 57개 **동시** 실행 = 레이트리밋 캐스케이드(에이전트당 6K 토큰·95% 실패) → **6개씩 순차 청크 + 3회 재시도** 로 안정화(119K/에이전트·실패 0). 상세 memory `reel_storyboards.md`. ⏳ 인포그래픽 실제 이미지(프롬프트→생성)·실제 영상 제작·모션/썸네일 Remotion 코드 구현은 추후

- **광고 관리 워크스페이스 + Meta Pixel** (2026-06-10, `/marketing/ads`): 옛 수기 성과 트래커를 **유료광고 기획·구성 워크스페이스**로 재설계+단순화. **시장(국가·언어 ko/en/th/vi `LOCALES` 공용)→광고계정→캠페인→(Meta 구조상)광고세트→광고** 계층이나 UI는 **단순화** — 캠페인 편집기(`CampaignEditor`) **1화면**에서 설정·목표·계정·타겟(지역·연령·성별·관심사·노출위치)·예산·기간 + **📎 콘텐츠 바로 담기**(만든 카드뉴스/릴스 `CreativePicker` 연결, 캡션 자동). "광고 세트" 용어 화면서 숨김(저장 시 자동 세트 1개로 정리→추후 Meta API 푸시 1:1, 콘텐츠 여러개=Meta 자동 최적화). 성과는 캠페인 단위 수기→CTR/CPC/CPA/ROAS 클라 파생. **migration 047**(`marketing_ad_accounts`·`marketing_ad_sets`·`marketing_ads`+campaigns에 account_id/market, txirmof 적용완료). 서비스 `adWorkspaceService.ts`(계정/세트/광고 graceful CRUD)+`marketingAdsService.ts`. 컴포넌트 `components/ads/`(adConstants·AccountBar·TargetingFields·CreativePicker·CampaignEditor)+AdsManagerPage 재설계, 옛 폼 5개 삭제. **Meta Pixel 통합**: React `analytics.ts`(동적로드+PageView+카톡클릭=`Lead`+측정완료=`HeightCalcComplete` custom) + 정적 `seo.mjs`(`pixelSnippet` head)·`_shell.js`(trackConsultClick→Lead). ID=`VITE_META_PIXEL_ID`(GA4와 동일 env, 없으면 no-op), 데이터셋 **999009859491958**(앱 ID 겸용). ⏳ Railway **v4 서비스**(ai-server 아님)에 `VITE_META_PIXEL_ID` 추가(프로덕션 정적)·광고는 픽셀 데이터 쌓이면 트래픽→전환. 상세 memory `ad_workspace_and_pixel.md`

- **연구 근거 라이브러리 Phase 1** (2026-06-10, `evidence_papers` 확장): 우리 치료 관련 **국제 SCI 논문 초록**을 품질 랭킹해 DB화. PubMed 발굴(`sort=relevance`) → **OpenAlex**(피인용·저널 if_proxy≈IF·ISSN) + **NIH iCite**(RCR 분야·연도 보정) enrich → 소아내분비 top 저널 화이트리스트 **SCI 게이트** → 합성 `quality_score`(0.40 RCR + 0.25 if_proxy + 0.20 log피인용 + 0.10 최신 + 0.05 근거등급, 0~100) 랭킹 → 15테마 top-N upsert. **전부 무키**(PubMed/OpenAlex/iCite). ai-server 신규 `services/{openalex,icite,journalQuality}.ts` + `data/journalWhitelist.ts`(27저널) + `scripts/ingest-evidence.mjs`(`--dry-run`/`--no-embed`/`--only`/`--limit`), `pubmed.ts` 에 doi·publicationTypes·sort·엔티티디코딩 추가. **migration 048**(evidence_papers 품질컬럼 12개, txirmof 적용). **적재 완료: 250 SCI 논문**(15테마, Lancet/Nature/Endocrine Reviews 등 cite 300~1064·RCR 30~48 랜드마크 상위), 기존 35 clinical 임베딩 보존. clinical RAG(처방추천)와 **단일 라이브러리 공유**. **Phase 2 임베딩 백필 완료**(2026-06-10, 새 Gemini 키 → gemini-embedding-001 768d, **281/281 NULL=0 검증**, `scripts/backfill-embeddings.mjs` resume 가능 + `validate-evidence-search.mjs` 교차언어 검증). 마케팅 연결은 **블로그 참고문헌으로 구현**(↓ 다음 항목). ★교훈: PubMed 기본=최신순이라 `sort=relevance` 필수(아니면 후보가 전부 0-피인용 신논문)·ESM import-time 키검사 회피 위해 gemini 동적 import·upsert by pmid 라 다테마 논문은 마지막 테마 태깅. 상세 memory `research_evidence_library.md`, 스펙/플랜 `docs/superpowers/{specs,plans}/2026-06-10-research-evidence-library*`

- **블로그 근거 논문 자동 인용** (2026-06-10, `/marketing/content` 블로그 탭): `evidence_papers`(281편 임베딩)를 블로그 62토픽에 **참고문헌으로 자동 매칭**(Phase 2 마케팅 연결의 블로그 한정 슬라이스). 운영=**자동+임계값 게이트**(sim≥**0.66** top5, 62토픽 dry-run 캘리브레이션 — 블로그→논문 점수가 Q→논문보다 낮아 0.72는 33토픽 빈칸). 아키텍처=**JSONB 스냅샷**(`marketing_articles.blog_references` **migration 049**, 아티클 단위·언어 독립). ai-server `services/evidenceMatch.ts`(순수 cosineSim·selectReferences) + `scripts/attach-references.mjs`(en(없으면 ko) 블로그 대표텍스트 임베딩→코사인→top-N upsert; `--dry-run`/`--force`/`--threshold`/`--top`/`--only`/`--allow-partial`, `embedding IS NOT NULL` 커버리지 검증). v4 `BlogReferencesPanel`(위저드 글쓰기 단계 하단, **전 언어 공통**, 표시·제거·순서변경·검색추가, `saveBlogReferences`/`searchEvidencePapers` evidence_papers anon SELECT) + `blog.mjs renderReferencesHtml`(6언어 헤딩·escape) + `blog-post.html {{post.references_html}}` 슬롯(renderPost 항상 주입, 빈 배열=''). **적재: 61/62 토픽**(평균 4.6편, #13만 0=best<0.66 → 스튜디오 검색-추가로 보완). 공개 노출은 SEO블로그 발행 파이프라인(기존 TODO) 대기 — 현 캐시 렌더엔 **inert(무회귀)**. ★교훈: 블로그→논문 코사인은 압축됨(0.64~0.84)→토픽랭킹 기준 임계값·커버리지 우선·정밀도는 스튜디오 큐레이션 안전망. brainstorm→spec(리뷰×2)→plan(리뷰×1)→subagent 구현. 상세 memory `blog_evidence_references.md`, 스펙/플랜 `docs/superpowers/{specs,plans}/2026-06-10-blog-evidence-references*`

- **클리니컬 처방추천 RAG 심화** (2026-06-10, Phase 2 ③): AI 처방추천(`/api/knowledge/rx-recommend`)이 검색된 논문의 **초록·핵심결론을 실제로 프롬프트에 주입**(기존엔 제목만 → LLM이 실제 findings 못 봄) + 281편 **한국어 요약 생성**(`korean_summary`·`key_finding`, 의사관점·효과크기/수치 포함) + `RxRecommendModal`에 표시. ai-server `services/evidenceSummary.ts`(순수 빌더+파서) + `scripts/backfill-summaries.mjs`(resume-safe·서킷브레이커·`--sleep`) + `rxRecommend.buildRxPrompt` 초록(600자 트렁케이트)+key_finding 주입 + `match_evidence_papers` RPC(**migration 051** drop+recreate, 두 필드 반환) + `knowledgeRetrieval` 타입 + 라우트 references abstract strip. v4 `RxReference`+모달 핵심결론·요약. ⚠️ **요약 백필은 Gemini 2.5-flash 일일 쿼터(RPD) 소진으로 19/281만 생성 — 한도 리셋(보통 24h) 후 재실행**(임베딩과 다른 쿼터; 빠른 페이싱+4×재시도가 RPD 빠르게 소모 → `--sleep` 기본 4000ms·서킷브레이커). 파이프라인은 3샘플로 검증(수치 정확). 상세 memory `clinical_rag_deepening.md`, 스펙/플랜 `docs/superpowers/{specs,plans}/2026-06-10-clinical-rag-deepening*`

- **릴스 인스타 커버 372장 + 중국어 콘텐츠 완성 + 발행큐 + 자산현황** (2026-06-10): (a) **릴스 인스타 커버(썸네일)** — Remotion 제네릭 `remotion/src/shorts/_thumbs/Thumb.tsx` **고정 슬롯**(kicker/주어/거대숫자/노랑라벨/태그라인/하단187로고 위치·크기 고정 + 칸 폭에 맞춰 폰트 자동축소). 언어별 폰트(KR/Thai/Inter/SC/TC, `fonts.ts`)·`estUnits`(태국 결합문자 0폭 정확화)로 가로 안 넘침. **62토픽×6언어=372장**: `thumbs.json`(카피, 에이전트 transcreation) + `render-thumbs.mjs`(@remotion/renderer 번들1회+잡마다 inputProps, 동시성3+재시도) → `out/marketing/thumbs/{n}-{lang}.png`(gitignore) → `upload-reel-covers.mjs`로 R2 업로드 + `marketing_articles.reels[lang].coverUrl` 연결(62×6 verified). ReelsPanel 영상제작 = **왼쪽 커버 / 오른쪽 영상**(`uploadCoverImage` 원본 PNG 보존, IG 커버는 WebP 거부). 검토 `make-contact-sheets.mjs`/`make-thumb-gallery.mjs`. (b) **블로그 cn/ch 124편**(62×2, ko→简/繁 native transcreation, slug·imageUrl·imagePrompt 그대로·섹션이미지 공용) + **카드뉴스 cn**(ch→简体 변환, 캡션62+해시태그62+슬라이드468) → blog·cardnews 텍스트 **6언어 완비**. (c) **릴스 발행 큐** — `ContentKind`에 `'reels'` 추가, ContentTabs 버튼 활성, PublishDialog 릴스=소셜(IG/FB/Threads, **영상 있는 언어만** + 캡션/해시태그 카드뉴스 공용). content_kind CHECK 없어 마이그레이션 불필요. (d) **콘텐츠 자산 현황 대시보드** — 콘텐츠 리스트 **📊 현황** 버튼 → 우측 매트릭스(62콘텐츠 × [블로그/카드뉴스/릴스] × 6언어, 🟩완료/🟨일부/⬜없음 + 채널별 완료% + hover 상세). `marketingStatusService.ts`(articles의 blog/reels + cardnews fetch 집계) + `ContentStatusPanel.tsx`. **[📦자산]/[🚀배포] 토글** — 🚀배포 모드는 발행 큐(`fetchPublishStatus`) 기준 **채널별 점**(카드뉴스·릴스=IG/FB/Threads, 블로그=자체사이트; 채움=발행·흐림=예약·테두리=큐·빨강=실패·회색=미등록). ⚠️ Gemini 키 무효라 중국어는 **Claude 병렬 에이전트**로(블로그 13·카드뉴스 6 에이전트, 청크+검증). 카드뉴스 cn 이미지·릴스 영상은 외부 생성이라 별개. 상세 memory `reel_covers_thumbnails.md`·`chinese_content_fill.md`·`reels_publish_status_dashboard.md`

- **릴스 영상 제작 파이프라인** (2026-06-10~11, `/marketing/content` 릴스): 스토리보드 → **원장 프레젠터(PresenterShort) 릴스** 자동 제작. (a) **인포그래픽 이미지 관리 UI** — 📋 스토리보드 서브탭 우측 `InfographicAssetsPanel`(드래그앤드롭 + 클릭후 Ctrl+V, 파일선택 없음, 프롬프트 개별/전체 복사 + 1:1 사이즈 자동첨부). R2(`marketing/reels/infographics` 원본 PNG) + DB `marketing_articles.reel_assets`(언어공용, **migration 050**). 슬롯 = `build.mjs` 가 출력하는 `/storyboards/infographics.json`. 이미지엔 텍스트 없음 → 렌더가 `insertLabels` 로 언어별 오버레이. (b) **제작 파이프라인**(`remotion/scripts/`): `storyboard-to-reel.mjs <n>`(spec→`src/shorts/<slug>/script.json` + 이미지 다운로드) → `gen-tts-short.mjs`(원장 클론음성 + **앞뒤 무음 트림**) → `make-presenter-base.mjs`(clean.mp4 에서 **카메라 응시 설명 구간만** 잘라 정사각 재사용 베이스 `mainclip/presenter-base.mp4`) → `prep-lipsync.mjs`(베이스 랜덤 cut, **slug 시드 → 같은 콘텐츠 6언어 동일 컷·콘텐츠별로만 다름**) → LatentSync 재립싱크 → `PresenterShort` 렌더(`Root.tsx` 등록, ID 로마자). (c) ReelsPanel **영상·커버 드래그앤드롭**. (d) **한글 나레이션 격식체 "~습니다"**(의사 신뢰 톤, #4~ 자동). (e) 업로드 후 페이지 이동 시 사라지던 stale 버그 fix(`onPatch` 로 부모 `articles` in-place 갱신). 제작 완료: **#2 성장타이밍4·#3 성장판나이 (ko/th)**. 상세 memory `reel_production_pipeline.md`. ⚠️ migration 050 수동적용 · 대용량(presenter-base·footage·lipsync·다운로드 이미지·TTS wav)은 gitignore(재생성).

## Remotion (Instagram Reels)
- **Directory**: `./remotion/` — Remotion 4 + TypeScript
- **Purpose**: Height prediction feature showcase reels (9:16)
- **Compositions**:
  - `HeightReels` (한국어 예측키 데모), `HeightReelsTH` (태국어 예측키 데모) — 24.5초
  - `HeightReelsTHPromo` / `HeightReelsKRPromo` (병원 홍보, 800프레임 ~26.7초) — 동일 구조 다른 로케일. 흐름: 예측키 측정(Hook→Input→Result) → **원장+실적+병원 슬라이딩 합친 씬(ClinicScene)** → 아역배우 사례(CasesScene) → 홈페이지/메신저 CTA(CtaPromoScene)
  - `HeightReelsKRMarketing` (마케팅 풀 퍼널, **5컷 720프레임 24.0초**, KR, **배경음악 `audio/bg1.mp3`** — 24초에 맞춰 endAt=720 + 0.6초 페이드인/1초 페이드아웃) — **동남아/태국 타겟 신나는 톤**. video-driven 브랜드/신뢰 퍼널(인-릴 측정 데모·Vs/DirectorGrid/Celeb 그리드 씬은 전부 폐기, 영상 3개로 슬림화). 흐름: **S1 `FearIntroScene`**(intro.mp4 위, **화면 중앙에 한 줄씩 "빡" 슬램**(1.45→1 슬램 스케일): "우리 아이 키, 걱정되시나요?" 단독 등장→사라짐 → "이제 태국에서" / "아시아 최고의 성장 치료를" / "받을 수 있습니다"(마지막 줄 accent) 순차 등장. 중앙 라디얼 스크림으로 가독성) →[slide-right 12f]→ **S2 `ClinicScene marketing`**(상단 187 로고 + 헤드라인 "아시아 최고의 성장 클리닉" + 원장 컷아웃 `doctor_rmbg.png` + 우측 1,000+/95% 카운트업 + 하단 병원 4컷 슬라이딩 "새봄" 네온 마무리. **하단 자막 제거됨**) →[zoom 14f]→ **S3 `IntegratedCareScene`**(growingup.mp4 위, **5개 통합관리 아이콘**(의학적 치료/수면/영양/성장 운동/자세 교정)이 **하나씩 화면 중앙에 크게(1.95배) 등장 + 라벨 동반 → 자기 자리로 날아가(0.95배) 안착 → float**. 핸드오프 스태거(delay `4+i*28`). 자막 "아이의 상태에 맞춰 다양한 방면으로 / 키 성장을 관리합니다") →[slide-bottom 12f]→ **S4 `VideoScene`**(celeb-reel.mp4 풀블리드, **자막 없음** — "우리 아이 스타들" 셀럽 타이틀은 영상 자체에 baked, Remotion 오버레이 아님) →[zoom 14f]→ **S5 `CtaPromoScene minimal`**(로고 + "우리 아이의 키 성장,\n지금 시작하세요"(`ctaStartLine`) + 홈페이지 URL만. CTA 버튼·메신저 pill·재측정 문구는 `minimal` prop 으로 전부 숨김). 전환은 slide(`@remotion/transitions/slide`) + **커스텀 zoom**(`src/lib/zoomTransition.tsx` — 빌트인 zoom 없어 직접 작성: entering 0.92→1, exiting 1→1.06 + fade) 믹스. 신규 씬 파일: `scenes/{IntegratedCareScene,VideoScene}.tsx`. 나레이션(TTS)은 액티브 톤 위해 제거(HeightReelsKRMarketing.tsx 내 주석 블록으로 복원 가능). 카피 원칙은 `memory/marketing_reel_kr.md` 참조
- **홍보 릴 핵심 설계**:
  - **ClinicScene = 합친 레이아웃**: 좌상단 원장 사진(고정) + 우측 실적 stats(1000+/90%+ 카운트업, 고정) + 하단 병원 사진 4장 슬라이딩(한국어 "새봄" 네온 간판으로 마무리). 상단 Korea 배지(`clinicKoreaBadge`)로 "한국 병원" 명시. StatsScene 은 이 씬에 흡수돼 컴포지션 미사용(파일만 보존)
  - **CtaPromoScene = locale-aware**: 로고(`L.logo`), 메신저 pill(`L.ctaMessengerBg/Fg` + `L.ctaLinePill`), URL(`L.siteUrl`) 전부 로케일 분기 → **ko = 한글 로고 + 카카오톡 노랑 pill + dr187growup.com / th = 영문 로고 + LINE 초록 pill + .../th**. "홈페이지에서 직접 측정 가능"(`ctaSiteMeasure`) 문구 + URL 로 재측정 동선 명시
  - **HookScene `hideCta` prop**: 프로모(TH/KR)는 `<HookScene hideCta />`. Hook 종료(75f)에 spring 등장하던 CTA 버튼이 exit transition(75f)과 겹쳐 **"깜빡 나타났다 사라지던"** 문제 제거 + `hideCta` 시 title/subtitle 타이밍을 `1.5·fps`로 앞당겨 전환 전 안착. 진짜 CTA는 마지막 CtaPromoScene 1곳만 (기존 데모 릴 `HeightReels`/`HeightReelsTH`는 prop 미지정 → 기본 동작 유지). ClinicScene 이름/연차 텍스트는 width 460·fontSize 24로 1줄 안착(th "10 ปี" 줄바꿈 깨짐 fix)
  - **CasesScene = 사진 + 자막만**: 아역배우 그리드(현재 플레이스홀더 `actors-grid.jpg`, 사용자가 실 이미지 교체 예정) + 자막. 효과(cm) 막대 **없음**(의료광고 규정 — 셀럽 얼굴에 치료효과 직접 결합 금지). 자막 `casesActorsLine`은 셀럽 비강조 **브랜드 메시지** ("아이의 키 성장, 187이 함께합니다" / "187 ดูแลการเติบโตของลูกคุณ")
- **Locale system**: `src/lib/texts.ts` — `LocaleTexts` 인터페이스에 ko/th 값. 새 언어 = 값 추가 → setLocale 바꾼 컴포지션 복사 → `Root.tsx` 등록
- **Commands**:
  ```bash
  cd remotion && npx remotion preview        # Preview
  cd remotion && npx remotion render HeightReels out/marketing/reels.mp4              # Korean demo
  cd remotion && npx remotion render HeightReelsTH out/marketing/reels-th.mp4         # Thai demo
  cd remotion && npx remotion render HeightReelsTHPromo out/marketing/reels-th-promo.mp4 # Thai promo
  cd remotion && npx remotion render HeightReelsKRPromo out/marketing/reels-kr-promo.mp4 # Korean promo
  cd remotion && npx remotion render src/index.ts HeightReelsKRMarketing out/marketing/reels-kr-marketing.mp4 # KR marketing reel (5컷 720f 24초, 동남아 타겟)
  # 쇼츠(토킹헤드 다국어):
  cd remotion && node scripts/gen-tts-short.mjs 초경 th                       # 쇼츠 클론음성 (slug lang)
  cd remotion && npx remotion render chogyeong out/shorts/초경/초경-th.mp4    # 쇼츠 최종 (한글 폴더, 로마자 ID)
  ```
- **out/ 폴더 규칙**: 쇼츠 결과물 = `out/shorts/<제목>/`, 마케팅 릴 = `out/marketing/`, 검증·중간물·캐시 = `out/_work/`(일회용). 전체 gitignore, 소스/런타임 에셋은 `public/`. 상세 `remotion/out/README.md`
- **유튜브 쇼츠 다국어 재현**(@187growup 채널 78개 → th/en/vi/zh): 교육 쇼츠를 클론음성(ElevenLabs)+LatentSync 립싱크로 현지화. **factory**: `src/shorts/<한글slug>/script.json`(대본+자막+`capY`/`cover`) + `_shared/FaithfulShort.tsx`(제목·자막·로고 범용, perchunk/linear/footage 3모드) + `scripts/gen-tts-short.mjs <slug> <lang>`. 파이프라인: yt-dlp→ko자막→번역→TTS→footage렌더→LatentSync(no-face패치)→최종합성. 분석 `scripts/{analyze-shorts,merge-analysis}.py`. **완성: 초경(ko/th/en/vi/zh)·부작용(ko/en/th)·몽정(ko/en/th)·영양제(ko/th/en, bespoke `SupplementFaithful{TH,EN}`)·성조숙음식[우유→성조숙증](ko/en/th)·칼슘영양제[Best3](en/th)** — `out/shorts/<slug>/<slug>-{lang}.mp4`. **★ 글로벌 선별 필터**(키측정 교훈): 연예인/K-pop·국내문화 클립 ❌(외국 부모는 모름, 번역 무의미) → 순수 의학·교육만 ✅. **★ 립싱크 = 통영상 LatentSync 1번, no-face 패치가 일러스트·데이터표·제품 인서트(얼굴 없음) 통과 → 자동으로 "원장 얼굴만 립싱크"**(부작용·영양제·성조숙음식·칼슘). 순수 몽타주(스톡 사람 얼굴, 몽정)만 립싱크 X. **★ 마스킹**: `cover` 전체폭 밴드 — footage 워프로 baked 한글이 언어/시점마다 다른 y에 옴 → 넉넉한 밴드 + **원장 입 위치 피하기**(밴드가 입 가리면 ❌, 빈 박스도 ❌). FaithfulShort 추가: **다중 cover 밴드**(`[[top,h],...]`)·**label_<lang>**(일러스트 한글 교체 예 압력→PRESSURE)·**bottomScrim**(하단 브랜딩바). 헤더색 `headerStyle`. **`_shared/StackedShort.tsx`**(헤더/자막/메인영상 세로 스택 — 도입부 연예인 클립은 `koAudio`로 원본 한국어+영어자막 풀스크린, `lipsyncFrom`으로 도입부 길이 바뀌어도 립싱크 정렬 유지, `panelSrc` 미리크롭). gen-tts-sync.mjs(영양제 bespoke)는 en 로케일 추가됨. 번역 간결·punchy. ⚠️ Remotion ID 한글 불가→로마자. zh=만다린(자막 번체). ⏸️ 키측정(연예인 도입부, 마스킹 난이도로 보류). 상세·플레이북 memory `youtube_shorts_recreation.md`
- **원장 프레젠터 포맷 = 쇼츠 표준**(`_shared/PresenterShort.tsx`, 2026-06-10 확립): 원본은 원장이 잠깐만 나옴 → **MainClip 클린(`public/mainclip/clean.mp4`) "정면" 토킹 구간을 베이스로 깔고 각 언어 재립싱크** → 원장이 내내 등장. 레이아웃: **인트로 카드(보라+로고+훅 슬램) → [헤더 / 원장 정사각 라운드 카드 / 자막 / 로고] + 인포그래픽 인서트 → CTA 카드(로고 가운데+언어별 홈페이지 URL `dr187growup.com[/th·/en·/vi]`)**. **RVM 매팅 안 함**(크림 배경 그대로 라운드 카드). 인서트 = **언어중립 이미지(텍스트 0) + `insertLabels`(분수좌표 x·y로 언어별 텍스트 오버레이)** → 이미지 1세트로 전 언어 재사용. ★**베이스=정면샷만**(B-roll·비정면·baked 그래픽 컷 제외 — 컨택트시트가 측면 음식몽타주·간판 놓치니 **풀해상도 검증 필수**), 스티칭 컷은 인서트존에 숨김, 음성보다 길게. ★**흰 로고는 `logo_en_wh.png`만**(`logo_white.png`·`logo_en_white.png`는 흰 배경 박스). **첫 작품 키유전80(ko·th 완성, en·vi 대기)** = 마케팅 콘텐츠 #1 「키 유전 80% vs 환경 20%」. 기획서 `docs/shorts/키유전80-기획서.html`. 가짜성조숙증도 이 표준 상속(재렌더 시)
- **성장클리닉 진료과정 영상 태국어 현지화**(`MainClipTH`, 진행 중): 한국어 4분 가로(1920×1080) 진료과정 영상(`remotion/mainclip/…지현쌤.mp4` = 텍스트 없는 1차 컷편)을 태국어로 재현. **클린 mp4를 `OffthreadVideo` 배경**으로 깔고 그 위에 **큐 기반 오버레이**를 얹어 렌더. 구조: `src/mainclip/{MainClipTH.tsx(합성), overlays.tsx(컴포넌트), cues.ts(타임드 큐 데이터)}`. 큐 종류: `subtitle`(흰/크림, 키워드 em)·`title`(외곽선+솔리드)·`chip`(좌상단 카테고리)·`circle`(키워드)·`label`/`callout`(위치 텍스트·콜아웃, `banner`=불투명 커버)·`number`(01~ 반투명)·`qcard`/`qbar`(Q&A 카드+상단 질문바)·watermark(우상단 187 GROWUP). 시간(초)→프레임 30fps. **워크플로우(컷별)**: (1) 구간 컨택트시트로 모든 오버레이/baked요소 파악 → (2) KR 프레임에서 텍스트·위치·스타일 추출(버블은 OpenCV HoughCircles로 중심 자동검출, 라벨 박스는 5% 그리드/마커로 측정) → (3) cues.ts 작성 → (4) 컷 렌더+더빙 믹스 → 사용자 컨펌. **더빙**: `scripts/gen-tts-seq.mjs`(ElevenLabs `previous_request_ids` 스티칭 = 한 컷 여러 줄을 한 목소리로, calm 세팅 STABILITY 0.7/STYLE 0) 줄별 생성 → 단계/자막 시작점에 배치(필요시 `atempo` 길이 맞춤). 번역은 한국어 구간 길이에 맞춰 간결하게(자막=더빙 동일). **배경음악**: 원본 오디오를 demucs(htdemucs 2-stem, `out/_work/.../separate.py`)로 보컬 제거 → `no_vocals.wav` 음악 스템을 더빙 아래 깔아 전 컷 재사용. **baked 한국어 처리**: 인트로 로고·간판·층별안내는 유지(건물 텍스트). 클린에 baked된 인포 라벨(아이들 나이 9-15/8-13세, 무릎 X-ray 열린/닫힌 성장판)은 **불투명 배너(`Callout banner`+`bannerBg`)로 덮고 태국어** — 등장 즉시 덮도록 `from`을 baked 등장 시점에 맞추고 pop 제거, 스프링 진동 요소는 세로로 큰 배너로 범위 전체 커버. **로고**: `public/images/logo_187growup.png`(v4 logo_en.png 흰배경 colorkey 투명화). 산출·중간물·클린 mp3/mp4는 `out/_work/th-mainclip/`, `public/mainclip/`(둘 다 gitignore). **완료: 컷1~7**(인트로·진료5단계·Q1~Q5). **남은: 컷8(Q6 사춘기관리)·엔딩 표·전체 결합·립싱크(GPU 필요, 보류)**
- **Add new language**: 1) `texts.ts` 의 `LocaleTexts` 에 값 추가 2) `HeightReelsKRPromo.tsx` 복사 → `setLocale()` 변경 3) `Root.tsx` 에 Composition 등록

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
- Remotion details: see `remotion/` (scenes, components, locale)
