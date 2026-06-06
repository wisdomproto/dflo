# AI Server Guide

## Overview
Express server providing AI analysis endpoints via Google Gemini 2.5 Flash.

## Commands
```bash
npm run dev   # Dev server (port 3001)
```

## Structure (src/)
```
index.ts          # Express entry (port 3001)
routes/
  analyze.ts      # POST /api/analyze/meal, POST /api/analyze/body
services/
  gemini.ts       # Gemini API client (gemini-2.5-flash)
  mealAnalyzer.ts # Meal photo analysis prompt + JSON parsing
  bodyAnalyzer.ts # Body posture analysis prompt + JSON parsing
middleware/
  auth.ts         # API key validation
```

## Endpoints
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| POST | `/api/analyze/meal` | Meal photo → nutrition analysis | WORKING |
| POST | `/api/analyze/body` | Body posture analysis | MOCK |

## Environment
```
GEMINI_API_KEY=...    # Google Gemini API key
API_KEY=...           # Shared secret with v4 frontend
PORT=3001
META_APP_ID=...       # Meta 개발자 앱 (Facebook/Instagram/Threads 발행)
META_APP_SECRET=...   # Meta 앱 시크릿 (서버 전용)
META_REDIRECT_BASE=...# ai-server 공개 URL — OAuth redirect_uri base (예: http://localhost:3001)
META_TOKEN_ENC_KEY=...# 토큰 at-rest 암호화 키 (base64 32바이트). 생성: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Meta 발행 연동
- OAuth: `GET /api/auth/meta`(공개) → FB 다이얼로그 → `GET /api/auth/meta/callback` → 토큰 암호화 저장 → SPA `?meta_connected=1` 복귀. 토큰은 서버 전용(AES-256-GCM, `META_TOKEN_ENC_KEY`).
- 연결/해제: `GET|DELETE /api/marketing/meta/connection` (토큰 제외 요약만 반환).
- 발행: `POST /api/marketing/meta/publish { queueId }` — 채널 platform(facebook/instagram/threads) + meta 타겟 id로 Graph v21.0 호출(IG/Threads 캐러셀). 결과를 `marketing_publish_queue.platform_post_id/error_message`에 기록.
- 채널 매핑: `marketing_channels.meta_page_id/meta_ig_id/meta_threads_id`. 연결 토큰은 `marketing_meta_connection`(암호문).
- 전제: Meta 앱 검수(`pages_manage_posts`·`instagram_content_publish`·`threads_content_publish`), IG 비즈니스 계정. 미설정 시 수동 "발행됨 표시" 폴백.

## Meal Analysis Flow
1. Frontend sends base64 photo + child info
2. Gemini analyzes: menu name, ingredients, calories, macros, growth score (1-10)
3. Returns structured JSON → saved to `meal_analyses` table
