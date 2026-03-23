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
- Shared UI helpers: `Badge`, `Skeleton`, `thumb`, `label`, button factories
- Lightbox modal

### Target files

```
pages/admin/
  AdminContentPage.tsx        (~100 lines) — tab bar, lightbox, orchestration

features/admin/components/
  AdminContentShared.tsx       (~40 lines)  — Badge, Skeleton, thumb, label, button factories, dark theme classes
  AdminRecipeTab.tsx           (~80 lines)  — recipe list + form
  AdminGuideTab.tsx            (~100 lines) — guide list + form (includes JSON editor)
  AdminCaseTab.tsx             (~180 lines) — case list + form + measurement table + drag reorder
```

### Interface design

Each tab component receives:

```ts
interface AdminTabProps<T> {
  items: T[];
  loading: boolean;
  onSave: (item: Partial<T>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}
```

The parent `AdminContentPage` keeps:
- `tab` state and tab switching
- `loading` per-tab state
- `lightboxUrl` and lightbox modal
- `load()`, `save()`, `del()` functions (pass as callbacks)

Each tab component manages its own edit state internally (`useState` for the form being edited).

### Shared utilities (`AdminContentShared.tsx`)

Exports:
- Dark theme class constants: `ic`, `cellIc`, `fw`, `cardCls`
- `Badge` component
- `Skeleton` component
- `thumb()` function (takes `onLightbox` callback)
- `label()` function
- Button factories: `editBtn`, `foldBtn`, `delBtn`, `newBtn`, `cancelBtn`, `saveBtn`
- Factory types: `ERecipe`, `EGuide`, `ECase` and their maker functions

## 2. RoutinePage Split

### Current structure

One 477-line component with:
- Date/tab navigation
- 20+ useState hooks for form fields
- Data loading (routine + meals + photos + analyses + exercises + measurements)
- Growth calculation logic (percentile, prediction, bone age, MPH)
- 7 card sections inline in JSX
- 2 modals (growth record, supplement settings)

### Target files

```
features/routine/components/
  HeightWeightCard.tsx    (~70 lines)  — height/weight inputs + percentile/prediction + hospital data
  SleepCard.tsx           (~30 lines)  — sleep time/wake time/quality
  WaterCard.tsx           (~25 lines)  — water intake buttons + reset
  SupplementCard.tsx      (~90 lines)  — supplement toggles + settings modal
  InjectionCard.tsx       (~25 lines)  — hormone injection toggle + time
  MemoCard.tsx            (~35 lines)  — mood selector + notes textarea

pages/
  RoutinePage.tsx          (~160 lines) — tab/date nav, data loading, save handler, card composition
```

### Interface design

Each card is a controlled component:

```ts
// Example: SleepCard
interface SleepCardProps {
  sleepTime: string;
  wakeTime: string;
  sleepQuality: SleepQuality | '';
  onSleepTimeChange: (v: string) => void;
  onWakeTimeChange: (v: string) => void;
  onSleepQualityChange: (v: SleepQuality) => void;
}
```

`HeightWeightCard` additionally receives:
- `child`, `measAge`, `measPct`, `measPred` (pre-computed in parent)
- `latestBoneAge` for hospital data section
- `measurements` count + `onShowGrowthModal` callback

`SupplementCard` manages its own modal state internally (supplement settings modal is tightly coupled to the card).

### What stays in RoutinePage

- All `useState` for form values (single source of truth)
- `useEffect` for data loading
- `ensureRoutineId`, `handleSave`
- Growth data calculations (`useMemo` hooks)
- Tab/date navigation UI
- Growth modal (already uses `GrowthModalContent`)
- Save button

### Shared components reused

`SectionTitle` and `Chevron` already exist as inline components in RoutinePage. Move `SectionTitle` to a shared location or keep it as a local utility — since it's only 5 lines and only used in routine cards, keep it in `RoutinePage.tsx` and import from there, or duplicate in each card (prefer: export from RoutinePage or a small shared file).

Decision: Export `SectionTitle` from `RoutinePage.tsx` as a named export. Cards import it.

## 3. CLAUDE.md Updates

Remove from Known Issues:
- "Dead code: `GrowthPage.tsx` (unreachable from router)" — file already deleted, router already cleaned
- "Duplicate `fetchMealsByRoutine` in both `routineService.ts` and `mealService.ts`" — routineService already has comment "Meals → moved to mealService.ts", no duplicate exists

Update:
- "AdminContentPage.tsx (479 lines) — needs splitting" → mark as resolved
- "RoutinePage.tsx (402 lines) — needs form extraction" → mark as resolved

## Testing Strategy

- `npm run build` must succeed with zero errors after each file split
- `npx tsc --noEmit` must pass
- Manual smoke test: admin content CRUD, routine page input/save/calendar tab

## Risk Assessment

Low risk — pure structural refactoring with no behavior changes. Each extraction is mechanical: move JSX + state into a new component, wire props.
