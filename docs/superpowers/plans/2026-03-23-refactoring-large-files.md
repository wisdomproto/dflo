# Refactoring Large Files — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `AdminContentPage.tsx` (479 lines) and `RoutinePage.tsx` (477 lines) into focused sub-components, and clean up CLAUDE.md Known Issues.

**Architecture:** Extract tab-specific sub-components from AdminContentPage (Recipe/Guide/Case tabs + shared utilities). Extract section cards from RoutinePage (HeightWeight/Sleep/Water/Supplement/Injection/Memo). Both use controlled-component patterns with props passed from parent.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-23-refactoring-large-files-design.md`

---

## Chunk 1: AdminContentPage Split

### Task 1: Create AdminContentShared.tsx

**Files:**
- Create: `v4/src/features/admin/components/AdminContentShared.tsx`

- [ ] **Step 1: Create shared utilities file**

Extract from `AdminContentPage.tsx` lines 17-41 and 97-109 into a new file. All UI helpers become exports. `thumb()` and `saveBtn()` gain explicit parameters instead of closures.

```tsx
// v4/src/features/admin/components/AdminContentShared.tsx
import type { Recipe, GrowthCase, GrowthGuide, CaseMeasurement } from '@/shared/types';

export type Tab = 'recipe' | 'guide' | 'case';
export const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'guide', label: '성장 가이드', emoji: '📚' },
  { key: 'recipe', label: '건강 레시피', emoji: '🥗' },
  { key: 'case', label: '성장 사례', emoji: '📋' },
];
export const DIFF = ['쉬움', '보통', '어려움'] as const;

export type ERecipe = Partial<Recipe> & { title: string };
export type EGuide = Partial<GrowthGuide> & { title: string; content: string };
export type ECase = Partial<GrowthCase> & { patient_name: string };

export const mkRecipe = (): ERecipe => ({ title: '', image_url: '', key_benefits: '', cooking_time_minutes: 0, difficulty: '보통', is_featured: false, order_index: 0 });
export const mkGuide = (): EGuide => ({ title: '', subtitle: '', icon: '', category: '', content: '', image_url: '', banner_color: '', is_featured: false, order_index: 0 });
export const mkCase = (): ECase => ({ patient_name: '', gender: 'male', special_notes: '', image_url: '', is_featured: false, order_index: 0, measurements: [] });
export const mkMeasurement = (): CaseMeasurement => ({ date: new Date().toISOString().split('T')[0], age: 0, height: 0 });

/* dark theme classes */
export const ic = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-full text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';
export const cellIc = 'bg-transparent border-0 w-full text-xs text-gray-200 placeholder-gray-500 py-1 px-1 focus:outline-none focus:bg-gray-700/50 rounded';
export const fw = 'bg-gray-800 rounded-xl p-4 space-y-3';
export const cardCls = 'bg-gray-800 rounded-xl shadow-sm p-4 flex items-center justify-between';

export const Badge = () => <span className="bg-yellow-900/50 text-yellow-400 rounded-full px-2 py-0.5 text-xs">추천</span>;
export const Skeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => <div key={i} className="bg-gray-800 rounded-xl p-4 h-16 animate-pulse" />)}
  </div>
);

export const thumb = (url: string | undefined, fallbackEmoji: string, fallbackBg: string, onLightbox: (url: string) => void) => {
  if (url) {
    return (
      <img
        src={url} alt=""
        className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary/50 transition"
        onClick={(e) => { e.stopPropagation(); onLightbox(url); }}
      />
    );
  }
  return <div className={`w-10 h-10 rounded-lg ${fallbackBg} flex items-center justify-center text-lg`}>{fallbackEmoji}</div>;
};

export const label = (text: string) => <span className="text-[11px] text-gray-400 block mb-0.5">{text}</span>;
export const empty = (msg: string) => <p className="text-gray-500 text-sm text-center py-8">{msg}</p>;

