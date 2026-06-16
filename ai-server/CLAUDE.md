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

## Research Evidence Library (Phase 1·2)
국제 SCI 논문 초록을 품질 랭킹해 `evidence_papers` 단일 라이브러리(clinical RAG 처방추천 + 마케팅 공용)에 적재. 목적=공개 인용(E-E-A-T·의료광고 근거) + AI RAG(Phase 2).
- 파이프라인: `scripts/ingest-evidence.mjs` — 15 주제축 PubMed 발굴(`sort=relevance`) → **OpenAlex**(`services/openalex.ts`: 피인용·저널 if_proxy≈IF·ISSN) + **NIH iCite**(`services/icite.ts`: RCR 분야·연도 보정) enrich → `services/journalQuality.ts`(저널 화이트리스트 `data/journalWhitelist.ts` **SCI 게이트** + 합성 `quality_score`) 랭킹 → top-N upsert. **전부 무키**(PubMed/OpenAlex/iCite).
- `pubmed.ts` 확장: `doi`·`publicationTypes` 파싱 + `searchPmids(q, n, sort)` + HTML 엔티티 디코딩.
- 사용: `node scripts/ingest-evidence.mjs [--dry-run] [--no-embed] [--only <topic>] [--limit N]`. `--no-embed`=무키(임베딩 생략, gemini import 안 함). 임베딩만 Gemini(없으면 null, Phase 2 백필). 테스트는 `dist/` import → 실행 전 `npm run build` 필수.
- migration **048**(evidence_papers 품질 컬럼 12개). 적재: **250 SCI 논문**(15테마, txirmof). **Phase 2 임베딩 백필 완료**: `scripts/backfill-embeddings.mjs`(`embedding IS NULL` 행만 → resume 가능, 텍스트=`title\nabstract`, gemini-embedding-001 768d) 로 **281/281** 채움 + `validate-evidence-search.mjs`(한국어 쿼리↔영어 초록 교차언어 검증).
- **마케팅 연결 = 블로그 참고문헌** (migration 049): `services/evidenceMatch.ts`(순수 `cosineSim`/`selectReferences`, 단위테스트) + `scripts/attach-references.mjs`(en/ko 블로그 대표텍스트 임베딩 → 281편 코사인 → sim≥0.66 top5 → `marketing_articles.blog_references` JSONB 스냅샷; `--dry-run`/`--force`/`--threshold`/`--top`/`--only`/`--allow-partial`). 적재 61/62 토픽. 상세 memory `research_evidence_library.md`·`blog_evidence_references.md`.
- **Phase 2 ③ 클리니컬 RAG 심화** (migration 051): rx-recommend 프롬프트에 **초록+key_finding 주입**(`rxRecommend.buildRxPrompt`, 기존 제목만) + 논문 **한국어 요약 생성**(`services/evidenceSummary.ts` 순수 빌더+파서 + `scripts/backfill-summaries.mjs` resume·서킷브레이커, `korean_summary`/`key_finding`) + `match_evidence_papers` RPC 가 두 필드 반환(drop+recreate, 반환 시그니처 변경) + `knowledgeRetrieval` 타입 + `routes/knowledge.ts` references abstract strip. 요약 백필은 `generateText`(2.5-flash) 일일 쿼터(RPD) 소진으로 API 19편만 → 나머지 Claude 병렬 에이전트로 **281/281 완료**. 상세 memory `clinical_rag_deepening.md`.
- **원장 저서 RAG** (migration 056, 원래 053→원격 마케팅 053~055 선점으로 renumber): 원장 저서 「우리 아이 키 성장 바이블」(264p)을 **3번째 지식소스(도서)**로 추가 — `knowledge_documents`(pgvector) + `match_knowledge_documents` RPC(chunk_index 반환). `searchKnowledge`가 papers/insights 옆에 `documents` 병렬 RPC(`kDocuments ?? 4`) 추가, `buildRxPrompt`가 "원장님 진료 철학·방침(1차 기준)" 섹션 주입(bookPassages 있을 때만·하위호환, 논문=보조). 적재 = `cases/extract_book.py`(PyMuPDF 청킹 227청크/5장, 무생성) → `scripts/ingest-book.mjs`(gemini-embedding-001, delete-by-source 재적재안전·preflight·빈입력가드). **책=1차 권위**, PDF·`book-chunks.json` 미커밋. 상세 memory `book_knowledge_rag.md`.

## 치료사례 원장 스토리 저장 (로컬 내부 도구)
- `routes/caseStory.ts` (`app.use('/api/case-story')`, marketingAuth 없이 자체 `x-admin-pin`=`WEBSITE_ADMIN_PIN`||8054): `GET /:chart`(조회) + `POST /`(저장) → `cases/case_stories.json`(src/routes 기준 `../../../cases`) read-merge-write. 치료사례 후보 페이지(`case-candidates.html`)의 🩺 원장 스토리 인라인 편집·저장용. PHI 내부 도구라 **dev(localhost) 전용**(prod Railway엔 cases 폴더 없음). gen 재생성 시 반영. 상세 memory `case_candidates_page.md`.

