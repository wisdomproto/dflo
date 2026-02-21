# 187 성장케어 v4 - Project Guide

## Project Overview
소아 성장 관리 플랫폼 (연세새봄의원 187 성장 클리닉)
- **v3** (legacy): `./` root에 Vanilla JS + Supabase + Cloudflare Pages
- **v4** (active): `./v4/` 디렉토리에 React + TypeScript + Vite

## Tech Stack (v4)
- React 19 + TypeScript 5 + Vite 7
- Tailwind CSS 4 (@tailwindcss/vite plugin, NO tailwind.config.js)
- Zustand (state management)
- Supabase (DB + Auth + Storage)
- Chart.js + react-chartjs-2 (growth charts)
- Google Gemini 2.5 Flash (AI features via ai-server)

## Commands
```bash
cd v4
npm run dev          # Dev server (Vite)
npm run build        # Production build
npx tsc --noEmit     # Type check

# AI Server
cd ai-server
npm run dev          # Dev server (port 3001)
```

## Project Structure (v4/src/)
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
  data/           # growthStandard.ts (WHO LMS 데이터)
  services/       # aiService.ts (client-side AI proxy to ai-server)
features/
  auth/           # LoginPage, ProtectedRoute, AdminRoute
  children/       # ChildFormModal, childrenService
  growth/         # measurementService
  routine/        # routineService, CalendarView, GrowthModalContent
  content/        # contentService, useHomeContent hook
                  # SwipeCards: GrowthGuideSwipeCard, RecipeSwipeCard, GrowthCaseSwipeCard
                  # Details: RecipeDetail, CaseDetail, GuideDetail, CasePredictionBadge
  meal/           # MealCard, MealAnalysisSection, mealService
  exercise/       # ExerciseCard, YouTubeModal, exercises data
  admin/          # AdminLayout, ImageUploader, adminService
pages/            # HomePage, RoutinePage, BodyAnalysisPage, InfoPage
  admin/          # AdminDashboardPage, AdminPatientsPage, AdminPatientDetailPage,
                  # AdminContentPage, AdminImportPage
scripts/          # create_admin.mjs, setup_storage.mjs, upload_growth_cases.mjs, etc.
```

## AI Server Structure (ai-server/src/)
```
index.ts          # Express server entry (port 3001)
routes/
  analyze.ts      # POST /api/analyze/meal, POST /api/analyze/body
services/
  gemini.ts       # Gemini API client (gemini-2.5-flash)
  mealAnalyzer.ts # Meal photo analysis prompt + JSON parsing
  bodyAnalyzer.ts # Body posture analysis prompt + JSON parsing
middleware/
  auth.ts         # API key validation middleware
```

## Conventions
- **Language**: All UI text in Korean (한국어)
- **Component size**: Max ~200 lines per file (absolute max 350)
- **Styling**: Tailwind CSS only, mobile-first. Custom colors defined in `src/index.css` @theme block
- **State**: Zustand stores with individual selectors `useStore((s) => s.field)` to minimize re-renders
- **Imports**: Use `@/` path alias (maps to `src/`)
- **Services**: Supabase queries in `features/*/services/` files
- **Types**: All shared types in `shared/types/index.ts`
- **No default exports** for feature components (named exports like `export function ChildFormModal`)
- **Default exports** for pages and shared components
- **Logging**: Use `logger` from `@/shared/lib/logger` (not raw `console.*`)

## Key Design Decisions
- Legacy DB auth: plaintext password in `users` table (email + password columns)
- RLS policies protect data (parents see own children only, admin sees all)
- Feature-based directory structure (not technical layers)
- Lazy-loaded pages via React Router
- Custom Tailwind theme colors: primary (#667eea), secondary (#764ba2), success, warning, danger
- Supabase Storage: `content-images` bucket (recipe/guide/case images), `meal-photos` bucket (식단 사진)
- Image compression: Client-side resize to max 1200x1200, JPEG 80% before upload

## Database Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, name, phone, role, password, is_patient | role: 'parent' \| 'admin' |
| `children` | id, parent_id, name, gender, birth_date | Linked to users |
| `measurements` | id, child_id, measured_date, height, weight, head_circ | Growth tracking |
| `daily_routines` | id, child_id, routine_date, sleep_time, wake_time, sleep_memo | 데일리 루틴 |
| `meals` | id, daily_routine_id, meal_type, meal_time, description | meal_type: breakfast/lunch/dinner |
| `meal_photos` | id, meal_id, photo_url, file_name, file_size | Storage: meal-photos bucket |
| `meal_analyses` | id, meal_id, menu_name, ingredients, calories, carbs, protein, fat, growth_score, advice | AI 분석 결과 (1 meal = 1 analysis) |
| `exercise_logs` | id, daily_routine_id, exercise_key, sets, reps, memo | 운동 기록 |
| `recipes` | id, title, image_url, is_published, order_index | 건강 레시피 |
| `growth_guides` | id, title, image_url, content, is_published, order_index | 성장 가이드 |
| `growth_cases` | id, chart_number, patient_name, gender, is_published | 성장 사례 |

## DB Column Naming
- `users`, `children`: use `is_active` (boolean)
- `recipes`, `growth_guides`, `growth_cases`: use `is_published` (boolean)
- Never mix `is_active` and `is_published` across these tables

## Environment Variables
```
# v4/.env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_AI_SERVER_URL=http://localhost:3001  # AI server URL

# v4/.env.local (not committed)
SUPABASE_SERVICE_ROLE_KEY=...   # For admin scripts only

# ai-server/.env
GEMINI_API_KEY=...
API_KEY=...                     # Shared secret with frontend
PORT=3001
```

## Admin Access
- Admin credentials: `admin@187growth.com` / `admin187!`
- Admin pages at `/admin/*` (protected by AdminRoute)
- Content authoring: `/admin/content` (가이드/레시피/사례 CRUD with image upload)
- Patient management: `/admin/patients`

## App Navigation
| Tab | Route | Page | Description |
|-----|-------|------|-------------|
| 홈 | `/` | HomePage | 성장 요약 + 콘텐츠 스와이프 카드 |
| 데일리 루틴 | `/routine` | RoutinePage | 캘린더 + 식사/운동/수면 + AI 분석 |
| 체형 분석 | `/body-analysis` | BodyAnalysisPage | 체형 사진 분석 (mock) |
| 성장가이드 | `/info` | InfoPage | 가이드/레시피/사례 전체 목록 |

## Current Progress
- Phase 0-3: COMPLETE (project setup, auth, shared layer, core pages)
- Phase 4: COMPLETE (content system, routine, exercise, swipeable home)
- Phase 5: COMPLETE (admin dashboard, content authoring, image upload, patient management)
- Phase 6: PARTIAL (AI server running, meal photo analysis working, body analysis mock only)

## AI Features
- **Meal photo analysis**: WORKING - Gemini 2.5 Flash via ai-server, results saved to `meal_analyses` table
  - Photo upload → compress (1200x1200 JPEG 80%) → AI analyze → DB save
  - Tab-based UI (아침/점심/저녁) with growth score (1-10) and nutrition breakdown
  - Re-analyze button for existing photos
- **Body posture analysis**: MOCK - placeholder with random data, needs real Gemini integration
- **RAG chatbot**: DEFERRED

## Known Issues (from audit)
- `AdminContentPage.tsx` (479 lines) — needs splitting into sub-components
- `RoutinePage.tsx` (402 lines) — needs form extraction
- Dead code: `GrowthPage.tsx` (unreachable from router)
- Duplicate `fetchMealsByRoutine` in both `routineService.ts` and `mealService.ts`
