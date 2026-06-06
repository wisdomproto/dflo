# Meta 발행 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meta(Facebook/Instagram/Threads)를 1회 OAuth로 연결하고, 연결된 페이지/IG/Threads를 언어 채널로 매핑해, dflo 콘텐츠를 ai-server가 Graph API로 실제 발행한다(토큰 서버 전용·암호화).

**Architecture:** ContentFlow(`C:\project\contentflow1\contentflow`)의 검증된 Meta 연동을 dflo로 포팅. OAuth/발행 로직은 동일, Next.js→Express(ai-server)로 교체. 크로스-오리진(SPA→ai-server→FB→ai-server→SPA) + 토큰 AES-256-GCM 암호화 저장. 순수 함수(암복호/URL빌더/발행검증)는 `node --test`로 TDD.

**Tech Stack:** ai-server(Express, TS, ESM `.js` import 확장자, Node 24 — `node --test`가 `.test.ts` 네이티브 실행), Supabase(anon RLS), v4(React 19 + Vite), Graph API v21.0.

---

## 사전 지식 (구현자가 꼭 알 것)

- **ai-server 구조**: 라우트는 `src/routes/*.ts`에서 Express Router export → `src/index.ts`에서 `app.use(path, ...middlewares, router)`. 프로덕션은 `/api/marketing/*`에 `authMiddleware`가 붙지만 dev는 미들웨어 off(현재 운영 현실). `/api/analytics`·`/api/knowledge`·`/api/r2`는 미들웨어 없음(공개).
- **Supabase 클라이언트(ai-server 패턴)**: `createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })`. 현재 service_role 키는 임시로 anon 키(RLS 허용 테이블에서 동작). **토큰 테이블은 암호화로 보호**하므로 anon 키여도 평문 노출 0.
- **테스트**: ai-server `package.json` → `"test": "node --test"`. Node 24는 `.test.ts`를 네이티브 타입스트립으로 실행. 테스트는 `src/services/__tests__/*.test.ts`에 두고, 확실히 돌리려면 명시 경로로 실행: `node --test src/services/__tests__/<name>.test.ts`.
- **타입체크**: ai-server `npx tsc --noEmit`; v4 `cd v4 && npx tsc --noEmit`.
- **빌드/실행**: ai-server `npm run dev`(tsx watch). import는 ESM이라 **상대 import에 `.js` 확장자**를 붙인다(예: `import { encrypt } from './metaCrypto.js'`) — 기존 ai-server 코드 컨벤션 확인 후 동일하게.
- **마이그레이션**: Supabase Dashboard 수동 적용. 미적용이어도 graceful.
- **커밋**: 사용자 글로벌 규칙상 자동 push 금지. 각 태스크 **로컬 커밋만**. remotion WIP 등 무관 파일 절대 스테이징 금지(`git add -A` 금지, 파일 지정).
- **라이브 Meta 한계**: 실제 OAuth/발행은 **Meta 개발자 앱(`META_APP_ID/SECRET`) + 리다이렉트 URI 등록 + 앱 검수**가 있어야 동작. 이 플랜은 코드 + 순수 단위테스트 + tsc까지 완수하고, 라이브 클릭 검증은 사용자가 Meta 앱을 준비한 뒤 수동으로 한다.

## ContentFlow 참조 (포팅 원본 — 그대로 읽어 반영)
- OAuth 시작: `src/app/api/auth/meta/route.ts` (스코프·dialog URL)
- 콜백: `src/app/api/auth/meta/callback/route.ts` (code→단기→장기 토큰, `/me/accounts` 묶음)
- 발행: `src/app/api/publish/meta/route.ts` (FB feed / IG media→media_publish / Threads threads→threads_publish)

## 파일 구조

**ai-server 생성**
- `src/services/metaCrypto.ts` — AES-256-GCM encrypt/decrypt (순수)
- `src/services/metaOAuth.ts` — buildAuthUrl(순수) + exchangeCodeForToken + fetchAccounts (Graph fetch)
- `src/services/metaPublishPrep.ts` — validatePublish + targetIdFor (순수)
- `src/services/metaPublish.ts` — publishFacebook/Instagram/Threads (Graph fetch)
- `src/services/metaConnectionStore.ts` — marketing_meta_connection CRUD + 암복호 래핑
- `src/routes/metaAuth.ts` — GET `/` (start), GET `/callback`
- `src/routes/__tests__` 아님 → `src/services/__tests__/metaCrypto.test.ts`, `metaOAuth.test.ts`, `metaPublishPrep.test.ts`

**ai-server 수정**
- `src/index.ts` — `app.use('/api/auth/meta', metaAuthRouter)` (공개)
- `src/routes/marketing.ts` — meta connection GET/DELETE + publish POST 핸들러 추가

**v4 생성**
- `src/features/marketing/services/metaConnectionService.ts` — 연결 상태/연결시작/해제/페이지매핑/발행 클라

**v4 수정**
- `src/features/marketing/services/marketingChannelService.ts` — metaPageId/metaIgId/metaThreadsId 필드
- `src/features/marketing/components/ChannelRegistryTab.tsx` — Meta 연결 헤더 + 언어-우선 + 페이지→채널 추가
- `src/features/marketing/components/content/PublishDialog.tsx` — 실제 발행 호출 + IG/텍스트 검증
- `src/features/marketing/services/marketingPublishService.ts` — PublishQueueItem에 platformPostId/errorMessage

**마이그레이션**
- `v4/scripts/migrations/041_marketing_meta_connection.sql`
- `v4/scripts/migrations/042_channels_meta_target_and_queue_result.sql`

