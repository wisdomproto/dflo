# 187 성장케어 - Project Guide

## Project Overview
소아 성장 관리 플랫폼 (연세새봄의원 187 성장 클리닉)
- **v3** (legacy): `./` root에 Vanilla JS + Supabase + Cloudflare Pages
- **v4** (active): `./v4/` 디렉토리에 React + TypeScript + Vite
- **ai-server**: `./ai-server/` Express + Gemini AI

## Tech Stack
- React 19 + TypeScript 5 + Vite 7
- Tailwind CSS 4 (@tailwindcss/vite plugin, NO tailwind.config.js)
- Zustand (state), Supabase (DB/Auth/Storage), Chart.js (charts)
- Google Gemini 2.5 Flash (AI via ai-server)

## Commands
```bash
cd v4 && npm run dev          # Dev server
cd v4 && npm run build        # Production build
cd v4 && npx tsc --noEmit     # Type check
cd ai-server && npm run dev   # AI server (port 3001)
```

## Conventions
- **Language**: All UI text in Korean (한국어)
- **Component size**: Max ~200 lines (absolute max 350)
- **Styling**: Tailwind CSS only, mobile-first
- **State**: Zustand with individual selectors `useStore((s) => s.field)`
- **Imports**: `@/` path alias (maps to `src/`)
- **Services**: Supabase queries in `features/*/services/`
- **Types**: All shared types in `shared/types/index.ts`
- **Exports**: Named exports for feature components, default exports for pages/shared
- **Logging**: Use `logger` from `@/shared/lib/logger`

## Key Design Decisions
- Legacy DB auth: plaintext password in `users` table
- RLS policies (parents see own children, admin sees all)
- Feature-based directory structure
- Lazy-loaded pages via React Router
- Custom theme: primary (#667eea), secondary (#764ba2)
- Supabase Storage: `content-images` bucket, `meal-photos` bucket
- Image compression: 1200x1200 JPEG 80% before upload
- Website sections: Instagram card-news style (4:5 ratio cards, swipe carousel)
- Per-slide templates: banner, video, cases (3 types) in same section
- DB: `website_sections` table (JSONB slides), legacy fallback to `website_banners`
- Admin: PC split layout (left 35% preview, right 65% editor) at lg breakpoint
- Admin preview: full website preview with all sections, scroll, per-section carousel arrows
- Admin: section inline rename/delete with confirm modal, slide tab delete with confirm
- Image history: upload 시 기존 이미지 삭제 안 함, 히스토리에서 복원 가능
- Bottom tab bar: 예상키 측정, 카카오톡 상담 (플로팅 버튼 대체)
- Cases slide: 직접 입력 (환자, 회차별 기록, 초진정보, 성장곡선+막대그래프)
- Cases measurements: 엑셀 붙여넣기(TSV), 한국식 나이 파싱 ("13세2개월"→13.2)
- GrowthChart: 실제키 + 최종예상키(18세) 포인트, x축 18.5세까지
- Diagnosis flow: 예상키 결과 → "AI 진단" → 7단계 초진 폼 (성별 구분)
- Website bg: white, 섹션 카드: border-3 border-purple-300, 카카오 아이콘: 노란색 SVG
- Growth guide: 13 cards, 4 categories, standalone pages (no header/footer)
- Guide data: JSON from 성장 바이블 원고 (fact-checked), 표준성장도표.xlsx
- AnimatedGrowthChart: SVG, 5th/50th/95th percentiles, male/female toggle
- Banner ctaAction: scroll | link | fulllink | modal | iframe
- Banner modalRatio: '4:5' | '9:16' for modal/iframe slides
- Program HTML pages: v4/public/programs/ (iframe-embeddable)

## Environment Variables
```
# v4/.env
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AI_SERVER_URL

# ai-server/.env
GEMINI_API_KEY, API_KEY, PORT=3001
```

## Deployment
- **Railway**: `dflo-production.up.railway.app` (root dir: `v4`)

## Current Progress
- Phase 0-5: COMPLETE (setup, auth, core pages, content, admin)
- Phase 6: PARTIAL (meal AI working, body analysis mock)
- Phase 7: COMPLETE (hospital website redesign)
- Phase 7.5: COMPLETE (Instagram card-news redesign, per-slide templates, dnd-kit reorder, bottom tab bar, admin live preview)
- Phase 8: PARTIAL (PC admin layout, cases slide, image history, diagnosis intake form, growth chart enhancements)
- Phase 9: COMPLETE (growth guide pages, animated growth chart, banner enhancements)

## Remotion (Instagram Reels)
- **Directory**: `./remotion/` — Remotion 4 + TypeScript
- **Purpose**: Height prediction feature showcase reels (9:16, ~24.5s)
- **Compositions**: `HeightReels` (한국어), `HeightReelsTH` (태국어)
- **Locale system**: `src/lib/texts.ts` — add new language → create composition → render
- **Commands**:
  ```bash
  cd remotion && npx remotion preview        # Preview
  cd remotion && npx remotion render HeightReels out/reels.mp4      # Korean
  cd remotion && npx remotion render HeightReelsTH out/reels-th.mp4 # Thai
  ```
- **Add new language**: 1) Add translations in `texts.ts` 2) Copy `HeightReelsTH.tsx` → change `setLocale()` 3) Add Composition in `Root.tsx`

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
- Remotion details: see `remotion/` (scenes, components, locale)