export const editBtn = (onClick: () => void) => <button onClick={onClick} className="text-primary hover:text-primary-light text-xs">수정</button>;
export const foldBtn = (onClick: () => void) => <button onClick={onClick} className="text-gray-400 hover:text-gray-200 text-xs">접기</button>;
export const delBtn = (onClick: () => void) => <button onClick={onClick} className="text-red-400 hover:text-red-300 text-xs">삭제</button>;
export const newBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm font-medium text-primary hover:text-primary-light">+ 새로 만들기</button>;
export const cancelBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5">취소</button>;
export const saveBtn = (onClick: () => void, disabled: boolean, saving: boolean) => (
  <button onClick={onClick} disabled={disabled} className="text-sm bg-primary text-white rounded-lg px-4 py-1.5 disabled:opacity-40 hover:bg-primary-dark transition-colors">
    {saving ? '저장 중...' : '저장'}
  </button>
);
```

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS (new file, no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/admin/components/AdminContentShared.tsx
git commit -m "refactor: extract AdminContentShared utilities from AdminContentPage"
```

### Task 2: Create AdminRecipeTab.tsx

**Files:**
- Create: `v4/src/features/admin/components/AdminRecipeTab.tsx`

- [ ] **Step 1: Create recipe tab component**

Extract `recipeForm()` (lines 126-156) and `recipeTab()` (lines 158-188) from `AdminContentPage.tsx`. The component manages its own `eR` edit state.

```tsx
// v4/src/features/admin/components/AdminRecipeTab.tsx
import { useState } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import {
  type ERecipe, mkRecipe, ic, fw, cardCls, DIFF,
  Badge, Skeleton, thumb, label, empty,
  editBtn, foldBtn, delBtn, newBtn, cancelBtn, saveBtn,
} from './AdminContentShared';
import type { Recipe } from '@/shared/types';

interface Props {
  items: Recipe[];
  loading: boolean;
  saving: boolean;
  onSave: (item: ERecipe) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function AdminRecipeTab({ items, loading, saving, onSave, onDelete, onLightbox }: Props) {
  const [eR, setER] = useState<ERecipe | null>(null);
  const s = (p: Partial<ERecipe>) => setER((v) => v ? { ...v, ...p } : v);

  const handleSave = async () => { if (eR) { await onSave(eR); setER(null); } };

  const form = () => {
    if (!eR) return null;
    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="recipes" currentUrl={eR.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={onLightbox} />
          </div>
          <div className="flex-1 space-y-3">
            <div>{label('제목')}<input className={ic} placeholder="제목" value={eR.title} onChange={(e) => s({ title: e.target.value })} /></div>
            <div>{label('주요 효능')}<input className={ic} placeholder="주요 효능" value={eR.key_benefits ?? ''} onChange={(e) => s({ key_benefits: e.target.value })} /></div>
            <div>{label('주요 영양소 (쉼표 구분)')}<input className={ic} placeholder="칼슘, 비타민D, 단백질" value={(eR.main_nutrients ?? []).join(', ')} onChange={(e) => s({ main_nutrients: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} /></div>
            <div className="flex gap-3">
              <div className="flex-1">{label('재료 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="재료 1&#10;재료 2" value={(eR.ingredients ?? []).join('\n')} onChange={(e) => s({ ingredients: e.target.value.split('\n').filter(Boolean) })} /></div>
              <div className="flex-1">{label('조리 순서 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="1단계&#10;2단계" value={(eR.steps ?? []).join('\n')} onChange={(e) => s({ steps: e.target.value.split('\n').filter(Boolean) })} /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">{label('조리시간(분)')}<input className={ic} type="number" value={eR.cooking_time_minutes ?? ''} onChange={(e) => s({ cooking_time_minutes: +e.target.value })} /></div>
              <div className="flex-1">{label('난이도')}<select className={ic} value={eR.difficulty ?? '보통'} onChange={(e) => s({ difficulty: e.target.value })}>{DIFF.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="flex-1">{label('정렬 순서')}<input className={ic} type="number" value={eR.order_index ?? 0} onChange={(e) => s({ order_index: +e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap self-end pb-2"><input type="checkbox" checked={eR.is_featured ?? false} onChange={(e) => s({ is_featured: e.target.checked })} /> 추천</label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">{cancelBtn(() => setER(null))}{saveBtn(handleSave, saving || !eR.title, saving)}</div>
      </div>
    );
  };

  if (loading) return <Skeleton />;
  return (
    <>
      {newBtn(() => setER(mkRecipe()))}
      {eR && !eR.id && form()}
      <div className="space-y-3">
        {items.map((r) => {
          const isEditing = eR?.id === r.id;
          return (
            <div key={r.id}>
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  {thumb(r.image_url, '🍳', 'bg-orange-900/30', onLightbox)}
                  <div>
                    <span className="font-medium text-sm text-gray-100">{r.title}</span>
                    {r.is_featured && <> <Badge /></>}
                    {r.key_benefits && <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.key_benefits}</p>}
                  </div>
                </div>
                <div className="flex gap-3">{isEditing ? foldBtn(() => setER(null)) : editBtn(() => setER({ ...r }))}{delBtn(() => onDelete(r.id))}</div>
              </div>
              {isEditing && form()}
            </div>
          );
        })}
        {!items.length && empty('등록된 레시피가 없습니다.')}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/admin/components/AdminRecipeTab.tsx
git commit -m "refactor: extract AdminRecipeTab from AdminContentPage"
```

