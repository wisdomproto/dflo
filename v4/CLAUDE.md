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
  admin/          # AdminLayout, ImageUploader, adminService
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
- **Banner admin**: PIN `8054` (route: `/website/admin/banners`, sessionStorage)

## App Navigation (login required)
| Tab | Route | Page |
|-----|-------|------|
| 홈 | `/` | HomePage (성장 요약 + 콘텐츠) |
| 데일리 루틴 | `/routine` | RoutinePage (캘린더 + 식사/운동/수면) |
| 체형 분석 | `/body-analysis` | BodyAnalysisPage (mock) |
| 성장가이드 | `/info` | InfoPage (가이드/레시피/사례) |

## Website Navigation (public)
| Route | Page |
|-------|------|
| `/website` | WebsiteHomePage (랜딩페이지) |
| `/website/program/:slug` | ProgramDetailPage (7개 프로그램) |
| `/website/admin/banners` | AdminBannerPage (PIN 보호) |

## AI Features
- **Meal analysis**: WORKING - photo → compress → Gemini analyze → DB save
- **Body analysis**: MOCK - placeholder, needs Gemini integration
- **RAG chatbot**: DEFERRED

## Refactoring History
- AdminContentPage: removed (content authoring dropped from admin)
- AdminPatientDetailPage: 3-column redesign with inline editing
- RoutinePage: 402→~200 lines (extracted cards)
- HeightCalculator: 336→~120+170 lines (form/result split)
