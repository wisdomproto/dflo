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
- **GA4**: `analytics.ts` gtag 동적 로드(`G-Y5VKTKKEQ4`). 카톡 CTA `trackKakaoConsult(source)` 가 핵심 전환 이벤트. private path 자동 차단. 어드민 분석 `/banner-admin/analytics`(GA4 Data API OAuth, PIN 보호). (정적 i18n 사이트 CTA 추적은 위 i18n 섹션 참조)
- **환자 임상 DB(어드민)**: `chart_number` UNIQUE. 환자상세 3-column = visit list │ `VisitDetailPanel`(4탭: 진료내역/X-ray/Lab/생활습관, sticky 헤더) │ `AdminPatientGrowthChart`. `visits.is_intake`=환자당 초진 가상 visit 1개(진료 리스트·그래프에서 제외). `children.intake_survey` JSONB(문진 Q1~16 + `raw_files` 메타). 테이블: `hospital_measurements`(키·뼈나이·PAH), `lab_tests`(panel_type별 + 첨부), 처방(`medications` MED/INJ/PRO 코드 + `prescriptions`)
- **환자 분류/단계**: 8종 카테고리(`patientCategories.ts`, Pure 함수) + 필터·정렬·즐겨찾기. `children.treatment_status`('consultation'|'treatment', migration 014) 에 따라 BottomNav·HomePage·`/app` 라우팅 분기. 차트번호 로그인(244명 password='1234')
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
  cd remotion && npx remotion render HeightReels out/reels.mp4              # Korean demo
  cd remotion && npx remotion render HeightReelsTH out/reels-th.mp4         # Thai demo
  cd remotion && npx remotion render HeightReelsTHPromo out/reels-th-promo.mp4 # Thai promo
  cd remotion && npx remotion render HeightReelsKRPromo out/reels-kr-promo.mp4 # Korean promo
  cd remotion && npx remotion render src/index.ts HeightReelsKRMarketing out/reels-kr-marketing.mp4 # KR marketing reel (5컷 720f 24초, 동남아 타겟)
  ```
- **Add new language**: 1) `texts.ts` 의 `LocaleTexts` 에 값 추가 2) `HeightReelsKRPromo.tsx` 복사 → `setLocale()` 변경 3) `Root.tsx` 에 Composition 등록

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
- Remotion details: see `remotion/` (scenes, components, locale)