### Task 3: Create AdminGuideTab.tsx

**Files:**
- Create: `v4/src/features/admin/components/AdminGuideTab.tsx`

- [ ] **Step 1: Create guide tab component**

Extract `guideForm()` (lines 191-245) and `guideTab()` (lines 247-277). Manages `eG` + `rawJsonMode` internally.

```tsx
// v4/src/features/admin/components/AdminGuideTab.tsx
import { useState } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import {
  type EGuide, mkGuide, ic, fw, cardCls,
  Badge, Skeleton, thumb, label, empty,
  editBtn, foldBtn, delBtn, newBtn, cancelBtn, saveBtn,
} from './AdminContentShared';
import type { GrowthGuide } from '@/shared/types';

interface Props {
  items: GrowthGuide[];
  loading: boolean;
  saving: boolean;
  onSave: (item: EGuide) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function AdminGuideTab({ items, loading, saving, onSave, onDelete, onLightbox }: Props) {
  const [eG, setEG] = useState<EGuide | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const s = (p: Partial<EGuide>) => setEG((v) => v ? { ...v, ...p } : v);

  const handleSave = async () => { if (eG) { await onSave(eG); setEG(null); } };

  const form = () => {
    if (!eG) return null;
    let parsed: { summary?: string; key_points?: string[]; sections?: { title: string; content: string }[] } = {};
    try { parsed = JSON.parse(eG.content); } catch { parsed = { summary: eG.content }; }
    const updateJson = (patch: Partial<typeof parsed>) => { s({ content: JSON.stringify({ ...parsed, ...patch }, null, 2) }); };

    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="guides" currentUrl={eG.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={onLightbox} />
          </div>
          <div className="flex-1 space-y-3">
            <div>{label('제목')}<input className={ic} placeholder="제목" value={eG.title} onChange={(e) => s({ title: e.target.value })} /></div>
            <div>{label('부제목')}<input className={ic} placeholder="부제목" value={eG.subtitle ?? ''} onChange={(e) => s({ subtitle: e.target.value })} /></div>
            <div className="flex gap-3">
              <div className="flex-1">{label('아이콘 (이모지)')}<input className={ic} placeholder="📖" value={eG.icon ?? ''} onChange={(e) => s({ icon: e.target.value })} /></div>
              <div className="flex-1">{label('카테고리')}<input className={ic} placeholder="성장" value={eG.category ?? ''} onChange={(e) => s({ category: e.target.value })} /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">{label('배너 색상 (#hex)')}<input className={ic} placeholder="#667eea" value={eG.banner_color ?? ''} onChange={(e) => s({ banner_color: e.target.value })} /></div>
              <div className="flex items-end gap-2 pb-1"><span className="text-xs text-gray-400">미리보기</span><div className="w-8 h-8 rounded-lg border border-gray-600" style={{ background: eG.banner_color || '#333' }} /></div>
              <div className="flex-1">{label('정렬 순서')}<input className={ic} type="number" value={eG.order_index ?? 0} onChange={(e) => s({ order_index: +e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap self-end pb-2"><input type="checkbox" checked={eG.is_featured ?? false} onChange={(e) => s({ is_featured: e.target.checked })} /> 추천</label>
            </div>
          </div>
        </div>
        {rawJsonMode ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">JSON 직접 편집</span>
              <button type="button" onClick={() => setRawJsonMode(false)} className="text-xs text-primary hover:text-primary-light">구조 편집으로</button>
            </div>
            <textarea className={`${ic} min-h-[200px] font-mono text-xs`} value={eG.content} onChange={(e) => s({ content: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-3 border border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">본문 내용</span>
              <button type="button" onClick={() => setRawJsonMode(true)} className="text-xs text-gray-500 hover:text-gray-300">JSON 편집</button>
            </div>
            <div>{label('요약')}<textarea className={`${ic} min-h-[60px]`} placeholder="요약 텍스트" value={parsed.summary ?? ''} onChange={(e) => updateJson({ summary: e.target.value })} /></div>
            <div>{label('핵심 포인트 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="포인트 1&#10;포인트 2" value={(parsed.key_points ?? []).join('\n')} onChange={(e) => updateJson({ key_points: e.target.value.split('\n').filter(Boolean) })} /></div>
          </div>
        )}
        <div className="flex gap-2 justify-end">{cancelBtn(() => setEG(null))}{saveBtn(handleSave, saving || !eG.title || !eG.content, saving)}</div>
      </div>
    );
  };

  if (loading) return <Skeleton />;
  return (
    <>
      {newBtn(() => setEG(mkGuide()))}
      {eG && !eG.id && form()}
      <div className="space-y-3">
        {items.map((g) => {
          const isEditing = eG?.id === g.id;
          return (
            <div key={g.id}>
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  {g.image_url ? thumb(g.image_url, '📖', 'bg-green-900/30', onLightbox) : g.icon ? <span className="text-xl">{g.icon}</span> : thumb(undefined, '📖', 'bg-green-900/30', onLightbox)}
                  <div>
                    <span className="font-medium text-sm text-gray-100">{g.title}</span>
                    {g.is_featured && <> <Badge /></>}
                    {g.category && <span className="ml-2 text-xs text-gray-400">{g.category}</span>}
                  </div>
                </div>
                <div className="flex gap-3">{isEditing ? foldBtn(() => setEG(null)) : editBtn(() => setEG({ ...g }))}{delBtn(() => onDelete(g.id))}</div>
              </div>
              {isEditing && form()}
            </div>
          );
        })}
        {!items.length && empty('등록된 가이드가 없습니다.')}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/admin/components/AdminGuideTab.tsx
git commit -m "refactor: extract AdminGuideTab from AdminContentPage"
```

