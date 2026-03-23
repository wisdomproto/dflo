# Refactoring Large Files — Design Spec

## Goal

Split two oversized files (`AdminContentPage.tsx` 479 lines, `RoutinePage.tsx` 477 lines) into focused sub-components, and update `CLAUDE.md` Known Issues to reflect resolved items.

## Scope

1. **AdminContentPage** — extract tab-specific components
2. **RoutinePage** — extract section cards
3. **CLAUDE.md** — remove resolved known issues (GrowthPage dead code, fetchMealsByRoutine duplicate)

## 1. AdminContentPage Split

### Current structure

One 479-line component containing:
- Shared state: `tab`, `loading`, `lightboxUrl`, `saving`
- Per-tab edit state: `eR` (recipe), `eG` (guide), `eC` (case)
- 6 inner functions: `recipeForm()`, `recipeTab()`, `guideForm()`, `guideTab()`, `caseForm()`, `caseTab()`
- Shared UI helpers: `Badge`, `Skeleton`, `thumb`, `label`, button factories, `empty`
- Lightbox modal

### Target files

```
pages/admin/
  AdminContentPage.tsx        (~100 lines) — tab bar, lightbox, orchestration

features/admin/components/
  AdminContentShared.tsx       (~50 lines)  — shared UI helpers + dark theme classes
  AdminRecipeTab.tsx           (~80 lines)  — recipe list + form
  AdminGuideTab.tsx            (~100 lines) — guide list + form (includes JSON editor)
  AdminCaseTab.tsx             (~180 lines) — case list + form + measurement table + drag reorder
```

### Interface design

Each tab component receives pre-bound callbacks (parent binds the tab key):

```ts
// AdminRecipeTab
interface AdminRecipeTabProps {
  items: Recipe[];
  loading: boolean;
  onSave: (item: Partial<Recipe>) => Promise<void>;  // parent binds: (item) => save('recipe', item)
  onDelete: (id: string) => Promise<void>;            // parent binds: (id) => del('recipe', id)
  onLightbox: (url: string) => void;
}
// Same pattern for Guide and Case tabs with their respective types
```

The parent `AdminContentPage` keeps:
- `tab` state and tab switching
- `loading` per-tab state
- `lightboxUrl` and lightbox modal
- `load()`, `save()`, `del()` functions — wraps them to pre-bind the tab key before passing

Each tab component manages its own edit state internally (`useState` for the form being edited).

### Internal state ownership per tab

- **AdminRecipeTab**: `eR` (editing recipe state)
- **AdminGuideTab**: `eG` (editing guide state), `rawJsonMode` (JSON editor toggle)
- **AdminCaseTab**: `eC` (editing case state), `dragIdx` ref (drag-and-drop reorder)

### Shared utilities (`AdminContentShared.tsx`)

Exports:
- Dark theme class constants: `ic`, `cellIc`, `fw`, `cardCls`
- `DIFF` constant array
- `Badge` component
- `Skeleton` component
- `thumb()` function (takes `onLightbox` callback parameter)
- `label()` function
- `empty()` function
- Button factories: `editBtn`, `foldBtn`, `delBtn`, `newBtn`, `cancelBtn`, `saveBtn`
- Type aliases: `ERecipe`, `EGuide`, `ECase` and their maker functions (`mkRecipe`, `mkGuide`, `mkCase`, `mkMeasurement`)

### Closure dependencies to re-wire

- `thumb()`: currently captures `setLightboxUrl` → extract as parameter `onLightbox`
- `saveBtn()`: currently captures `saving` state → add `saving` parameter
- Case form `dragIdx` ref: currently in parent scope → move to `AdminCaseTab` internal ref
- Guide form `rawJsonMode`: currently in parent scope → move to `AdminGuideTab` internal state

## 2. RoutinePage Split

### Current structure

One 477-line component with:
- Date/tab navigation
- 20+ useState hooks for form fields
- Data loading (routine + meals + photos + analyses + exercises + measurements)
- Growth calculation logic (percentile, prediction, bone age, MPH)
- 7 card sections inline in JSX (note: `MealCard`, `MealAnalysisSection`, `ExerciseCard` are already extracted)
- 2 modals (growth record, supplement settings)

### Target files

```
features/routine/components/
  SectionTitle.tsx         (~10 lines)  — shared section header (extracted from RoutinePage)
  HeightWeightCard.tsx     (~70 lines)  — height/weight inputs + percentile/prediction + hospital data
  SleepCard.tsx            (~35 lines)  — sleep time/wake time/quality
  WaterCard.tsx            (~30 lines)  — water intake buttons + reset
  SupplementCard.tsx       (~90 lines)  — supplement toggles + settings modal
  InjectionCard.tsx        (~25 lines)  — hormone injection toggle + time
  MemoCard.tsx             (~40 lines)  — mood selector + notes textarea

pages/
  RoutinePage.tsx          (~200 lines) — tab/date nav, data loading, save handler, card composition
```

