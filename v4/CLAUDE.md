# v4 Frontend Guide

## Project Structure (src/)
```
app/              # App.tsx, router.tsx
stores/           # Zustand stores (authStore, childrenStore, uiStore)
shared/
  components/     # Layout, BottomNav, Modal, Card, Toast, ChildSelector,
                  # LoadingSpinner, GenderIcon, GrowthChart, MeasurementTable,
                  # SwipeableSection
  lib/            # supabase.ts, logger.ts, storage.ts
  types/          # All TypeScript interfaces (index.ts)
  utils/          # age.ts, growth.ts, date.ts, gender.ts, image.ts
  data/           # growthStandard.ts (WHO LMS data)
  services/       # aiService.ts (client-side AI proxy)
features/
  auth/           # LoginPage, ProtectedRoute, AdminRoute
  children/       # ChildFormModal (+ desired_height field), childrenService
  growth/         # measurementService (hospital_measurements CRUD)
  hospital/       # services/ visitService, hospitalMeasurementService (+upsert),
                  #   medicationService, labTestService, prescriptionService,
                  #   intakeSurveyService (updateChildField, updateIntakeSurvey)
                  # components/ VisitList (inline inputs, collapsible rail, lab upload),
                  #   XrayPanel (atlas matching, drag/paste/pick, editable BA, predicted adult),
                  #   AdminPatientGrowthChart (BA+CA dual projection, per-visit highlight),
                  #   VisitsTimeline, VisitForm, MeasurementEditor,
                  #   LifestyleSummary, LabTestsBlock, AllergyLabEditor,
                  #   FreeformLabEditor, MedicationPicker, PrescriptionsBlock
                  # components/intake/ IntakeSurveyPanel (기본 정보 tab root),
                  #   IntakeBasicInfoSection, IntakeGrowthHistoryTable (TSV paste),
                  #   IntakeFamilySection, IntakeMedicalSection, IntakeCausesSection
  bone-age/       # lib/ types, atlas, matcher, growthPrediction, growthStandard
                  # components/ PatientForm, XrayUpload, XrayPreview, MatchResultView,
                  #   BoneAgeInput, PredictionResult, BoneAgeChart, BoneAgeTool
                  # services/ xrayReadingService (+fetchVisitIdsWithXray)
  routine/        # routineService, CalendarView, GrowthModalContent
                  # Cards: SleepCard, MealCard, ExerciseCard, SupplementCard
  content/        # contentService, useHomeContent hook
                  # SwipeCards: GrowthGuideSwipeCard, RecipeSwipeCard, GrowthCaseSwipeCard
                  # Details: RecipeDetail, CaseDetail, GuideDetail, CasePredictionBadge
  meal/           # MealCard, MealAnalysisSection, mealService
  exercise/       # ExerciseCard, YouTubeModal, exercises data
  admin/          # AdminLayout, ImageUploader, adminService (+fetchRegionDistribution)
                  # components/ PatientDistributionMap (17 시도 타일 카토그램 + 서울 구 bar chart)
                  # utils/ region.ts (주소 → Region 파서, 99.6% 커버리지)
  website/        # Public hospital website (연세새봄의원 리뉴얼)
    components/   # HeroBanner, WebsiteHeader/Footer/Layout, WebsiteSlider,
                  # HeroSection, TrustStats, HeightCalculator/Result,
                  # ProgramSlider, GrowthGuideSlider, RecipeSlider, ExerciseSlider,
                  # CaseSlider, CaseDetailModal, YouTubeModal,
                  # InfoModal, AboutModal, FloatingButtons, LocationModal, HoursModal
    pages/        # WebsiteHomePage, ProgramDetailPage, AdminBannerPage
    data/         # programs.ts (7 growth programs)
    assets/       # Hospital images
pages/            # HomePage, RoutinePage, BodyAnalysisPage, InfoPage
  admin/          # AdminDashboardPage, AdminPatientsPage, AdminPatientDetailPage,
                  # AdminVisitNewPage, AdminVisitDetailPage, AdminBoneAgePage,
                  # AdminMedicationsPage, AdminImportPage
scripts/
  create_admin.mjs, setup_storage.mjs, upload_growth_cases.mjs
  migrations/     # 000_initial_schema.sql, 001_permissive_clinical_writes.sql,
                  #   002_add_desired_height.sql + README
  seeds/          # seed_treatment_cases.sql (7 patients, 48 visits),
                  #   seed_xray_atlas_matches.sql (47 xray readings)
```