---

# Phase M1 — 백엔드 토대 (마이그레이션 + 암호화 + 연결 저장소)

### Task 1: 마이그레이션 041·042

**Files:** Create `v4/scripts/migrations/041_marketing_meta_connection.sql`, `v4/scripts/migrations/042_channels_meta_target_and_queue_result.sql`

- [ ] **Step 1: 041 작성**
```sql
-- 041_marketing_meta_connection.sql
-- Meta 연결(암호화 토큰 묶음). enc_payload는 ai-server에서 AES-256-GCM 암호화한 JSON.
-- 토큰은 서버 전용. Supabase Dashboard에서 1회 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_meta_connection (
  id             uuid primary key default gen_random_uuid(),
  meta_user_id   text unique,
  meta_user_name text default '',
  enc_payload    text not null,
  expires_at     timestamptz,
  connected_at   timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table marketing_meta_connection enable row level security;
-- 토큰은 암호문이라 1차 방어됨. 정식 service_role 키 확보 시 anon 차단으로 강화 권장.
drop policy if exists meta_conn_all on marketing_meta_connection;
create policy meta_conn_all on marketing_meta_connection
  for all to anon, authenticated using (true) with check (true);
```

- [ ] **Step 2: 042 작성**
```sql
-- 042_channels_meta_target_and_queue_result.sql
-- 채널을 Meta 타겟에 매핑 + 발행 결과 컬럼. Supabase Dashboard에서 1회 적용.
alter table marketing_channels add column if not exists meta_page_id text;
alter table marketing_channels add column if not exists meta_ig_id text;
alter table marketing_channels add column if not exists meta_threads_id text;
alter table marketing_publish_queue add column if not exists platform_post_id text;
alter table marketing_publish_queue add column if not exists error_message text;
```

- [ ] **Step 3: Commit**
```bash
git add v4/scripts/migrations/041_marketing_meta_connection.sql v4/scripts/migrations/042_channels_meta_target_and_queue_result.sql
git commit -m "feat(meta): 연결 토큰 테이블 + 채널 meta 타겟/큐 결과 마이그레이션"
```

---

### Task 2: metaCrypto (AES-256-GCM) + TDD

**Files:** Create `ai-server/src/services/metaCrypto.ts`, `ai-server/src/services/__tests__/metaCrypto.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`ai-server/src/services/__tests__/metaCrypto.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../metaCrypto.js';

const KEY = crypto.randomBytes(32).toString('base64');

test('encrypt→decrypt 왕복', () => {
  const plain = JSON.stringify({ token: 'abc', pages: [1, 2] });
  const cipher = encrypt(plain, KEY);
  assert.notEqual(cipher, plain);
  assert.equal(decrypt(cipher, KEY), plain);
});

test('다른 키로 복호화 실패', () => {
  const cipher = encrypt('secret', KEY);
  const other = crypto.randomBytes(32).toString('base64');
  assert.throws(() => decrypt(cipher, other));
});

