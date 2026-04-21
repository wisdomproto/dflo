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
- VisitDetailPanel: 측정 · X-ray · 검사(Lab) · 처방 · 생활 습관 (진료 전 30일) 세로 섹션, X-ray onLiveChange → 측정 섹션 뼈나이/PAH 동기화 (측정은 read-only, `?` 툴팁)
- VisitDetailPanel X-ray/Lab 섹션 접기: 헤더 ▾/▴ 토글, 데이터 없으면 기본 접힘 (`hasXrayImage === false` / `labFileCount === 0`), 요약 배지 "이미지 없음" / "첨부 N"
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
- **검사 이력 (LabHistoryPanel)**: AdminPatientDetailPage 접힘 섹션, 첫 상담·기본 정보와 3자택1. panel_type별 전용 렌더 (혈액=이상수치 강조+전체 toggle / IgG4·MAST=Class≥1 정렬 / NK=값+배지 / 유기산=카테고리별 flag / 모발·첨부=파일 목록), panel 필터 칩
- lab_tests.test_type CHECK는 기존 3종 유지 (`allergy|organic_acid|blood|attachment`) — 신규 panel은 `result_data.panel_type`에 식별자 저장. migration 008 은 CHECK 확장 SQL 파일만 준비 (수동 적용 대기)
- fetchPatients 배치 쿼리: 239명 × 3 round-trip을 `in('id', parentIds)` + `in('child_id', childIds)` 로 합쳐 총 3 쿼리로 축소

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