## Database Tables

### Identity
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, name, phone, role, password | role: 'parent' \| 'doctor' \| 'admin' |
| `children` | id, parent_id, name, gender, birth_date, father_height, mother_height, desired_height, grade, class_height_rank, intake_survey (jsonb) | Every child is a patient; intake_survey holds paper-form Q4/Q9~Q16 |

### Hospital data (doctor-entered, visit-centric)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `visits` | id, child_id, visit_date, doctor_id, chief_complaint, plan, notes | Hospital-data hub |
| `hospital_measurements` | id, visit_id, child_id, measured_date, height, weight, bone_age, pah | One per visit |
| `xray_readings` | id, visit_id, child_id, xray_date, image_path, bone_age_result, atlas_match_younger/older | Atlas-matched, storage: `xray-images` |
| `lab_tests` | id, visit_id, child_id, test_type, result_data jsonb, attachments jsonb | allergy \| organic_acid \| blood \| attachment |
| `medications` | id, code, name, default_dose, unit, is_active | Drug master (admin CRUD) |
| `prescriptions` | id, visit_id, child_id, medication_id, dose, frequency, duration_days | Per-visit prescriptions |

### Lifestyle data (patient-entered)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `daily_routines` | id, child_id, routine_date, sleep_time, wake_time, water_intake_ml, basic_supplements[], growth_injection | Daily log |
| `meals` | id, daily_routine_id, meal_type, meal_time, description | breakfast/lunch/dinner/snack |
| `meal_photos` | id, meal_id, photo_url | Storage: `meal-photos` |
| `meal_analyses` | id, meal_id, menu_name, calories, carbs, protein, fat, growth_score, advice | AI analysis |
| `exercise_logs` | id, daily_routine_id, exercise_name, duration_minutes, completed | Exercise logs |

### Content (admin-managed)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `exercises` | id, category, name, youtube_url, order_index, is_active | Reference library |
| `recipes` | id, title, image_url, is_published, order_index | Recipes |
| `growth_guides` | id, title, image_url, content, is_published, order_index | Guides |
| `growth_cases` | id, chart_number, patient_name, gender, is_published | Website treatment cases |

## Storage Buckets
- `content-images` (public, 5MB) — guides/recipes/cases + lab attachments
- `meal-photos` (public, 5MB) — patient meal uploads
- `xray-images` (PRIVATE, 10MB) — PHI, signed URL only

## DB Column Naming
- `users`, `children`, `exercises`, `medications`: use `is_active`
- `recipes`, `growth_guides`, `growth_cases`: use `is_published`

## Schema & Migrations
- Fresh-project setup SQL: `v4/scripts/migrations/000_initial_schema.sql`
- Permissive writes for anon: `001_permissive_clinical_writes.sql`
- Desired height column: `002_add_desired_height.sql`
- Intake survey columns: `003_children_intake_survey.sql`
- Seeds: `v4/scripts/seeds/seed_treatment_cases.sql`, `seed_xray_atlas_matches.sql`

## Admin Patient Detail
- **Tabs**: `?tab=info` (기본 정보) / `?tab=visits` (진료 기록, default)
- **기본 정보 tab**: `IntakeSurveyPanel` — 5 sections
  - Basic info (children columns: name/birth/parent heights/grade/class_rank/...)
  - Growth history table (8~16세, TSV paste modal, delta auto-calc)
  - Family/interest (Q9/Q10/Q12/Q13 yes-no + sports event)
  - Medical/development (Q14 chronic conditions, Q15 Tanner 1-5)
  - Short stature causes (Q16 multi-select chips + free-text)
