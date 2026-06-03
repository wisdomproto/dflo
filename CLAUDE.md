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
- `build-i18n.mjs`: 빌드 오케스트레이터 (async main, `--refetch` 플래그). 비한국어 빌드 시 후처리로 `/programs/images/` → `/programs/images/{lang}/`, `/images/logo.jpg` → `/images/logo_en.png` swap
- `lib/render.mjs`: `{{placeholder}}` + `{{#each list}}` 미니 렌더러 (마커 누락 시 throw)
- `lib/messenger.mjs`: `getMessengerCTA(lang, {requireLiveUrl})` — TBD URL이 활성 언어에 있으면 빌드 실패
- `lib/seo.mjs`: meta/canonical/hreflang/OG/Twitter Card + `PATH_PREFIX` env-var (기본 `''`, staging에서 `/test` 오버라이드 가능). **`ACTIVE_LANGS`(ko/th/vi/en) 단일 소스** — `build-i18n.mjs`가 여기서 import. hreflang·sitemap·빌드 루프가 절대 어긋나지 않게(미빌드 ja/zh-tw/id 를 hreflang 으로 내보내면 404 타겟이라 클러스터 무효화). 언어 활성화 = 이 배열에만 추가
- `lib/jsonld.mjs`: MedicalClinic + Physician + FAQPage + BlogPosting. `areaServed` 는 th 만 `[KR,TH]`(방콕 원격상담 신호), 그 외 `KR`. Physician 에 image(`/images/doctor.jpg`)·url·jobTitle 포함
- `lib/sitemap.mjs`: `<xhtml:link rel="alternate">` 자동 삽입 + 홈·블로그 외 서브페이지(clinic/cases/calculator) × ACTIVE_LANGS 도 등재
- `lib/fetch-contentflow-posts.mjs`: ContentFlow API에서 블로그 fetch → `i18n/blog-cache/` JSON 캐시
- `lib/blog.mjs`: `renderPost` + `renderIndex` + `loadCachedPosts`

빌드 산출(`public/{ko,th,vi,en}/`, `sitemap.xml`, `i18n/blog-cache/`)은 `.gitignore`. 소스(`public/_shell.css`, `_shell.js`, `og/`, `robots.txt`, `images/logo_en.png`, `programs/images/{lang}/{slug}/`)는 tracked.

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

### 라우터 (Phase 6 후)
`v4/src/app/router.tsx`:
- `/` → `HardRedirect('/ko/index.html')`. 기존 React `WebsiteHomePage`는 `/home-legacy`에 보존 (롤백용)
- `/{ko,th,vi,en}` · `/{lang}/blog` · `/{lang}/` · `/{lang}/blog/` → `HardRedirect` 정적 `index.html` (4 lang × 4 변형 = 16 routes, `I18N_LANGS` 배열에서 flatMap)
- `/test`, `/test/`, `/test/:lang(/blog)?` → `Navigate(replace)` 새 경로로 (SEO + 북마크 보존)
- 기존 `/program/:slug`, `/guide`, `/diagnosis`, `/banner-admin`, `/app/*`, `/admin/*` 변동 없음

