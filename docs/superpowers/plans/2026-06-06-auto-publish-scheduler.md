# 자동 예약 발행 스케줄러 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ai-server 내장 node-cron 스케줄러가 예약 시각이 지난 발행 큐 항목을 자동 발행한다(IG/FB/Threads는 Graph, 블로그는 published 전환 + Railway 배포 훅). 발행 로직은 수동·자동 공용 executor로 단일화한다.

**Architecture:** 현재 `/meta/publish` 라우트에 인라인된 Meta 발행 로직을 `publishExecutor.publishQueueItem()` 공용 서비스로 추출. `scheduler.ts`가 매분 due 항목을 claim→executor 실행. 블로그는 deploy hook으로 재빌드. 마이그레이션 없음(기존 컬럼 재사용).

**Tech Stack:** ai-server(Express, TS, ESM `.js` import, Node 24 — 테스트는 `npx tsx --test`), node-cron, Supabase, v4(React/Vite).

---

## 사전 지식

- **ai-server 테스트**: `npx tsx --test <file>` (plain `node --test`는 `.js`→`.ts` ESM 재작성 미지원). 순수 함수 테스트는 `src/services/__tests__/*.test.ts`.
- **ESM**: 상대 import에 `.js` 확장자 필수.
- **Supabase 클라이언트(ai-server 패턴)**: `createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })`.
- **타입체크**: ai-server·v4 각각 `npx tsc --noEmit`. 프로젝트는 strict(미사용 import는 에러 가능) — import 이동 시 미사용 항목 반드시 제거.
- **커밋**: 로컬 커밋만(자동 push 금지). `git add`는 파일 지정(`-A`/`.` 금지). `remotion/` 및 무관 파일 절대 스테이징 금지.
- **현재 `/meta/publish` 핸들러**: `ai-server/src/routes/marketing.ts` 449~508행. 채널 분기 없이 ig/fb/threads만 처리. 이번에 executor로 이전 + `/publish/run`으로 일반화 + website 분기 추가.
- **현재 `handlePush`**: `v4/src/features/marketing/components/PublishQueuePage.tsx` 76~100행 — Meta면 `publishToMeta`, 그 외 `publish-push`. 단일 `runPublish` 경로로 교체.
- **현재 PublishDialog 블로그**: `publishBlog('published')`가 `upsertPublishedBlog(article, language, 'published')` 즉시 published. → 'draft'로 변경.

## 파일 구조

**생성(ai-server)**
- `src/services/publishExecutor.ts` — `publishQueueItem(queueId)` 공용 발행기
- `src/services/deployHook.ts` — `triggerDeploy()`
- `src/services/scheduler.ts` — `selectDue`(순수) + `runDueOnce` + `startScheduler`
- `src/services/__tests__/scheduler.test.ts`

**수정(ai-server)**
- `src/routes/marketing.ts` — 인라인 Meta 발행 삭제 → `/publish/run`(executor 호출) + 미사용 import 정리
- `src/index.ts` — `startScheduler()` 호출
- `package.json` — node-cron 의존성
- `CLAUDE.md` — env 문서

**수정(v4)**
- `src/features/marketing/services/metaConnectionService.ts` — `publishToMeta` → `runPublish`(`/publish/run`)
- `src/features/marketing/components/PublishQueuePage.tsx` — `handlePush` 단일 경로
- `src/features/marketing/components/content/PublishDialog.tsx` — 블로그 draft 등록

---

### Task 1: node-cron 의존성 + deployHook

**Files:** Modify `ai-server/package.json`; Create `ai-server/src/services/deployHook.ts`

- [ ] **Step 1: node-cron 설치**

Run: `cd ai-server && npm install node-cron && npm install -D @types/node-cron`
Expected: `package.json` dependencies에 `node-cron`, devDependencies에 `@types/node-cron` 추가.

- [ ] **Step 2: deployHook 작성**