- **진료 기록 tab — 3-Column Layout**
  - **Left**: Visit list — inline height/weight inputs, collapsible rail, CA/BA/PAH display, lab file upload (drag/paste/pick)
  - **Center**: X-ray panel — younger/patient/older atlas, ↑↓ step, editable bone age, predicted adult height, drag&drop/paste/file-pick
  - **Right**: Growth chart — KDCA 2017 percentiles (40% alpha), BA + CA dual projection curves, per-visit highlight, toggle chips
  - Grid: visits `minmax(220px, 1fr)` | X-ray `360px/44px` | chart `60%`
  - Chart: BA 예측 (indigo dashed) + CA 예측 (teal dashed) + solid horizontal lines at predicted adult heights

## Admin Access
- **App admin**: `admin@187growth.com` / `admin187!` (routes: `/admin/*`)
- **Cases parent**: `cases@187growth.com` / `cases187!` (7 treatment case children)
- **Banner admin**: PIN `8054` (route: `/banner-admin`, sessionStorage)

## App Navigation (login required, mounted under `/app`)
모든 `/app/*` 라우트는 `ProtectedRoute` 로 보호됨. 환자는 차트번호 + 비밀번호 (기본 `1234`) 로 로그인.

**환자 단계별 BottomNav 분기** — `selectedChild.treatment_status` 기준
- **`treatment` (치료 중)**: 진료기록(📋) / 생활 다이어리(📔) / 생활 통계(📊) / 1:1상담. `/app` 진입 시 `/app/records` 로 자동 redirect.
- **`consultation` (상담만 한 환자)**: 홈(🏠) / 첫 상담 기록(📋) / 1:1상담. 마케팅 + 데이터 기반 공포 카드로 치료 시작 유도.

| Route | Page | 노출 단계 |
|-------|------|----------|
| `/app` | HomePage (단계별 분기 — IntakeGrowthChartCard 또는 redirect) | consultation |
| `/app/records` | RecordsPage (treatment→진료 회차 타임라인 / consultation→`ConsultationRecordView` 풀 14카드) | both |
| `/app/routine` | RoutinePage (생활 다이어리, 입력 전용 — 통계 분리됨) | treatment |
| `/app/stats` | StatsPage (월별 통계, 6 카테고리 + 일별/주별 토글) | treatment |
| `/app/info[/*]` | 성장가이드 / 레시피 / 케이스 (탭 없음, 홈에서 진입) | consultation |
| 1:1상담 | (외부) 카카오톡 https://pf.kakao.com/_ZxneSb | both |

**`treatment_status` 의사 수동 토글** — AdminPatientDetailPage 헤더 좌측 `[상담][치료]` 버튼. 즉시 저장. `migration 014` 의 자동 백필 (visits 1건 이상 → treatment) 결과 244명 전원 `treatment` 로 시작.

**헤더** (Layout.tsx): 로고(앱홈으로) + ← 화살표 + "홈페이지" pill 버튼(공식 사이트로 빠져나가는 동선) + 톱니바퀴(콘텐츠 관리 PIN) + 햄버거(로그아웃).

## Website Navigation (public, root)
| Route | Page |
|-------|------|
| `/` | WebsiteHomePage (KR 랜딩페이지) |
| `/program/:slug` | ProgramDetailPage (7개 프로그램) |
| `/guide`, `/guide/:cardId` | GrowthGuidePage / Detail |
| `/diagnosis` | IntakeDiagnosisPage (AI 진단 intake) |
| `/banner-admin` | AdminWebsitePage (PIN 보호) |

