# Meta 발행 연동 (Facebook/Instagram/Threads) — 설계

> 작성일 2026-06-06. 대상: dflo `ai-server`(Express) + v4 `/marketing`(PIN 8054) + Supabase.
> 참조 구현: ContentFlow (`C:\project\contentflow1\contentflow`) — 이미 동작하는 Meta 연동을 dflo로 **포팅**한다.

## 배경 / 목표

dflo 마케팅의 발행은 현재 **수동**(사람이 올리고 큐에서 "발행됨 표시" + URL 붙여넣기). 채널 설정 페이지는
계정을 *명부*로 적어둘 뿐 실제 연결이 없다. 목표: **Meta 계정을 1회 OAuth로 연결**하고, 연결된 페이지/IG/
Threads를 **언어별 채널로 매핑**한 뒤, 콘텐츠를 **ai-server가 Graph API로 실제 발행**한다. 토큰은 **서버 전용**.

근거: ContentFlow에 OAuth·토큰교환·발행 로직이 검증돼 있어, 새로 설계하기보다 포팅이 가장 빠르고 안전하다.
다만 ContentFlow는 Next.js 단일 앱(동일 오리진) + 토큰 평문/브라우저 노출이라, dflo(별도 Express +
Vite SPA)에 맞춰 **크로스-오리진 OAuth**와 **토큰 암호화/서버 전용**으로 개선한다.

## 확정된 결정

- **연결 모델**: Meta **1회 연결**(OAuth) → 계정의 모든 페이지/IG/Threads 획득 → 각 페이지를 **언어 채널로 매핑**.
- **토큰 보안**: **서버 전용**. 토큰은 ai-server에서만 사용. **저장 시 암호화(at-rest)** 하여 브라우저(anon supabase)로
  읽혀도 평문 노출 0. 발행·분석 전부 ai-server 프록시.
- **플랫폼**: **FB + IG + Threads 전부** 1차 포함.
- **언어-우선 UI**: 채널 설정·발행 모두 "언어 선택 → 그 아래 채널" 순.

## ContentFlow에서 포팅하는 것 (참조 파일)

| ContentFlow 파일 | dflo 대응 |
|---|---|
| `src/app/api/auth/meta/route.ts` (OAuth 시작) | ai-server `GET /api/auth/meta` |
| `src/app/api/auth/meta/callback/route.ts` (code→장기토큰, /me/accounts) | ai-server `GET /api/auth/meta/callback` |
| `src/app/api/publish/meta/route.ts` (FB/IG/Threads 발행) | ai-server `POST /api/marketing/publish/meta` |
| `src/components/project/channel-connections-section.tsx` (연결 UI) | v4 `ChannelRegistryTab`(채널 설정) 확장 |
| `src/components/analytics/meta-analytics-dashboard.tsx` | (선택) ai-server 프록시 + dflo 대시보드 |

포팅 시 OAuth/발행 로직(스코프, 토큰 교환, Graph 호출 시퀀스)은 ContentFlow와 **동일**하게 가져오고,
프레임워크 의존부(`NextResponse`→`res`, `process.env` 동일)만 교체한다.

- **OAuth 스코프**: `public_profile, pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish` (+ Threads는 `threads_basic, threads_content_publish`).
- **토큰 교환**: code → 단기 user token → `grant_type=fb_exchange_token`로 60일 장기 토큰.
- **묶음 획득**: `/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}` + Threads user id.
- **발행(graph v21.0)**: FB `POST /{pageId}/feed`; IG 컨테이너 `POST /{igId}/media` → `POST /{igId}/media_publish`; Threads `POST /{threadsId}/threads` → `/threads_publish`.

## 아키텍처

크로스-오리진이 핵심 차이(ContentFlow는 단일 앱). 흐름:

```
[v4 SPA 채널설정]  "Meta 연결" 클릭
   → window.location = {AI_SERVER}/api/auth/meta?return={SPA_URL}/marketing/channels
[ai-server] GET /api/auth/meta
   → 302 https://www.facebook.com/v21.0/dialog/oauth?...scopes...&redirect_uri={AI_SERVER}/api/auth/meta/callback
[Facebook] 사용자 승인
   → GET {AI_SERVER}/api/auth/meta/callback?code=...&state={return}
[ai-server] callback:
   code→단기→장기 토큰, /me/accounts(+threads) 묶음 조회
   → 토큰 묶음 암호화 후 marketing_meta_connection upsert (서버 전용)
   → 302 {return}?meta_connected=1     ← 토큰은 절대 URL에 안 실음 (개선)
[v4 SPA] ?meta_connected=1 감지 → GET {AI_SERVER}/api/marketing/meta/connection
   → 연결된 페이지/IG 목록(토큰 제외) 표시 → 페이지를 언어 채널로 매핑
```

