# 릴 에디터 라벨 편집 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 릴 에디터 프리뷰에서 인서트 라벨을 클릭 선택·하이라이트하고, 정사각 5% 격자로 자석 이동(마우스 드래그 + 화살표)하며, 폰트·볼드·글자색·외각색·그림자를 편집한다.

**Architecture:** 순수 헬퍼(`snapFrac`/`nudgeLabel` v4 utils, `labelBoxStyle` remotion)로 스냅·이동·스타일 로직을 분리(테스트). 선택 상태는 `ReelEditorPanel`에 `selectedLabelIdx`로 두고 `CanvasDragLayer`(캔버스 하이라이트·스냅 드래그·선택)와 `ChunkInspector`(카드 하이라이트·클릭 선택·스타일 컨트롤)에 전달, 화살표 nudge는 패널 keydown effect. 라벨 실제 스타일은 `PresenterShort` InsertPanel이 `labelBoxStyle`로 렌더 → 프리뷰·워커 동일.

**Tech Stack:** React + TypeScript(v4, `tsc -b`), Remotion(remotion, `tsc --noEmit`), 테스트: v4 `node --import tsx --test scripts/test/*.mjs` / remotion `node --test src/lib/*.test.mjs`(Node 24).

**스펙:** `docs/superpowers/specs/2026-06-16-reel-label-edit-enhance-design.md`

---

## File Structure

- `v4/src/features/marketing/utils/reelEditor.ts` (수정) — `snapFrac`·`nudgeLabel` 순수 헬퍼 추가.
- `v4/scripts/test/reelEditor.mjs` (생성) — 위 헬퍼 단위테스트.
- `v4/src/features/marketing/types.ts` (수정) — `ReelInsertLabel`에 `font?`·`stroke?`·`shadow?`.
- `remotion/src/lib/labelStyle.mjs` (생성) — `labelBoxStyle(L)` 순수 정적 스타일 빌더.
- `remotion/src/lib/labelStyle.d.mts` (생성) — 타입 사이드카.
- `remotion/src/lib/labelStyle.test.mjs` (생성) — 단위테스트.
- `remotion/src/shorts/_shared/PresenterShort.tsx` (수정) — InsertPanel이 `labelBoxStyle` 사용.
- `v4/.../reelEditor/CanvasDragLayer.tsx` (수정) — 클릭 선택 + 스냅 드래그 + 선택 하이라이트.
- `v4/.../reelEditor/ReelEditorPanel.tsx` (수정) — `selectedLabelIdx` 상태 + 화살표 nudge + 배선.
- `v4/.../reelEditor/ChunkInspector.tsx` (수정) — 카드 하이라이트·클릭 선택 + 스타일 컨트롤.

---

### Task 1: 스냅·nudge 순수 헬퍼 (TDD)

**Files:**
- Modify: `v4/src/features/marketing/utils/reelEditor.ts`
- Test: `v4/scripts/test/reelEditor.mjs`

- [ ] **Step 1: Write the failing test** — create `v4/scripts/test/reelEditor.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { snapFrac, nudgeLabel } from '../../src/features/marketing/utils/reelEditor.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('snapFrac: 0.05 격자 반올림', () => {
  close(snapFrac(0.06), 0.05);
  close(snapFrac(0.08), 0.10);
  close(snapFrac(0.5), 0.5);
});
test('snapFrac: 0..1 clamp', () => {
  close(snapFrac(-0.3), 0);
  close(snapFrac(1.4), 1);
});
test('nudgeLabel: step 이동 + 기타 필드 보존', () => {
  const r = nudgeLabel({ x: 0.5, y: 0.5, ko: 'a' }, 1, 0);
  close(r.x, 0.55); close(r.y, 0.5); assert.equal(r.ko, 'a');
  const u = nudgeLabel({ x: 0.5, y: 0.5 }, 0, -1);
  close(u.y, 0.45);
});
test('nudgeLabel: 모서리에서 정지(clamp)', () => {
  const r = nudgeLabel({ x: 0.98, y: 0.02 }, 1, -1);
  close(r.x, 1); close(r.y, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd v4; npm test`
Expected: FAIL — `snapFrac`/`nudgeLabel` export 없음.