## Legacy Route Redirects
router.tsx has `<Navigate>` entries for the pre-restructure paths so old bookmarks and banner `cta_target` values in R2 keep working:
- `/website` → `/`, `/website/program/:slug` → `/program/:slug`, `/website/guide[/*]` → `/guide[/*]`, `/website/diagnosis` → `/diagnosis`, `/website/admin` → `/banner-admin`
- `/routine` → `/app/routine`, `/info[/*]` → `/app/info[/*]`
- `/body-analysis` & `/app/body-analysis` → `/app/routine` (체형 분석 페이지는 `PhotoCaptureCard` 로 흡수됨)
- `/app/stats` → `/app/routine` (통계 페이지는 RoutinePage 안 탭으로 통합됨)

## AI Features
- **Meal analysis**: WORKING - photo → compress → Gemini analyze → DB save
- **Body analysis**: MOCK - placeholder, needs Gemini integration
- **RAG chatbot**: DEFERRED

## Refactoring History
- AdminContentPage: removed (content authoring dropped from admin)
- AdminPatientDetailPage: 3-column redesign with inline editing
- RoutinePage: 402→~200 lines (extracted cards)
- HeightCalculator: 336→~120+170 lines (form/result split)
- BodyAnalysisPage: deleted, condensed into `features/routine/components/PhotoCaptureCard.tsx` and embedded at the bottom of RoutinePage's input tab.

## RAG (Phase 21, 인프라+UI 완성·임베딩 배치 대기)

**A. 의사 보조 — 비슷한 케이스 검색**
- migration 015 (수동 실행 대기): pgvector + `patient_embeddings(child_id PK, embedding vector(768))` + RPC `match_patient_embeddings(query_child_id, match_count)` (cosine top-k).
- ai-server: `services/embedder.ts` 가 child 의 인구학·MPH·키 추이·뼈나이·처방 패턴·lab 강반응·메모를 한국어 brief 텍스트로 정규화 → Gemini `text-embedding-004` (REST 직접 호출) → upsert.
- endpoints: `POST /api/embeddings/build/:childId` · `POST /api/embeddings/build-all` (skipExisting, 0.4s 간격) · `GET /api/similar-cases/:childId?k=5` (유사도% + 환자 demographics + 첫·마지막 키/PAH + 처방 top-5).
- 어드민 UI: AdminPatientDetailPage 좌하단 `🔍 비슷한 케이스` 플로팅 버튼 (기존 `🧠 환자 분석` 위) → `SimilarCasesModal` (5장 카드: 유사도/키 변화/PAH 변화/처방 칩/환자 상세 링크). 임베딩 없을 때 "임베딩 만들고 다시 검색" fallback 버튼.

**B. 환자 코칭 — 식단/잠/운동 가이드**
- migration 015: `coaching_cards(child_id, content_date UNIQUE, content jsonb)` — 1일 1회 캐시.
- ai-server: `services/coachingGenerator.ts` 가 child + 최근 7일 daily_routines(meal/sleep/water/injection 평균) + intake → Gemini 2.5 Flash → `{meal, sleep, exercise, summary}` JSON.
- endpoints: `GET /api/coaching/:childId` (오늘 캐시 또는 자동 생성) · `POST /api/coaching/:childId` (강제 재생성).
- 환자 UI: RoutinePage 입력 탭 HeightWeightCard 직후 `CoachingCard` (3개 가이드 카드 + 격려 한 줄 + 🔄 새로 받기). 매일 1회 자동 호출.

## features/records/ — 환자용 진료기록 (NEW)
환자가 병원에서 측정·진료받은 read-only 데이터를 모바일 친화적으로 보여주는 새 영역.
`treatment_status` 에 따라 RecordsPage 가 두 가지 뷰로 분기.

**공통**
- `services/patientRecordsService.ts` — 한 child 의 visits + measurements + prescriptions(medication name 조인) + lab_tests + xray_readings 를 한 번에 fetch 하는 `fetchPatientRecords(childId)` 함수. is_intake 가상 visit 제외.