### Constants moved with their cards

Each card takes ownership of its related constants:
- `SleepCard`: `SLEEP_OPTS`
- `MemoCard`: `MOOD_OPTS`
- `SupplementCard`: `DEFAULT_SUPPLEMENTS`, `SUPPL_STORAGE_KEY`, `loadSupplementList()`, `saveSupplementList()`
- `RoutinePage` keeps: `Chevron` (only used in page-level navigation)

### Interface design

Each card is a controlled component:

```ts
// SleepCard
interface SleepCardProps {
  sleepTime: string;
  wakeTime: string;
  sleepQuality: SleepQuality | '';
  onSleepTimeChange: (v: string) => void;
  onWakeTimeChange: (v: string) => void;
  onSleepQualityChange: (v: SleepQuality) => void;
}

// WaterCard
interface WaterCardProps {
  waterIntake: number;
  onWaterIntakeChange: (v: number) => void;
}

// SupplementCard — manages supplList, showSettings, newSupplName internally
interface SupplementCardProps {
  supplements: string[];
  onSupplementsChange: (v: string[]) => void;
}

// InjectionCard
interface InjectionCardProps {
  growthInjection: boolean;
  injectionTime: string;
  onGrowthInjectionChange: (v: boolean) => void;
  onInjectionTimeChange: (v: string) => void;
}

// MemoCard
interface MemoCardProps {
  mood: Mood | '';
  dailyNotes: string;
  onMoodChange: (v: Mood) => void;
  onDailyNotesChange: (v: string) => void;
}

// HeightWeightCard
interface HeightWeightCardProps {
  dailyHeight: string;
  dailyWeight: string;
  onDailyHeightChange: (v: string) => void;
  onDailyWeightChange: (v: string) => void;
  child: Child | null;
  measAge: AgeResult | null;
  measPct: number | null;
  measPred: number | null;
  latestBoneAge: { boneAge: number; pah?: number; measuredDate: string } | null;
  measurementCount: number;
  onShowGrowthModal: () => void;
}
```

`SectionTitle` → extracted to `features/routine/components/SectionTitle.tsx` (follows project convention of keeping shared routine components in `features/routine/components/`).

### What stays in RoutinePage

- All `useState` for form values (single source of truth)
- `useEffect` for data loading
- `ensureRoutineId`, `handleSave`
- Growth data calculations (`useMemo` hooks)
- Tab/date navigation UI + `Chevron` component
- Growth modal (already uses `GrowthModalContent`)
- Save button
- Composition of all cards

### Already-extracted components (no changes needed)

- `MealCard` — `features/meal/components/MealCard.tsx`
- `MealAnalysisSection` — `features/meal/components/MealAnalysisSection.tsx`
- `ExerciseCard` — `features/exercise/components/ExerciseCard.tsx`

## 3. CLAUDE.md Updates

Remove from Known Issues:
- "Dead code: `GrowthPage.tsx` (unreachable from router)" — file already deleted, router already cleaned (verified: `GrowthPage.tsx` not found in `v4/src/`, router.tsx line 18 has comment "GrowthPage removed")
- "Duplicate `fetchMealsByRoutine` in both `routineService.ts` and `mealService.ts`" — verified: `routineService.ts` line 104 has comment "Meals → moved to mealService.ts", no `fetchMealsByRoutine` function exists there. `RoutinePage.tsx` imports only from `mealService.ts`.

Update after refactoring:
- "AdminContentPage.tsx (479 lines) — needs splitting" → mark as resolved
- "RoutinePage.tsx (402 lines) — needs form extraction" → mark as resolved

## Testing Strategy

- `npx tsc --noEmit` must pass after each file extraction
- `npm run build` must succeed with zero errors
- Manual smoke test: admin content CRUD (all 3 tabs), routine page input/save/calendar tab

## Risk Assessment

Low risk — pure structural refactoring with no behavior changes. However, several closure dependencies need careful re-wiring:

- **AdminContentPage**: `thumb()` captures `setLightboxUrl`, `saveBtn()` captures `saving` — both become parameters in shared utils
- **AdminCaseTab**: `dragIdx` ref moves from parent → internal ref
- **AdminGuideTab**: `rawJsonMode` state moves from parent → internal state
- **RoutinePage**: constants (`SLEEP_OPTS`, `MOOD_OPTS`, supplement helpers) move to their respective card files

Each extraction should be followed by a `tsc --noEmit` check before proceeding to the next.