### ai-server 라우트 (신규)
- `GET /api/auth/meta` — OAuth 시작(공개, authMiddleware 제외). `return` 쿼리를 `state`로 전달.
- `GET /api/auth/meta/callback` — 토큰 교환 + 묶음 저장 + SPA로 redirect(공개).
- `GET /api/marketing/meta/connection` — 연결 상태 + 페이지/IG/Threads 목록 반환 **(토큰 필드 제외)**.
- `DELETE /api/marketing/meta/connection` — 연결 해제(행 삭제).
- `POST /api/marketing/publish/meta` — 실제 발행(아래 발행 플로우).

### 서비스 (ai-server, 신규)
- `services/metaOAuth.ts` — `buildAuthUrl(state)`, `exchangeCode(code)`, `fetchAccounts(token)` (순수 fetch; 토큰 교환·묶음 조립).
- `services/metaPublish.ts` — `publishFacebook/publishInstagram/publishThreads(target, caption, imageUrls, token)` (Graph 호출 시퀀스).
- `services/metaCrypto.ts` — `encrypt(plain)/decrypt(cipher)` AES-256-GCM, 키 `META_TOKEN_ENC_KEY`(ai-server .env). **순수, 단위 테스트 대상**.
- `services/metaConnectionStore.ts` — connection row CRUD + 토큰 암복호 래핑.

## 데이터 모델 (마이그레이션 041~042)

### 041_marketing_meta_connection.sql (신규 테이블)
```sql
create table marketing_meta_connection (
  id            uuid primary key default gen_random_uuid(),
  meta_user_id  text unique,           -- 연결한 Meta 사용자 id (멀티 로그인 허용)
  meta_user_name text default '',
  enc_payload   text not null,         -- 암호화된 JSON {userToken, pages:[{id,name,pageToken,ig:{id,username},threads_id}]}
  expires_at    timestamptz,           -- 장기 토큰 만료(연결+60일)
  connected_at  timestamptz default now(),
  updated_at    timestamptz default now()
);
```
- **RLS**: anon **차단**(정책 없음 = 접근 불가). ai-server만 접근. → ai-server는 이 테이블 접근에 **정식
  service_role 키 필요**(현재 임시 anon 키로는 RLS 차단 테이블 못 읽음). **단, `enc_payload`는 어차피
  암호문**이라, 만약 service_role 키 확보 전이면 임시로 anon-허용 RLS여도 토큰은 암호문이라 노출 0(보안 폴백).
  정식 키 확보 시 RLS 차단으로 전환. (CLAUDE.md의 "정식 service_role 키 교체" 과제와 연결.)

### 042_channels_meta_target_and_queue_result.sql
`marketing_channels` — 채널을 Meta 타겟에 매핑:
```sql
alter table marketing_channels add column if not exists meta_page_id text;     -- FB 페이지 id
alter table marketing_channels add column if not exists meta_ig_id text;       -- IG 비즈니스 id
alter table marketing_channels add column if not exists meta_threads_id text;  -- Threads user id
```
(plaftorm 컬럼으로 어떤 타겟을 쓸지 결정: instagram→meta_ig_id, facebook→meta_page_id, threads→meta_threads_id.)

`marketing_publish_queue` — 실제 발행 결과:
```sql
alter table marketing_publish_queue add column if not exists platform_post_id text;
alter table marketing_publish_queue add column if not exists error_message text;
```

## 발행 플로우 (`POST /api/marketing/publish/meta`)

입력: `{ queueId }` (또는 `{ articleId, channelId, language }`).
1. 큐 행 + 채널(meta 타겟 id, platform, locale) 로드. connection 토큰 복호화(채널의 페이지 id로 묶음에서 페이지 토큰 찾음).
2. **콘텐츠 → 발행물 변환**(content_kind 기준):
   - `cardnews` → 슬라이드 이미지 URL들(R2 공개 URL) + 캡션/해시태그. **IG/Threads는 캐러셀**(이미지≥2면 child container들→carousel container→publish), FB는 멀티포토.
   - `post`(기본글) → 본문에서 텍스트 추출(언어별). **FB/Threads 텍스트 글**. **IG는 텍스트 전용 불가 → 후보에서 제외**(PublishDialog가 막음).
3. **플랫폼별 Graph 호출**(metaPublish):
   - FB: `POST /{meta_page_id}/feed` (text) — 멀티포토는 `/photos`(published=false)로 업로드 후 feed attach(선택, 1차는 단일/텍스트 우선).
   - IG: child별 `POST /{meta_ig_id}/media`(image_url, is_carousel_item) → `POST /{meta_ig_id}/media`(media_type=CAROUSEL, children) → `media_publish`. 단일 이미지면 컨테이너 1개→publish.
   - Threads: `POST /{meta_threads_id}/threads`(media_type=TEXT|IMAGE|CAROUSEL) → `/threads_publish`.