test('변조된 페이로드 복호화 실패', () => {
  const cipher = encrypt('secret', KEY);
  const parts = cipher.split('.');
  parts[2] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decrypt(parts.join('.'), KEY));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaCrypto.test.ts`
Expected: FAIL — `Cannot find module './metaCrypto.js'` (또는 import 에러).

- [ ] **Step 3: 구현**

`ai-server/src/services/metaCrypto.ts`:
```ts
// Meta 토큰 암호화(at-rest). AES-256-GCM. 키는 META_TOKEN_ENC_KEY(base64 32바이트).
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

export function encrypt(plain: string, keyB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(payload: string, keyB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function getEncKey(): string {
  const k = process.env.META_TOKEN_ENC_KEY;
  if (!k) throw new Error('META_TOKEN_ENC_KEY 환경변수가 필요합니다 (base64 32바이트).');
  return k;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaCrypto.test.ts`
Expected: PASS (3 tests). 또 `cd ai-server && npx tsc --noEmit` → 0 에러.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/services/metaCrypto.ts ai-server/src/services/__tests__/metaCrypto.test.ts
git commit -m "feat(meta): 토큰 암호화(AES-256-GCM) + 테스트"
```

---

### Task 3: metaConnectionStore (CRUD + 암복호)

**Files:** Create `ai-server/src/services/metaConnectionStore.ts`

- [ ] **Step 1: 구현**

`ai-server/src/services/metaConnectionStore.ts`:
```ts
// marketing_meta_connection CRUD. 토큰 묶음은 암호화 저장. 토큰은 절대 클라로 안 나간다.
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, getEncKey } from './metaCrypto.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface MetaPage {
  id: string;
  name: string;
  pageAccessToken: string;
  instagram: { id: string; username: string } | null;
  threadsId: string | null;
}
export interface MetaBundle {
  userToken: string;
  userId: string;
  userName: string;
  pages: MetaPage[];
  connectedAt: string;
}

export async function saveConnection(bundle: MetaBundle, expiresAt: string | null): Promise<void> {
  const enc_payload = encrypt(JSON.stringify(bundle), getEncKey());
  const { error } = await sb.from('marketing_meta_connection').upsert(
    {
      meta_user_id: bundle.userId,
      meta_user_name: bundle.userName,
      enc_payload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'meta_user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function getBundle(): Promise<MetaBundle | null> {
  const { data, error } = await sb
    .from('marketing_meta_connection')
    .select('enc_payload')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  try {
    return JSON.parse(decrypt(data[0].enc_payload as string, getEncKey())) as MetaBundle;
  } catch {
    return null;
  }
}

// 클라 노출용 — 토큰 제거한 요약.
export async function getConnectionPublic(): Promise<{
  connected: boolean;
  userName?: string;
  pages?: Array<{ id: string; name: string; instagram: { id: string; username: string } | null; threadsId: string | null }>;
}> {
  const b = await getBundle();
  if (!b) return { connected: false };
  return {
    connected: true,
    userName: b.userName,
    pages: b.pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram, threadsId: p.threadsId })),
  };
}

// 페이지/IG/Threads id로 해당 페이지 토큰을 찾는다.
export function findPageToken(bundle: MetaBundle, targetId: string): string | null {
  for (const p of bundle.pages) {
    if (p.id === targetId || p.instagram?.id === targetId || p.threadsId === targetId) {
      return p.pageAccessToken;
    }
  }
  return null;
}

export async function deleteConnection(): Promise<void> {
  const { error } = await sb.from('marketing_meta_connection').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ai-server && npx tsc --noEmit` → 0 에러.

- [ ] **Step 3: Commit**
```bash
git add ai-server/src/services/metaConnectionStore.ts
git commit -m "feat(meta): 연결 토큰 저장소(암복호 래핑 + 토큰 비노출 요약)"
```

---

# Phase M2 — OAuth (ai-server)

### Task 4: metaOAuth (buildAuthUrl TDD + 토큰 교환/계정 조회)

**Files:** Create `ai-server/src/services/metaOAuth.ts`, `ai-server/src/services/__tests__/metaOAuth.test.ts`

- [ ] **Step 1: 실패 테스트**

`ai-server/src/services/__tests__/metaOAuth.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthUrl, META_SCOPES } from '../metaOAuth.js';

test('buildAuthUrl: dialog URL + 스코프 + redirect_uri + state 포함', () => {
  const url = buildAuthUrl({ appId: 'APP123', redirectUri: 'https://x.com/api/auth/meta/callback', state: 'https://spa/marketing/channels' });
  assert.ok(url.startsWith('https://www.facebook.com/v21.0/dialog/oauth?'));
  assert.ok(url.includes('client_id=APP123'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes(encodeURIComponent('https://x.com/api/auth/meta/callback')));
  assert.ok(url.includes(encodeURIComponent('https://spa/marketing/channels')));
  for (const s of ['pages_manage_posts', 'instagram_content_publish']) assert.ok(META_SCOPES.includes(s));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaOAuth.test.ts` → FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`ai-server/src/services/metaOAuth.ts` (ContentFlow callback 로직 포팅):
```ts
// Meta OAuth — dialog URL(순수) + 토큰 교환 + 계정 묶음 조회. graph v21.0.
import type { MetaBundle, MetaPage } from './metaConnectionStore.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'threads_basic',
  'threads_content_publish',
];

export function buildAuthUrl(opts: { appId: string; redirectUri: string; state: string }): string {
  const scope = META_SCOPES.join(',');
  return (
    `https://www.facebook.com/v21.0/dialog/oauth?client_id=${opts.appId}` +
    `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
    `&scope=${scope}&response_type=code&auth_type=rerequest` +
    `&state=${encodeURIComponent(opts.state)}`
  );
}

// code → 단기 → 60일 장기 토큰. 반환: { token, expiresInSec }
export async function exchangeCodeForToken(opts: {
  appId: string; appSecret: string; redirectUri: string; code: string;
}): Promise<{ token: string; expiresInSec: number }> {
  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${opts.appId}&redirect_uri=${encodeURIComponent(opts.redirectUri)}&client_secret=${opts.appSecret}&code=${opts.code}`,
  );
  const short = await shortRes.json();
  if (short.error) throw new Error(short.error.message);
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${opts.appId}&client_secret=${opts.appSecret}&fb_exchange_token=${short.access_token}`,
  );
  const long = await longRes.json();
  return {
    token: long.access_token || short.access_token,
    expiresInSec: Number(long.expires_in) || 60 * 24 * 3600,
  };
}

// 사용자 + 페이지 + IG 비즈니스 묶음. Threads id는 페이지 id로 best-effort 매핑(ContentFlow 방식).
export async function fetchAccounts(token: string): Promise<MetaBundle> {
  const [userRes, pagesRes] = await Promise.all([
    fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`),
    fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account%7Bid,username%7D&access_token=${token}`),
  ]);
  const user = await userRes.json();
  const pages = await pagesRes.json();
  const pagesData: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }> =
    pages.data || [];
  const mapped: MetaPage[] = pagesData.map((p) => ({
    id: p.id,
    name: p.name,
    pageAccessToken: p.access_token,
    instagram: p.instagram_business_account
      ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username }
      : null,
    threadsId: p.id, // ContentFlow 방식: Threads는 페이지 id로 호출. 라이브 테스트 후 조정 가능.
  }));
  return {
    userToken: token,
    userId: user.id,
    userName: user.name,
    pages: mapped,
    connectedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaOAuth.test.ts` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/services/metaOAuth.ts ai-server/src/services/__tests__/metaOAuth.test.ts
git commit -m "feat(meta): OAuth URL 빌더(테스트) + 토큰 교환/계정 조회"
```

---

### Task 5: OAuth 라우트 + index 마운트

**Files:** Create `ai-server/src/routes/metaAuth.ts`; Modify `ai-server/src/index.ts`

- [ ] **Step 1: 라우트 작성**

`ai-server/src/routes/metaAuth.ts`:
```ts
// Meta OAuth 라우트(공개). SPA가 /api/auth/meta로 top-level redirect → FB → /callback → SPA 복귀.
import { Router } from 'express';
import { buildAuthUrl, exchangeCodeForToken, fetchAccounts } from '../services/metaOAuth.js';
import { saveConnection } from '../services/metaConnectionStore.js';

export const metaAuthRouter = Router();

function redirectBase(): string {
  return (process.env.META_REDIRECT_BASE || '').replace(/\/$/, '');
}

// GET /api/auth/meta?return={spaUrl}
metaAuthRouter.get('/', (req, res) => {
  const appId = process.env.META_APP_ID;
  if (!appId) return res.status(500).send('META_APP_ID 미설정');
  const ret = String(req.query.return || '');
  const redirectUri = `${redirectBase()}/api/auth/meta/callback`;
  res.redirect(buildAuthUrl({ appId, redirectUri, state: ret }));
});

// GET /api/auth/meta/callback?code=...&state={spaUrl}
metaAuthRouter.get('/callback', async (req, res) => {
  const spa = String(req.query.state || process.env.CORS_ORIGIN || '');
  const fail = (msg: string) => res.redirect(`${spa}?meta_error=${encodeURIComponent(msg)}`);
  const code = req.query.code ? String(req.query.code) : '';
  if (!code) return fail(String(req.query.error || 'no_code'));
  try {
    const { token, expiresInSec } = await exchangeCodeForToken({
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      redirectUri: `${redirectBase()}/api/auth/meta/callback`,
      code,
    });
    const bundle = await fetchAccounts(token);
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
    await saveConnection(bundle, expiresAt);
    res.redirect(`${spa}?meta_connected=1`);
  } catch (e) {
    fail(e instanceof Error ? e.message : 'oauth_failed');
  }
});
```

- [ ] **Step 2: index.ts 마운트 (공개, 미들웨어 없음)**

`ai-server/src/index.ts`의 import 블록에 추가:
```ts
import { metaAuthRouter } from './routes/metaAuth.js';
```
라우트 마운트 구역(다른 `app.use` 근처, `/api/knowledge` 줄 부근)에 추가:
```ts
app.use('/api/auth/meta', metaAuthRouter);
```

- [ ] **Step 3: 타입체크**

Run: `cd ai-server && npx tsc --noEmit` → 0 에러.

- [ ] **Step 4: Commit**
```bash
git add ai-server/src/routes/metaAuth.ts ai-server/src/index.ts
git commit -m "feat(meta): OAuth 시작/콜백 라우트(공개) + 마운트"
```

---

# Phase M3 — 발행 (ai-server)

### Task 6: metaPublishPrep (발행 검증/타겟 — 순수) + TDD

**Files:** Create `ai-server/src/services/metaPublishPrep.ts`, `ai-server/src/services/__tests__/metaPublishPrep.test.ts`

- [ ] **Step 1: 실패 테스트**

`ai-server/src/services/__tests__/metaPublishPrep.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePublish, targetIdFor, htmlToText } from '../metaPublishPrep.js';

test('IG는 이미지 없으면 거부', () => {
  assert.equal(validatePublish('instagram', []).ok, false);
  assert.equal(validatePublish('instagram', ['u']).ok, true);
});
test('FB/Threads는 텍스트만도 허용', () => {
  assert.equal(validatePublish('facebook', []).ok, true);
  assert.equal(validatePublish('threads', []).ok, true);
});
test('targetIdFor: 플랫폼별 채널 id 선택', () => {
  const ch = { platform: 'instagram', meta_page_id: 'P', meta_ig_id: 'IG', meta_threads_id: 'T' };
  assert.equal(targetIdFor(ch, 'instagram'), 'IG');
  assert.equal(targetIdFor(ch, 'facebook'), 'P');
  assert.equal(targetIdFor(ch, 'threads'), 'T');
});
test('htmlToText: 태그 제거 + 공백 정리', () => {
  assert.equal(htmlToText('<p>안녕 <b>키</b></p>'), '안녕 키');
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaPublishPrep.test.ts` → FAIL.

- [ ] **Step 3: 구현**

`ai-server/src/services/metaPublishPrep.ts`:
```ts
// 발행 전 순수 헬퍼: 플랫폼-콘텐츠 호환 검증, 채널→타겟 id, HTML→텍스트.
export type Platform = 'facebook' | 'instagram' | 'threads';

export function validatePublish(platform: Platform, imageUrls: string[]): { ok: boolean; reason?: string } {
  if (platform === 'instagram' && imageUrls.length === 0) {
    return { ok: false, reason: 'Instagram은 이미지가 1장 이상 필요합니다(텍스트 전용 불가).' };
  }
  return { ok: true };
}

export function targetIdFor(
  ch: { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
  platform: Platform,
): string | null {
  if (platform === 'instagram') return ch.meta_ig_id ?? null;
  if (platform === 'facebook') return ch.meta_page_id ?? null;
  return ch.meta_threads_id ?? null;
}

export function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd ai-server && node --test src/services/__tests__/metaPublishPrep.test.ts` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/services/metaPublishPrep.ts ai-server/src/services/__tests__/metaPublishPrep.test.ts
git commit -m "feat(meta): 발행 검증/타겟/텍스트 추출 순수 헬퍼 + 테스트"
```

---

### Task 7: metaPublish (Graph 발행 — FB/IG/Threads, 캐러셀)

**Files:** Create `ai-server/src/services/metaPublish.ts`

- [ ] **Step 1: 구현** (ContentFlow `publish/meta/route.ts` 포팅 + IG/Threads 캐러셀 확장)

`ai-server/src/services/metaPublish.ts`:
```ts
// Graph v21.0 발행. 반환: { postId } 또는 throw(Graph 에러 메시지).
const GRAPH = 'https://graph.facebook.com/v21.0';

async function gpost(path: string, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'Graph 오류');
  return json;
}

export async function publishFacebook(pageId: string, token: string, caption: string): Promise<string> {
  const r = await gpost(`${pageId}/feed`, { message: caption, access_token: token });
  return r.id;
}

export async function publishInstagram(igId: string, token: string, caption: string, imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 1) {
    const c = await gpost(`${igId}/media`, { image_url: imageUrls[0], caption, access_token: token });
    const r = await gpost(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
    return r.id;
  }
  // 캐러셀: child 컨테이너 → carousel 컨테이너 → publish
  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await gpost(`${igId}/media`, { image_url: url, is_carousel_item: true, access_token: token });
    children.push(child.id);
  }
  const carousel = await gpost(`${igId}/media`, {
    media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
  });
  const r = await gpost(`${igId}/media_publish`, { creation_id: carousel.id, access_token: token });
  return r.id;
}

export async function publishThreads(threadsId: string, token: string, caption: string, imageUrls: string[]): Promise<string> {
  let creationId: string;
  if (imageUrls.length <= 1) {
    const c = await gpost(`${threadsId}/threads`, {
      media_type: imageUrls[0] ? 'IMAGE' : 'TEXT', text: caption,
      ...(imageUrls[0] ? { image_url: imageUrls[0] } : {}), access_token: token,
    });
    creationId = c.id;
  } else {
    const children: string[] = [];
    for (const url of imageUrls) {
      const child = await gpost(`${threadsId}/threads`, { media_type: 'IMAGE', image_url: url, is_carousel_item: true, access_token: token });
      children.push(child.id);
    }
    const carousel = await gpost(`${threadsId}/threads`, { media_type: 'CAROUSEL', children: children.join(','), text: caption, access_token: token });
    creationId = carousel.id;
  }
  const r = await gpost(`${threadsId}/threads_publish`, { creation_id: creationId, access_token: token });
  return r.id;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ai-server && npx tsc --noEmit` → 0.

- [ ] **Step 3: Commit**
```bash
git add ai-server/src/services/metaPublish.ts
git commit -m "feat(meta): Graph 발행(FB/IG/Threads, 캐러셀 포함)"
```

---

### Task 8: marketing 라우트에 connection + publish 핸들러

**Files:** Modify `ai-server/src/routes/marketing.ts`

- [ ] **Step 1: import 추가** (파일 상단 import 구역)
```ts
import { getConnectionPublic, getBundle, findPageToken, deleteConnection } from '../services/metaConnectionStore.js';
import { validatePublish, targetIdFor, htmlToText, type Platform } from '../services/metaPublishPrep.js';
import { publishFacebook, publishInstagram, publishThreads } from '../services/metaPublish.js';
```
(파일 상단의 supabase 클라이언트 `sb`가 이미 있으니 재사용.)

- [ ] **Step 2: connection 핸들러 추가** (라우터에 핸들러 등록 — 파일의 다른 `router.get/post` 패턴 따름; 라우터 변수명은 파일 확인 후 일치시킬 것, 예: `marketingRouter`)
```ts
// GET /api/marketing/meta/connection — 토큰 제외 연결 요약
router.get('/meta/connection', async (_req, res) => {
  try {
    res.json({ success: true, ...(await getConnectionPublic()) });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'error' });
  }
});

// DELETE /api/marketing/meta/connection — 연결 해제
router.delete('/meta/connection', async (_req, res) => {
  try {
    await deleteConnection();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'error' });
  }
});
```

- [ ] **Step 3: publish 핸들러 추가**
```ts
// POST /api/marketing/meta/publish { queueId } — 실제 발행 후 큐 행 갱신
router.post('/meta/publish', async (req, res) => {
  const { queueId } = req.body ?? {};
  if (!queueId) return res.status(400).json({ success: false, error: 'queueId 필요' });
  try {
    // 1) 큐 + 채널 로드
    const { data: q } = await sb.from('marketing_publish_queue').select('*').eq('id', queueId).single();
    if (!q) return res.status(404).json({ success: false, error: '큐 항목 없음' });
    const platform = q.channel as Platform;
    if (!['facebook', 'instagram', 'threads'].includes(platform)) {
      return res.status(400).json({ success: false, error: 'Meta 채널이 아닙니다' });
    }
    const { data: ch } = await sb.from('marketing_channels').select('*').eq('id', q.channel_id).single();
    if (!ch) return res.status(400).json({ success: false, error: '채널 없음' });

    // 2) 콘텐츠 → 캡션/이미지
    let caption = '';
    let imageUrls: string[] = [];
    if (q.content_kind === 'cardnews') {
      const { data: cn } = await sb.from('marketing_cardnews').select('id, caption, hashtags').eq('content_id', q.article_id).limit(1).single();
      if (cn) {
        caption = [cn.caption, (cn.hashtags ?? []).map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')].filter(Boolean).join('\n\n');
        const { data: slides } = await sb.from('marketing_cardnews_slides').select('canvas, sort_order').eq('cardnews_id', cn.id).order('sort_order');
        imageUrls = (slides ?? []).map((s: { canvas: { imageUrl?: string | null } }) => s.canvas?.imageUrl).filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
      }
    } else {
      const { data: art } = await sb.from('marketing_articles').select('title, body, translations').eq('id', q.article_id).single();
      const lang = q.language || 'ko';
      const body = lang === 'ko' ? art?.body : art?.translations?.[lang]?.body;
      caption = htmlToText(body || '');
    }

    // 3) 검증 + 타겟 + 토큰
    const v = validatePublish(platform, imageUrls);
    if (!v.ok) return res.status(400).json({ success: false, error: v.reason });
    const targetId = targetIdFor(ch, platform);
    if (!targetId) return res.status(400).json({ success: false, error: '채널에 Meta 타겟 id가 없습니다. 연결/매핑 필요.' });
    const bundle = await getBundle();
    if (!bundle) return res.status(400).json({ success: false, error: 'Meta 연결이 없습니다.' });
    const token = findPageToken(bundle, targetId);
    if (!token) return res.status(400).json({ success: false, error: '해당 타겟의 토큰을 찾을 수 없습니다(재연결 필요).' });

    // 4) 발행
    let postId = '';
    if (platform === 'facebook') postId = await publishFacebook(targetId, token, caption);
    else if (platform === 'instagram') postId = await publishInstagram(targetId, token, caption, imageUrls);
    else postId = await publishThreads(targetId, token, caption, imageUrls);

    // 5) 큐 갱신
    await sb.from('marketing_publish_queue').update({
      status: 'published', platform_post_id: postId, published_at: new Date().toISOString(),
      error_message: null, updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    res.json({ success: true, postId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '발행 실패';
    await sb.from('marketing_publish_queue').update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() }).eq('id', queueId);
    res.status(500).json({ success: false, error: msg });
  }
});
```
> 라우터 변수명(`router` vs `marketingRouter`)·`sb` 클라이언트명은 `marketing.ts` 실제 코드에 맞춘다. 카드뉴스 테이블/컬럼명(`marketing_cardnews`, `marketing_cardnews_slides`, `canvas.imageUrl`)은 `cardnewsService.ts` 기준.

- [ ] **Step 4: 타입체크**

Run: `cd ai-server && npx tsc --noEmit` → 0 에러.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/routes/marketing.ts
git commit -m "feat(meta): connection 조회/해제 + 실제 발행 핸들러"
```

---

# Phase M4 — 프론트엔드 (연결 서비스 + 채널 설정 UI)

### Task 9: metaConnectionService (클라)

**Files:** Create `v4/src/features/marketing/services/metaConnectionService.ts`

- [ ] **Step 1: 구현**
```ts
// src/features/marketing/services/metaConnectionService.ts
// Meta 연결 상태/연결시작/해제/발행 — ai-server 프록시(토큰은 절대 클라로 안 옴).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export interface MetaConnection {
  connected: boolean;
  userName?: string;
  pages?: Array<{ id: string; name: string; instagram: { id: string; username: string } | null; threadsId: string | null }>;
}

export async function getMetaConnection(): Promise<MetaConnection> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`);
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) return { connected: false };
  return b as MetaConnection;
}

// top-level redirect로 OAuth 시작. 콜백 후 returnTo?meta_connected=1로 복귀.
export function startMetaConnect(returnTo: string): void {
  window.location.href = `${BASE}/api/auth/meta?return=${encodeURIComponent(returnTo)}`;
}

export async function disconnectMeta(): Promise<void> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`, { method: 'DELETE' });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '연결 해제 실패');
}

