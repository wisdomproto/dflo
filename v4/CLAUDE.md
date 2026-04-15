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
  children/       # ChildFormModal, childrenService
  growth/         # measurementService (hospital_measurements CRUD)
  hospital/       # services/ visitService, hospitalMeasurementService,
                  #   medicationService, labTestService, prescriptionService
                  # components/ VisitsTimeline, VisitForm, MeasurementEditor,
                  #   LifestyleSummary, LabTestsBlock, AllergyLabEditor,
                  #   FreeformLabEditor, MedicationPicker, PrescriptionsBlock
  bone-age/       # lib/ types, atlas, matcher, growthPrediction, growthStandard
                  # components/ PatientForm, XrayUpload, XrayPreview, MatchResultView,
                  #   BoneAgeInput, PredictionResult, BoneAgeChart, BoneAgeTool
                  # services/ xrayReadingService
  routine/        # routineService, CalendarView, GrowthModalContent
                  # Cards: SleepCard, MealCard, ExerciseCard, SupplementCard
  content/        # contentService, useHomeContent hook
                  # SwipeCards: GrowthGuideSwipeCard, RecipeSwipeCard, GrowthCaseSwipeCard
                  # Details: RecipeDetail, CaseDetail, GuideDetail, CasePredictionBadge
  meal/           # MealCard, MealAnalysisSection, mealService
  exercise/       # ExerciseCard, YouTubeModal, exercises data
  admin/          # AdminLayout, ImageUploader, adminService
                  # Tabs: AdminRecipeTab, AdminGuideTab, AdminCaseTab, AdminContentShared
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
                  # AdminMedicationsPage, AdminContentPage, AdminImportPage
scripts/
  create_admin.mjs, setup_storage.mjs, upload_growth_cases.mjs
  migrations/     # 000_initial_schema.sql + README (Supabase SQL)
```

## Database Tables

### Identity
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, name, phone, role, password | role: 'parent' \| 'doctor' \| 'admin' |
| `children` | id, parent_id, name, gender, birth_date, father_height, mother_height | Every child is a patient |

### Hospital data (doctor-entered, visit-centric)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `visits` | id, child_id, visit_date, doctor_id, chief_complaint, plan, notes | Hospital-data hub |
| `hospital_measurements` | id, visit_id, child_id, measured_date, height, weight, bone_age, pah | Renamed from `measurements` |
| `xray_readings` | id, visit_id, child_id, xray_date, image_path, bone_age_result, atlas_match_younger/older | BoneAgeAI output, storage: `xray-images` |
| `lab_tests` | id, visit_id, child_id, test_type, result_data jsonb, attachments jsonb | allergy \| organic_acid \| blood |
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
- `content-images` (public, 5MB) — guides/recipes/cases
- `meal-photos` (public, 5MB) — patient meal uploads
- `xray-images` (PRIVATE, 10MB) — PHI, signed URL only

## DB Column Naming
- `users`, `children`, `exercises`, `medications`: use `is_active`
- `recipes`, `growth_guides`, `growth_cases`: use `is_published`

## Schema & Migrations
- Fresh-project setup SQL: `v4/scripts/migrations/000_initial_schema.sql`
- Run in Supabase SQL Editor; see `v4/scripts/migrations/README.md`

## Admin Access
- **App admin**: `admin@187growth.com` / `admin187!` (routes: `/admin/*`)
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

## Website Features (Phase 7)
- Rolling hero banner (3 slides, fade, arrow/dot/swipe, admin-managed)
- Height predictor (LMS-based, Korean 2017 standards, chart 3~18세)
- Trust stats (15,000+ children, 94.7% goal rate, 20yr+ experience)
- 187 성장프로그램 (7 programs, sliding cards → detail pages)
- Content sliders (guides/recipes/exercises/cases via WebsiteSlider)
- Hospital info modals (location, hours, about)
- Mobile-first, brand color #0F6E56, desktop max-w-5xl

## Refactoring History
- AdminContentPage: 479→~130 lines (split into tabs)
- RoutinePage: 402→~200 lines (extracted cards)
- HeightCalculator: 336→~120+170 lines (form/result split)