`ai-server/src/services/deployHook.ts`:
```ts
// Railway 배포 훅 트리거. 블로그(자체 사이트) 발행 후 정적 재빌드용. 미설정 시 no-op.
export async function triggerDeploy(): Promise<void> {
  const url = process.env.RAILWAY_DEPLOY_HOOK_URL;
  if (!url) {
    console.warn('[deploy] RAILWAY_DEPLOY_HOOK_URL 미설정 — 배포 트리거 skip');
    return;
  }
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) console.warn(`[deploy] hook 실패: ${res.status}`);
    else console.log('[deploy] 배포 훅 트리거됨');
  } catch (e) {
    console.warn('[deploy] hook 오류:', e instanceof Error ? e.message : String(e));
  }
}
```

- [ ] **Step 3: 타입체크**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add ai-server/package.json ai-server/package-lock.json ai-server/src/services/deployHook.ts
git commit -m "feat(scheduler): node-cron 의존성 + 배포 훅 트리거"
```

---

### Task 2: publishExecutor (Meta 발행 로직 이전 + website 분기)

**Files:** Create `ai-server/src/services/publishExecutor.ts`

- [ ] **Step 1: executor 작성** (marketing.ts 449~508 로직을 옮기고 website 분기 추가)

`ai-server/src/services/publishExecutor.ts`:
```ts
// 발행 큐 1건을 실제 발행하는 공용 실행기. 수동(/publish/run)·자동(scheduler) 공용.
// deploy hook은 호출하지 않음(호출자가 배치 단위로 트리거).
import { createClient } from '@supabase/supabase-js';
import { validatePublish, targetIdFor, htmlToText, type Platform } from './metaPublishPrep.js';
import { publishFacebook, publishInstagram, publishThreads } from './metaPublish.js';
import { getBundle, findPageToken } from './metaConnectionStore.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface ExecResult {
  ok: boolean;
  kind: 'meta' | 'website';
  postId?: string;
  error?: string;
}

async function fail(queueId: string, kind: 'meta' | 'website', error: string): Promise<ExecResult> {
  await sb.from('marketing_publish_queue').update({
    status: 'failed', error_message: error, updated_at: new Date().toISOString(),
  }).eq('id', queueId);
  return { ok: false, kind, error };
}

