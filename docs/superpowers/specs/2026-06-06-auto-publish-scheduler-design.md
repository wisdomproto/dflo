# 자동 예약 발행 스케줄러 — 설계

> 작성일 2026-06-06. 대상: dflo `ai-server`(Express, Railway 상시 가동) + v4 마케팅 발행 페이지.

## 배경 / 목표

현재 발행 큐의 "예약"은 시각(`scheduled_at`)과 상태(`scheduled`)만 기록하고, **그 시각에 자동 발행하는 백그라운드 실행기가 없다** — 사람이 와서 "즉시 발행"을 눌러야 나간다. 목표: ai-server 내장 스케줄러가 예약 시각이 지난 큐 항목을 **자동 발행**한다(IG/FB/Threads는 Graph, 블로그는 published 전환 + 배포 훅).

## 확정된 결정

- **구동**: ai-server 내장 **node-cron**, 1분 주기.
- **블로그(자체 사이트)**: 발행 시 `blog_published.status='published'` 전환 + **Railway deploy hook** 자동 트리거.
- **실패**: 자동 재시도 없음 (`failed` + `error_message` 기록).

## 핵심 설계 — 발행 로직 단일화(executor)

현재 Meta 발행 로직이 라우트 `marketingRouter.post('/meta/publish')`(marketing.ts 449~508)에 인라인돼 있다. 수동·자동이 같은 코드를 쓰도록 **공용 서비스로 추출**한다.

### `ai-server/src/services/publishExecutor.ts` (신규)
```
publishQueueItem(queueId): Promise<ExecResult>
ExecResult = { ok: boolean; kind: 'meta' | 'website'; postId?: string; error?: string }
```
- 큐 행 + 채널 로드.
- **ig/fb/threads**: 기존 `/meta/publish` 본문 그대로 이전 — 캡션/이미지 구성(cardnews/post) → `validatePublish` → `targetIdFor` → `getBundle`/`findPageToken` → `publishFacebook/Instagram/Threads` → 큐 `published`+`platform_post_id`. 반환 `{ok:true, kind:'meta', postId}`.
- **website**: `blog_published`(article_id+language) `status='published'`+`published_at=now` 업데이트(행이 없으면 `{ok:false, error:'발행본 없음'}`) → 큐 `published`. 반환 `{ok:true, kind:'website'}`.
- 실패: 큐 `failed`+`error_message`, 반환 `{ok:false, kind, error}`.
- **deploy hook은 호출하지 않음**(호출자 책임 — 배치 디바운스 위해).

### `ai-server/src/services/deployHook.ts` (신규)
```
triggerDeploy(): Promise<void>   // POST process.env.RAILWAY_DEPLOY_HOOK_URL, 미설정/실패 시 no-op + warn
```

### `ai-server/src/services/scheduler.ts` (신규)
- 순수 `selectDue(items, nowIso): items` — `status==='scheduled' && scheduled_at != null && scheduled_at <= now`. **단위 테스트 대상.**
- `runDueOnce()`:
  1. `marketing_publish_queue`에서 `status='scheduled'` 조회 → `selectDue(rows, now())`.
  2. 각 항목 **claim**: `update status='publishing' where id=? and status='scheduled'`(가드로 중복 방지). claim 실패(영향 0행)면 skip.
  3. `publishQueueItem(id)` 호출. 결과 수집.
  4. 이번 배치에 `kind==='website' && ok`가 1건이라도 있으면 `triggerDeploy()` **1회**.
- `startScheduler()`: `process.env.SCHEDULER_ENABLED !== 'false'`일 때 `node-cron`으로 매분 `runDueOnce()` 등록. 시작 시 1회 **stale 복구**: `update status='scheduled' where status='publishing'`(이전 프로세스 중단분 회수).

### 라우트 일반화
- `marketingRouter.post('/meta/publish')` → **`marketingRouter.post('/publish/run')`** 로 교체. 본문: `const r = await publishQueueItem(queueId); if (r.ok && r.kind==='website') await triggerDeploy(); return res.json({ success:r.ok, postId:r.postId, error:r.error })` (실패면 적절 status). (Meta 전용 검증 제거 — executor가 채널 분기.)
- 기존 marketing.ts의 인라인 Meta 발행 블록(449~508)은 executor로 이전돼 라우트에서는 사라진다. 관련 import(`validatePublish`,`targetIdFor`,`htmlToText`,`publishFacebook/Instagram/Threads`,`getBundle`,`findPageToken`)는 executor로 이동.