### Task 4: Create AdminCaseTab.tsx

**Files:**
- Create: `v4/src/features/admin/components/AdminCaseTab.tsx`

- [ ] **Step 1: Create case tab component**

Extract `caseForm()` (lines 280-404) and `caseTab()` (lines 407-444). Manages `eC` state + `dragIdx` ref internally.

The code is the full case form + case list from AdminContentPage lines 280-444, with:
- `eC`, `setEC` as internal state
- `dragIdx` as internal useRef
- `saving` received as prop
- `onSave`, `onDelete`, `onLightbox` as pre-bound callbacks

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/admin/components/AdminCaseTab.tsx
git commit -m "refactor: extract AdminCaseTab from AdminContentPage"
```

### Task 5: Rewrite AdminContentPage.tsx to use extracted tabs

**Files:**
- Modify: `v4/src/pages/admin/AdminContentPage.tsx`

- [ ] **Step 1: Rewrite AdminContentPage as orchestrator**

Replace the entire file. It now imports the 3 tab components and shared utilities, manages only: tab switching, loading, saving, lightbox, and data fetching.

Key changes:
- Remove all form/list rendering code
- Remove per-tab edit state (`eR`, `eG`, `eC`, `rawJsonMode`, `dragIdx`)
- Keep `tab`, `loading`, `lightboxUrl`, `saving` state
- Keep `load()` function
- `save()` now receives the item from the tab component and calls the appropriate upsert
- `del()` pre-bound per tab
- Pass `saving` as prop to each tab

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Build check**

Run: `cd v4 && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add v4/src/pages/admin/AdminContentPage.tsx
git commit -m "refactor: AdminContentPage now uses extracted tab components