export async function publishToMeta(queueId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/meta/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '발행 실패');
  return b.postId as string;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit` → 0.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/services/metaConnectionService.ts
git commit -m "feat(meta): 프론트 연결/발행 클라이언트 서비스"
```

---

### Task 10: 채널 서비스 — meta 타겟 필드

**Files:** Modify `v4/src/features/marketing/services/marketingChannelService.ts`

- [ ] **Step 1: 타입 + 매퍼**

`MarketingChannel` 인터페이스에 `isActive: boolean;` 다음 줄에 추가:
```ts
  isActive: boolean;
  metaPageId: string | null;
  metaIgId: string | null;
  metaThreadsId: string | null;
```
`rowToChannel` 반환에 `isActive` 다음 추가:
```ts
    isActive: (r.is_active as boolean) ?? true,
    metaPageId: (r.meta_page_id as string | null) ?? null,
    metaIgId: (r.meta_ig_id as string | null) ?? null,
    metaThreadsId: (r.meta_threads_id as string | null) ?? null,
```
`channelToRow` 반환에 `is_active` 다음 추가:
```ts
    is_active: c.isActive ?? true,
    meta_page_id: c.metaPageId ?? null,
    meta_ig_id: c.metaIgId ?? null,
    meta_threads_id: c.metaThreadsId ?? null,
```

