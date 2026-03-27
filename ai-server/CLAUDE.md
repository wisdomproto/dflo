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
```

## Meal Analysis Flow
1. Frontend sends base64 photo + child info
2. Gemini analyzes: menu name, ingredients, calories, macros, growth score (1-10)
3. Returns structured JSON → saved to `meal_analyses` table