export async function publishQueueItem(queueId: string): Promise<ExecResult> {
  const { data: q } = await sb.from('marketing_publish_queue').select('*').eq('id', queueId).single();
  if (!q) return { ok: false, kind: 'meta', error: '큐 항목 없음' };
  const channel = q.channel as string;

  // ── website (자체 사이트 블로그): blog_published draft → published ──
  if (channel === 'website') {
    const lang = (q.language as string) || 'ko';
    const { data: rows, error } = await sb.from('blog_published')
      .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('article_id', q.article_id).eq('language', lang).eq('status', 'draft').select('id');
    if (error) return fail(queueId, 'website', error.message);
    // 이미 published거나 draft 행이 없으면, 발행본 존재 여부 확인
    if (!rows || rows.length === 0) {
      const { data: existing } = await sb.from('blog_published').select('id').eq('article_id', q.article_id).eq('language', lang).limit(1);
      if (!existing || existing.length === 0) return fail(queueId, 'website', '블로그 발행본이 없습니다.');
    }
    await sb.from('marketing_publish_queue').update({
      status: 'published', published_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    return { ok: true, kind: 'website' };
  }

  // ── meta (ig/fb/threads) ──
  const platform = channel as Platform;
  if (!['facebook', 'instagram', 'threads'].includes(platform)) return fail(queueId, 'meta', 'Meta 채널이 아닙니다');
  const { data: ch } = await sb.from('marketing_channels').select('*').eq('id', q.channel_id).single();
  if (!ch) return fail(queueId, 'meta', '채널 없음');

  let caption = '';
  let imageUrls: string[] = [];
  if (q.content_kind === 'cardnews') {
    const { data: cn } = await sb.from('marketing_cardnews').select('id, caption, hashtags').eq('content_id', q.article_id).limit(1).single();
    if (cn) {
      const tags = ((cn.hashtags ?? []) as string[]).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      caption = [cn.caption as string, tags].filter(Boolean).join('\n\n');
      const { data: slides } = await sb.from('marketing_cardnews_slides').select('canvas, sort_order').eq('cardnews_id', cn.id as string).order('sort_order');
      imageUrls = ((slides ?? []) as Array<{ canvas?: { imageUrl?: string | null } }>)
        .map((s) => s.canvas?.imageUrl)
        .filter((u): u is string => typeof u === 'string' && u.length > 0);
    }
  } else {
    const { data: art } = await sb.from('marketing_articles').select('title, body, translations').eq('id', q.article_id).single();
    const lang = (q.language as string) || 'ko';
    const body = lang === 'ko'
      ? (art as { body?: string } | null)?.body
      : (art as { translations?: Record<string, { body?: string }> } | null)?.translations?.[lang]?.body;
    caption = htmlToText(body || '');
  }

  const v = validatePublish(platform, imageUrls);
  if (!v.ok) return fail(queueId, 'meta', v.reason || '발행 불가');
  const targetId = targetIdFor(
    ch as { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
    platform,
  );
  if (!targetId) return fail(queueId, 'meta', '채널에 Meta 타겟 id가 없습니다. 연결/매핑 필요.');
  const bundle = await getBundle();
  if (!bundle) return fail(queueId, 'meta', 'Meta 연결이 없습니다.');
  const token = findPageToken(bundle, targetId);
  if (!token) return fail(queueId, 'meta', '해당 타겟의 토큰을 찾을 수 없습니다(재연결 필요).');

  try {
    let postId = '';
    if (platform === 'facebook') postId = await publishFacebook(targetId, token, caption);
    else if (platform === 'instagram') postId = await publishInstagram(targetId, token, caption, imageUrls);
    else postId = await publishThreads(targetId, token, caption, imageUrls);
    await sb.from('marketing_publish_queue').update({
      status: 'published', platform_post_id: postId, published_at: new Date().toISOString(),
      error_message: null, updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    return { ok: true, kind: 'meta', postId };
  } catch (e) {
    return fail(queueId, 'meta', e instanceof Error ? e.message : '발행 실패');
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 0 errors. (marketing.ts는 아직 옛 import를 쓰므로 중복 import 경고는 없음 — executor는 자체 import.)

- [ ] **Step 3: Commit**

```bash
git add ai-server/src/services/publishExecutor.ts
git commit -m "feat(scheduler): 발행 공용 실행기(meta + website) 추출"
```

---

### Task 3: scheduler (selectDue TDD + runDueOnce + start)

**Files:** Create `ai-server/src/services/scheduler.ts`, `ai-server/src/services/__tests__/scheduler.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`ai-server/src/services/__tests__/scheduler.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectDue } from '../scheduler.js';

const now = '2026-06-06T12:00:00.000Z';

test('과거/현재 scheduled만 due, 미래·null·비scheduled 제외', () => {
  const items = [
    { id: 'a', status: 'scheduled', scheduled_at: '2026-06-06T11:00:00.000Z' }, // 과거 → due
    { id: 'b', status: 'scheduled', scheduled_at: '2026-06-06T13:00:00.000Z' }, // 미래 → 제외
    { id: 'c', status: 'scheduled', scheduled_at: null },                        // null → 제외
    { id: 'd', status: 'draft', scheduled_at: '2026-06-06T11:00:00.000Z' },      // 비scheduled → 제외
    { id: 'e', status: 'scheduled', scheduled_at: '2026-06-06T12:00:00.000Z' },  // == now → due
  ];
  assert.deepEqual(selectDue(items, now).map((x) => x.id), ['a', 'e']);
});

test('빈 배열', () => {
  assert.deepEqual(selectDue([], now), []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd ai-server && npx tsx --test src/services/__tests__/scheduler.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: scheduler 구현**

`ai-server/src/services/scheduler.ts`:
```ts
// 예약 발행 스케줄러 — 매분 due 항목을 claim 후 executor 실행. node-cron(in-process).
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { publishQueueItem } from './publishExecutor.js';
import { triggerDeploy } from './deployHook.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface DueRow {
  id: string;
  status: string;
  scheduled_at: string | null;
}

// 순수: 예약 시각이 now 이하인 'scheduled' 항목만.
export function selectDue<T extends DueRow>(items: T[], nowIso: string): T[] {
  return items.filter(
    (it) => it.status === 'scheduled' && it.scheduled_at != null && it.scheduled_at <= nowIso,
  );
}

export async function runDueOnce(): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from('marketing_publish_queue')
    .select('id, status, scheduled_at')
    .eq('status', 'scheduled');
  if (error) { console.warn('[scheduler] 조회 실패:', error.message); return; }
  const due = selectDue((data ?? []) as DueRow[], nowIso);
  if (due.length === 0) return;

  let websitePublished = false;
  for (const item of due) {
    // claim: scheduled → publishing (가드로 중복 방지)
    const { data: claimed } = await sb
      .from('marketing_publish_queue')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('status', 'scheduled')
      .select('id');
    if (!claimed || claimed.length === 0) continue;
    try {
      const r = await publishQueueItem(item.id);
      if (r.ok && r.kind === 'website') websitePublished = true;
      console.log(`[scheduler] ${item.id} → ${r.ok ? 'published' : 'failed'} (${r.kind})${r.error ? ': ' + r.error : ''}`);
    } catch (e) {
      console.warn('[scheduler] 항목 실패', item.id, e instanceof Error ? e.message : String(e));
    }
  }
  if (websitePublished) await triggerDeploy();
}

export function startScheduler(): void {
  if (process.env.SCHEDULER_ENABLED === 'false') {
    console.log('[scheduler] 비활성(SCHEDULER_ENABLED=false)');
    return;
  }
  // stale 복구: 이전 프로세스가 publishing 중 중단한 항목 회수
  void sb.from('marketing_publish_queue')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('status', 'publishing')
    .then(({ error }) => { if (error) console.warn('[scheduler] stale 복구 실패:', error.message); });
  cron.schedule('* * * * *', () => { void runDueOnce(); });
  console.log('[scheduler] 매분 예약 발행 체크 시작');
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd ai-server && npx tsx --test src/services/__tests__/scheduler.test.ts`
Expected: PASS (2 tests). Run: `cd ai-server && npx tsc --noEmit` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/scheduler.ts ai-server/src/services/__tests__/scheduler.test.ts
git commit -m "feat(scheduler): 매분 due 발행 스케줄러 + selectDue 테스트"
```

---

### Task 4: 라우트 일반화(/publish/run) + 스케줄러 기동

**Files:** Modify `ai-server/src/routes/marketing.ts`, `ai-server/src/index.ts`

- [ ] **Step 1: marketing.ts — 인라인 Meta 발행 블록을 /publish/run으로 교체**

`marketing.ts`에서 `marketingRouter.post('/meta/publish', ...)` 블록 전체(449~508행)를 아래로 교체:
```ts
// POST /publish/run { queueId } — 큐 1건 실제 발행(meta/website 공용). website면 배포 훅.
marketingRouter.post('/publish/run', async (req, res) => {
  const { queueId } = (req.body ?? {}) as { queueId?: string };
  if (!queueId) return res.status(400).json({ success: false, error: 'queueId 필요' });
  const r = await publishQueueItem(queueId);
  if (r.ok && r.kind === 'website') await triggerDeploy();
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, postId: r.postId });
});
```

- [ ] **Step 2: marketing.ts — import 정리**

상단 import에서 executor/deployHook 추가:
```ts
import { publishQueueItem } from '../services/publishExecutor.js';
import { triggerDeploy } from '../services/deployHook.js';
```
그리고 이제 marketing.ts에서 **직접 안 쓰는** import 제거: `validatePublish, targetIdFor, htmlToText, type Platform`(metaPublishPrep), `publishFacebook, publishInstagram, publishThreads`(metaPublish), 그리고 metaConnectionStore에서 `getBundle, findPageToken`(connection 엔드포인트가 쓰는 `getConnectionPublic, deleteConnection`은 유지). 즉 `metaPublish.js` import 줄·`metaPublishPrep.js` import 줄은 통째 삭제, metaConnectionStore import는 `getConnectionPublic, deleteConnection`만 남긴다.

> tsc가 미사용 import를 잡으므로, Step 3에서 0 에러가 나오도록 정확히 정리할 것. (connection GET/DELETE 핸들러는 그대로 두기.)

- [ ] **Step 3: index.ts — 스케줄러 기동**

`ai-server/src/index.ts` import 블록에 추가:
```ts
import { startScheduler } from './services/scheduler.js';
```
`app.listen(...)` 호출 다음 줄에 추가:
```ts
startScheduler();
```

- [ ] **Step 4: 타입체크 + 스케줄러 부팅 확인**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 0 errors.
Run(선택): `cd ai-server && SCHEDULER_ENABLED=false npm run dev` 로 부팅 → 로그에 `[scheduler] 비활성` 또는 (미설정 시) `매분 예약 발행 체크 시작` 출력 확인 후 종료.

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/routes/marketing.ts ai-server/src/index.ts
git commit -m "feat(scheduler): /publish/run 일반화(executor) + 스케줄러 기동"
```

---

### Task 5: 프론트 — runPublish 단일 경로 + 블로그 draft 등록

**Files:** Modify `v4/src/features/marketing/services/metaConnectionService.ts`, `v4/src/features/marketing/components/PublishQueuePage.tsx`, `v4/src/features/marketing/components/content/PublishDialog.tsx`

- [ ] **Step 1: metaConnectionService — publishToMeta → runPublish**

`metaConnectionService.ts`의 `publishToMeta` 함수를 교체:
```ts
// 큐 1건 즉시 발행(meta/website 공용). ai-server executor 경유.
export async function runPublish(queueId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/publish/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '발행 실패');
  return (b.postId as string) ?? '';
}
```
(기존 `publishToMeta` export 제거 — 유일 호출처는 PublishQueuePage, Step 2에서 교체.)

- [ ] **Step 2: PublishQueuePage — handlePush 단일화**

import 교체: `import { publishToMeta } from '../services/metaConnectionService';` → `import { runPublish } from '../services/metaConnectionService';`
`handlePush`(76~100행)를 교체:
```ts
  // 즉시 발행 — 모든 채널을 executor(/publish/run) 경유. 성공 시 큐 새로고침.
  const handlePush = async (id: string, _channel: PublishChannel) => {
    try {
      await runPublish(id);
      reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '발행 요청 실패');
    }
  };
```
교체 후 미사용이 되면 제거: `BASE` 상수(다른 곳에서 안 쓰면), `markPublished` import(다른 핸들러 `handleMarkPublished`가 계속 쓰면 유지). `PublishChannel` 타입은 `_channel` 시그니처에 쓰이므로 유지. `cd v4 && npx tsc --noEmit`로 미사용 잡아 정리.

- [ ] **Step 3: PublishDialog — 블로그 draft 등록**

`PublishDialog.tsx`의 `publishBlog` 함수에서 upsert 호출을 항상 draft로:
```ts
      const pub = await upsertPublishedBlog(article, language, 'draft');
```
(기존 `upsertPublishedBlog(article, language, status)` → `'draft'` 고정. 미리보기 버튼은 그대로 새 탭 열기, "발행 큐에 넣기" 버튼은 draft upsert + website 큐 enqueue. 실제 published 전환은 발행 페이지/스케줄러의 executor에서.)

- [ ] **Step 4: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/services/metaConnectionService.ts v4/src/features/marketing/components/PublishQueuePage.tsx v4/src/features/marketing/components/content/PublishDialog.tsx
git commit -m "feat(scheduler): 프론트 runPublish 단일 경로 + 블로그 draft 등록"
```

---

### Task 6: env 문서 + 전체 검증

**Files:** Modify `ai-server/.env`(로컬, 커밋 안 함), `ai-server/CLAUDE.md`

- [ ] **Step 1: .env에 항목 추가**(로컬에만)

`ai-server/.env`에 추가:
```
SCHEDULER_ENABLED=
RAILWAY_DEPLOY_HOOK_URL=
```
(둘 다 비워두면: 스케줄러 활성 + 배포 훅 skip. dev에서 스케줄러 끄려면 `SCHEDULER_ENABLED=false`.)

- [ ] **Step 2: CLAUDE.md env 섹션 보강**

`ai-server/CLAUDE.md` Environment 목록에 추가:
```
SCHEDULER_ENABLED=...        # 'false'면 예약 발행 스케줄러 비활성(기본 활성)
RAILWAY_DEPLOY_HOOK_URL=...  # 블로그 자동 발행 후 정적 재빌드 트리거(미설정 시 상태만 전환)
```
그리고 "Meta 발행 연동" 섹션 아래에 한 줄:
```
- 예약 발행: node-cron(매분)이 `status='scheduled' AND scheduled_at<=now` 항목을 claim→executor 발행. 블로그는 published 전환 + deploy hook. 수동·자동 공용 `publishExecutor.publishQueueItem`, 라우트 `POST /api/marketing/publish/run`.
```

- [ ] **Step 3: 전체 검증**

Run:
```
cd ai-server && npx tsx --test src/services/__tests__/scheduler.test.ts && npx tsc --noEmit
cd v4 && npx tsc --noEmit
```
Expected: scheduler 테스트 PASS, 양쪽 tsc 0 errors.

- [ ] **Step 4: Commit (CLAUDE.md만; .env 금지)**

```bash
git add ai-server/CLAUDE.md
git commit -m "docs(scheduler): env(SCHEDULER_ENABLED·RAILWAY_DEPLOY_HOOK_URL) + 동작 문서화"
```

---

## 자가 점검 (계획↔스펙)

- node-cron 매분 + selectDue + claim → Task 3
- executor 단일화(meta+website) → Task 2, 라우트 일반화 → Task 4
- 블로그 deploy hook → Task 1(deployHook) + Task 2(website 분기) + Task 4(라우트 트리거) + Task 3(스케줄러 배치 트리거)
- 블로그 draft 등록 보정 → Task 5 Step 3
- 프론트 runPublish 단일 경로 → Task 5
- 실패 자동 재시도 없음 → executor `fail()`만(재시도 로직 없음) ✓
- 마이그레이션 없음 ✓ / env 2개 → Task 6
- 비범위(재시도·분산락·병렬) 미포함 ✓

## 수동 검증 (구현 후)
1. dev에서 콘텐츠 1건 "발행 큐에 넣기"(소셜) → 발행 페이지에서 예약 시각을 **과거**로 설정(status=scheduled) → 1분 내 자동 `published`(Meta 연결 시 실제 게시 / 미연결 시 `failed` 사유) 확인.
2. 블로그: "발행 큐에 넣기"(draft) → 예약 → 스케줄러가 `blog_published` published 전환 + (훅 설정 시) 배포 트리거.
3. `즉시 발행` 버튼이 `/publish/run` 경유로 동작하는지(메타·website 모두).

## 라이브 전제 (사용자)
- Meta 실제 게시는 Meta 앱·검수 필요(별도). 블로그 자동 재빌드는 `RAILWAY_DEPLOY_HOOK_URL` 설정 필요.