**치료 환자 뷰** (`treatment_status='treatment'`) — RecordsPage 정상 흐름
- `components/PatientHeaderCard.tsx` — 그라데이션 헤더 + 이름·생년월일·만나이 한 줄 + 차트번호 + 진료/뼈나이/처방/검사 4-stat + 최초/마지막 진료일.
- `components/GrowthComparisonCard.tsx` — "📊 최종 예측키 변화 ±N cm" (default 접힘). 펼치면 어드민 `GrowthComparisonDiagram` 3 픽토그램 (초기 키 / 최초 예측 / 최종 예측). BA 측정 ≥2 일 때만.
- `components/BoneAgeCompareCard.tsx` — "🦴 뼈나이 / 예측키" 3 그리드 (실제 나이 / 뼈나이 / 예측키) + 친근한 한 줄 해석 + 이전 측정 펼침 (회차별 예측키 포함).
- `components/VisitTimelineCard.tsx` — 회차 카드. BA 회차는 amber 톤 강조. 펼치면 **처방/검사/X-ray/메모 4탭**. X-ray 탭은 image_path 있는 reading 만 노출 + signed URL 라이트박스. 검사 탭의 panel 칩 클릭 시 LabDetailModal.
- `components/LabDetailModal.tsx` — 어드민 `LabHistoryPanel` 의 `PanelContent`/`panelTypeOf` 재사용. 한 회차에 panel 여러 개면 상단 탭.
- 회차 필터 체크박스 (🦴 뼈나이 / 🧪 검사 / 📝 메모) — OR 필터, 진료기록 헤더에서 토글.
- 성장 추이 그래프: `AdminPatientGrowthChart` simplified 모드 재사용 (BA 회차만 다이아 + 클릭 시 예측키 banner + 보라 점선 hide).

**상담 환자 뷰** (`treatment_status='consultation'` 또는 visits=0) — `ConsultationRecordView`
어드민의 `firstConsultContent.ko` 11 슬라이드 + 환자 데이터를 합쳐 모바일 14 카드 스택으로 풀 재구성. 가족·지인 공유 가능.

1. 187 Cover (다크그린 hero, 원장명·웹사이트)
2. 환자 인사 ("{이름} 님의 첫 상담 기록 · 자유롭게 공유")
3. 채용현 원장 소개 (사진 + 인용구 + 2002/2010/2023/2025 타임라인 + 활동·출연 펼침)
4. 병원 진료 소개 사진 x2
5. 핵심 수치 hero (현재 키 / 18세 예측 / MPH + 공포 카피 "MPH 보다 -Ncm")
6. 성장 추이 그래프 (intake history + 18세 LMS 예측)
7. 설문 발췌 (성장 패턴/Tanner/원인 칩/학교/만성/관심도)
8. MPH vs PAH 방법론 (firstConsultContent 그대로)
9. MPH 가우시안 분포 (자체 모바일 SVG bell curve, ±1σ 68% / ±2σ / 외각 + tick labels)
10. 뼈나이 분석 (이미지 + 설명)
11. 뼈나이 아틀라스 (이미지 + 설명)
12. X-ray 판독 모듈 안내 ("진료 시작 시 누적")
13. 성장 그래프 모듈 안내 ("진료 시작 시 매 회차 업데이트")
14. **원장 마무리 한마디** — amber 톤 손편지 카드, 환자 데이터 기반 동적 4문단 (백분위·MPH 갭·Tanner·원인 별 분기) + "잘 치료하면 충분히 좋아질 케이스" + 채용현 원장 서명
15. 카톡 1:1 상담 CTA

**기타 환자용 컴포넌트**
- `features/home/components/IntakeGrowthChartCard.tsx` — 상담 단계 홈 첫 섹션. 공포 마케팅 카드.
- `features/home/components/TreatmentDashboardCard.tsx` — 치료 단계 홈 (실제로는 redirect 되니 stub 역할). 마지막 진료 N일 + 진료기록·다이어리 quick entry.
- `pages/RecordsPage.tsx` — 위 두 뷰 조립 + `treatment_status` 분기.