Splits 479-line monolith into:
- AdminContentShared.tsx (UI helpers)
- AdminRecipeTab.tsx
- AdminGuideTab.tsx
- AdminCaseTab.tsx
- AdminContentPage.tsx (orchestrator, ~100 lines)"
```

## Chunk 2: RoutinePage Split

### Task 6: Create SectionTitle.tsx

**Files:**
- Create: `v4/src/features/routine/components/SectionTitle.tsx`

- [ ] **Step 1: Create SectionTitle component**

```tsx
// v4/src/features/routine/components/SectionTitle.tsx
interface Props {
  icon: string;
  text: string;
  right?: React.ReactNode;
}

export function SectionTitle({ icon, text, right }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <span>{icon}</span>{text}
      </h3>
      {right}
    </div>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/SectionTitle.tsx
git commit -m "refactor: extract SectionTitle from RoutinePage"
```

### Task 7: Create SleepCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/SleepCard.tsx`

- [ ] **Step 1: Create SleepCard**

```tsx
// v4/src/features/routine/components/SleepCard.tsx
import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';
import type { SleepQuality } from '@/shared/types';

const SLEEP_OPTS: { value: SleepQuality; label: string }[] = [
  { value: 'good', label: '깊게 잘잤다' },
  { value: 'bad', label: '종종 깨거나 설친다' },
];

interface Props {
  sleepTime: string;
  wakeTime: string;
  sleepQuality: SleepQuality | '';
  onSleepTimeChange: (v: string) => void;
  onWakeTimeChange: (v: string) => void;
  onSleepQualityChange: (v: SleepQuality) => void;
}

export function SleepCard({ sleepTime, wakeTime, sleepQuality, onSleepTimeChange, onWakeTimeChange, onSleepQualityChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="🌙" text="수면" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">취침 시간<input type="time" value={sleepTime} onChange={(e) => onSleepTimeChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
        <label className="text-xs text-gray-500">기상 시간<input type="time" value={wakeTime} onChange={(e) => onWakeTimeChange(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
      </div>
      <div className="flex gap-2">
        {SLEEP_OPTS.map((o) => (
          <button key={o.value} onClick={() => onSleepQualityChange(o.value)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${sleepQuality === o.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/SleepCard.tsx
git commit -m "refactor: extract SleepCard from RoutinePage"
```

### Task 8: Create WaterCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/WaterCard.tsx`

- [ ] **Step 1: Create WaterCard**

```tsx
// v4/src/features/routine/components/WaterCard.tsx
import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  waterIntake: number;
  onWaterIntakeChange: (v: number) => void;
}

export function WaterCard({ waterIntake, onWaterIntakeChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="💧" text="수분 섭취" />
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-primary">{waterIntake}ml</span>
        <div className="flex gap-2 ml-auto">
          {[100, 200, 500].map((n) => (
            <button key={n} onClick={() => onWaterIntakeChange(waterIntake + n)}
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 active:bg-blue-100">
              +{n}ml
            </button>
          ))}
        </div>
      </div>
      {waterIntake > 0 && <button onClick={() => onWaterIntakeChange(0)} className="mt-2 text-xs text-gray-400 underline">초기화</button>}
    </Card>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/WaterCard.tsx
git commit -m "refactor: extract WaterCard from RoutinePage"
```

### Task 9: Create SupplementCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/SupplementCard.tsx`

- [ ] **Step 1: Create SupplementCard**

Manages `supplList`, `showSupplSettings`, `newSupplName` internally. Includes the settings modal.

Extract from RoutinePage: lines 38-49 (constants + localStorage helpers), lines 382-401 (card JSX), lines 440-473 (modal JSX).

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/SupplementCard.tsx
git commit -m "refactor: extract SupplementCard from RoutinePage"
```

### Task 10: Create InjectionCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/InjectionCard.tsx`

- [ ] **Step 1: Create InjectionCard**

```tsx
// v4/src/features/routine/components/InjectionCard.tsx
import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';

interface Props {
  growthInjection: boolean;
  injectionTime: string;
  onGrowthInjectionChange: (v: boolean) => void;
  onInjectionTimeChange: (v: string) => void;
}

export function InjectionCard({ growthInjection, injectionTime, onGrowthInjectionChange, onInjectionTimeChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="💉" text="호르몬 주사" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">오늘 주사 투여</span>
        <button onClick={() => onGrowthInjectionChange(!growthInjection)}
          className={`relative ml-auto h-7 w-12 rounded-full transition-colors ${growthInjection ? 'bg-primary' : 'bg-gray-200'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${growthInjection ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {growthInjection && (
        <label className="block mt-3 text-xs text-gray-500">
          투여 시간
          <input type="time" value={injectionTime} onChange={(e) => onInjectionTimeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/InjectionCard.tsx
git commit -m "refactor: extract InjectionCard from RoutinePage"
```

### Task 11: Create MemoCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/MemoCard.tsx`

- [ ] **Step 1: Create MemoCard**

```tsx
// v4/src/features/routine/components/MemoCard.tsx
import Card from '@/shared/components/Card';
import { SectionTitle } from './SectionTitle';
import type { Mood } from '@/shared/types';

const MOOD_OPTS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: '좋음' },
  { value: 'normal', emoji: '😐', label: '보통' },
  { value: 'sad', emoji: '😢', label: '슬픔' },
  { value: 'tired', emoji: '😴', label: '피곤' },
  { value: 'sick', emoji: '🤒', label: '아픔' },
];

interface Props {
  mood: Mood | '';
  dailyNotes: string;
  onMoodChange: (v: Mood) => void;
  onDailyNotesChange: (v: string) => void;
}

export function MemoCard({ mood, dailyNotes, onMoodChange, onDailyNotesChange }: Props) {
  return (
    <Card>
      <SectionTitle icon="📝" text="메모" />
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
        {MOOD_OPTS.map((o) => (
          <button key={o.value} onClick={() => onMoodChange(o.value)}
            className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors flex-shrink-0 ${
              mood === o.value ? 'bg-primary/10 ring-1 ring-primary' : 'bg-gray-50'
            }`}>
            <span className="text-lg">{o.emoji}</span>
            <span className={mood === o.value ? 'text-primary font-medium' : 'text-gray-500'}>{o.label}</span>
          </button>
        ))}
      </div>
      <textarea value={dailyNotes} onChange={(e) => onDailyNotesChange(e.target.value)}
        placeholder="오늘 아이의 컨디션이나 특이사항을 기록해주세요" rows={3}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
    </Card>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/MemoCard.tsx
git commit -m "refactor: extract MemoCard from RoutinePage"
```

### Task 12: Create HeightWeightCard.tsx

**Files:**
- Create: `v4/src/features/routine/components/HeightWeightCard.tsx`

- [ ] **Step 1: Create HeightWeightCard**

Extract from RoutinePage lines 329-352. Receives all computed values as props (no growth calculations inside).

The component renders:
- Height/weight number inputs
- Percentile + prediction badges (if `measPct`/`measPred` provided)
- Hospital data section (if `child?.is_patient` and `latestBoneAge` provided)
- Growth modal button (if `measurementCount > 0`)

- [ ] **Step 2: Type check and commit**

```bash
cd v4 && npx tsc --noEmit
git add v4/src/features/routine/components/HeightWeightCard.tsx
git commit -m "refactor: extract HeightWeightCard from RoutinePage"
```

### Task 13: Rewrite RoutinePage.tsx to use extracted cards

**Files:**
- Modify: `v4/src/pages/RoutinePage.tsx`

- [ ] **Step 1: Rewrite RoutinePage as orchestrator**

Replace inline card JSX with imported components. Keep all state, effects, and calculations in the page.

Key changes:
- Remove `SLEEP_OPTS`, `MOOD_OPTS`, `DEFAULT_SUPPLEMENTS`, `SUPPL_STORAGE_KEY`, `loadSupplementList`, `saveSupplementList`
- Remove `SectionTitle` (now imported from extracted file)
- Keep `Chevron` (only used in page nav)
- Replace inline card JSX with `<SleepCard .../>`, `<WaterCard .../>`, etc.
- Remove supplement settings modal (now inside SupplementCard)

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Build check**

Run: `cd v4 && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add v4/src/pages/RoutinePage.tsx
git commit -m "refactor: RoutinePage now uses extracted card components

Splits 477-line page into:
- SectionTitle.tsx, HeightWeightCard.tsx, SleepCard.tsx
- WaterCard.tsx, SupplementCard.tsx, InjectionCard.tsx, MemoCard.tsx
- RoutinePage.tsx (orchestrator, ~200 lines)"
```

## Chunk 3: CLAUDE.md Cleanup

### Task 14: Update CLAUDE.md Known Issues

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Known Issues section**

Replace the current Known Issues block:

```markdown
## Known Issues (from audit)
- `AdminContentPage.tsx` (479 lines) — needs splitting into sub-components
- `RoutinePage.tsx` (402 lines) — needs form extraction
- Dead code: `GrowthPage.tsx` (unreachable from router)
- Duplicate `fetchMealsByRoutine` in both `routineService.ts` and `mealService.ts`
```

With:

```markdown
## Known Issues (from audit)
- All previously tracked issues have been resolved.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md - all known issues resolved"
```

### Task 15: Final verification

- [ ] **Step 1: Full build**

Run: `cd v4 && npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 2: Type check**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Verify file sizes**

Check that no new file exceeds 200 lines:
```bash
wc -l v4/src/features/admin/components/AdminContentShared.tsx v4/src/features/admin/components/AdminRecipeTab.tsx v4/src/features/admin/components/AdminGuideTab.tsx v4/src/features/admin/components/AdminCaseTab.tsx v4/src/pages/admin/AdminContentPage.tsx v4/src/features/routine/components/SectionTitle.tsx v4/src/features/routine/components/HeightWeightCard.tsx v4/src/features/routine/components/SleepCard.tsx v4/src/features/routine/components/WaterCard.tsx v4/src/features/routine/components/SupplementCard.tsx v4/src/features/routine/components/InjectionCard.tsx v4/src/features/routine/components/MemoCard.tsx v4/src/pages/RoutinePage.tsx
```
Expected: All files under 200 lines (AdminCaseTab may be close to 180)