- [ ] **Step 3: Add the helpers** to `v4/src/features/marketing/utils/reelEditor.ts`, immediately AFTER the `pxToPanelFrac` function (ends ~line 34, before the `// 주의: stickerFrames` comment):

```ts
/** 분수 좌표를 step(기본 0.05=5%) 격자에 스냅 + 0..1 clamp. */
export function snapFrac(v: number, step = 0.05): number {
  return clamp01(Math.round(v / step) * step);
}
/** 라벨을 dx·dy(격자 칸 수)만큼 이동 — step 격자, x·y clamp 0..1, 나머지 필드 보존. */
export function nudgeLabel<T extends { x: number; y: number }>(label: T, dx: number, dy: number, step = 0.05): T {
  return { ...label, x: clamp01(label.x + dx * step), y: clamp01(label.y + dy * step) };
}
```
(`clamp01` is already module-private at line 10 — reuse it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd v4; npm test`
Expected: PASS — the new reelEditor tests pass (and existing suite stays green).

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/utils/reelEditor.ts v4/scripts/test/reelEditor.mjs
git commit -m "feat(reel-editor): snapFrac/nudgeLabel 순수 헬퍼 + 테스트"
```

---

### Task 2: ReelInsertLabel 타입 확장

**Files:**
- Modify: `v4/src/features/marketing/types.ts`

- [ ] **Step 1: Add the style fields**

The current type (around line 168):
```ts
export type ReelInsertLabel = {
  x: number; y: number;        // 인서트 패널 존 내 분수 (캔버스 분수와 다른 좌표계!)
  size?: number; weight?: number; color?: string; pill?: string;
} & Partial<Record<ReelLang, string>>;
```
Replace with:
```ts
export type ReelInsertLabel = {
  x: number; y: number;        // 인서트 패널 존 내 분수 (캔버스 분수와 다른 좌표계!)
  size?: number; weight?: number; color?: string; pill?: string;
  font?: 'kr' | 'thai' | 'inter' | 'sc' | 'tc'; stroke?: string; shadow?: boolean;
} & Partial<Record<ReelLang, string>>;
```

- [ ] **Step 2: Typecheck**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/types.ts
git commit -m "feat(reel-editor): ReelInsertLabel font/stroke/shadow 필드"
```

---

### Task 3: labelBoxStyle 순수 스타일 빌더 (TDD)

**Files:**
- Create: `remotion/src/lib/labelStyle.mjs`, `remotion/src/lib/labelStyle.d.mts`, `remotion/src/lib/labelStyle.test.mjs`

- [ ] **Step 1: Write the failing test** — create `remotion/src/lib/labelStyle.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { labelBoxStyle } from "./labelStyle.mjs";

test("폰트맵: 기본 kr, 키별 분기", () => {
  assert.match(labelBoxStyle({}).fontFamily, /Noto Sans KR/);
  assert.match(labelBoxStyle({ font: "inter" }).fontFamily, /Inter/);
  assert.match(labelBoxStyle({ font: "sc" }).fontFamily, /Noto Sans SC/);
  assert.match(labelBoxStyle({ font: "tc" }).fontFamily, /Noto Sans TC/);
});
test("그림자 기본값: pill 없으면 on, pill 있으면 off, 명시 우선", () => {
  assert.notEqual(labelBoxStyle({}).textShadow, "none");
  assert.equal(labelBoxStyle({ pill: "#fff" }).textShadow, "none");
  assert.equal(labelBoxStyle({ shadow: false }).textShadow, "none");
  assert.notEqual(labelBoxStyle({ pill: "#fff", shadow: true }).textShadow, "none");
});
test("외각: stroke 있으면 WebkitTextStroke+paintOrder, 없으면 미포함", () => {
  const s = labelBoxStyle({ stroke: "#000" });
  assert.equal(s.WebkitTextStroke, "2px #000");
  assert.equal(s.paintOrder, "stroke fill");
  assert.equal(labelBoxStyle({}).WebkitTextStroke, undefined);
});
test("pill: 배경/패딩, 없으면 배경 미포함", () => {
  assert.equal(labelBoxStyle({ pill: "#E0568A" }).background, "#E0568A");
  assert.equal(labelBoxStyle({}).background, undefined);
});
test("size/weight/color 기본값", () => {
  const d = labelBoxStyle({});
  assert.equal(d.fontSize, 40);
  assert.equal(d.fontWeight, 800);
  assert.equal(d.color, "#1f2430");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd remotion; node --test src/lib/labelStyle.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `remotion/src/lib/labelStyle.mjs`:**

```js
// 인서트 라벨 정적 스타일(폰트/크기/굵기/색/외각/그림자/pill) — 순수.
// InsertPanel 이 여기에 애니메이션(위치·opacity·scale)을 합성해 렌더.
// FONT_MAP 은 fonts.ts 패밀리 문자열과 동기(변경 시 양쪽 수정).
const FONT_MAP = {
  kr: "'Noto Sans KR', 'Noto Sans Thai', sans-serif",
  thai: "'Noto Sans Thai', 'Noto Sans KR', sans-serif",
  inter: "'Inter', sans-serif",
  sc: "'Noto Sans SC', 'Noto Sans KR', sans-serif",
  tc: "'Noto Sans TC', 'Noto Sans KR', sans-serif",
};

export function labelBoxStyle(L) {
  const style = {
    fontFamily: FONT_MAP[L.font] ?? FONT_MAP.kr,
    fontSize: L.size ?? 40,
    fontWeight: L.weight ?? 800,
    color: L.color ?? "#1f2430",
    whiteSpace: "pre",
    textAlign: "center",
    lineHeight: 1.15,
    textShadow: (L.shadow ?? !L.pill) ? "0 2px 10px rgba(0,0,0,0.18)" : "none",
  };
  if (L.stroke) {
    style.WebkitTextStroke = "2px " + L.stroke;
    style.paintOrder = "stroke fill";
  }
  if (L.pill) {
    style.background = L.pill;
    style.padding = "6px 18px";
    style.borderRadius = 14;
    style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
  }
  return style;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd remotion; node --test src/lib/labelStyle.test.mjs`
Expected: PASS (tests 5, pass 5, fail 0).

- [ ] **Step 5: Create `remotion/src/lib/labelStyle.d.mts`:**

```ts
import type { CSSProperties } from "react";
export type LabelStyleInput = {
  font?: "kr" | "thai" | "inter" | "sc" | "tc";
  size?: number; weight?: number; color?: string; stroke?: string; shadow?: boolean; pill?: string;
};
export function labelBoxStyle(L: LabelStyleInput): CSSProperties;
```

- [ ] **Step 6: Commit**

```bash
git add remotion/src/lib/labelStyle.mjs remotion/src/lib/labelStyle.d.mts remotion/src/lib/labelStyle.test.mjs
git commit -m "feat(remotion): labelBoxStyle 순수 라벨 스타일 빌더 + 테스트"
```

---

### Task 4: InsertPanel 이 labelBoxStyle 사용

**Files:**
- Modify: `remotion/src/shorts/_shared/PresenterShort.tsx`

READ the file first (parallel edits may have shifted lines). The label rendering lives in the `InsertPanel` component, inside `labels.map((L, k) => { ... })`.

- [ ] **Step 1: Import labelBoxStyle**

Add after the existing `import { ... } from "../../lib/captions.mjs";` (or after the other `../../lib/*` imports):
```tsx
import { labelBoxStyle } from "../../lib/labelStyle.mjs";
```

- [ ] **Step 2: Replace the label's inline static style with `labelBoxStyle(L)`**

Find the label `<div>` inside `InsertPanel`'s `labels.map(...)` — currently:
```tsx
          <div key={k} style={{
            position: "absolute", left: `${L.x * 100}%`, top: `${L.y * 100}%`,
            transform: `translate(-50%,-50%) scale(${interpolate(lpop, [0, 1], [0.7, 1], clamp)})`,
            fontFamily: NOTO_SANS_KR, fontSize: L.size ?? 40, fontWeight: L.weight ?? 800,
            color: L.color ?? "#1f2430", whiteSpace: "pre", textAlign: "center", lineHeight: 1.15, opacity: lop,
            textShadow: L.pill ? "none" : "0 2px 10px rgba(0,0,0,0.18)",
            ...(L.pill ? { background: L.pill, padding: "6px 18px", borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.12)" } : {}),
          }}>{txt}</div>
```
Replace the `style` object with (keep position/transform/opacity, delegate the rest to `labelBoxStyle`):
```tsx
          <div key={k} style={{
            position: "absolute", left: `${L.x * 100}%`, top: `${L.y * 100}%`,
            transform: `translate(-50%,-50%) scale(${interpolate(lpop, [0, 1], [0.7, 1], clamp)})`,
            opacity: lop,
            ...labelBoxStyle(L),
          }}>{txt}</div>
```
(`NOTO_SANS_KR` import stays — still used by header/caption/intro/CTA. Only the label's font now comes from `labelBoxStyle`.)

- [ ] **Step 3: Typecheck**

Run: `cd remotion; npx tsc --noEmit`
Expected: exit 0. (`labelBoxStyle` types via `labelStyle.d.mts`; returns `CSSProperties` so the spread is valid.)

- [ ] **Step 4: Commit**

```bash
git add remotion/src/shorts/_shared/PresenterShort.tsx
git commit -m "feat(remotion): InsertPanel 라벨 스타일을 labelBoxStyle 로 (폰트/외각/그림자)"
```

---

### Task 5: CanvasDragLayer — 클릭 선택 + 스냅 드래그 + 하이라이트

**Files:**
- Modify: `v4/src/features/marketing/components/content/reelEditor/CanvasDragLayer.tsx`

- [ ] **Step 1: Import snapFrac**

Change the utils import line to add `snapFrac`:
```tsx
import { PANEL_H_FRAC, PANEL_TOP_FRAC, pxToCanvasFrac, pxToPanelFrac, snapFrac, type RectLike } from '../../../utils/reelEditor';
```

- [ ] **Step 2: Add selection props**

Change `interface Props` to add two:
```tsx
interface Props {
  chunk: ReelChunk;
  language: ReelLang;
  selectedIdx: number | null;
  onSelectLabel: (idx: number) => void;
  onCommit: (labels: ReelInsertLabel[]) => void;           // 라벨 위치 커밋
  onCommitStickers: (stickers: ReelStickerItem[]) => void; // 스티커 위치/크기 커밋
}
```
And destructure them:
```tsx
export function CanvasDragLayer({ chunk, language, selectedIdx, onSelectLabel, onCommit, onCommitStickers }: Props) {
```

- [ ] **Step 3: Select on label pointerdown**

Change `onLabelDown` to also select:
```tsx
  const onLabelDown = (idx: number) => (e: React.PointerEvent) => {
    onSelectLabel(idx);
    const rect = startRect(e);
    if (rect) setDrag({ type: 'label', idx, labels: committedLabels, rect });
  };
```

- [ ] **Step 4: Snap label drag to 5% grid**

In `onPointerMove`, the label branch currently:
```tsx
    if (drag.type === 'label') {
      const { x, y } = pxToPanelFrac(e.clientX, e.clientY, drag.rect);
      setDrag((d) => (d && d.type === 'label'
        ? { ...d, labels: d.labels.map((l, i) => (i === d.idx ? { ...l, x, y } : l)) }
        : d));
      return;
    }
```
Replace with (snap both axes):
```tsx
    if (drag.type === 'label') {
      const raw = pxToPanelFrac(e.clientX, e.clientY, drag.rect);
      const x = snapFrac(raw.x), y = snapFrac(raw.y);
      setDrag((d) => (d && d.type === 'label'
        ? { ...d, labels: d.labels.map((l, i) => (i === d.idx ? { ...l, x, y } : l)) }
        : d));
      return;
    }
```

- [ ] **Step 5: Highlight selected label**

The label render `<div>` `className` currently:
```tsx
            className="pointer-events-auto absolute flex max-w-[60%] cursor-move select-none items-center justify-center rounded border border-dashed border-fuchsia-400/90 bg-fuchsia-500/10 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-fuchsia-700"
```
Replace with a conditional (선택=시안 실선, 비선택=기존 자홍 점선):
```tsx
            className={
              'pointer-events-auto absolute flex max-w-[60%] cursor-move select-none items-center justify-center rounded px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight ' +
              (i === selectedIdx
                ? 'border-2 border-cyan-400 bg-cyan-400/20 text-cyan-800'
                : 'border border-dashed border-fuchsia-400/90 bg-fuchsia-500/10 text-fuchsia-700')
            }
```

- [ ] **Step 6: Typecheck**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0. (Callers updated in Task 6; this task leaves a temporary type error at the call site in ReelEditorPanel — if tsc -b flags the missing props at the CanvasDragLayer usage, that is EXPECTED and fixed in Task 6. If so, note it and proceed; the implementer of this task should still confirm THIS file has no errors of its own.)

> Note: because `selectedIdx`/`onSelectLabel` are now required props, `ReelEditorPanel`'s existing `<CanvasDragLayer .../>` will fail tsc until Task 6. That cross-file error is expected. This task's file itself must be internally correct.

- [ ] **Step 7: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/CanvasDragLayer.tsx
git commit -m "feat(reel-editor): 캔버스 라벨 클릭 선택 + 5% 스냅 드래그 + 선택 하이라이트"
```

---

### Task 6: ReelEditorPanel — 선택 상태 + 화살표 nudge + 배선

**Files:**
- Modify: `v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx`

- [ ] **Step 1: Import nudgeLabel**

Add `nudgeLabel` to the utils import:
```tsx
import {
  FALLBACK_CHUNK_FRAMES, chunkDurations, chunkStarts, totalFrames, updateChunk, nudgeLabel,
} from '../../../utils/reelEditor';
```

- [ ] **Step 2: Add selectedLabelIdx state** (inside `EditorInner`, near `const [selected, setSelected] = useState(0);`):
```tsx
  const [selectedLabelIdx, setSelectedLabelIdx] = useState<number | null>(null);
```

- [ ] **Step 3: Reset label selection on chunk/language/content change**

Add an effect after the existing `useEffect(() => { setSelected(0); }, [language]);`:
```tsx
  useEffect(() => { setSelectedLabelIdx(null); }, [selected, language, article.id]);
```

- [ ] **Step 4: Arrow-key nudge + Esc deselect effect**

Add after the effect from Step 3 (uses `sel`/`selChunk`/`patchSelChunk` defined later in the component — they are in scope at render but effects close over current values; place this effect AFTER `selChunk`/`patchSelChunk` are defined, i.e. just before the `return (`):
```tsx
  useEffect(() => {
    const NUDGE: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'Escape') { setSelectedLabelIdx(null); return; }
      if (selectedLabelIdx == null) return;
      const d = NUDGE[e.key];
      if (!d) return;
      const labels = Array.isArray(selChunk.insertLabels) ? (selChunk.insertLabels as ReelInsertLabel[]) : [];
      if (selectedLabelIdx >= labels.length) return;
      e.preventDefault();
      const next = labels.map((l, i) => (i === selectedLabelIdx ? nudgeLabel(l, d[0], d[1]) : l));
      patchSelChunk(sel, { insertLabels: next });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedLabelIdx, selChunk, sel, patchSelChunk]);
```
Add `ReelInsertLabel` to the type import at the top:
```tsx
import type { ReelChunk, ReelInsertLabel } from '../../../types';
```
(The existing `import type { ReelChunk } from '../../../types';` line — extend it to include `ReelInsertLabel`.)

- [ ] **Step 5: Pass selection props to CanvasDragLayer**

The existing `<CanvasDragLayer ... />`:
```tsx
          <CanvasDragLayer
            chunk={selChunk}
            language={lang}
            onCommit={(insertLabels) => patchSelChunk(sel, { insertLabels })}
            onCommitStickers={(stickers) => patchSelChunk(sel, { stickers })}
          />
```
Add the two new props:
```tsx
          <CanvasDragLayer
            chunk={selChunk}
            language={lang}
            selectedIdx={selectedLabelIdx}
            onSelectLabel={setSelectedLabelIdx}
            onCommit={(insertLabels) => patchSelChunk(sel, { insertLabels })}
            onCommitStickers={(stickers) => patchSelChunk(sel, { stickers })}
          />
```

- [ ] **Step 6: Pass selection props to ChunkInspector**

The existing `<ChunkInspector ... />` — add two props:
```tsx
          <ChunkInspector
            chunk={selChunk}
            chunkIdx={sel}
            chunkCount={chunks.length}
            language={lang}
            reelAssets={article.reelAssets ?? {}}
            runtime={runtime}
            selectedLabelIdx={selectedLabelIdx}
            onSelectLabel={setSelectedLabelIdx}
            onPatch={(patch) => patchSelChunk(sel, patch)}
          />
```

- [ ] **Step 7: Typecheck**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0 IF Task 7 already added the ChunkInspector props. If running before Task 7, `ChunkInspector` will error on the unknown `selectedLabelIdx`/`onSelectLabel` props — that cross-file error is expected and resolved in Task 7. Confirm THIS file is internally correct (CanvasDragLayer now satisfied).

- [ ] **Step 8: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/ReelEditorPanel.tsx
git commit -m "feat(reel-editor): selectedLabelIdx 상태 + 화살표 nudge/Esc + 선택 배선"
```

---

### Task 7: ChunkInspector — 카드 하이라이트·클릭 선택 + 스타일 컨트롤

**Files:**
- Modify: `v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx`

- [ ] **Step 1: Add selection props**

`interface Props` — add two optional props:
```tsx
interface Props {
  chunk: ReelChunk;
  chunkIdx: number;
  chunkCount: number;
  language: ReelLang;
  reelAssets: ReelAssets;
  runtime: ReelRuntimeDoc | null;
  selectedLabelIdx?: number | null;
  onSelectLabel?: (idx: number) => void;
  onPatch: (patch: Partial<ReelChunk>) => void;
}
```
Destructure:
```tsx
export function ChunkInspector({ chunk, chunkIdx, chunkCount, language, reelAssets, runtime, selectedLabelIdx, onSelectLabel, onPatch }: Props) {
```

- [ ] **Step 2: Widen patchLabel to accept boolean** (for `shadow`)

The current `patchLabel`:
```tsx
  const patchLabel = (idx: number, field: keyof ReelInsertLabel | ReelLang, value: string | number | undefined) => {
```
Change the value type to include boolean:
```tsx
  const patchLabel = (idx: number, field: keyof ReelInsertLabel | ReelLang, value: string | number | boolean | undefined) => {
```

- [ ] **Step 3: Make each label card selectable + highlighted**

The label card opening `<div>`:
```tsx
                <div key={i} className="rounded border border-gray-100 bg-gray-50/60 p-2">
```
Replace with click-to-select + conditional highlight:
```tsx
                <div
                  key={i}
                  onClick={() => onSelectLabel?.(i)}
                  className={
                    'cursor-pointer rounded p-2 ' +
                    (i === selectedLabelIdx
                      ? 'border-2 border-cyan-400 bg-cyan-50'
                      : 'border border-gray-100 bg-gray-50/60')
                  }
                >
```

- [ ] **Step 4: Add the style controls**

Inside each label card, the second row currently holds 크기/색/pill (`<div className="flex items-center gap-3">...`). REPLACE that whole `<div className="flex items-center gap-3">...</div>` block with the expanded controls (크기·색·외각·그림자 on one wrapped row, 폰트·굵기·pill on another):

```tsx
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      크기
                      <input
                        type="number"
                        value={l.size ?? 32}
                        onChange={(e) => patchLabel(i, 'size', Number(e.target.value) || undefined)}
                        className="w-14 rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      폰트
                      <select
                        value={l.font ?? 'kr'}
                        onChange={(e) => patchLabel(i, 'font', e.target.value)}
                        className="rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      >
                        <option value="kr">한국어</option>
                        <option value="thai">태국어</option>
                        <option value="inter">Inter</option>
                        <option value="sc">간체</option>
                        <option value="tc">번체</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      굵기
                      <select
                        value={l.weight ?? 800}
                        onChange={(e) => patchLabel(i, 'weight', Number(e.target.value))}
                        className="rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      >
                        <option value={400}>보통</option>
                        <option value={800}>굵게</option>
                        <option value={900}>매우굵게</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      색
                      <input
                        type="color"
                        value={l.color ?? '#5b3fa6'}
                        onChange={(e) => patchLabel(i, 'color', e.target.value)}
                        className="h-5 w-7 cursor-pointer rounded border border-gray-200"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      외각
                      <input
                        type="color"
                        value={l.stroke ?? '#000000'}
                        onChange={(e) => patchLabel(i, 'stroke', e.target.value)}
                        className="h-5 w-7 cursor-pointer rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => patchLabel(i, 'stroke', undefined)}
                        className="rounded border border-gray-200 px-1 text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        없음
                      </button>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      <input
                        type="checkbox"
                        checked={l.shadow ?? !l.pill}
                        onChange={(e) => patchLabel(i, 'shadow', e.target.checked)}
                        className="accent-[#4A2D6B]"
                      />
                      그림자
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      pill 배경
                      <CommitInput
                        value={l.pill ?? ''}
                        onCommit={(v) => patchLabel(i, 'pill', v || undefined)}
                        placeholder="없음"
                        className="w-20 rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      />
                    </label>
                  </div>
```

- [ ] **Step 5: Prevent text-input clicks from being swallowed by card select**

The label text `CommitInput` and 삭제 button sit in a row above the controls. Card-level `onClick` selects — that's fine (clicking anywhere in the card selects it). No change needed; clicking inputs both selects the card AND focuses the input (acceptable). Leave as is.

- [ ] **Step 6: Typecheck**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0 (now ReelEditorPanel's ChunkInspector props are satisfied, and patchLabel accepts boolean for `shadow`).

- [ ] **Step 7: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/ChunkInspector.tsx
git commit -m "feat(reel-editor): 라벨 카드 클릭 선택·하이라이트 + 폰트/굵기/외각/그림자 컨트롤"
```

---

### Task 8: 검증 + 문서

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full gates**

Run: `cd remotion; node --test src/lib/labelStyle.test.mjs; npx tsc --noEmit`
Expected: labelStyle 5/5 pass, tsc-remotion exit 0.

Run: `cd v4; npm test; npx tsc -b --noEmit`
Expected: reelEditor tests pass (+ existing suite green), tsc-v4 exit 0.

- [ ] **Step 2: CLAUDE.md 반영**

In `CLAUDE.md`, the reel-editor entry (`**릴스 라이트 에디터**`) — append a sentence to the canvas-drag description (near the `CanvasDragLayer` mention):
```
**(2026-06-16) 라벨 편집 강화**: 프리뷰 라벨 클릭=선택(캔버스 시안 아웃라인+인스펙터 카드 하이라이트, 양방향), 정사각 0.05(5%) 격자 자석 이동(드래그 라이브 스냅 `snapFrac` + 화살표 `nudgeLabel`·Esc 해제). 스타일 컨트롤 폰트(5종)/굵기/글자색/외각색/그림자 — `ReelInsertLabel` `font?/stroke?/shadow?` + 렌더는 순수 `remotion/src/lib/labelStyle.mjs labelBoxStyle`(InsertPanel·무회귀: shadow 미지정=pill없으면 on). pill 배경=라벨 둥근 배경색(비우면 글자+그림자).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: 릴 에디터 라벨 편집 강화 반영"
```

---

## 무회귀 / 검증 노트

- `labelBoxStyle`의 `shadow ?? !pill` = 기존 InsertPanel 동작과 동일(기존 라벨 모양 불변). `stroke`/`font` 미지정 = 외각 없음/kr.
- 선택·하이라이트는 에디터 DOM 전용 → Remotion 렌더 산출 무영향.
- 인터랙션(클릭 선택·드래그 라이브 스냅·화살표 nudge·하이라이트)·실제 폰트/외각/그림자 모양은 **로컬 프리뷰 수동 검증**(인서트 이미지 있는 릴스를 에디터에서 열어 확인). 단위테스트는 `snapFrac`/`nudgeLabel`/`labelBoxStyle` 순수 로직 커버.
- 화살표 연타 시 undo 스냅샷 다수는 v1 허용(스펙 열린 항목). 외각 굵기 2px·선택 색은 시각 보고 후속 미세조정 가능.
