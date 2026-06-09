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
META_REDIRECT_BASE=...# ai-server 공개 URL — OAuth redirect_uri base (로컬 예: http://localhost:4000)
META_TOKEN_ENC_KEY=...# 토큰 at-rest 암호화 키 (base64 32바이트). 생성: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
                      # ⚠️ 모든 환경/머신에서 '동일'해야 함 — 키가 다르면 기존 암호화 토큰 복호화 불가(재연결 필요)
SCHEDULER_ENABLED=...        # 'false'면 예약 발행 스케줄러 비활성(기본 활성)
RAILWAY_DEPLOY_HOOK_URL=...  # 블로그 자동 발행 후 정적 재빌드 트리거(미설정 시 상태만 전환)
```

## Meta 발행 연동
- OAuth: `GET /api/auth/meta`(공개) → FB 다이얼로그 → `GET /api/auth/meta/callback` → 토큰 암호화 저장 → SPA `?meta_connected=1` 복귀. 토큰은 서버 전용(AES-256-GCM, `META_TOKEN_ENC_KEY`).
- 연결/해제: `GET|DELETE /api/marketing/meta/connection` (토큰 제외 요약만 반환).
- 발행: `POST /api/marketing/publish/run { queueId }` — 채널 platform + meta 타겟 id로 Graph v21.0 호출. **IG/Threads = 캐러셀, FB = 다중사진 앨범**(각 사진 `published:false,temporary` 업로드 → `media_fbid` 수집 → `attached_media`로 묶어 1 피드 글, `added_photos`). 이미지 0장이면 FB는 텍스트 피드. IG/Threads 컨테이너는 `waitMediaReady`(status_code=FINISHED 폴링) 후 publish(없으면 "Media ID is not available"). 결과를 `platform_post_id` + `published_url`(`fetchPermalink`: IG/Threads=`permalink`, FB=`permalink_url`→`{pageId}/posts/{storyId}` 폴백) + `error_message`에 기록. (수동·예약 공용 executor)
- 채널 매핑: `marketing_channels.meta_page_id/meta_ig_id/meta_threads_id`. 연결 토큰은 `marketing_meta_connection`(암호문).
- 스코프(FB 로그인 다이얼로그): `public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_content_publish`. **`threads_*`는 FB 다이얼로그에서 Invalid Scope → 제외**(Threads는 별도 OAuth). IG 비즈니스 계정 필요. 비즈니스 포트폴리오 소유 페이지는 `/me/accounts`에 안 나옴 → page ID 직접 조회로 보강(`fetchAccounts`).
- 상태: **연결 라이브** — 187growup Thailand FB(`1162825793580038`) + `@187growup.thailand` IG. 카드뉴스 th IG 캐러셀·FB 앨범 발행 검증 완료. 미연결/미설정 시 수동 "발행됨 표시" 폴백. 프로덕션은 Meta 앱 검수 필요.

## 예약 발행 스케줄러
- `services/scheduler.ts`: node-cron 매분 → `selectDue`(순수) → `status='scheduled' AND scheduled_at<=now` 항목을 claim(scheduled→publishing) → `publishExecutor.publishQueueItem` 발행. 배치에 website 발행 1건이라도 있으면 `deployHook.triggerDeploy` 1회. 시작 시 stale `publishing`→`scheduled` 회수. `SCHEDULER_ENABLED=false`면 비활성.
- `services/publishExecutor.ts`: 수동·자동 공용 발행기. ig/fb/threads→Graph, website→`blog_published` published 전환. 라우트 `POST /api/marketing/publish/run { queueId }`(수동 즉시 발행)·스케줄러 공용.
- 블로그는 콘텐츠 편집기에서 `blog_published` **draft**로만 큐잉 → 발행(즉시/예약) 시 executor가 published 전환 + deploy hook.

## Meal Analysis Flow
1. Frontend sends base64 photo + child info
2. Gemini analyzes: menu name, ingredients, calories, macros, growth score (1-10)
3. Returns structured JSON → saved to `meal_analyses` table