- [ ] **Step 2: 타입체크 + Commit**

Run: `cd v4 && npx tsc --noEmit` → 0.
```bash
git add v4/src/features/marketing/services/marketingChannelService.ts
git commit -m "feat(meta): 채널에 meta 타겟 id 필드(page/ig/threads)"
```

---

### Task 11: 채널 설정 UI — Meta 연결 헤더 + 언어-우선 + 페이지→채널 추가

**Files:** Modify `v4/src/features/marketing/components/ChannelRegistryTab.tsx`

> 이 태스크는 UI 비중이 커서 단계가 길다. 기존 동작(수기 추가/수정/삭제/언어필터)을 유지하면서 아래를 더한다.

- [ ] **Step 1: import + 연결 상태 로드**

상단 import에 추가:
```ts
import { getMetaConnection, startMetaConnect, disconnectMeta, type MetaConnection } from '../services/metaConnectionService';
```
컴포넌트 본문 상단(state들 근처)에 추가:
```ts
  const [meta, setMeta] = useState<MetaConnection>({ connected: false });
  const reloadMeta = () => getMetaConnection().then(setMeta).catch(() => setMeta({ connected: false }));
  useEffect(reloadMeta, []);
  // 콜백 복귀 감지
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('meta_connected') === '1') {
      reloadMeta();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
```