4. 성공 → 큐 행 `status='published'`, `platform_post_id`, `published_url`(permalink 조회 또는 구성), `published_at`. 실패 → `status='failed'`, `error_message`.

> **이미지 소스**: 카드뉴스 업로드/생성 이미지는 이미 R2 공개 URL(`aiImageService`)이라 IG/Threads의 공개 URL 요건 충족.

기존 **수동 "발행됨 표시"는 폴백으로 유지**(앱 검수 전·토큰 만료·예외 시).

## 채널 설정 UI (언어-우선)

`ChannelRegistryTab`(채널 설정) 재구성:
- 상단: **[Meta 연결]** 버튼(미연결 시) / **연결됨: {계정명} · [해제]**(연결 시). `GET /meta/connection` 으로 상태.
- **언어 선택(탭/셀렉트)** → 그 아래에 **해당 언어 채널 목록**.
- 연결된 경우, "**연결된 페이지에서 채널 추가**" — 페이지/IG 목록을 보여주고 선택 + 언어 지정 → `marketing_channels` 행 생성(meta_* id 채움, platform 지정). 수동 추가(핸들만)도 유지.
- 발행 대상이 되려면 채널에 해당 meta_* id가 있어야 함(없으면 "연결 필요" 배지).

PublishDialog는 이미 언어-우선. 추가: **실제 발행 버튼**(즉시 발행 via Meta) — 성공/실패 인라인 표시. content_kind와 platform 호환성 검증(IG+text 차단).

## CORS / Auth / 환경

- OAuth 라우트(`/api/auth/meta*`)는 **authMiddleware 제외**(브라우저 top-level redirect라 헤더 못 실음). callback은 Meta가 호출.
- `/api/marketing/meta/connection`·`/publish/meta`는 기존 marketing 라우터 정책 따름(현재 dev 무인증; prod auth는 별도 과제).
- **CORS**: ai-server가 SPA 오리진 허용(이미 `CORS_ORIGIN` 존재). connection/publish는 SPA→ai-server fetch.
- **Meta 앱 콘솔**: redirect URI에 dev(`http://localhost:3001/api/auth/meta/callback`) + prod(`https://<ai-server>/api/auth/meta/callback`) 등록.
- **env (ai-server/.env)**: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_BASE`(ai-server 공개 URL), `META_TOKEN_ENC_KEY`(32바이트 base64). 프론트엔드엔 `VITE_AI_SERVER_URL`만(시크릿 노출 0).

## 테스트 전략

- **순수 단위(node:test)**: `metaCrypto`(encrypt→decrypt 왕복, 잘못된 키 실패), `metaOAuth.buildAuthUrl`(스코프/redirect_uri 포함), 발행물 변환(content_kind→{caption,imageUrls,platform호환}) 순수 함수.
- **통합/수동**: 실제 Meta 테스트 앱(개발 모드 + 테스트 사용자)으로 OAuth→연결→IG/FB/Threads 발행 1건씩. 앱 검수 전엔 앱 소유자/테스터 계정으로만 가능.
- `npx tsc --noEmit`.

## 비범위 (YAGNI)

- 자동 스케줄러(예약 시각 자동 발행) — ContentFlow도 없음. 수동 즉시 발행 + (선택) FB native `scheduled_publish_time`만.
- 토큰 자동 갱신 — 60일. 만료 임박 시 **경고 배지**만, 재연결은 수동.
- 댓글/DM/인사이트 고급 기능 — 1차 발행에 집중. 분석 대시보드는 선택(프록시).
- 네이버/유튜브 발행 — 본 연동 범위 아님.

## 전제 / 의존 (외부)

- **Meta 개발자 앱 + 비즈니스 인증 + 앱 검수**(`pages_manage_posts`, `instagram_content_publish`, `threads_content_publish`) — 외부 절차, 수일~수주. 검수 전엔 앱 소유자/테스터 한정 동작.
- **IG는 비즈니스/크리에이터 계정 + FB 페이지 연결** 필수.
- (권장) ai-server **정식 service_role 키** 확보 — connection 테이블 RLS 차단을 완전히 적용하기 위함(암호화로 1차 방어는 됨).

## 마이그레이션 요약 (수동 적용)

| # | 파일 | 내용 |
|---|---|---|
| 041 | `041_marketing_meta_connection.sql` | Meta 연결(암호화 토큰) 테이블 |
| 042 | `042_channels_meta_target_and_queue_result.sql` | 채널 meta_* 타겟 id + 큐 platform_post_id/error_message |
