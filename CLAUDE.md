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

## Detailed Docs
- Frontend details: see `v4/CLAUDE.md`
- AI server details: see `ai-server/CLAUDE.md`