- [ ] **Step 2: Meta 연결 헤더 블록** (return JSX 최상단, 추가 폼 위에)
```tsx
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-sm">
          <span className="font-semibold text-gray-800">Meta 연결</span>{' '}
          {meta.connected ? (
            <span className="text-emerald-600">✓ {meta.userName} · 페이지 {meta.pages?.length ?? 0}개</span>
          ) : (
            <span className="text-gray-400">미연결</span>
          )}
        </div>
        {meta.connected ? (
          <button type="button" onClick={async () => { await disconnectMeta(); reloadMeta(); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600">연결 해제</button>
        ) : (
          <button type="button" onClick={() => startMetaConnect(window.location.origin + '/marketing/channels')}
            className="rounded-lg bg-[#1877f2] px-3 py-1.5 text-xs font-semibold text-white">Meta 연결</button>
        )}
      </div>
```

- [ ] **Step 3: 연결된 페이지 → 채널 추가** (연결 시, 헤더 다음)
```tsx
      {meta.connected && meta.pages && meta.pages.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 text-xs font-semibold text-gray-500">연결된 페이지에서 채널 추가 (언어 {localeFilter === 'all' ? 'ko' : localeFilter})</div>
          <div className="flex flex-wrap gap-2">
            {meta.pages.map((pg) => (
              <div key={pg.id} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs">
                <span className="font-medium text-gray-700">{pg.name}</span>
                <button type="button" title="Facebook 채널 추가"
                  onClick={() => addMetaChannel('facebook', pg)} className="rounded bg-[#1877f2] px-1.5 text-white">FB</button>
                {pg.instagram && (
                  <button type="button" title="Instagram 채널 추가"
                    onClick={() => addMetaChannel('instagram', pg)} className="rounded bg-pink-500 px-1.5 text-white">IG</button>
                )}
                <button type="button" title="Threads 채널 추가"
                  onClick={() => addMetaChannel('threads', pg)} className="rounded bg-gray-900 px-1.5 text-white">TH</button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">현재 선택된 언어로 채널이 추가됩니다(전체일 땐 ko).</p>
        </div>
      )}
```