## 치료사례 후보 전체 상세(PHI) — prod admin (2026-06-16)
- gen 산출 `case-candidates.html`(gitignore)을 `case_candidates_doc` 테이블(migration 058+059)에 `gen_case_profiles.mjs uploadCaseDoc`(service_role REST upsert)로 적재 → **v4 `/admin/cases` 가 anon Supabase 클라이언트로 직접 읽음**(기존 admin 환자 페이지와 동일 모델). **ai-server 경유 안 함** — 처음엔 `routes/caseCandidates.ts` 엔드포인트로 짰다가 prod service_role 미설정 401 → 폐기. ai-server 는 write(gen, 로컬 service_role)만 관여. 상세 memory `case_candidates_page.md`.

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
- 릴스(영상) 발행: 큐 `content_kind='reels'` — 영상=`marketing_articles.reels[lang].videoUrl`(없으면 실패 안내), 캡션=`reels[lang].caption(+hashtags)` 우선(커스텀 콘텐츠), 없으면 카드뉴스 캡션 공용. IG `media_type=REELS`(+cover_url)·FB `/videos`(file_url)·Threads VIDEO — IG/Threads 는 `waitMediaReady` 후 publish. 발행된 게시물 삭제 `POST /api/marketing/publish/delete-post`(FB만 — IG 미디어는 Graph 삭제 미지원).
- 광고 푸시(Marketing API): `services/metaAds.ts` — `POST /api/marketing/ads/push { campaignId }`: 워크스페이스 캠페인을 campaign→adset→ad **PAUSED 로 생성**(기존 게시물 `object_story_id` 부스팅; 업로드 소재는 개발모드 object_story_spec 차단 → 페이지 발행(published:true) 후 post_id 부스팅 우회, source_post_id 저장으로 재푸시 중복 방지) + `GET /ads/insights/:accountExternalId` 성과 조회. migration 053 으로 meta id 매핑. ads 호출=user token(`ads_management`), 페이지 발행=page token. 토큰 진단 `npm run diagnose-meta`.
- 피드 읽기: `GET /api/marketing/meta/feed/:channelId` — 채널의 실제 게시물 목록(FB `/{pageId}/posts`·IG `/{igId}/media`+children, 수동 업로드 포함). 광고 워크스페이스 "기존 게시물(boosting)" 소재 선택용. `services/metaFeed.ts` — 순수 매퍼(mapFbPost/mapIgMedia) 테스트 + supabase/커넥션스토어 **lazy import**(env 없는 테스트 환경에서 import-time createClient throw 회피).
- 채널 매핑: `marketing_channels.meta_page_id/meta_ig_id/meta_threads_id`. 연결 토큰은 `marketing_meta_connection`(암호문).
- 스코프(FB 로그인 다이얼로그): `public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_content_publish,ads_management,ads_read`(광고 푸시용 ads_* 는 2026-06-11 추가 — 스코프 추가 후 기존 토큰엔 없으므로 재연결 필요). **`threads_*`는 FB 다이얼로그에서 Invalid Scope → 제외**(Threads는 별도 OAuth). IG 비즈니스 계정 필요. 비즈니스 포트폴리오 소유 페이지는 `/me/accounts`에 안 나옴 → page ID 직접 조회로 보강(`fetchAccounts`).
- 상태: **연결 라이브 — 2026-06-10 master 계정 재구성**. Meta 앱 `999009859491958`(master `187growup.master@gmail.com`=채용현 소유, 앱도 master 소유라 개발모드여도 OAuth 바로 가능). **한 계정에 한국 `1169557802909664` + 태국 `1065006963373288`** 페이지(옛 단일 태국 `1162825793580038` 폐기). 한국·태국 FB/IG 발행 검증. 미연결 시 수동 폴백. prod Meta 앱 검수 필요. 2026-06-11 한때 저장 토큰 Graph 전면 차단(`API access blocked`)됐으나 **재연결로 해소** — FB 카드뉴스 발행·광고 푸시 라이브 검증. 차단 의심 시 master facebook.com 재로그인(체크포인트 해제)+앱 대시보드 확인 후 재연결.
- **★IG를 페이지에 연결하면 그 페이지가 비즈니스 포트폴리오 자산이 돼 `/me/accounts`에서 빠진다** → `fetchAccounts(token, extraPageIds)`가 등록 채널 `meta_page_id`(`getRegisteredPageIds`)를 page ID 직접 조회로 보강해야 가져옴(이 보강 회귀로 한국만 잡히던 버그 → 복원, callback이 `getRegisteredPageIds()`→`fetchAccounts`).
- 페이지 프로필 세팅: `scripts/set-fb-about.mjs`(**멀티페이지** about/description/**website**, 태국어·한국어) + `scripts/set-fb-photos.mjs`(FB 프로필사진 `/{page}/picture` OK). **★커버 사진은 Graph API 거부(`cover_photo` 필드 안 받음)·IG 프로필(bio/사진)도 API 불가 → 둘 다 앱 수동.**

## 예약 발행 스케줄러
- `services/scheduler.ts`: node-cron 매분 → `selectDue`(순수) → `status='scheduled' AND scheduled_at<=now` 항목을 claim(scheduled→publishing) → `publishExecutor.publishQueueItem` 발행. 배치에 website 발행 1건이라도 있으면 `deployHook.triggerDeploy` 1회. 시작 시 stale `publishing`→`scheduled` 회수. `SCHEDULER_ENABLED=false`면 비활성.
- `services/publishExecutor.ts`: 수동·자동 공용 발행기. ig/fb/threads→Graph, website→`blog_published` published 전환. 라우트 `POST /api/marketing/publish/run { queueId }`(수동 즉시 발행)·스케줄러 공용.
- 블로그는 콘텐츠 편집기에서 `blog_published` **draft**로만 큐잉 → 발행(즉시/예약) 시 executor가 published 전환 + deploy hook.

## Meal Analysis Flow
1. Frontend sends base64 photo + child info
2. Gemini analyzes: menu name, ingredients, calories, macros, growth score (1-10)
3. Returns structured JSON → saved to `meal_analyses` table
