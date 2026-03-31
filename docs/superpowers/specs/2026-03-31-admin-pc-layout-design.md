# Admin Website Page — PC Split Layout Design (IMPLEMENTED)

## Summary

Redesign `AdminWebsitePage.tsx` from a vertical mobile-first stack to a horizontal split layout optimized for PC:
- **Left 35%**: Mobile preview (sticky, dark background, phone frame)
- **Right 65%**: Section tabs + slide tabs + editor form (scrollable)

## Current State

`AdminWebsitePage.tsx` (626 lines) renders everything in a single vertical column:
1. Header + save button (`max-w-lg mx-auto` — must be removed for PC)
2. Section tabs (draggable)
3. Section title input + delete
4. Slide tabs (draggable) + add/move/delete buttons
5. Slide move/delete controls (← → ✕)
6. Mobile preview (MobilePreview wrapper around SectionCarousel)
7. Slide editor form (banner or video fields)

All stacked vertically — requires scrolling past preview to reach editor.

## Target Layout

```
┌──────────────────────────────────────────────────┐
│ Header: 웹사이트 관리                    [저장]   │  ← full-width, ~56px
├────────────────┬─────────────────────────────────┤
│                │ Section tabs (drag)  [+ 추가]   │
│                ├─────────────────────────────────┤
│   Dark bg      │ Section title        [삭제]     │
│                ├─────────────────────────────────┤
│  ┌──────────┐  │ Slide tabs + [←→✕]  [+📸][+🎬] │
│  │  Phone   │  ├─────────────────────────────────┤
│  │  Frame   │  │                                 │
│  │ (351×439)│  │  Editor Form (scrollable)       │
│  │          │  │  - Image upload                 │
│  └──────────┘  │  - Title / Subtitle (2-col)     │
│   ● ● ●       │  - Position / CTA (2-col)       │
│  (sticky)      │  - etc.                         │
│   35%          │          65%                    │
└────────────────┴─────────────────────────────────┘
```

## Design Decisions

### 1. Left panel — Preview (sticky)
- `position: sticky; top: 56px; height: calc(100vh - 56px)` (accounts for header height)
- Dark background (`bg-slate-900`) with centered phone frame
- Existing `SectionCarousel` + `force-mobile` CSS unchanged
- MobilePreview wrapper: keep existing aspect-[4/5] and scale logic — works fine in 35% panel since it scales to parent width
- Dot indicators below phone frame
- Slide move/delete controls (← → ✕) stay in **right panel** with slide tabs, NOT in preview

### 2. Right panel — Editor (scrollable)
- Contains ALL editing UI: section tabs, slide tabs, slide controls, editor form
- `height: calc(100vh - 56px); overflow-y: auto` for independent scrolling within the panel
- Section tabs at top (draggable, same dnd-kit logic)

### 3. Header
- Remove `max-w-lg mx-auto` constraint — full-width on PC
- `sticky top-0 z-40` — stays above both panels
- The flex split container sits below the header

### 4. Editor form 2-column grid
- On PC (md+): title/subtitle side by side, textPosition/CTA side by side
- Each textarea+toolbar combo gets `min-w-0` to prevent overflow
- Falls back to single column on smaller screens

### 5. Mobile fallback
- Below `lg:` breakpoint (1024px) → revert to current vertical stack layout
- Use `flex-col lg:flex-row` pattern
- Changed from `md:` to `lg:` since 768px is too narrow for comfortable split editing

### 6. Empty state
- When `slides.length === 0`: empty state renders in the **right panel** only
- Left panel shows SectionCarousel which handles its own empty rendering

### 7. Component extraction
- Current file is 626 lines (exceeds 200-line convention)
- Extract into sub-components during implementation:
  - `AdminPreviewPanel.tsx` — left sticky preview panel
  - `AdminEditorPanel.tsx` — right editor panel (tabs + form)
  - `BannerSlideEditor.tsx` — banner form fields
  - `VideoSlideEditor.tsx` — video form fields
- Main `AdminWebsitePage.tsx` keeps: state, handlers, dnd-kit context, layout shell

## Files to Modify/Create

| File | Change |
|------|--------|
| `AdminWebsitePage.tsx` | Restructure into layout shell + extract sub-components |
| `AdminPreviewPanel.tsx` | **NEW** — Left sticky preview panel |
| `AdminEditorPanel.tsx` | **NEW** — Right editor panel with tabs + form |
| `BannerSlideEditor.tsx` | **NEW** — Banner slide form fields |
| `VideoSlideEditor.tsx` | **NEW** — Video slide form fields |

## What Does NOT Change

- All state management (sections, activeSection, activeSlide, saving)
- dnd-kit drag and drop logic (sections + slides)
- SectionCarousel rendering + force-mobile CSS
- MobilePreview wrapper (scale logic works in new parent)
- ImageUploader component
- DB save/load logic (websiteSectionService)
- PIN authentication flow
- Type definitions
- All editor form fields and their behavior
- Add slide menu (banner/video)

## Implementation Approach

1. Extract sub-components first (preview panel, editor panel, slide editors)
2. Remove `max-w-lg mx-auto` from header and main content
3. Wrap content area below header in `flex-col lg:flex-row`
4. Left panel: `w-full lg:w-[35%] lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]`
5. Right panel: `w-full lg:w-[65%] lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto`
6. Add `grid grid-cols-1 lg:grid-cols-2 gap-4` for form field pairs in banner editor
7. Test: dnd-kit drag in narrower panel, scroll behavior, mobile fallback
