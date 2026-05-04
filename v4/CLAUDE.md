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

| Tab | Route | Page |
|-----|-------|------|
| 홈 | `/app` | HomePage (성장 요약 + 콘텐츠) |
| 루틴 | `/app/routine` | RoutinePage (입력/통계 탭 + 마지막에 PhotoCaptureCard "내 사진") |
| 진료기록 | `/app/records` | RecordsPage (병원 측정 데이터 read-only) |
| 1:1상담 | (외부) | 카카오톡 https://pf.kakao.com/_ZxneSb |
| (탭 없음) | `/app/info[/*]` | 성장가이드 / 레시피 / 케이스 (홈에서 진입) |

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

## features/records/ — 환자용 진료기록 (NEW)
환자가 병원에서 측정·진료받은 read-only 데이터를 모바일 친화적으로 보여주는 새 영역.

- `services/patientRecordsService.ts` — 한 child 의 visits + measurements + prescriptions(medication name 조인) + lab_tests + xray_readings 를 한 번에 fetch 하는 `fetchPatientRecords(childId)` 함수. is_intake 가상 visit 제외. 반환 구조 `PatientRecords { visits: PatientVisitRecord[], measurements, visitCount, boneAgeCount, prescriptionCount, labCount }`.
- `components/PatientHeaderCard.tsx` — 그라데이션 헤더 + 진료/뼈나이/처방/검사 4-stat + 마지막 진료일.
- `components/BoneAgeCompareCard.tsx` — 최신 BA 회차 기준 실제나이 vs 뼈나이 + 친근한 한 줄 해석 ("실제보다 약 0.3세 빠른 편입니다") + 이전 측정 펼침.
- `components/VisitTimelineCard.tsx` — 회차 카드 (접힘 상태: 회차번호 / 날짜 + 만나이 / 키·체중·뼈나이·예측키 / 처방·검사·메모 배지). 펼치면 처방 약품 리스트 + 패널별 검사 칩(클릭 가능) + 메모 원문. PAH 가 DB에 비어 있어도 BA 회차에서 `heightAtSamePercentile(키, BA, 18, gender)` 로 fallback 계산.
- `components/LabDetailModal.tsx` — Lab 칩/버튼 클릭 시 오픈. 어드민 `LabHistoryPanel` 의 export 된 `PanelContent`/`panelTypeOf`/`PanelType` 그대로 재사용. 회차에 panel 여러 개면 상단 탭으로 전환 (혈액 / IgG4 / MAST / NK / 유기산 / 모발 / 첨부 / 기타).
- `pages/RecordsPage.tsx` — 위 컴포넌트들 조립, GrowthChart compact 모드로 키 추이 + 예측키 라인 표시.