- [ ] **Step 4: addMetaChannel 핸들러** (컴포넌트 본문에)
```ts
  const addMetaChannel = async (
    platform: 'facebook' | 'instagram' | 'threads',
    pg: NonNullable<MetaConnection['pages']>[number],
  ) => {
    const locale = localeFilter === 'all' ? 'ko' : localeFilter;
    await saveChannel({
      platform,
      name: platform === 'instagram' ? (pg.instagram?.username ?? pg.name) : pg.name,
      locale,
      isActive: true,
      metaPageId: pg.id,
      metaIgId: pg.instagram?.id ?? null,
      metaThreadsId: pg.threadsId,
    });
    reload();
  };
```
(`reload`/`saveChannel`/`localeFilter`는 기존 컴포넌트에 존재.)

- [ ] **Step 5: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 0.
수동(라이브 Meta 없으면 연결 헤더/버튼 렌더·연결 해제만 확인; 연결은 Meta 앱 준비 후).

- [ ] **Step 6: Commit**
```bash
git add v4/src/features/marketing/components/ChannelRegistryTab.tsx
git commit -m "feat(meta): 채널 설정에 Meta 연결 헤더 + 페이지→언어채널 추가"
```

---

# Phase M5 — 실제 발행 연결 (PublishDialog + 큐 결과)

### Task 12: 발행 큐 서비스 — 결과 필드 + 발행 함수 노출

**Files:** Modify `v4/src/features/marketing/services/marketingPublishService.ts`

- [ ] **Step 1: PublishQueueItem에 결과 필드 + rowToQueueItem 매핑**

`PublishQueueItem`에 추가(`contentKind?` 근처):
```ts
  platformPostId?: string | null;
  errorMessage?: string | null;
```
`rowToQueueItem` 반환에 추가:
```ts
    platformPostId: (r.platform_post_id as string | null) ?? null,
    errorMessage: (r.error_message as string | null) ?? null,
```

- [ ] **Step 2: 타입체크 + Commit**

Run: `cd v4 && npx tsc --noEmit` → 0.
```bash
git add v4/src/features/marketing/services/marketingPublishService.ts
git commit -m "feat(meta): 큐 항목에 platformPostId/errorMessage 노출"
```

---

### Task 13: PublishDialog — 큐 추가 후 즉시 Meta 발행

**Files:** Modify `v4/src/features/marketing/components/content/PublishDialog.tsx`

> 현재 소셜 경로는 `enqueue`로 draft 행만 만든다. 여기에 "발행 큐에 추가" 외 **"바로 발행"** 옵션을 더한다: enqueue 후 생성된 행 id로 `publishToMeta` 호출. enqueue가 id를 반환하지 않으므로, 추가 직후 최신 행을 조회하거나, 간단히 "큐에 추가"만 두고 실제 발행은 발행 큐 페이지의 "즉시 발행" 버튼(Task 14)에서 하도록 한다. **YAGNI: PublishDialog는 큐 추가까지, 실제 Meta 호출은 큐 페이지에서.**

- [ ] **Step 1: IG+텍스트 차단 안내만 보강** (PublishDialog social 블록)

