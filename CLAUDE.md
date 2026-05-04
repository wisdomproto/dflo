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
cd v4 && npm run build        # Production build
cd v4 && npx tsc --noEmit     # Type check
cd ai-server && npm run dev   # AI server (port 3001)
```

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
- Admin sidebar: collapsible (localStorage `admin.sidebar.collapsed`), 64px rail
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

## Remotion (Instagram Reels)
- **Directory**: `./remotion/` — Remotion 4 + TypeScript
- **Purpose**: Height prediction feature showcase reels (9:16, ~24.5s)
- **Compositions**: `HeightReels` (한국어), `HeightReelsTH` (태국어)
- **Locale system**: `src/lib/texts.ts` — add new language → create composition → render
- **Commands**:
  ```bash
  cd remotion && npx remotion preview        # Preview
  cd remotion && npx remotion render HeightReels out/reels.mp4      # Korean
  cd remotion && npx remotion render HeightReelsTH out/reels-th.mp4 # Thai
  ```
- **Add new language**: 1) Add translations in `texts.ts` 2) Copy `HeightReelsTH.tsx` → change `setLocale()` 3) Add Composition in `Root.tsx`

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
- Remotion details: see `remotion/` (scenes, components, locale)