### 다국어 자산 처리
- **프로그램 이미지**: 한국어는 기존 `public/programs/images/{slug}/` 유지. 비한국어는 `public/programs/images/{lang}/{slug}/` (사용자가 직접 채움 — 공통 이미지도 복사). 빌드가 lang별로 URL swap
- **로고**: 한국어 = `public/images/logo.jpg`. 비한국어 = `public/images/logo_en.png` (1832×560 PNG, ~860KB, 고해상도 영문 워드마크). `_shell.js`가 runtime `__I18N_LOCALE` 보고 분기, 빌드는 hero masthead용으로 URL swap
- **HeightCalculator 생년월일 input**: `<input type="date">`가 Chromium에서 lang 속성 무시하는 문제 회피 — 3개 number 필드(년/월/일)로 분리, `calcLabels.ts`의 `fieldBirthYear/Month/Day` 라벨로 locale별 placeholder
- **예측키 성장 표준 (계산기 전용)**: `growthStandard.ts` 에 `GrowthStandard='KR'|'TH'` 분기. th 는 TSPE 2022(WHO 2-5세 + 태국 국가 성장 기준 2020) PDF 차트를 P3/P50/P97 → LMS(L=1, M=P50, S=(P97-P3)/(3.7616·M)) 로 디지털화한 `MALE/FEMALE_HEIGHT_LMS_TH`. `HeightCalculator`/`Result` 가 `lang==='th'?'TH':'KR'` 로 전달. **계산기에만 적용** — 치료사례 차트(`SectionCarousel` cases)는 환자가 한국인이라 ko/th/vi/en 전부 한국 LMS 유지. `?` 도움말·footer 카피는 LMS 전문용어 제거하고 "국가 표준 성장 데이터 기반" 으로 톤다운
- **예측키 결과 CTA**: `HeightCalculatorResult.tsx` 의 `MESSENGER` 맵으로 언어별 분기 — th = LINE OA(#06C755), ko/vi/en = KakaoTalk(#FEE500). `messenger.yml` 과 동일 라우팅
- **치료사례 차트 라벨 i18n**: 공용 `GrowthChart` 에 `labels` prop(범례 실제키/초진·현재 예상 성장 + 축) 추가, `casesLabels.ts` 의 `chartActualHeight/InitialGrowth/CurrentGrowth/AxisAge/AxisHeight` 를 `SectionCarousel` 이 주입. 배너 title/subtitle 은 `CASES_BANNER_I18N` 으로 번역

### 1차 활성화 스코프 (Phase 6 완료)
- 시장 4개: 🇰🇷 ko / 🇹🇭 th / 🇻🇳 vi / 🇺🇸 en
- 메신저: ko/vi/en 은 KakaoTalk (`pf.kakao.com/_ZxneSb`), **th 는 LINE OA `@894qhqtu`** (2026-05-18 전환). `messenger.yml` 만 교체 → `_shell.js` 가 `window.__I18N__.messenger` 에서 읽어 헤더 pill·계산기 결과 CTA·5개 케이스 인라인 CTA 동적 렌더 (인라인 색상 + filter:brightness hover). 빌드가 `messenger_json` 으로 JSON-encode 해 안전 주입
- 프로그램 이미지: ko + **th 완료** (`public/programs/images/th/{slug}/`, 7 프로그램 78 장, 2026-05-18). vi/en 은 추후 채울 예정 — 빌드가 lang 별로 자동 URL swap
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

## Key Design Decisions
- Legacy DB auth: plaintext password in `users` table
- RLS policies (parents see own children, admin sees all)
- Feature-based directory structure
- Lazy-loaded pages via React Router
- Custom theme: primary (#667eea), secondary (#764ba2)
- Supabase Storage: `content-images` bucket, `meal-photos` bucket
- Image compression: 1200x1200 JPEG 80% before upload
- Website sections: Instagram card-news style (4:5 ratio cards, swipe carousel)
- Website PC layout: 모바일 폭 카드(`max-w-[460px]`)를 PC 중앙에 세로 스택 (인스타그램 데스크탑 스타일). 헤더는 데스크탑 nav 제거 + 햄버거만 표시, 하단 탭바는 `md:h-20` + `md:text-2xl/sm` 으로 확대해 PC 의 주 네비로 사용. `useViewportZoom` 폐기 — 텍스트:카드 비율이 모바일과 동일
- Website 공유 (`ShareSheet`): 헤더 우측 📤 버튼 → 바텀시트 — Web Share API (모바일 네이티브 시트 안에 카톡 포함) + 링크 복사. Kakao SDK 연동은 보류 (`VITE_KAKAO_JS_KEY` 받기 전까지 Web Share 로 대체)
- GA4 통합: 클라이언트는 [analytics.ts](v4/src/shared/lib/analytics.ts) 에서 `gtag.js` 동적 로드 (`VITE_GA_MEASUREMENT_ID=G-Y5VKTKKEQ4`, Property `534844605`). App.tsx 가 `router.subscribe` 로 SPA 페이지뷰 발사. 카톡 CTA 7군데(헤더/탭바/예상키결과/케이스슬라이더/케이스모달/cases슬라이드/가이드섹션) 모두 `trackKakaoConsult(source)` 발사 — 핵심 전환 이벤트. private path(`/app/*`, `/admin/*`, `/banner-admin/*`) 는 자동 차단. URL prefix `/vn`,`/th`,`/en`,`/zh`,`/ja` 자동 감지 → `locale` 파라미터로 다국어 분리
- 어드민 분석: `/banner-admin/analytics` (PIN 보호) — ai-server `/api/analytics/overview` 가 GA4 Data API (OAuth refresh token 인증) 호출 → 요약 카드 + 일자별 트렌드 + 카톡 source별 + locale별 + 인기 페이지. 서비스 계정 키 정책 우회 위해 OAuth 데스크톱 앱 + 일회성 refresh token (`ai-server/scripts/setup-ga4-oauth.mjs`) 사용. 커스텀 디멘션(`source`,`locale`) 등록 전엔 해당 카드만 빈 상태로 graceful fallback
- Per-slide templates: banner, video, cases (3 types) in same section
- DB: `website_sections` table (JSONB slides), legacy fallback to `website_banners`
- Admin: PC split layout (left 35% preview, right 65% editor) at lg breakpoint
- Admin preview: full website preview with all sections, scroll, per-section carousel arrows
- Admin: section inline rename/delete with confirm modal, slide tab delete with confirm
- Image history: upload 시 기존 이미지 삭제 안 함, 히스토리에서 복원 가능
- Bottom tab bar: 예상키 측정, 카카오톡 상담 (플로팅 버튼 대체)
- Cases slide: 직접 입력 (환자, 회차별 기록, 초진정보, 성장곡선+막대그래프)
- Cases measurements: 엑셀 붙여넣기(TSV), 한국식 나이 파싱 ("13세2개월"→13.2)
- GrowthChart: 실제키 + 최종예상키(18세) 포인트, x축 18.5세까지
- Diagnosis flow: 예상키 결과 → "AI 진단" → 7단계 초진 폼 (성별 구분)
- Website bg: white, 섹션 카드: border-3 border-purple-300, 카카오 아이콘: 노란색 SVG
- Growth guide: 13 cards, 4 categories, standalone pages (no header/footer)
- Guide data: JSON from 성장 바이블 원고 (fact-checked), 표준성장도표.xlsx
- AnimatedGrowthChart: SVG, 5th/50th/95th percentiles, male/female toggle
- Banner ctaAction: scroll | link | fulllink | modal | iframe
- Banner modalRatio: '4:5' | '9:16' for modal/iframe slides
- Banner iframeZoom: configurable content zoom % (default 70%)
- Program HTML pages: v4/public/programs/ (iframe-embeddable)
- Cases: clean_cases.py for Excel data cleanup + AI predicted height calculation
- Cases: predicted growth curve (bone-age percentile → yearly projection to 18)
- Cases: allergyData (danger/caution food lists) with collapsible card UI
- Cases: admin fields — realName, chartNumber, youtubeUrl, allergyData, category (free-text)
- Cases: percentile display in measurement table (actual age for height, age 18 for predicted)
- Cases: character illustrations (Gemini Imagen 4.0) in v4/public/images/cases/
- Typography: Noto Sans KR (Google Fonts) 전체 통일, body font-family
- Banner typography defaults: title bold 96px, subtitle medium 50px, CTA medium 14px
- Banner text align: titleAlign/subtitleAlign (left|center|right|justify)
- Banner CTA: ctaSizePx (8~20), ctaAlign (left|center|right), ctaBgColor, ctaTextColor
- WebsiteSection.showNav: 하단 도트 인디케이터 on/off (좌우 화살표는 항상 표시)
- Admin preview: 375px 폭 (iPhone 기준)
- Website content on Cloudflare R2 (website.json + images); ai-server exposes /api/r2/website (PUT) + /api/r2/upload (POST), PIN-protected
- Patient app data (users, children, measurements, meals) remains on Supabase
- Cases measurement table: no percentiles; bone age shown to 1 decimal
- Admin patient detail: `?tab=info|visits` tabs (기본 정보 / 진료 기록)
- Intake survey: `children.intake_survey` JSONB + `grade` / `class_height_rank` columns
- Intake survey covers paper form Q1~Q16 (Q17 lab selection handled via `lab_tests`)
- Admin sidebar: collapsible (localStorage `admin.sidebar.collapsed`), 64px rail. 좌하단 "📄 BM 자료" 드롭다운 → IR deck 새 탭. **v3 primary** (`v4/public/ir/187_ir_v3_260509.html`, 16장, K-헬스케어 글로벌 표준 포지셔닝, 187 보라+골드 톤, 발표자 노트+섹션 transition 4개 포함, design spec `docs/superpowers/specs/2026-05-09-187-ir-deck-v3-design.md`). **v2 archive** (`v4/public/ir/187_ir_v2_260506.html`, 24장, Korean Growth Clinic OS) 는 dropdown 두번째 entry 로 보존
- Admin patient list: `chart_number` UNIQUE NOT NULL (migration 007), search by name OR chart_number, + 환자 추가 / 삭제 (CASCADE) buttons
- Admin patient detail 3-column: visit list (#번호+날짜만) | VisitDetailPanel | AdminPatientGrowthChart
- VisitDetailPanel: 4탭 구조 (진료 내역 / X-ray 검사 / Lab 테스트 / 생활습관), 공통 헤더(날짜·CA·BA·PAH) + 탭 뱃지에 데이터 유무 표시 (없음=rose / 첨부 N=emerald). 헤더+탭바는 `sticky top-0 z-10`으로 고정, 탭 컨텐츠만 스크롤
- 진료 내역 탭: 측정 + 처방 + 메모 + 판독문 원본 (해당 회차 이미지 1장 + prev/next + 썸네일 strip)
- 새 진료 버튼: 별도 페이지 이동 대신 오늘 날짜로 빈 visit 즉석 생성 + 자동 선택 → 탭에서 바로 데이터 입력
- 첫 상담 · 기본 정보: 페이지 상단 접힘 섹션 삭제, 환자 헤더 오른쪽 버튼(`첫 상담`·`기본 정보`)으로 열리는 full-screen 모달로 이전. 모달 내부 flex column으로 DeckNav가 하단에 고정되게 보강
- Lab 테스트 탭: 회차별 lab_tests 수치 테이블 (panel별 분리) + 첨부 이미지/PDF 갤러리
- 뼈나이 + 예측 성인키는 X-ray 섹션에서 계산, 측정 섹션은 자동 표시
- Xray upsert: 동일 visit_id 있으면 UPDATE (이미지 경로 유지); migration 006 anon storage RLS opened
- Growth chart 우상단 📊 환자 헤더 버튼 → ZoomModal에 GrowthComparisonDiagram (초기키/최초 예측/최종 예측 3명 픽토그램, pencil path 사용)
- KR/CN nationality toggle: children.nationality (migration 005), X-ray 섹션 + 성장 그래프 양쪽 동기화, 중국 근사 LMS (`growthStandardCN.ts`)
- Tanner 참고 이미지: `/public/images/tanner/male.png` + `female.png`, 환자 성별 토글로 자동 전환
- Prescription 단순화: 약품 검색/표시 통합 input + 돋보기 + 용량 + 메모, 스프레드시트 스타일 행
- 검사(Lab) 다중 파일 업로드 + 썸네일 갤러리 + 라이트박스(←→/Esc)
- 생활 습관: 진료일 포함 월 뷰 + ◀▶ 이동 + 진료월 복귀; 5개 카테고리 평가 카드(수면/기분/성장주사/식사/운동, 잘함/보통/부족) + pill 필터
- usePasteTarget 공용 훅: 한 번에 한 드롭존만 arm (X-ray patient / Lab)
- ZoomableImg: 마우스 휠로 줌 인/아웃(15% per tick, passive:false native listener) + 드래그 패닝 + 그리기 모드(빨간 자유선, 지우개)
- visits.is_intake (migration 004): 환자당 "초진 가상 visit" 1개, 기본 정보 탭이 임상 데이터를 여기 저장
- 초진 visit 은 진료 기록 리스트/성장 그래프에서 제외 (visitService.fetchVisitsForChild + adminService.fetchPatientDetail 필터)
- **첫 상담 (FirstConsultPanel)**: 환자 상세 페이지 상단 접힘 섹션, PPT 스타일 슬라이드 덱 (11장), KO/EN 토글, ←/→ 키보드 + dot 페이지네이션
- 덱 슬라이드: Cover · Director(원장 초상) · 병원 진료 소개 x2 · 기본 정보 번들(현재키+설문 5개 섹션) · MPH/PAH 비교 · MPH 가우시안 분포 · 뼈나이 분석 · 뼈나이 아틀라스 · X-ray 판독 모듈 · 성장 그래프 모듈
- 슬라이드 컨텐츠: `firstConsultContent.ts` 의 typed array (kind 별로 cover/director/hospital/survey-bundle/method/methods-comparison/mph-distribution/xray-module/growth-chart-module)
- MPHDistributionSlide: SVG 가우시안 곡선, σ=2.5cm, 5개 색상 영역 (±1σ 68%, ±1~2σ 14%, ±2σ 이상 2%), 환자 부모키 기반 자동 공식 계산, x축 tick 에 중앙값 강조
- 첫 상담 live BA 공유: XrayModuleSlide → FirstConsultPanel parent liveXray state → GrowthChartModuleSlide 가 measurement.bone_age fallback 으로 사용, 저장 없이도 슬라이드 11 에 예측 곡선 즉시 표시
- CurrentHeightBlock: 슬라이드 5 최상단에 현재 키+측정일 입력, controlled input + "✓ 저장됨" 배지, is_intake visit 에 upsert
- 첫 상담 이미지: `/first_session/` 폴더 (원장님.png, 진료 사진1.png, 진료사진 2.png, bon analysis.png, bone reference.png)
- **Lab OCR 파이프라인** (`cases/`): Surya OCR + eone 파서 + Supabase 임포트. 5 양식 지원 (표준 피검사, IgG4 음식과민증, MAST, NK세포 활성도, 유기산 상세) + 모발 중금속/기타는 attachment 처리. 234차트 / 2094이미지 → 804 lab_tests 임포트됨
- `parse_eone.py`: 페이지별 eone 판독 파서 (standard/igg4/mast/nk/organic_acid_detail 분기), accession + date 정규식 fallback으로 OCR merged cell 대응, 22028 차트 기준 290/290 match 검증
- `surya_batch.py` + `surya_watchdog.py`: GPU VRAM 단편화로 3-4 배치 후 hang하는 Surya를 5분 stall 감지 → kill/relaunch로 자동 복구, BATCH=4 / rec_batch=16 / `torch.cuda.empty_cache()` 설정
- `aggregate_labs.py`: 페이지별 파싱을 (accession, 패널 family)별 논리 lab order로 머지. IgG4 + 표준 피검사가 한 accession에 공존해도 분리됨
- `insert_labs_to_db.mjs`: ai-server/.env의 SERVICE_ROLE_KEY로 Supabase 직접 쓰기. collected_date별 visit find-or-create, dedup = (visit_id, accession, panel_type)
- `upsert_children_from_labs.mjs`: OCR'd chart_number에 대한 children 레코드 자동 생성 (`ocr-import@187growth.com` 보호자), birth_prefix(YYMMDD-c)로 birth_date 계산
- **검사 이력 (LabHistoryPanel)**: 기존 접힘 섹션은 제거 — panel_type별 렌더러(`PanelContent`, `panelTypeOf`)는 export되어 VisitDetailPanel Lab 탭이 재사용. IgG4는 Class 0-6 색상 스케일(회색→노랑→주황→빨강) + `?` 툴팁 가이드
- lab_tests.test_type CHECK는 기존 3종 유지 (`allergy|organic_acid|blood|attachment`) — 신규 panel은 `result_data.panel_type`에 식별자 저장. migration 008 은 CHECK 확장 SQL 파일만 준비 (수동 적용 대기)
- fetchPatients 페이지네이션: children/measurements/labs 각 쿼리를 1000 row 단위로 반복 fetch (PostgREST 기본 limit 해결), per-child measurementCount/labCount 정확히 집계
- **환자 카테고리 분류** (`v4/src/features/admin/utils/patientCategories.ts`): 8개 카테고리(부모키 작음 🧬/성장 느림 🐢/성조숙 의심 ⚡/염증·알레르기 🌿/치료 시기 놓침 ⏰/미숙아·저체중 👶/편식 🍎/수면 부족 😴), children + intake_survey 기반 Pure 함수, 중복 허용. AdminPatientsPage에 필터 칩 + 뱃지 컬럼 + 컬럼별 정렬(환자번호/이름/카테고리 수/측정/Lab/상태)
- **판독문 OCR 임포트 완료**: 판독문_ocr/*/data.json → hospital_measurements 2995건(+2930 insert, BA 602건), visits 3803건(+550 ocr-only visit 생성), visits.notes 3758건(판독문 memo 이식). "Imported from eone" placeholder 3203건은 NULL 처리. OCR memo 매핑 스크립트: `cases/import_ocr_measurements.mjs`
- **lab_tests visit 재매핑** (`cases/remap_labs_to_clinical_visits.mjs`): lab-only visit에 연결됐던 230개 lab을 collected_date+90일/-30일 내 가장 가까운 진료 visit으로 재연결, 202개 orphan visit 삭제. 46개는 매칭 윈도우 밖이라 유지
- **원본 파일 Storage** (`raw-records` 버킷, public): 판독문 원본 976개 + 랩 원본 2094개 업로드. `children.intake_survey.raw_files` JSONB에 `{pandokmun:[], lab:[], pandokmun_by_visit:{visit_id→[filename]}}` 메타 저장. 업로드 스크립트 `cases/upload_raw_records.mjs`, visit 매핑 스크립트 `cases/map_pandokmun_pages_to_visits.mjs` (ocr-only row는 date 매칭 fallback으로 547개 복구)
- **성장문진표 임포트**: docx 36개 + Google Forms 응답 xlsx 91개 → children/intake_survey 각각 18명 매칭 업데이트 (DB에 없는 환자는 skip). 스크립트: `cases/parse_intake_surveys.py`, `parse_intake_xlsx.py`, `import_intake_surveys.mjs`, `import_intake_xlsx.mjs`
- **XrayPanel**: X-ray 이미지 있을 때만 atlas 자동매칭 BA/PAH를 parent(VisitDetailPanel)에 push, 이미지 없으면 `null`로 밀어 판독문 OCR에서 온 `hospital_measurements.bone_age` 값만 사용
- **AdminPatientGrowthChart**: BA 측정된 visit point를 주황 다이아몬드(`rectRot`) + tooltip에 BA 값 표시. "🦴 뼈나이 측정만" 체크박스로 월별 촘촘한 실측 대신 BA 측정 회차만 표시
- **VisitList**: 각 회차 row에 BA 측정된 visit만 `🦴 BA 12.3` amber 뱃지 표시 (판독문에서 실제 측정된 회차만)
- **처방 임포트 파이프라인** (`cases/`): eone 처방데이터.csv(UTF-16, 40만 행) → `parse_prescriptions.py`(MEDICINE/LAB/ADMIN/XRAY/FOLLOWUP 분류) → `insert_medications.mjs` + `insert_prescriptions.mjs`. 244명 × 19,080 처방 임포트. 매칭 로직: chart_number로 child 찾고 처방일자 기준 ±30일 내 가장 가까운 visit 연결, 없으면 새 visit 생성(`notes='Auto-created from prescription import'`, is_intake=false). 비약품 40개(X-ray 촬영 오더 `g4502` 등, 진료기록 사본)는 `cleanup_nonmed.mjs`로 제거
- **medication 코드 포맷 재설계** (`cases/recode_medications.mjs`): 이름순 정렬 후 `MED0001` / `INJ001` / `PRO001` (처방약 1,155 / 주사 43 / 시술 8). 원본 eone 코드는 `notes`에 `eone:{원본}` 보존. `round_doses.mjs`로 default_dose/dose 전부 소수점 1자리(`1.000` → `1.0`). `total=N.0` 메모는 14,837건 복원 (`restore_rx_totals.mjs`)
- **AdminMedicationsPage 리디자인**: 상태 컬럼 제거, 코드/약명 검색 박스, 카테고리 필터 탭(전체 / 처방약 / 주사 / 시술 + 개수), sticky 헤더. `fetchMedications`는 페이지네이션 반복 fetch (1,206개 전체 로드)
- **visit_images + X-ray 갤러리** (migration 011): 회차별 webp 이미지 저장. 업로드 스크립트 `cases/upload_visit_images.mjs`로 `cases/영상데이터/{chart}/{YYYYMMDD}/*.webp` 9,025개를 `xray-images` 버킷에 업로드 (Storage 키는 ASCII로 한글 sanitize, 238명 / 836 visit / 43개 새 visit 자동 생성). 서비스 `visitImageService.ts` + 컴포넌트 `VisitImageGallery.tsx` (수평 스크롤 썸네일 + ← → 스크롤 버튼 + 클릭 라이트박스 + 드래그 가능)
- **XrayPanel 갤러리 통합**: 3-column atlas 아래 `VisitImageGallery` 렌더. 썸네일을 가운데 환자 pane에 드래그&드롭 → `XRAY_IMAGE_DRAG_TYPE` dataTransfer 수신 → signed URL을 fetch로 Blob 변환 → File 생성 → 기존 `acceptFile` 경로 재사용. 드래그 후 저장 시 해당 이미지가 손 X-ray로 확정됨
- **AI 환자 분석 파이프라인** (migration 012): `patient_analyses(child_id UNIQUE, data JSONB, model, generated_at)` 테이블. ai-server에 `/api/patient-analysis/:childId` GET/POST. POST는 children + visits + measurements + prescriptions(med name 조인) + lab_tests 전체를 묶어 Gemini 2.5 Flash에 구조화 JSON 요청. 응답: `summary / problem / intervention / outcome / response_level(excellent~insufficient_data) / treatment_phase(초기/유지/마무리/종료/일회성/불명) / sub_categories / risk_flags / key_findings / growth_metrics`
- **치료 후기 xlsx seed 데이터 제외** (2026-04-24): `cases/치료 후기 케이스 정리 (정리완료).xlsx` 기반으로 `seed_treatment_cases.sql`이 넣었던 35개 측정값 + 14개 이미지 없는 xray_readings + 9개 seed 메모 삭제. 판독문 OCR 근거 없는 수기 정리 데이터는 더 이상 사용하지 않음. 향후 분석/스토리 생성도 이 xlsx 무시. 정리 스크립트: `cases/cleanup_seed_measurements.mjs`
- **PatientAnalysisModal** (`v4/src/features/hospital/components/`): AdminPatientDetailPage 좌하단 플로팅 `🧠 환자 분석` 버튼 → 모달 열기. 캐시된 분석 없으면 "분석 생성하기" 버튼, 있으면 반응도·치료단계 배지 + 서사 요약 + 처방/세부카테고리/경고/지표변화/growth_metrics 전체 표시. 재생성 가능
- **VisitList BA 회차 하이라이트**: `hospital_measurements.bone_age` 측정된 회차는 행 배경을 amber로 전환 (선택 시 `bg-amber-100 ring-amber-200`). BA 없는 회차는 기존 indigo selection
- **환자 리스트 주소/내원일 컬럼**: `AdminPatientsPage` 에 `주소` · `최초 내원` · `최근 내원` 3개 컬럼 + 정렬키 추가. `fetchPatients` 가 `visits(is_intake=false)` 페이지네이션 집계로 first/last date 계산, `intake_survey.contact.address` → `regionFromAddress()` 파싱해 region 포함. RegionBadge: 서울은 `[서울] 강남구`, 광역시·도는 단일 칩
- **주소 → 지역 파서** (`v4/src/features/admin/utils/region.ts`): 233개 실주소 중 232개 해결(99.6%). 서울 25구 + 동→구 매핑 50+, 구 축약형(마포→마포구), 도로명(선릉로·반포대로·위례광장로·천중로·성북로…), 랜드마크(한남더힐·타워팰리스·반포자이·시그니엘…), 경기 시(수원·부천·남양주·고양·하남·용인·파주·김포…) + 내부 구(영통·분당·기흥·일산동…), 충남/충북/전북/전남/경북(문경시)/경남(진주시·함안군)/강원 각 시·군, 오타(감남구→강남구), 해외(미국·필리핀·일본·중국·태국·베트남 등). 매칭 순서: 광역시도 prefix → 서울구 prefix → 서울동 prefix → 경기시 prefix → 경기구 prefix → 각도 시/군 prefix → 서울구 축약 → 경기 도로 → 서울 도로 → 랜드마크 → 부분포함
- **대시보드 한국 지도** (`PatientDistributionMap`): 좌측 17 광역시도 타일 카토그램(CSS 6×7 grid, indigo 5단계 choropleth), 우측 서울 25구 수평 bar chart(count 내림차순). `fetchRegionDistribution()` 이 children.intake_survey.contact.address 전수 집계. AdminDashboardPage 에 stat cards 아래 섹션으로 추가

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
- Phase 0-5: COMPLETE (setup, auth, core pages, content, admin)
- Phase 6: PARTIAL (meal AI working, body analysis mock)
- Phase 7: COMPLETE (hospital website redesign)
- Phase 7.5: COMPLETE (Instagram card-news redesign, per-slide templates, dnd-kit reorder, bottom tab bar, admin live preview)
- Phase 8: PARTIAL (PC admin layout, cases slide, image history, diagnosis intake form, growth chart enhancements)
- Phase 9: COMPLETE (growth guide pages, animated growth chart, banner enhancements)
- Phase 10: PARTIAL (7 treatment cases with data cleanup, predicted growth curves, allergy data, admin enhancements)
- Phase 11: PARTIAL (patient DB unification, admin clinical dashboard, X-ray panel, BA/CA dual predictions, intake survey tab)
- Phase 12: PARTIAL (VisitDetailPanel 4+1 섹션, chart_number, KR/CN 성장곡선, GrowthComparisonDiagram, 생활 습관 월간 뷰 + 카테고리 평가, 환자 추가/삭제, 사이드바 접기)
- Phase 14: PARTIAL (Lab OCR 파이프라인 — Surya + parse_eone + Supabase 임포트 / 234차트·2094이미지·804 lab_tests / LabHistoryPanel + 검사 이력 접힘 섹션)
- Phase 15: COMPLETE (판독문 OCR 전체 완료 240명 / hospital_measurements 2995건 / visits.notes 3758건 / 원본 Storage 업로드 / 환자 카테고리 8종 + 필터·정렬 / VisitDetailPanel 4탭 리팩토링 / 진료 회차별 판독문 페이지 뷰어 / lab_tests 진료 visit 재매핑)
- Phase 16: COMPLETE (처방 파이프라인 40만 행 → 19,080 처방 임포트 + 약품코드 MED/INJ/PRO 재설계 + AdminMedicationsPage 리디자인 / X-ray 회차 이미지 9,025개 업로드 + VisitImageGallery 드래그&드롭)
- Phase 17: PARTIAL (AI 환자 분석 파이프라인 — migration 012 / ai-server endpoint / PatientAnalysisModal / 수작업 1명 검증 완료. Gemini API 키 만료로 배치 실행 대기 중)
- Phase 18: COMPLETE (환자 리스트 고도화 — VisitList BA 하이라이트 / AdminPatientsPage 주소·내원일 컬럼 / region 파서 99.6% 커버리지 / 대시보드 한국 지도 타일 카토그램)
- Phase 19: COMPLETE (환자 모드 강화 — `/app/*` 전체 ProtectedRoute 보호 / 차트번호 로그인 (244명 전부 password='1234' 활성) / Layout 헤더에 "← 홈페이지" 외부 진입 버튼 / BottomNav 4탭 정리 (홈·루틴·진료기록·1:1상담) / BodyAnalysisPage → PhotoCaptureCard 흡수 / 통계 페이지는 RoutinePage 탭으로 재통합 / **RecordsPage 신규** — `features/records/` (patientRecordsService + PatientHeaderCard + BoneAgeCompareCard + VisitTimelineCard + LabDetailModal). 어드민의 PanelContent/panelTypeOf 재사용. BA 회차 PAH fallback 계산. 만나이 표시. cases/check_app_login_readiness.mjs + cases/check_lifestyle_data.mjs 진단 스크립트 추가)
- Phase 20: COMPLETE (환자 단계 분리 + 첫 상담 풀 기록 — children.treatment_status 컬럼 (migration 014, 'consultation' default, 244명 'treatment' 백필) + 어드민 헤더 수동 토글 / **BottomNav 단계별 분기**: treatment=진료기록·생활 다이어리·생활 통계·1:1상담 / consultation=홈·첫 상담 기록·1:1상담 / 치료 환자가 /app 진입 시 /app/records 자동 redirect / **HomePage 분기**: treatment→TreatmentDashboardCard(마지막 진료 N일 + quick entry) / consultation→IntakeGrowthChartCard(공포 마케팅 카드) / **ConsultationRecordView 풀 재구성** (firstConsultContent.ko 11장 슬라이드를 모바일 14 카드 스택: 187 Cover · 원장 타임라인 · 병원 진료 사진 x2 · 핵심수치 hero · 성장그래프 · 설문발췌 · MPH/PAH 방법론 · MPH 가우시안 SVG · 뼈나이 분석/아틀라스 · X-ray 모듈 안내 · 성장그래프 모듈 안내 · 원장 마무리 한마디 · 카톡 CTA) / **AdminEditorPanel 섹션 옵션에 👁️ 노출/🙈 숨김 토글** + websiteSectionService.fetchSectionsFromKey 의 visible 매핑 버그 fix / 통계 시스템 review 후 8가지 fix (식사 is_healthy 점수 반영 / 수분 1000ml 만점 / 평균 정직 표시 / 카테고리 6개로 확장(성장주사 binary 추가, 가중치 20/15/15/15/15/20) / 카테고리별 ? 모달 / 빈 상태 CTA / 일별·주별 토글) / 운동 9개 DB 마이그레이션 (`exercises` 테이블 + ExerciseCard·YouTubeModal DB fetch 전환, data/exercises.ts 삭제) / **AdminPatientGrowthChart simplified 모드** (BA 회차만 점 표시 + 클릭 시 예측키 표시 + 보라 점선 hide + tooltip 날짜 연도 포함) / 데모 환자 F9999 김철수 (consultation 단계 시연용 시드, intake_survey 풀 데이터) / Lab 칩 클릭→LabDetailModal · BA 회차 amber 하이라이트 · GrowthComparisonCard (성장 비교 default 접힘) · 진료기록 회차 필터 체크박스(메모/뼈나이/검사) · 식사 good/bad 토글)
- Phase 22: COMPLETE (홈페이지 리뉴얼 프로토타입 + 프로그램 상세페이지 통합 — **`v4/public/programs/`** 정적 HTML 7개: hormone-balance / precocious-puberty / body-proportion / obesity-growth / posture-exercise / feet-care / late-growth + 통합 원페이지 `growth-clinic.html` (sticky 케이스별 nav + 색상 분리 + 체형·발육 머지). 원본 AVIF 인포그래픽 7장에서 사진/일러스트만 잘라 `images/{slug}/*.jpg` 로 분리, 텍스트는 HTML 로 재작성 / **`v4/public/test/` 신규 홈페이지 시안** — `_shell.css/_shell.js` (fixed 상단 헤더: 작은 로고+공유 버튼, 하단 4탭 nav: 프로그램/병원/예상키/사례, 카카오 floater) + `index.html`(growth-clinic 콘텐츠) / `clinic.html`(병원·원장·시설 carousel) / `calculator.html`(LMS 예상키 계산 standalone) / `cases.html`(`/cases-embed` iframe) / **신규 React 라우트** `/cases-embed` (CasesEmbedPage) — R2 sections fetch 후 SectionCarousel 로 cases 슬라이드만 렌더, `/test/cases.html` 가 iframe 으로 사용 / **router.tsx HardRedirect** `/test`·`/test/` → `/test/index.html` (Vite SPA fallback 우회) / **HeightCalcSlide 신규 어드민 슬라이드 타입** (`websiteSection.ts` + `HeightCalcCard` + `HeightCalcSlideEditor` + AdminEditorPanel `+ 📐 예상키` 버튼) — 카드 안 입력↔결과 토글, 4:5/9:16 비율 옵션 / **SectionCarousel `initialPredictedCurve` 알고리즘 변경**: percentile-기반 projection → 첫 측정 stored `predictedHeight` 를 18세 plateau 로 사용 (BA advanced 환자에서 chart 가 stored 값과 일치)
- Phase 23: COMPLETE (`/test/` 시안 럭셔리 K-medical 재설계 — **컬러 토큰 재정의** (`_shell.css`): 보라 시그니처 #4A2D6B (heritage purple) + 카카오 노랑 #FAE100 + warm off-white #fafaf8 + warm hairline #e8e2d8 + Noto Serif KR (heading) / **헤더**: 좌측 logo + 우측 노란 "1:1 카톡 상담" pill (큼지막) + 작은 share btn / **하단 nav**: 4탭 floating pill (radius 999px, height 58px, bottom 14px, 좌우 12px 여백, soft box-shadow), 마지막 "예상키 측정" 탭은 보라 fill highlight (CTA 강조, `overflow:hidden` 으로 우측 모서리 자동 둥글림) / **첫 방문 모달**: localStorage `t.calc.modal.seen` (timestamp, 30일 만료), 광고 UTM(`utm_medium=cpc/paid/paid_social`) 즉시 600ms / 그 외 스크롤 200px or 1.5초 fallback / data-page=calc 페이지에선 skip / **모달 차트**: `drawHeightChart()` SVG 라인 — 동일 백분위 유지 곡선 + 50th median dashed + 시작/끝 점 + 나이 ticks (보라 #4A2D6B) / **`clinic.html` 카피 재작성**: 보디빌딩 자격 (IFBB Pro·USPTA) → "소아 성장 진료 10년·통합 호르몬 전문" 우선 / 인사말 "고객의 건강과 가치" → "호르몬 통합 관점으로 아이의 키 성장을 봅니다" + "10년의 진료 경험으로 함께하겠습니다" / `clinic-intro` H2 → "187 성장클리닉 — 연세새봄의원" + 본문에 "키 성장" 명시 / **`index.html`**: H1 "성장 프로그램 소개" → "**우리 아이 키, 지금 어디쯤일까요?**" / `.case-nav` sticky `top: 52px` (헤더에 안 가림) / 5개 케이스 섹션(`#obesity / #precocious / #proportion / #bodywork / #late`) 끝마다 인라인 보라 카톡 CTA (`.case-cta-inline`, 케이스별 다른 카피) / **`/calc-embed` 신규 라우트** (`CalcEmbedPage`): 기존 React `HeightCalculator` 모듈을 `embedded` prop 으로 임베드 — InfoModal 우회 + 페이지로 렌더, 결과 화면에 "다시 측정하기" 버튼 추가 / `HeightCalculator` + `HeightCalculatorResult` 에 `embedded?: boolean` prop 추가 (default false → 메인 사이트 모달 모드 그대로) / **`/test/calculator.html`** → `cases.html` 패턴처럼 `<iframe src="/calc-embed">` wrapper 로 변경 — Chart.js 메인 그래프 (5th/50th/95th 백분위 + 카운트업) 그대로 재사용 / **`cases-embed`** "키 성장 관리 사례" 섹션 통째로 노출 + 첫 진입을 케이스 #1 부터 (인트로 banner skip, swipe ←로 접근) / `_shell.js` `window.t.calc` + `window.t.lms` + `window.t.drawHeightChart` 노출 / `.t-page` `padding-bottom: 88px` (floating nav 만큼 여백) / **모달 진짜 모달화**: 기존 fullscreen `background:#fff` → `rgba(26,23,20,0.55)` backdrop + `blur(3px)` + flex center / `.t-calc` 가 panel 역할 (max-w 460, bg #fff, radius 20, max-h `calc(100dvh - 32px)` scroll, soft shadow), close btn 을 panel 안 우상단 absolute 로 이동 / **PC 적응** (≥768) `.container` (index/clinic/cases/calculator) + `.t-header` max-width 640 → **1024**, `CasesEmbedPage` inner wrap `max-w-[460px] md:max-w-[720px]` (cases 카드 PC 에서 56% 더 크게), 하단 floating nav 는 460 그대로 (모바일 pill 톤 유지) / ⚠️ 이 Phase 의 `drawHeightChart()`·`window.t.calc/lms/drawHeightChart`·`.t-calc` 모달 폼은 Phase 25 에서 폐기 — 팝업이 React `/calc-embed` iframe 으로 대체됨)
- Phase 21: PARTIAL (RAG 인프라 + UI 완성, 임베딩 배치는 사용자 액션 대기 — **migration 015** `pgvector` extension + `patient_embeddings(child_id PK, embedding vector(768), source_text)` + `coaching_cards(child_id, content_date UNIQUE, content jsonb)` + RPC `match_patient_embeddings(query_child_id, k)` cosine top-k / **ai-server endpoints**: `POST /api/embeddings/build/:childId` · `POST /api/embeddings/build-all` (배치, 0.4s 간격, skipExisting default) · `GET /api/similar-cases/:childId?k=5` (유사도 + 데모그래픽 + PAH 변화 + top medications) · `GET·POST /api/coaching/:childId` (1일 1회 캐시, 강제 재생성) / **services**: `embedder.ts` 환자 정규화 텍스트 (인구학·MPH·키 추이·뼈나이·처방·lab 강반응·메모) → Gemini text-embedding-004 → upsert / `coachingGenerator.ts` 환자 7일 패턴 + intake → Gemini → JSON {meal, sleep, exercise, summary} / **어드민 UI**: AdminPatientDetailPage 좌하단 `🔍 비슷한 케이스` 플로팅 버튼 + `SimilarCasesModal` (5장 카드: 유사도% + 키 변화 + PAH 변화 + 처방 칩 + 환자 상세 링크). 임베딩 없으면 "임베딩 만들고 다시 검색" 버튼 / **환자 UI**: RoutinePage 입력 탭 HeightWeightCard 직후 `CoachingCard` (식단/수면/운동 3개 가이드 + 격려 한 줄 + 🔄 새로 받기) / **main.tsx `vite:preloadError` 리스너** — 새 배포 후 옛 lazy chunk 404 시 자동 1회 reload (sessionStorage 가드, 무한 reload 방지) / **사용자 액션 대기**: SQL migration 015 Dashboard 실행 + `POST /api/embeddings/build-all` 244명 배치 1회 — supabase MCP 권한 차단으로 자동화 불가)
- Phase 24: COMPLETE (진료 데이터 편집 + 스토리 작성 인프라 — **진료 내역 탭 BA 직접 편집** (VisitDetailPanel `NumberField` `onLocal` 콜백 → 입력 즉시 부모 `heightDraft`/`boneAgeDraft` state push → PAH 미리보기 onBlur 전이라도 실시간 표시. onBlur 시 `upsertMeasurementField` 저장 + `syncXrayReadingBoneAge` 로 `xray_readings.bone_age_result` + `atlas_match_younger/older` NULL 처리해 X-ray 탭의 atlas 레퍼런스가 새 BA 기준으로 자동 재매칭) / **BA 단위 명시** — 라벨 "뼈나이 (소수점 년)" + 라이브 한글 환산 hint ("13.5 = 13년 6개월"). 임상 관습 "13세 2개월 = 13.2" 식 표기와의 혼동 방지. X-ray 탭 BA 입력도 동일 / **XrayPanel `defaultYoungerAge` 1순위 변경**: `thisVisitMeasurement.bone_age` 우선 → existing reading → 이전 visit → chrono. row 유무와 무관하게 진료 내역에서 BA 만 수정해도 atlas 레퍼런스가 새 BA 기준으로 매칭됨 / **AdminPatientsPage 기본 정렬** — 컬럼 헤더 미클릭 시 측정 수 desc → 동률 시 최근 내원 desc / **즐겨찾기** — `features/admin/hooks/useFavoritePatients` localStorage `admin.patients.favorites` (다중 PC sync 필요해지면 DB 이전). 테이블 첫 컬럼 + 모바일 카드 좌측 별표 토글 + 카테고리 칩 좌측 ⭐ 필터 칩 (켜면 즐겨찾기 + 카테고리 AND). 초기화 버튼이 즐겨찾기·카테고리 둘 다 해제 / **PAH 백필** — `hospital_measurements.pah` 가 거의 비어있던 상태 → `cases/backfill_measurement_pah.mjs` + `cases/lib/predict.mjs` (KR LMS) 로 BA+키 있는 row 255건 일괄 LMS 계산해 저장 (사용자 직접 입력값 보존, `--force` 로만 덮어쓰기) / **service auto sync** — `hospitalMeasurementService.syncPahForVisit` 추가: `upsertMeasurementField` 에서 bone_age 또는 height patch 가 들어오면 (사용자가 pah 명시 입력 안 했을 때) 자동으로 같은 회차 measurement 의 PAH 재계산해 DB 저장. `updateMeasurementBoneAge` (X-ray save 흐름) 도 끝에 sync 호출. 향후 신규 진료부터 화면값과 DB값 일관성 유지 / **환자 스토리 작성 인프라** (`cases/`): `PATIENT_STORY_GUIDE.md` 가이드 (톤·금지·필수 골격·BMI 호전 서브플롯·서술 순서·"처음" 단정 금지 등 규칙 누적) + `dump_patient_story_context.mjs` (가족용 추상 신호 dump, first_pah/last_pah/bmi_transition 등) + `deep_dump_patient.mjs` (작성자용 raw 임상 dump — lab flagged + 알러지 hits + 처방 카운트 + 의사 메모 등) + `upsert_patient_story.mjs` (Claude 작성 본문 → `patient_stories` 저장, model=claude-opus-4-7, source=claude) + `find_patient.mjs` / `check_raw_labs.mjs` (헬퍼) / **`generate_patient_stories.mjs` 프롬프트 재작성** — 박완서 톤, 약품명·횟수·검사 panel 본문 금지, 시술(PRO) 제외, "처음 들은 PAH ↔ 최종 PAH" 두 점만 비교 (중간 변동 묘사 금지, 임상적으로 부적절), 실제 측정 → 예상키 서술 순서 / **스토리 3건 작성**: 홍준서 (#26198 "예상키가 자라는 시간" — 뼈나이 천천히 진행) · 전하준 (#23661 "172를 넘어" — 비만 + 알러지 식이 + 사춘기 억제, 유전 172 → 180.4) · 이주열 (#26066 "한참 아래에서 한참 위로" — 빈혈+IGF-1 낮음 + 영양·수면·사춘기 억제, 166.4 → 178.4))
- Phase 25: COMPLETE (예상키 계산기 단일 소스화 + PC 적응형 — **첫 방문 팝업 iframe 리팩토링**: 과거 `_shell.js` 에 vanilla 로 포팅돼 있던 예상키 계산기(한국 KDCA LMS 하드코딩 + 자체 `drawHeightChart()` SVG)는 태국 등 다국어에서 **한국어 텍스트·한국 데이터가 그대로 노출되는 버그**가 있었음 → vanilla 계산기(LMS 배열·helper·`window.t.calc/lms/drawHeightChart` 노출 ~250줄) 전부 제거하고 팝업 모달을 `<iframe src="/calc-embed?lang={locale}">` 로 교체해 React `HeightCalculator` 단일 소스로 통일. 이제 모든 로케일이 자동으로 올바른 라벨(`calcLabels.ts`)·성장표준(th=TSPE / 그 외=KR)·메신저 CTA(th=LINE / 그 외=Kakao)를 받음 / `_shell.css`: `.t-calc`/`.t-result` 폼·결과·차트 스타일 제거 → `.t-calc-frame`(definite height 로 flex iframe 채움) + 44px 상단 바(✕ 닫기 버튼이 iframe 안 React `?` 도움말 버튼과 안 겹치게), PC `max-width:600px` / **PC 적응형**: `HeightCalculator`·`HeightCalculatorResult` 에 `md:` 반응형(텍스트 크기·패딩·`break-keep` 줄바꿈), 결과 차트는 `md:max-w-md` 로 폭 제한해 PC 에서 세로로 너무 길어지지 않게 / 팝업 자동 노출 정책(30일 만료·광고 UTM 즉시·스크롤 200px/1.5초 fallback)은 그대로 유지)
- Phase 26: COMPLETE (`/test` 시안 PC 가독성 마감 — **섹션 이름 제목화** (`index.html`): `.sec-eyebrow`(번호+섹션명, 예 "01 / 비만형 성장 관리")를 작은 kicker 가 아니라 가장 강한 헤딩으로 승격 — accent 컬러(섹션별 `--accent`) + 800 weight + 짧은 언더라인(`::after`) + 아래 `h3`(설명) 보다 크거나 같게, h3 은 서브헤드로 강등. 모바일 18→21px(640)→28px(768), h3 18→20→22px / **치료사례 PC 확대** (`SectionCarousel`): `usePcEmbedZoom(embed)` 훅 — embed(`/cases-embed`) + `min-width:768` 일 때만 카드 전체 `zoom:1.4`(`width:100/zoom%` 보정). 메인 사이트·어드민 프리뷰(embed=false)는 모바일 폭 카드 그대로 유지. `CasesBarChart` 내재 px 상향(CHART_HEIGHT 180→196, bar 52→58, 값 라벨 11→13px, 축/요약 글자 일괄 +1~2px) → 모바일도 약간 커지고 PC 에선 zoom 과 곱연산 / **이중 스크롤바 제거**: cases 페이지가 바깥페이지 + iframe문서 + 카드 3중 스크롤이던 문제 — `cases.html` `body[data-page="cases"] .t-page{height:100vh;padding-bottom:0;overflow:hidden}` 로 바깥 제거, `CasesEmbedPage` wrapper `h-screen flex flex-col overflow-hidden` + `SectionCarousel` root `h-full flex flex-col`(nav row `flex-shrink-0`) + `<section>` embed 시 고정 `aspect-[4/5]` 대신 `flex-1 min-h-0` 로 iframe 남은 높이를 꽉 채워 iframe문서 스크롤 소멸 → 활성 카드 `CasesContent`(`overflow-y-auto`) 단일 스크롤만 남김 / `clinic.html` PC 카피·여백 보강)

- Phase 27: COMPLETE (프로그램 페이지 index 첫 화면 재설계 + 1vs6 비교 이미지 — **첫 화면 흐름**: h1 "우리 아이 키, 걱정되시나요?"(불안) → INTRO h2 "제대로 관리하면, 아직 충분히 클 수 있습니다"(희망) + 본문 "187 성장클리닉 아이마다 키가 안 크는 원인부터 찾아 맞춤형 통합 관리" → **1vs6 비교 이미지** → CHECK(성장검사) → GOLDEN → HORMONE → 케이스 5 → PROCESS → DIRECTOR / **비교 이미지 lang 분기 (배열 트릭)**: render.mjs 에 `{{#if}}` 없어 `compare` 를 배열로 — ko `[{img_alt}]` 1개 → `{{#each compare}}` 가 헤드라인 없이 `compare-1vs6.webp` full-img 렌더, th/vi/en `compare: []` 빈배열 → 섹션 통째 미렌더(404 없음). webp 는 일단 4개 언어 폴더에 ko 한글 이미지 복사(`programs/images/{lang}/growth-hormone-balance/compare-1vs6.webp`), 각국 번역 이미지는 추후 yml `[{img_alt}]` + 폴더 교체로 활성화 / **medal(모델 에이전시 지정) 섹션 제거** — 비교 직후 흐름 단절 방지 / **헤딩 위계**: 섹션명 9개 `.sec-eyebrow` `<div>`→`<h2>` (시각 동일, h1→h2→h3 정상화 — 스캔·접근성·SEO) / **CTA 중간 배치**: `cta_global` 에 `check_cta`·`bottom_heading`·`bottom_label` 추가 — CHECK 자가진단 직후 인라인 CTA(`data-source=check_selfcheck`) + 페이지 끝 `.cta-bottom`(DIRECTOR 뒤, 제목+버튼만) 신규. 기존 케이스 5개 인라인 CTA 와 합쳐 위·중·아래 배치 / **CHECK 제목 정리**: eyebrow "우리 아이에게 성장 검사가 필요할까?"(질문) + heading "이런 경우라면 고려해볼 수 있어요"(답)로 "성장 검사" 중복 제거 / **미사용 CSS 정리**: 텍스트 카드 시절 `.compare-intro`·`.ccol*` 제거, `.compare-img` 여백만 유지 / 4개 언어 모두 적용. 빡센 멀티에이전트 리뷰(7 렌즈 — 메시지/전환/규정/신뢰/타겟/UX/SEO) 후 규정·증거(=cases·clinic 페이지 담당)는 빼고 논리흐름·UI/UX 만 반영)
- Phase 28: COMPLETE (프로그램 페이지 글 흐름 2차 정리 — 독립 서브에이전트 흐름 리뷰 후 채택분만 반영 / **HORMONE 섹션 슬림화 + 통합 메시지 집결**: INTRO 본문에서 "통합 관리" 제거(불안→희망 도입만), 1-vs-6 비교 이미지를 INTRO 아래에서 **HORMONE 섹션 안(헤딩 아래)으로 이동** → 통합 얘기를 HORMONE 한 곳에 모음. **중복 이미지/섹션 제거**: `solution-diagram.jpg`(6각형 6아이콘 — 1-vs-6 오른쪽 절반과 100% 동일)와 "호르몬 밸런스 3가지 핵심 관리" features 블록(케이스 섹션과 중복) 둘 다 삭제, HORMONE = 헤딩 + lead + 1-vs-6 만 / **카피 교정**: HORMONE 헤딩 "성장호르몬만 보는 치료가 아닙니다 / 키 성장을 **다방면으로 관리합니다**"(명사구 dangling 제거), lead 브랜드 "연세새봄"→"187 성장클리닉" · "평가"→"관리" · "…자세 등 다양한 요인을"(나열 외 더 많은 항목 암시) / **CTA 위계 재배치 (#2)**: CHECK 직후 CTA를 강한 상담→**무료 예상키 측정**(`/{lang}/calculator.html` 내부 링크, 보라, `data-source` 없음 → `consult_click` 오염 방지)으로 톤다운, **통합관리 차별화 직후 강한 상담 CTA(`hormone_consult`) 신설**(신뢰 형성 지점) / **최종 CTA 강화 (#5)**: `.cta-bottom` 에 보라 primary "예상키 무료 측정하기"(계산기) + 메신저 secondary 2버튼 + `bottom_sub` 추가, heading "원인부터 찾는 통합 관리, 지금 시작하세요" — 본문에 없던 핵심 무기 "예상키 무료 측정"을 클로징에 투입 / **레이아웃**: 히어로 이미지를 제목 아래→INTRO 텍스트 뒤로 이동(불안→희망 말 흐름 뒤 시각 보상), `t-masthead` 하단 hairline 제거 + `.t-masthead + .intro` 위 패딩 축소, 전 섹션 `.sec-eyebrow` 확대(18→22 / 21→25 / 28→32px), "통합 성장 관리" 위에 187 로고(`.section-logo`, 비한국어 자동 `logo_en` swap) / **미국(en) 메신저**: WhatsApp 으로 가기로 결정했으나 번호 미수령 → 일단 Kakao 유지(`messenger.yml` en, 활성 언어라 TBD 불가). 1-vs-6 모바일 세로 재배치는 사용자가 새 이미지 제작 예정 / 4개 언어 모두 적용)
- Phase 29: COMPLETE (치료사례 그래프·마무리 멘트 소비자 친화화 — **공용 `GrowthChart` 에 `showPercentiles`(기본 true)·`yMin` prop 추가**: 치료사례(`SectionCarousel`·`CaseDetail`)만 `showPercentiles={false}` 로 5th/50th/95th 곡선+라벨박스+하단범례 통째 제거(뼈나이·실제나이와 백분위가 겹쳐 소비자 혼란), `yMin={120}` 으로 y축 120 시작. 환자앱 차트(상담기록/홈카드/루틴모달)는 prop 미전달 → 백분위·자동스케일 유지. 예측키 계산기(`HeightCalculatorResult`)는 자체 Chart.js 라 무관 / **"현재 예상 성장"(주황) 곡선 ease-out 스무딩**: 뼈나이 백분위를 표준 행에 nearest-snap 투영해 계단식으로 울퉁불퉁하던 것을, 회색 초진곡선과 동일하게 마지막 측정점→`lastWithBone.predictedHeight`(임상 저장 현재예상키) 로 ease-out(1-(1-t)^1.8). 안 쓰게 된 `heightStandard` state+`growthStandard` import 정리 / **마무리 멘트 화자=의사**: `casesLabels.finalMemo` "🎉 마무리"→"🩺 원장 소견"(en/th/vi 동일). 의료광고법 제56조상 보호자 치료경험담은 금지 리스크 → 의사 진료관점 서술이 안전(효과 보장·단정 회피, 결과는 차트 측정값이 말하게). 멘트 본문은 케이스별 데이터라 어드민 입력)
- Phase 30: COMPLETE (성장 그래프 예측키 추세 탭 — admin 환자상세·환자앱 진료기록 성장 그래프에 `[성장 곡선][예측키 추세]` 탭. **예측키 추세**(신규 `PredictedHeightTrend`): 예측키(키+뼈나이 18세 예측) 라인 한 줄 + X축 아래 측정날짜/만나이/뼈나이/Δ(뼈−만, 조숙 +빨강·지연 −초록), 호버 툴팁 없음, Chart.js Y축 폭(`afterFit`) 고정으로 아래 HTML 행과 정렬. **성장 곡선** 탭은 `AdminPatientGrowthChart` 에 `defaultHidePrediction` prop 추가 → 예측키(baProj) 곡선 기본 off(상단 `BA 예측` 칩으로 켜기), `simplified`(환자앱)·첫상담은 미영향(prop 안 줌). 추가 조정: `baOnly`(뼈나이 측정만) 기본 ON·Y축 90~190(`Y_MAX` 185→190), AdminPatientDetailPage 좌하단 `🔍 비슷한 케이스`/`🧠 환자 분석` 플로팅 버튼 숨김(모달·state 보존, JSX 주석). 환자앱은 RecordsPage treatment 뷰만(consultation 제외). plan: `docs/superpowers/plans/2026-06-02-growth-chart-predicted-trend-tab.md`)
- Phase 31: COMPLETE (진료내역 측정 UX 정리 + 뼈나이 양방향 동기화 + 판독문 라이트박스 네비 — **뼈나이 입력 = 년/개월 2칸**(공용 `shared/utils/boneAge.ts` `splitBoneAgeYM`/`parseBoneAgeDec`, 진료내역 측정칸 + X-ray 탭 동일). 측정칸 표시값을 헤더와 같은 `effectiveBoneAge`(=liveXray ?? draft ?? m.bone_age)로 통일해 X-ray·판독문에서 온 BA도 보이게 함. **0년 0개월 → null(미측정)**: `parseBoneAgeDec` 가 0 을 null 로 반환 + `boneAgeTouched` 플래그로 "안 건드림"과 "0,0 으로 지움" 구분 → 명시적으로 BA 비우기 가능(그래프 BA점·예측키추세에서 빠짐) / **측정 섹션 명시적 "저장" 버튼**: 키·몸무게·뼈나이 자동(blur) 저장 끄고(`NumberField`/`BoneAgeYMField` `autoSave` prop) 한 번에 저장(`upsertMeasurementField` 멀티필드 patch) + `✓ 저장됨` 배지. 입력 중엔 PAH 미리보기만 실시간 / **뼈나이 양방향 동기화**: 진료내역 BA 저장 → `syncXrayReadingBoneAge`(xray_readings) + `onMeasurementChanged`/`refreshData`(그래프). **X-ray `handleSave` 에 `upsertMeasurementField({bone_age})` 추가** → X-ray 에서 BA 확정 시 hospital_measurements·PAH·그래프까지 동기화(기존엔 xray_readings 만 써서 누락됐던 버그 fix) / **헤더 CA + 예측키추세 X축 = 년/개월 표기**(CA `14세 6개월`, 만/뼈 `세 개월`, Δ `+8개월`·`-1년 4개월`) / type=number 스피너 화살표 제거(측정·X-ray 입력 전부), 측정 그리드 폭 재배분(`[3fr_3fr_6fr_4fr]` + input `w-full min-w-0` — 너비 없던 input 이 컬럼 못 줄이던 문제 fix) / **판독문 원본 라이트박스**: 전체 보기에서 ←/→ 키 + 좌우 ‹ › 버튼으로 **이 환자의 전체 회차 판독문**(`raw_files.pandokmun` 전수) 넘겨보기 + Esc/배경 닫기 + 카운터·파일명. 회차당 1장뿐이어도 이동 가능)
- Phase 32: COMPLETE (X-ray 뷰 상태 저장·복원 — 환자 X-ray 이미지의 **줌 배율·패닝 위치·빨간 펜 마킹**(일반/확대 뷰 각각)을 `xray_readings.view_state jsonb`(migration 016)에 저장해 다음에 열 때 그대로 복원. **좌표 0~1 정규화**(`ZoomableImg` 의 `normStrokes`/`denormStrokes` + offset 비율) → 화면·모달 크기가 달라도 마킹 위치 일치. `ZoomableImg` 에 `initialViewState`(마운트 시 복원, 컨테이너 측정될 때까지 ResizeObserver 로 1회 적용) + `onViewStateChange`(줌/패닝/그리기/지우기 시 **600ms 디바운스 자동 저장**, `interactedRef` 로 첫 조작 후부터) prop 추가. 인라인 패널 + 확대 모달 둘 다 복원·저장(같은 view_state 공유, 정규화라 양쪽 크기 차이 무관). 서비스 `updateXrayViewState(visitId, vs)` 는 판독 row 없으면(이미지 미저장) no-op + 컬럼/오류 시 throw 안 함 → migration 미적용이어도 뷰어 정상 동작. `handleViewStateChange` 가 로컬 `existing.view_state` 도 갱신해 같은 세션 모달 재오픈 시에도 최신 마킹 복원. **migration 016 수동 실행 필요**(MCP 권한 차단))
- Phase 33: COMPLETE (어드민 환자 화면 정리 + 성장 그래프 확대 — **X-ray 탭 '없음' 뱃지 버그 fix**: presence probe(`hasXrayImage`)가 `[visit.id]`에서만 돌아 이미지 저장 후 갱신 안 되던 것 → X-ray `onSaved` 시 `xrayRefreshKey` bump + probe 가 그 키에 의존하게 해 저장 직후 재조회 / **헤더·사이드바 정리**: AdminLayout 좌상단 "187 성장케어/관리자 대시보드" 텍스트 → 로고 이미지(`/images/logo.jpg`). 환자 헤더에서 로고·만나이·"보호자 …(placeholder)" 제거, 성별·생년월일을 이름 옆 한 줄로(父/母 키만 아래 작게). 미사용 `calculateAge`/`parent` state 정리 / **진료내역 헤더**: 날짜만 남기고 `CA/BA/PAH` 칩 제거(`chronoAge` 정리) / **성장 그래프 확대 모달**: 차트 패널 우상단 `⤢` 버튼 → `ZoomModal`(min(1400px,96vw)×82vh)로 확대. 모달 안에도 `[성장 곡선][예측키 추세]` 탭(`chartTab` 공유)으로 전환. `AdminPatientGrowthChart`/`PredictedHeightTrend` 에 `enlarged` prop 추가 → 확대 시 축 제목·눈금 폰트(12→16/11→14) + 예측키추세 X축 아래 라벨(10→15px)·점·Y축폭 키움. 인라인 뷰는 기존 크기 유지)

- **마케팅 ContentFlow 포팅 (진행 중)**: `/marketing`(PIN `8054`) 별도 섹션에 ContentFlow(별도 Next.js 앱 `C:\projects\ContentFlow\contentflow`, Supabase 별개 `hpjvtphijdaketuqtpep`)의 마케팅 도구를 native 내재화. **ContentFlow 사이드바 구조 미러**(설정/오가닉[키워드·콘텐츠·발행]/성장[모니터링]/유료[광고]/분석[사이트·채널·경쟁사]/전략). 완료: Phase1 콘텐츠허브(전략HTML 8종 iframe뷰어+키워드72+주제78 정적) → SP1 설정폼(`marketing_config` 016) → SP3a 블로그AI생성(ai-server `/api/marketing/generate-article` Gemini + `marketing_articles` 017) → R0 ContentFlow 구조재정렬(미구축은 `MarketingPlaceholder` 준비중). **진행중: R1 키워드 라이브**(ai-server `keywordSearch.ts` 네이버HMAC+DataForSEO + `/api/marketing/{naver,google}-keywords`, `marketing_keywords` 018, IdeasPage 3탭). ai-server(`@/features/marketing/*`, `src/routes/marketing.ts`). 외부키는 ai-server `.env`만(NAVER_*·DATAFORSEO_*·GEMINI). 상세·resume·게이트는 memory `marketing_contentflow_port.md` + `docs/superpowers/{specs,plans}/*marketing*`. ⚠️ Gemini키 만료·migration 016~018 수동적용·전부 로컬 미푸시.

## Remotion (Instagram Reels)
- **Directory**: `./remotion/` — Remotion 4 + TypeScript
- **Purpose**: Height prediction feature showcase reels (9:16)
- **Compositions**:
  - `HeightReels` (한국어 예측키 데모), `HeightReelsTH` (태국어 예측키 데모) — 24.5초
  - `HeightReelsTHPromo` / `HeightReelsKRPromo` (병원 홍보, 800프레임 ~26.7초) — 동일 구조 다른 로케일. 흐름: 예측키 측정(Hook→Input→Result) → **원장+실적+병원 슬라이딩 합친 씬(ClinicScene)** → 아역배우 사례(CasesScene) → 홈페이지/메신저 CTA(CtaPromoScene)
  - `HeightReelsKRMarketing` (마케팅 풀 퍼널, **6컷 735프레임 ~24.5초**, KR) — 인-릴 측정 데모(Hook/Input/Result)·CasesScene 제거하고 브랜드/신뢰 퍼널로 슬림화. 흐름: **S1 FearIntro**(2단계 교차 페이드 "아이 키가 고민이신가요?"→"지금이 바로 골든타임") → **S2 ClinicScene marketing**(상단 187 로고 + Korea 배지 + 원장 + 1,000+/**95% 치료성공률** + **실제 환자 국적 국기 5개 🇰🇷🇹🇭🇲🇾🇮🇩🇺🇸** + 병원 슬라이딩 + "아시아 최고의 성장 클리닉") →[slide]→ **S3 VsScene**(단순 주사 vs 통합 6가지 **세로 리스트**, 펀치 "성장호르몬 하나만 보지 않습니다…") → **S4 DirectorGridScene** 🆕(진료·학부모 강연 2×3 바둑판 + "세계 곳곳 아이들의 꿈을 부모와 함께 키웁니다") → **S5 CelebScene**(한 문장 "각국에서 배우·가수·운동선수를 꿈꾸는 아이들이 다녀갔습니다" + **실제 아이 사진 3×2 그리드**) → **S6 CtaPromoScene**(예측키 무료 측정 홈페이지 안내 + 카톡). 퍼널 순서: 불안→권위(S2)→차별화(S3)→감성(S4+S5)→행동(S6) / **남은 에셋(HAS_IMG·placeholder)**: S1 `images/fear-1.jpg`, S3 `images/vs/` 아이콘 7종, S4 `images/director/act-1~6.jpg`, S5 `images/celeb/kid-1~6.jpg`. 국기는 flagcdn PNG(`images/flags/`) — 이모지 국기는 헤드리스 렌더에서 깨짐 / **상세 스토리보드 HTML**: `remotion/storyboard/kr-marketing-storyboard.html`(씬별 비주얼·자막·나레이션·AI 프롬프트). 카피 원칙은 `memory/marketing_reel_kr.md` 참조
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
  cd remotion && npx remotion render src/index.ts HeightReelsKRMarketing out/reels-kr-marketing.mp4 # KR marketing reel (8씬 풀 퍼널)
  ```
- **Add new language**: 1) `texts.ts` 의 `LocaleTexts` 에 값 추가 2) `HeightReelsKRPromo.tsx` 복사 → `setLocale()` 변경 3) `Root.tsx` 에 Composition 등록

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
- Remotion details: see `remotion/` (scenes, components, locale)