### `index.ts`
- `import { startScheduler } from './services/scheduler.js'` + `app.listen` 직후 `startScheduler()` 호출.

## 블로그 흐름 보정 (필수)

현재 `PublishDialog` 블로그 "발행 큐에 넣기"가 `upsertPublishedBlog(article, language, 'published')`로 **즉시 published** → 예약이 무의미. 변경:
- **PublishDialog 블로그 분기**: `upsertPublishedBlog(article, language, 'draft')`로 **draft 등록만** + 큐 website 행 enqueue. (미리보기 버튼은 그대로 draft upsert + 새 탭.)
- 실제 published 전환 + deploy는 executor(발행 페이지 즉시 발행 / 스케줄러)에서.

## 프론트 보정

- `metaConnectionService.publishToMeta(queueId)` → **`runPublish(queueId)`** 로 이름·경로 변경(`POST /api/marketing/publish/run`). 반환 `{postId?}`.
- `PublishQueuePage.handlePush(id, channel)`: 채널 분기 제거하고 **모든 채널을 `runPublish(id)`로** 즉시 발행 → `reload()`. (기존 publish-push 분기 삭제 — 채널이 ig/fb/threads/website뿐이라 executor가 전담.)
- 예약 UI(`PublishQueueList`의 datetime-local + 빠른칩 → `setSchedule` → status='scheduled')는 **변경 없음**. 스케줄러가 집어감.

## 데이터 모델

**마이그레이션 없음.** `marketing_publish_queue.status/scheduled_at/platform_post_id/error_message`, `blog_published.status` 모두 기존 존재. `publishing` 상태도 기존 enum 문자열(text라 자유).

## 환경변수 (ai-server/.env)
```
SCHEDULER_ENABLED=          # 'false'면 비활성. 기본(미설정) 활성
RAILWAY_DEPLOY_HOOK_URL=    # Railway 배포 훅 URL. 미설정 시 블로그 자동 재빌드 skip(상태만 전환)
```

## 에러 / 안전

- claim 가드(`where status='scheduled'`)로 틱 중복·다중 호출 시 한 번만 발행.
- 단일 ai-server 인스턴스 가정(다중 인스턴스 분산락은 비범위).
- executor 실패는 항목별 격리 — 한 건 실패가 배치 중단시키지 않음(try/catch per item).
- deploy hook 실패는 warn만(발행 자체는 성공 유지).
- Meta 토큰 만료/미연결 시 해당 항목 `failed`+사유, 사람이 재연결 후 재예약.

## 테스트 전략

- **순수 단위(node:test, `npx tsx --test`)**: `selectDue(items, now)` — 미래/과거/널/비scheduled 필터. (claim·executor·Graph·deploy는 통합/수동.)
- **수동**: dev에서 항목 1건 예약 시각을 과거로 설정 → 1분 내 자동 `published` 전환 확인(Meta 연결 시 실제 게시; 미연결 시 `failed` 사유). 블로그는 `blog_published` published 전환 + (훅 설정 시) 배포 트리거.
- `cd ai-server && npx tsc --noEmit`; `cd v4 && npx tsc --noEmit`.

## 비범위 (YAGNI)

- 자동 재시도/백오프, 다중 인스턴스 분산락, 틱 내 병렬 발행, 예약 타임존 UI(이미 UTC 저장·datetime-local 로컬변환), FB native `scheduled_publish_time` 위임.

## 파일 요약

**생성**: `ai-server/src/services/{publishExecutor,deployHook,scheduler}.ts` + `__tests__/scheduler.test.ts`
**수정**: `ai-server/src/routes/marketing.ts`(인라인 발행 → executor + `/publish/run`), `ai-server/src/index.ts`(startScheduler), `ai-server/package.json`(node-cron), `v4/.../services/metaConnectionService.ts`(runPublish), `v4/.../components/PublishQueuePage.tsx`(handlePush 단일화), `v4/.../components/content/PublishDialog.tsx`(블로그 draft 등록), `ai-server/CLAUDE.md`(env)