`matchingChannels` 정의 다음에 경고용 파생 추가:
```ts
  const igSelectedForText = contentKind === 'post' &&
    matchingChannels.some((c) => selected.has(c.id) && c.platform === 'instagram');
```
"발행 큐에 추가" 버튼 위에 안내:
```tsx
            {igSelectedForText && (
              <p className="text-[11px] text-amber-600">⚠️ 기본글(텍스트)은 Instagram에 발행할 수 없습니다 — IG는 카드뉴스(이미지)만.</p>
            )}
```
버튼 `disabled`에 조건 추가: `disabled={busy || matchingChannels.length === 0 || igSelectedForText}`.

- [ ] **Step 2: 타입체크 + Commit**

Run: `cd v4 && npx tsc --noEmit` → 0.
```bash
git add v4/src/features/marketing/components/content/PublishDialog.tsx
git commit -m "feat(meta): PublishDialog에서 IG+텍스트 조합 차단 안내"
```

---

### Task 14: 발행 큐 "즉시 발행" → 실제 Meta 호출

**Files:** Modify `v4/src/features/marketing/components/PublishQueuePage.tsx`

> `PublishQueuePage`는 `PublishQueueList`에 `onPush(id, channel)`를 내려준다(현재 `/api/marketing/publish-push` 스텁 호출). Meta 채널(facebook/instagram/threads)일 때 `publishToMeta(id)`로 분기한다.

- [ ] **Step 1: onPush 분기** — `PublishQueuePage.tsx` 읽고, `onPush` 핸들러에서 channel이 Meta면 `publishToMeta`:

import 추가:
```ts
import { publishToMeta } from '../services/metaConnectionService';
```
onPush 구현을 다음 형태로(기존 핸들러 본문 교체; 함수/상태명은 파일에 맞춤):
```ts
  const handlePush = async (id: string, channel: string) => {
    try {
      if (channel === 'facebook' || channel === 'instagram' || channel === 'threads') {
        await publishToMeta(id);
      } else {
        // 기존 publish-push 경로 유지
        await fetch(`${BASE}/api/marketing/publish-push`, { /* 기존 본문 유지 */ });
      }
      reload(); // 큐 새로고침(기존 reload 함수)
    } catch (e) {
      alert(e instanceof Error ? e.message : '발행 실패');
    }
  };
```
> 파일의 실제 onPush/reload/BASE 명칭에 맞춰 최소 변경. Meta 분기만 추가하는 게 핵심.

- [ ] **Step 2: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 0.
(라이브 발행은 Meta 앱 준비 후. 코드 경로만 확인.)

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/components/PublishQueuePage.tsx
git commit -m "feat(meta): 발행 큐 즉시 발행이 Meta 채널이면 실제 Graph 발행 호출"
```

---

# Phase M6 — 환경/문서/검증

### Task 15: env 샘플 + 검증

**Files:** Modify `ai-server/.env` (로컬, gitignored — 커밋 안 함). 문서용으로 `ai-server/CLAUDE.md`에 env 항목만 추가.

- [ ] **Step 1: ai-server/.env에 추가** (로컬에만; 값은 사용자가 Meta 앱 생성 후 채움)
```
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_BASE=http://localhost:3001
META_TOKEN_ENC_KEY=   # base64 32바이트. 생성: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 2: ai-server/CLAUDE.md Environment 섹션에 항목 추가**

`ai-server/CLAUDE.md`의 환경변수 목록에 추가:
```
META_APP_ID / META_APP_SECRET   # Meta 개발자 앱
META_REDIRECT_BASE              # ai-server 공개 URL (OAuth redirect_uri base)
META_TOKEN_ENC_KEY             # 토큰 암호화 키 (base64 32바이트)
```

- [ ] **Step 3: 전체 검증**

Run:
```
cd ai-server && node --test src/services/__tests__/metaCrypto.test.ts src/services/__tests__/metaOAuth.test.ts src/services/__tests__/metaPublishPrep.test.ts && npx tsc --noEmit
cd v4 && npx tsc --noEmit
```
Expected: 모든 테스트 PASS, 양쪽 tsc 0 에러.

- [ ] **Step 4: Commit (CLAUDE.md만; .env는 커밋 금지)**
```bash
git add ai-server/CLAUDE.md
git commit -m "docs(meta): ai-server env 항목(META_*) 문서화"
```

---

## 자가 점검 (계획↔스펙)

- 연결 모델(1회 OAuth + 페이지→언어채널) → Task 4·5·10·11
- 토큰 서버 전용 + 암호화 → Task 2·3 (+ 클라는 토큰 미수신: Task 9 `getMetaConnection` 요약만)
- FB/IG/Threads 발행 → Task 6·7·8 (+ 캐러셀)
- 언어-우선 채널 설정 → Task 11 (언어 필터 기준 추가)
- 큐 결과/실제 발행 → Task 12·13·14
- env/전제 → Task 15
- 비범위(스케줄러·자동갱신) 미포함 확인 ✓

## 라이브 검증 전제 (사용자 작업)
1. Meta 개발자 앱 생성 → `META_APP_ID/SECRET` 발급, 리다이렉트 URI에 `{META_REDIRECT_BASE}/api/auth/meta/callback`(dev/prod) 등록.
2. `instagram_content_publish`·`pages_manage_posts`·`threads_content_publish` **앱 검수**(검수 전엔 앱 소유자/테스터만).
3. IG는 비즈니스/크리에이터 계정 + FB 페이지 연결.
4. `META_TOKEN_ENC_KEY` 생성해 ai-server .env에 설정.
5. 마이그레이션 041·042 Supabase Dashboard 적용.

## 미적용 마이그레이션
| # | 파일 | 내용 |
|---|---|---|
| 041 | marketing_meta_connection | 암호화 토큰 연결 |
| 042 | channels_meta_target_and_queue_result | 채널 meta_* + 큐 결과 |
