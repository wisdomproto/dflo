# 마케팅 발행/채널 재구조화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마케팅을 "언어(시장) 축"으로 일원화한다 — 채널·콘텐츠·사이트는 언어 단위, 지역은 유료광고 타겟팅에서만. 콘텐츠별 발행 버튼 + 등록 계정(언어 일치) 타겟 + 블로그 자체 사이트 임베드(동적+정적) + 카드뉴스 이미지 업로드 + 광고 지역 레이어를 추가한다.

**Architecture:** dflo v4 React/Vite `/marketing`(PIN 8054) + Supabase(anon RLS) + v4 i18n 정적 빌드. 순수 로직(큐 행 빌더, 블로그 슬러그/본문 빌더, published→post 매퍼)은 import 부작용 없는 `utils/`·`scripts/lib/` 파일에 두고 `node --test`로 단위 테스트. 서비스/컴포넌트는 그 순수 함수를 호출. 블로그 정적 발행은 `blog_published` 테이블을 ContentFlow 포스트와 동일 JSON 형태로 변환해 기존 `build-i18n.mjs` 렌더 경로를 재사용.

**Tech Stack:** React 19, TypeScript 5, Supabase JS, @dnd-kit, node:test + tsx, js-yaml (i18n build).

---

## 사전 지식 (구현자가 꼭 알 것)

- **다국어 모델(이미 존재):** `marketing_articles`는 마스터(ko) 1행 + `translations` JSONB(`{ en:{title,body}, th:{...} }`). 코드 타입은 `MarketingArticle`(`v4/src/features/marketing/types.ts`).
- **블로그 본문 소스 = 기본글 본문(언어별).** N블로그 탭의 네이버 카드(`blog_contents`/`blog_cards`)는 네이버 위성용으로 보존하고, **자체 사이트 블로그 발행은 기본글 본문**(ko=`article.body`, 그 외=`article.translations[lang].body`, TipTap HTML)을 쓴다. 카드 모델을 언어별로 확장하지 않는다(YAGNI).
- **테스트 실행:** v4 루트에서 `npm test`(= `node --import tsx --test scripts/test/*.mjs`). 순수 `.ts` 유틸은 tsx로 import 가능하나 **`@/` alias·supabase를 import하면 node에서 깨진다** → 테스트 대상 순수 함수는 그런 import가 없는 파일에 둔다. i18n `.mjs` 순수 함수는 `npm run test:i18n`(= `node --test scripts/test/*.mjs`)로도 돈다.
- **타입체크:** `cd v4 && npx tsc --noEmit`.
- **마이그레이션:** Supabase Dashboard 수동 적용(현 MCP 권한). 미적용이어도 서비스가 graceful fallback 하도록 작성.
- **모든 마케팅 테이블 RLS = anon full**(dev 키 패턴). 기존 마이그레이션(024/026/028) 동일 패턴 따를 것.
- **커밋 규칙:** 사용자 글로벌 규칙상 자동 push 금지. 각 태스크는 **로컬 커밋만** 한다(push·문서 "업데이트"는 사용자가 별도 지시).

## 파일 구조 (이 플랜이 만들거나 고치는 것)

**생성**
- `v4/scripts/migrations/037_marketing_channel_active.sql` — 채널 `is_active`
- `v4/scripts/migrations/038_publish_queue_channel_ref.sql` — 큐 `channel_id`,`content_kind`
- `v4/scripts/migrations/039_blog_published.sql` — 자체 사이트 블로그 발행본
- `v4/scripts/migrations/040_ad_region.sql` — 광고 `region`,`channel_id`
- `v4/src/features/marketing/utils/publishRows.ts` — 발행 큐 행 빌더(순수) + 채널/상태 타입 원천
- `v4/src/features/marketing/utils/blogPublish.ts` — 슬러그/발행본 빌더(순수)
- `v4/src/features/marketing/services/blogPublishService.ts` — `blog_published` CRUD(클라)
- `v4/src/features/marketing/components/content/PublishDialog.tsx` — 콘텐츠별 발행 모달
- `v4/src/features/marketing/components/BlogPreviewPage.tsx` — 동적 미리보기(noindex)
- `v4/scripts/lib/blog-supabase.mjs` — 정적 빌드용 published 로더 + `publishedRowToPost`
- `v4/scripts/test/publishRows.test.mjs`, `blogPublish.test.mjs`, `blogSupabase.test.mjs`

**수정**
- `v4/src/features/marketing/services/marketingChannelService.ts` — `isActive` + `LOCALES`
- `v4/src/features/marketing/components/ChannelRegistryTab.tsx` — 언어 select·활성 토글·플래그·필터
- `v4/src/features/marketing/components/ChannelAnalyticsPage.tsx` — registry 탭 제거(트래픽 전용)
- `v4/src/features/marketing/components/MarketingSidebar.tsx` — "채널 관리" 상위 항목
- `v4/src/app/router.tsx` — `/marketing/channels`, `/marketing/blog-preview/:articleId`
- `v4/src/features/marketing/services/marketingPublishService.ts` — `channelId`/`contentKind`/join, `enqueue` 재작성
- `v4/src/features/marketing/utils/publishConstants.ts` — `website` 채널 메타
- `v4/src/features/marketing/components/AddToQueueModal.tsx` — 새 `enqueue` 시그니처
- `v4/src/features/marketing/components/PublishQueueList.tsx` — 계정명 표시
- `v4/src/features/marketing/components/content/ContentTabs.tsx` — 발행 버튼
- `v4/scripts/build-i18n.mjs` — published 블로그 병합
- `v4/src/features/marketing/components/content/CardNewsPanel.tsx` — 이미지 업로드
- `v4/src/features/marketing/services/aiImageService.ts` — `uploadImageFile(File)`
- `v4/src/features/marketing/services/marketingAdsService.ts` — `region`/`channelId`
- `v4/src/features/marketing/components/AdCampaignForm.tsx` — region select
- `v4/src/features/marketing/components/AdsManagerPage.tsx` — region 필터

---

# Phase A — 채널 언어축 + IA

### Task 1: 마이그레이션 037 (채널 is_active)

**Files:**
- Create: `v4/scripts/migrations/037_marketing_channel_active.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- 037_marketing_channel_active.sql
-- 채널을 언어(시장) 단위로 운영. locale는 이미 024에 존재 → UI 노출만.
-- 비활성 계정 숨김용 is_active 추가. Supabase Dashboard SQL Editor에서 1회 적용.
alter table marketing_channels
  add column if not exists is_active boolean not null default true;
```

- [ ] **Step 2: 적용 안내 출력**

이 마이그레이션은 사용자가 Supabase Dashboard에 수동 적용한다. 서비스(Task 2)는 컬럼이 없어도 `is_active`를 `true`로 폴백하므로 미적용 상태에서도 동작한다.

- [ ] **Step 3: Commit**

```bash
git add v4/scripts/migrations/037_marketing_channel_active.sql
git commit -m "feat(marketing): 채널 is_active 마이그레이션 — 언어축 채널 관리 준비"
```

---

### Task 2: 채널 서비스 — isActive + LOCALES

**Files:**
- Modify: `v4/src/features/marketing/services/marketingChannelService.ts`

- [ ] **Step 1: `MarketingChannel`에 `isActive` 추가 + LOCALES export**

`marketingChannelService.ts`의 `interface MarketingChannel { ... sortOrder: number; }`를 아래로 교체(마지막 필드 뒤에 `isActive` 추가):

```ts
export interface MarketingChannel {
  id: string;
  platform: string;
  name: string;
  handle: string;
  url: string;
  followers: number;
  followerSnapshotAt: string | null;
  locale: string;
  note: string;
  sortOrder: number;
  isActive: boolean;
}

// 언어(시장) 단일 소스 — 채널/발행/광고 UI 공용.
export const LOCALES: { code: string; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

export function localeFlag(code: string): string {
  return LOCALES.find((l) => l.code === code)?.flag ?? '🌐';
}
```

- [ ] **Step 2: 매퍼에 is_active 반영**

`rowToChannel`의 `return {...}` 마지막에 추가:

```ts
    sortOrder: (r.sort_order as number) ?? 0,
    isActive: (r.is_active as boolean) ?? true,
  };
```

`channelToRow`의 `return {...}` 에서 `sort_order` 다음 줄에 추가:

```ts
    sort_order: c.sortOrder ?? 0,
    is_active: c.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
```

- [ ] **Step 3: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음 (ChannelRegistryTab은 Task 3에서 `isActive` 사용; 현재 `Draft=Partial`라 미설정 허용).

- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/services/marketingChannelService.ts
git commit -m "feat(marketing): 채널 서비스에 isActive + LOCALES(언어 단일 소스) 추가"
```

---

### Task 3: ChannelRegistryTab — 언어 select·활성 토글·플래그·필터

**Files:**
- Modify: `v4/src/features/marketing/components/ChannelRegistryTab.tsx`

- [ ] **Step 1: import + EMPTY + 언어 상수**

상단 import 교체:

```ts
import { useEffect, useState } from 'react';
import type { MarketingChannel } from '../services/marketingChannelService';
import {
  fetchChannels,
  saveChannel,
  deleteChannel,
  syncYoutubeChannel,
  LOCALES,
  localeFlag,
} from '../services/marketingChannelService';
```

`EMPTY` 교체(locale·isActive 포함):

```ts
const EMPTY: Draft = {
  platform: 'instagram', name: '', handle: '', url: '',
  followers: 0, note: '', locale: 'ko', isActive: true,
};
```

- [ ] **Step 2: 폼에 언어 select + 활성 체크박스 추가**

`ChannelFormRow` 내부, `note` 입력 `<input ... placeholder="메모" .../>` 바로 다음에 추가:

```tsx
      <select
        value={draft.locale ?? 'ko'}
        onChange={(e) => setDraft({ ...draft, locale: e.target.value })}
        className={cls}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={draft.isActive ?? true}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
        />
        활성
      </label>
```

- [ ] **Step 3: 언어 필터 + 행에 플래그/비활성 표시**

`ChannelRegistryTab` 본문에 필터 상태 추가 — `const [syncing, setSyncing] = useState<string | null>(null);` 다음에:

```ts
  const [localeFilter, setLocaleFilter] = useState<string>('all');
  const visible = localeFilter === 'all' ? channels : channels.filter((c) => c.locale === localeFilter);
```

`return (...)` 의 `<ChannelFormRow ... submitLabel="+ 추가" />` 다음(`{err && ...}` 위)에 필터 칩 추가:

```tsx
      <div className="flex flex-wrap gap-1">
        {[{ code: 'all', flag: '🌐', label: '전체' }, ...LOCALES].map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocaleFilter(l.code)}
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              localeFilter === l.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>
```

리스트 렌더를 `channels`→`visible`로 바꾸고(빈 상태 분기 포함), 행 표시명 옆에 플래그 + 비활성 dim 적용. `channels.length === 0 ? (...)` 를 `visible.length === 0 ? (...)` 로, `channels.map((c) =>` 를 `visible.map((c) =>` 로 교체. 표시 행의 `<div className="truncate text-sm font-medium text-gray-800">{c.name}</div>` 를:

```tsx
                  <div className={`truncate text-sm font-medium ${c.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {localeFlag(c.locale)} {c.name}
                  </div>
```

- [ ] **Step 4: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: `cd v4 && npm run dev` → `/marketing/channel-analytics` → 채널 관리 탭에서 채널 추가 시 언어 select·활성 체크, 언어 필터 칩 동작, 행에 국기/비활성 표시 확인.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/components/ChannelRegistryTab.tsx
git commit -m "feat(marketing): 채널 레지스트리에 언어 select·활성 토글·언어 필터 추가"
```

---

### Task 4: IA — "채널 관리" 상위 승격 + 라우트

**Files:**
- Modify: `v4/src/features/marketing/components/ChannelAnalyticsPage.tsx`
- Modify: `v4/src/features/marketing/components/MarketingSidebar.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: ChannelAnalyticsPage를 트래픽 전용으로**

`ChannelAnalyticsPage.tsx` 전체 교체:

```tsx
// src/features/marketing/components/ChannelAnalyticsPage.tsx
import { ChannelTrafficTab } from './ChannelTrafficTab';

export function ChannelAnalyticsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 pt-4 pb-2 text-sm font-semibold text-gray-700">
        📈 유입 분석
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChannelTrafficTab />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 사이드바에 "채널 관리" 그룹 추가**

`MarketingSidebar.tsx`의 `GROUPS` 배열에서 "오가닉 마케팅" 그룹 다음에 새 그룹을 삽입:

```ts
  {
    label: '채널 관리',
    items: [{ to: '/marketing/channels', icon: '🗂', label: '채널 (언어별)' }],
  },
```

- [ ] **Step 3: 라우트 추가**

`v4/src/app/router.tsx` 상단의 marketing lazy import 구역(`MarketingArticlesPage` 선언 근처, 81행)에 추가. router는 named export를 `.then((m) => ({ default: m.X }))` 패턴으로 lazy 로드한다 — 동일 형태:

```ts
const ChannelRegistryTab = lazy(() =>
  import('@/features/marketing/components/ChannelRegistryTab').then((m) => ({ default: m.ChannelRegistryTab })),
);
```

marketing children 배열에서 `articles` redirect 항목(298행) 근처에 라우트 추가:

```tsx
      {
        path: 'channels',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ChannelRegistryTab />
          </Suspense>
        ),
      },
```

> 주의: `ChannelRegistryTab`이 named export인지 확인. 위 lazy 패턴은 named export 기준. router.tsx의 기존 marketing import 스타일(default vs named)을 따를 것.

- [ ] **Step 4: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: dev에서 사이드바 "채널 관리 → 채널 (언어별)" 클릭 시 레지스트리 노출, "채널 분석"은 유입 분석만.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/components/ChannelAnalyticsPage.tsx v4/src/features/marketing/components/MarketingSidebar.tsx v4/src/app/router.tsx
git commit -m "feat(marketing): 채널 관리를 사이드바 상위로 승격 + /marketing/channels 라우트"
```

---

# Phase B-1 — 발행 큐 데이터 레이어

### Task 5: 마이그레이션 038 (큐 channel_id + content_kind)

**Files:**
- Create: `v4/scripts/migrations/038_publish_queue_channel_ref.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- 038_publish_queue_channel_ref.sql
-- 발행 대상을 '플랫폼 종류'가 아니라 '등록 계정(marketing_channels)'으로.
-- 블로그/사이트 발행은 channel_id NULL + channel='website'.
-- content_kind: 산출물 종류(blog|cardnews|post). Supabase Dashboard에서 1회 적용.
alter table marketing_publish_queue
  add column if not exists channel_id uuid references marketing_channels(id) on delete set null;
alter table marketing_publish_queue
  add column if not exists content_kind text not null default 'post';
```

- [ ] **Step 2: Commit**

```bash
git add v4/scripts/migrations/038_publish_queue_channel_ref.sql
git commit -m "feat(marketing): 발행 큐에 channel_id·content_kind 마이그레이션"
```

---

### Task 6: 발행 큐 행 빌더(순수) + TDD

**Files:**
- Create: `v4/src/features/marketing/utils/publishRows.ts`
- Create: `v4/scripts/test/publishRows.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`v4/scripts/test/publishRows.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueueRows } from '../../src/features/marketing/utils/publishRows.ts';

test('blog target → website 행 1개', () => {
  const rows = buildQueueRows({
    articleId: 'a1', language: 'th', contentKind: 'blog',
    targets: [{ channelId: null, channel: 'website' }],
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    article_id: 'a1', channel: 'website', channel_id: null,
    language: 'th', content_kind: 'blog', status: 'draft',
  });
});

test('social targets → 계정당 1행, 플랫폼 보존', () => {
  const rows = buildQueueRows({
    articleId: 'a2', language: 'ko', contentKind: 'cardnews',
    targets: [
      { channelId: 'c1', channel: 'instagram' },
      { channelId: 'c2', channel: 'facebook' },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].channel_id, 'c1');
  assert.equal(rows[0].channel, 'instagram');
  assert.equal(rows[1].channel, 'facebook');
  assert.ok(rows.every((r) => r.content_kind === 'cardnews' && r.status === 'draft'));
});

test('language 빈값 → ko 폴백', () => {
  const rows = buildQueueRows({
    articleId: 'a3', language: '', contentKind: 'post',
    targets: [{ channelId: null, channel: 'website' }],
  });
  assert.equal(rows[0].language, 'ko');
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && npm test`
Expected: FAIL — `Cannot find module ... publishRows.ts`.

- [ ] **Step 3: 순수 구현 작성**

`v4/src/features/marketing/utils/publishRows.ts`:

```ts
// 발행 큐 행 빌더(순수) — 채널/상태 타입의 원천 소스(import 부작용 없음 → 단위 테스트 가능).
export type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type PublishChannel =
  | 'wordpress' | 'instagram' | 'facebook' | 'threads' | 'youtube' | 'naver_blog' | 'website';
export type ContentKind = 'blog' | 'cardnews' | 'post';

export interface QueueTarget {
  channelId: string | null;
  channel: PublishChannel;
}
export interface BuildQueueInput {
  articleId: string;
  language: string;
  contentKind: ContentKind;
  targets: QueueTarget[];
}
export interface NewQueueRow {
  article_id: string;
  channel: PublishChannel;
  channel_id: string | null;
  language: string;
  content_kind: ContentKind;
  status: PublishStatus;
}

export function buildQueueRows(input: BuildQueueInput): NewQueueRow[] {
  return input.targets.map((t) => ({
    article_id: input.articleId,
    channel: t.channel,
    channel_id: t.channelId,
    language: input.language || 'ko',
    content_kind: input.contentKind,
    status: 'draft' as const,
  }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd v4 && npm test`
Expected: PASS (publishRows 3 테스트).

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/utils/publishRows.ts v4/scripts/test/publishRows.test.mjs
git commit -m "feat(marketing): 발행 큐 행 빌더(순수) + 테스트"
```

---

### Task 7: marketingPublishService — channelId/contentKind/join + enqueue 재작성

**Files:**
- Modify: `v4/src/features/marketing/services/marketingPublishService.ts`
- Modify: `v4/src/features/marketing/utils/publishConstants.ts`

- [ ] **Step 1: 타입 원천을 publishRows로 이전**

`marketingPublishService.ts` 상단의 직접 type 선언을 교체. 기존:

```ts
export type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type PublishChannel = 'wordpress' | 'instagram' | 'facebook' | 'threads' | 'youtube' | 'naver_blog';
```

→

```ts
import {
  buildQueueRows,
  type PublishStatus,
  type PublishChannel,
  type ContentKind,
  type BuildQueueInput,
} from '../utils/publishRows';
export type { PublishStatus, PublishChannel, ContentKind } from '../utils/publishRows';
```

- [ ] **Step 2: PublishQueueItem 필드 추가**

`interface PublishQueueItem`에 필드 추가(`viewCount?` 위쪽 derived 구역):

```ts
  articleTitle?: string;
  articleCategory?: string;
  channelId?: string | null;
  channelName?: string;
  contentKind?: ContentKind;
  viewCount?: number;
```

- [ ] **Step 3: 매퍼 보강**

`rowToQueueItem` 안에서 article 추출 다음에 channel 추출 추가하고 매핑 필드 추가:

```ts
function rowToQueueItem(r: Row): PublishQueueItem {
  const article = (r.marketing_articles ?? null) as Row | null;
  const ch = (r.marketing_channels ?? null) as Row | null;
  return {
    id: r.id as string,
    articleId: (r.article_id as string | null) ?? null,
    channel: ((r.channel as PublishChannel) ?? 'naver_blog'),
    language: (r.language as string) ?? 'ko',
    scheduledAt: (r.scheduled_at as string | null) ?? null,
    status: ((r.status as PublishStatus) ?? 'draft'),
    publishedUrl: (r.published_url as string | null) ?? null,
    publishedAt: (r.published_at as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
    articleTitle: article ? ((article.title as string) ?? '') : undefined,
    articleCategory: article ? ((article.category as string) ?? '') : undefined,
    channelId: (r.channel_id as string | null) ?? null,
    channelName: ch ? ((ch.name as string) ?? '') : undefined,
    contentKind: (r.content_kind as ContentKind) ?? 'post',
  };
}
```

- [ ] **Step 4: fetchQueue join에 채널 추가**

`fetchQueue`의 select를 교체:

```ts
    .select('*, marketing_articles(title, category), marketing_channels(name, platform, locale)')
```

> graceful: 038 미적용(channel_id 없음) 시 join이 빈 값이어도 `.warn` 후 빈 배열/undefined로 폴백(기존 패턴 유지).

- [ ] **Step 5: enqueue 재작성**

기존 `enqueue(articleId, channels, language)` 함수를 교체:

```ts
// BuildQueueInput(순수 빌더)로 행 생성 후 insert. updated_at만 비순수로 부착.
export async function enqueue(input: BuildQueueInput): Promise<void> {
  if (!input.targets.length) return;
  const now = new Date().toISOString();
  const rows = buildQueueRows(input).map((r) => ({ ...r, updated_at: now }));
  const { error } = await supabase.from('marketing_publish_queue').insert(rows);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 6: publishConstants에 website 메타 추가**

`v4/src/features/marketing/utils/publishConstants.ts`의 `CHANNELS` 배열 끝에 추가:

```ts
  { id: 'website', label: '자체 사이트', badge: 'bg-emerald-600 text-white', dot: '#059669' },
```

- [ ] **Step 7: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: `AddToQueueModal.tsx`가 옛 enqueue 시그니처를 써서 **에러** 발생 → Task 8에서 수정. (이 태스크 단독 커밋 전에 Task 8까지 함께 통과시키려면 Step 8을 Task 8 뒤로 미뤄도 됨. 권장: Task 7·8을 연달아 진행 후 커밋.)

- [ ] **Step 8: Commit (Task 8 통과 후)**

```bash
git add v4/src/features/marketing/services/marketingPublishService.ts v4/src/features/marketing/utils/publishConstants.ts
git commit -m "feat(marketing): 발행 큐가 등록 계정(channel_id)·content_kind 참조하도록 재작성"
```

---

### Task 8: AddToQueueModal — 새 enqueue 시그니처

**Files:**
- Modify: `v4/src/features/marketing/components/AddToQueueModal.tsx`

- [ ] **Step 1: handleAdd의 enqueue 호출 교체**

`AddToQueueModal.tsx`의 `handleAdd` 내부 `await enqueue(articleId, [...channels], selectedArticle?.language ?? 'ko');` 를 교체:

```ts
      await enqueue({
        articleId,
        language: selectedArticle?.language ?? 'ko',
        contentKind: 'post',
        targets: [...channels].map((channel) => ({ channelId: null, channel })),
      });
```

> 이 모달은 "플랫폼 종류"만 고르는 레거시 빠른 추가(계정 미지정). 계정 단위 발행은 PublishDialog(Task 10)에서. channel_id=null로 둔다.

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음(Task 7 변경 포함).

- [ ] **Step 3: Commit (Task 7과 함께)**

```bash
git add v4/src/features/marketing/components/AddToQueueModal.tsx
git commit -m "fix(marketing): AddToQueueModal을 새 enqueue 시그니처에 맞춤"
```

---

# Phase C-데이터 — 블로그 발행 데이터 레이어 (PublishDialog가 의존)

### Task 9: 마이그레이션 039 (blog_published)

**Files:**
- Create: `v4/scripts/migrations/039_blog_published.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- 039_blog_published.sql
-- 자체 사이트 블로그 발행본: (article, language)당 1행. 정적 빌드(build-i18n)와
-- 동적 미리보기 공용 소스. 본문 html_body는 기본글 번역 본문(TipTap HTML).
-- Supabase Dashboard에서 1회 적용.
create extension if not exists pgcrypto;
create table if not exists blog_published (
  id               uuid primary key default gen_random_uuid(),
  article_id       uuid references marketing_articles(id) on delete cascade,
  language         text not null,
  slug             text not null,
  seo_title        text not null default '',
  meta_description text not null default '',
  html_body        text not null default '',
  status           text not null default 'draft',  -- draft|published
  published_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (article_id, language)
);
create index if not exists blog_published_lang_status_idx on blog_published (language, status);
alter table blog_published enable row level security;
drop policy if exists blog_published_all on blog_published;
create policy blog_published_all on blog_published
  for all to anon, authenticated using (true) with check (true);
```

- [ ] **Step 2: Commit**

```bash
git add v4/scripts/migrations/039_blog_published.sql
git commit -m "feat(marketing): blog_published 테이블 마이그레이션 — 자체 사이트 블로그 발행본"
```

---

### Task 10: 블로그 발행본 빌더(순수) + TDD

**Files:**
- Create: `v4/src/features/marketing/utils/blogPublish.ts`
- Create: `v4/scripts/test/blogPublish.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`v4/scripts/test/blogPublish.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, buildPublishedBlog } from '../../src/features/marketing/utils/blogPublish.ts';

const base = {
  id: 'abcdef1234567890', topicId: null, category: '', keywords: [],
  language: 'ko', status: 'draft', createdAt: '', updatedAt: '',
  confirmed: false, sortOrder: 0,
};

test('slugify: 영문 소문자·하이픈', () => {
  assert.equal(slugify('Growth Hormone Guide'), 'growth-hormone-guide');
});

test('slugify: 한글 보존, 양끝 하이픈 제거', () => {
  assert.equal(slugify('  소아 성장!! '), '소아-성장');
});

test('마스터(ko) 본문으로 발행본 생성 + 슬러그에 id 접두', () => {
  const a = { ...base, title: '키 크는 법', body: '<p>잘 자고 잘 먹기</p>', translations: {} };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.seoTitle, '키 크는 법');
  assert.equal(r.htmlBody, '<p>잘 자고 잘 먹기</p>');
  assert.equal(r.metaDescription, '잘 자고 잘 먹기');
  assert.equal(r.slug, '키-크는-법-abcdef12');
});

test('번역(th) 본문 사용', () => {
  const a = {
    ...base, title: '키 크는 법', body: '<p>ko</p>',
    translations: { th: { title: 'วิธีเพิ่มความสูง', body: '<p>นอนหลับ</p>' } },
  };
  const r = buildPublishedBlog(a, 'th');
  assert.equal(r.seoTitle, 'วิธีเพิ่มความสูง');
  assert.equal(r.htmlBody, '<p>นอนหลับ</p>');
});

test('본문 비어있으면 throw', () => {
  const a = { ...base, title: 't', body: '   ', translations: {} };
  assert.throws(() => buildPublishedBlog(a, 'ko'), /본문/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && npm test`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 순수 구현 작성**

`v4/src/features/marketing/utils/blogPublish.ts`:

```ts
// 블로그 발행본 빌더(순수). 자체 사이트 블로그 본문 = 기본글 본문(언어별 TipTap HTML).
import type { MarketingArticle } from '../types';

export interface PublishedBlogDraft {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  htmlBody: string;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildPublishedBlog(article: MarketingArticle, language: string): PublishedBlogDraft {
  const isMaster = language === 'ko';
  const t = isMaster ? { title: article.title, body: article.body } : article.translations?.[language];
  const title = (t?.title || article.title || '').trim();
  const body = (t?.body || '').trim();
  if (!body) throw new Error(`${language} 본문이 비어 있어 발행할 수 없습니다.`);
  const slugBase = slugify(title) || 'post';
  const slug = `${slugBase}-${article.id.slice(0, 8)}`;
  return {
    slug,
    seoTitle: title,
    metaDescription: htmlToText(body).slice(0, 155),
    htmlBody: body,
  };
}
```

> 주의: `MarketingArticle.body`는 `types.ts`에 존재(마스터 본문). `import type`만 쓰므로 node/tsx에서 안전.

- [ ] **Step 4: 통과 확인**

Run: `cd v4 && npm test`
Expected: PASS (blogPublish 5 + publishRows 3).

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/utils/blogPublish.ts v4/scripts/test/blogPublish.test.mjs
git commit -m "feat(marketing): 블로그 발행본 빌더(슬러그/본문, 순수) + 테스트"
```

---

### Task 11: blogPublishService (클라 CRUD)

**Files:**
- Create: `v4/src/features/marketing/services/blogPublishService.ts`

- [ ] **Step 1: 서비스 작성**

```ts
// src/features/marketing/services/blogPublishService.ts
// blog_published CRUD (supabase 직접, anon RLS). 본문은 buildPublishedBlog(순수)로 생성.
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle } from '../types';
import { buildPublishedBlog } from '../utils/blogPublish';

export interface PublishedBlog {
  id: string;
  articleId: string;
  language: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  htmlBody: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
}

type Row = Record<string, unknown>;

function rowTo(r: Row): PublishedBlog {
  return {
    id: r.id as string,
    articleId: (r.article_id as string) ?? '',
    language: (r.language as string) ?? 'ko',
    slug: (r.slug as string) ?? '',
    seoTitle: (r.seo_title as string) ?? '',
    metaDescription: (r.meta_description as string) ?? '',
    htmlBody: (r.html_body as string) ?? '',
    status: ((r.status as 'draft' | 'published') ?? 'draft'),
    publishedAt: (r.published_at as string | null) ?? null,
  };
}

export async function fetchPublished(articleId: string): Promise<PublishedBlog[]> {
  const { data, error } = await supabase
    .from('blog_published')
    .select('*')
    .eq('article_id', articleId);
  if (error) {
    logger.warn('[marketing] fetchPublished failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowTo(r as Row));
}

// (article, language) upsert. status='published'면 published_at=now.
export async function upsertPublishedBlog(
  article: MarketingArticle,
  language: string,
  status: 'draft' | 'published',
): Promise<PublishedBlog> {
  const draft = buildPublishedBlog(article, language);
  const now = new Date().toISOString();
  const row = {
    article_id: article.id,
    language,
    slug: draft.slug,
    seo_title: draft.seoTitle,
    meta_description: draft.metaDescription,
    html_body: draft.htmlBody,
    status,
    published_at: status === 'published' ? now : null,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from('blog_published')
    .upsert(row, { onConflict: 'article_id,language' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowTo(data as Row);
}

// 동적 미리보기 경로(noindex). 정적 정식 경로는 /{lang}/blog/{slug}.
export function blogPreviewPath(articleId: string, language: string): string {
  return `/marketing/blog-preview/${articleId}?lang=${language}`;
}

export function blogStaticPath(language: string, slug: string): string {
  return `/${language}/blog/${slug}`;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/services/blogPublishService.ts
git commit -m "feat(marketing): blog_published 클라이언트 서비스(upsert/fetch + 경로 헬퍼)"
```

---

# Phase B-2 — 발행 UI (PublishDialog + 버튼)

### Task 12: PublishDialog 컴포넌트

**Files:**
- Create: `v4/src/features/marketing/components/content/PublishDialog.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/marketing/components/content/PublishDialog.tsx
// 콘텐츠별 발행 모달. contentKind에 따라 타겟이 달라진다:
//  - blog  → 자체 사이트(언어 자동). [미리보기] upsert draft + 미리보기 열기 / [발행] upsert published + 큐(website) 행.
//  - cardnews/post → 선택 언어와 locale 일치하는 활성 소셜 계정(IG/FB/Threads) 선택 → 큐 행.
import { useEffect, useMemo, useState } from 'react';
import type { MarketingArticle } from '../../types';
import {
  fetchChannels,
  localeFlag,
  type MarketingChannel,
} from '../../services/marketingChannelService';
import { enqueue, type PublishChannel } from '../../services/marketingPublishService';
import type { ContentKind } from '../../utils/publishRows';
import {
  upsertPublishedBlog,
  blogPreviewPath,
  blogStaticPath,
} from '../../services/blogPublishService';

const ACCENT = '#4A2D6B';
const SOCIAL_PLATFORMS: PublishChannel[] = ['instagram', 'facebook', 'threads'];

interface Props {
  article: MarketingArticle;
  contentKind: ContentKind;
  initialLanguage: string;
  onClose: () => void;
  onDone: () => void;
}

export function PublishDialog({ article, contentKind, initialLanguage, onClose, onDone }: Props) {
  const [language, setLanguage] = useState(initialLanguage);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 발행 가능한 언어 = 마스터(ko) + 본문 있는 번역
  const languageOptions = useMemo(() => {
    const opts = ['ko'];
    for (const [lang, t] of Object.entries(article.translations ?? {})) {
      if (t?.body?.trim()) opts.push(lang);
    }
    return opts;
  }, [article.translations]);

  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  const matchingChannels = channels.filter(
    (c) => c.isActive && c.locale === language && SOCIAL_PLATFORMS.includes(c.platform as PublishChannel),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── 블로그: 미리보기 / 정식 발행 ──
  const publishBlog = async (status: 'draft' | 'published') => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const pub = await upsertPublishedBlog(article, language, status);
      if (status === 'draft') {
        window.open(blogPreviewPath(article.id, language), '_blank');
        setMsg('미리보기로 저장했습니다. 새 탭에서 확인하세요.');
      } else {
        await enqueue({
          articleId: article.id,
          language,
          contentKind: 'blog',
          targets: [{ channelId: null, channel: 'website' }],
        });
        setMsg(`정식 발행 저장 완료. 다음 배포 시 ${blogStaticPath(language, pub.slug)} 로 반영됩니다.`);
        onDone();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '발행 실패');
    } finally {
      setBusy(false);
    }
  };

  // ── 소셜: 선택 계정 큐 추가 ──
  const publishSocial = async () => {
    if (selected.size === 0) {
      setErr('계정을 1개 이상 선택하세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const targets = matchingChannels
        .filter((c) => selected.has(c.id))
        .map((c) => ({ channelId: c.id, channel: c.platform as PublishChannel }));
      await enqueue({ articleId: article.id, language, contentKind, targets });
      setMsg('발행 큐에 추가했습니다.');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '큐 추가 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            발행 — {contentKind === 'blog' ? '자체 사이트 블로그' : contentKind === 'cardnews' ? '카드뉴스' : '기본글'}
          </h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">언어 버전</span>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setSelected(new Set()); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {languageOptions.map((l) => (
              <option key={l} value={l}>{localeFlag(l)} {l}</option>
            ))}
          </select>
        </label>

        {contentKind === 'blog' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">자체 사이트 <code>/{language}/blog/…</code> 에 발행합니다. (구글 SEO)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => publishBlog('draft')}
                disabled={busy}
                className="flex-1 rounded-lg border border-[#4A2D6B] px-3 py-2 text-sm font-semibold text-[#4A2D6B] disabled:opacity-40"
              >
                미리보기 발행
              </button>
              <button
                type="button"
                onClick={() => publishBlog('published')}
                disabled={busy}
                className="flex-1 rounded-lg bg-[#4A2D6B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                정식 발행
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-gray-500">
              발행 계정 ({localeFlag(language)} {language} · 활성 소셜)
            </span>
            {matchingChannels.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                이 언어의 활성 IG/FB/Threads 계정이 없습니다. “채널 관리”에서 먼저 등록하세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {matchingChannels.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={`rounded-full px-3 py-1 text-xs ${on ? 'bg-[#4A2D6B] text-white font-semibold' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {on ? '✓ ' : ''}{c.platform} · {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={publishSocial}
              disabled={busy || matchingChannels.length === 0}
              className="w-full rounded-lg bg-[#4A2D6B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              발행 큐에 추가
            </button>
          </div>
        )}

        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/PublishDialog.tsx
git commit -m "feat(marketing): PublishDialog — 언어 버전·등록 계정/자체 사이트 타겟 발행"
```

---

### Task 13: ContentTabs — 발행 버튼

**Files:**
- Modify: `v4/src/features/marketing/components/content/ContentTabs.tsx`

- [ ] **Step 1: import + state + 매핑**

`ContentTabs.tsx` 상단 import에 추가:

```ts
import { PublishDialog } from './PublishDialog';
import type { ContentKind } from '../../utils/publishRows';
```

`const [language, setLanguage] = useState('ko');` 다음에:

```ts
  const [showPublish, setShowPublish] = useState(false);
  const contentKind: ContentKind = tab === 'blog' ? 'blog' : tab === 'cardnews' ? 'cardnews' : 'post';
```

- [ ] **Step 2: 탭바에 발행 버튼**

탭바 `<div className="flex shrink-0 gap-1 border-b border-gray-200 px-4">` 를 양끝 정렬로 바꾸고 우측에 버튼 추가. 기존 div를 아래로 교체:

```tsx
      {/* Tab bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'text-[#4A2D6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
                style={active ? { borderColor: ACCENT } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          🚀 발행
        </button>
      </div>
```

- [ ] **Step 3: 모달 렌더**

컴포넌트 최상위 `return (<div className="flex h-full flex-col">` 내부 맨 끝(닫는 `</div>` 직전)에 추가:

```tsx
      {showPublish && (
        <PublishDialog
          article={article}
          contentKind={contentKind}
          initialLanguage={language}
          onClose={() => setShowPublish(false)}
          onDone={() => setShowPublish(false)}
        />
      )}
```

- [ ] **Step 4: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: dev에서 콘텐츠 선택 → 우상단 🚀 발행 → 기본글/카드뉴스 탭에선 계정 선택, N블로그 탭에선 미리보기/정식 버튼 노출 확인.

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/components/content/ContentTabs.tsx
git commit -m "feat(marketing): 콘텐츠 편집기에 탭 맥락별 발행 버튼"
```

---

### Task 14: PublishQueueList — 계정명 표시

**Files:**
- Modify: `v4/src/features/marketing/components/PublishQueueList.tsx`

- [ ] **Step 1: 배지 옆에 계정명/언어**

`{meta.label}</span>` 배지 다음, 제목 span 앞에 계정명 칩 추가. 기존:

```tsx
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
```

→

```tsx
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
              {it.channelName && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{it.channelName}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
```

- [ ] **Step 2: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: PublishDialog로 소셜 계정에 발행 후 `/marketing/publish` 큐에 계정명 칩 표시 확인.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/PublishQueueList.tsx
git commit -m "feat(marketing): 발행 큐 항목에 등록 계정명 표시"
```

---

# Phase C — 블로그 임베드 (동적 미리보기 + 정적)

### Task 15: BlogPreviewPage (동적, noindex) + 라우트

**Files:**
- Create: `v4/src/features/marketing/components/BlogPreviewPage.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
// src/features/marketing/components/BlogPreviewPage.tsx
// 자체 사이트 블로그 동적 미리보기 — blog_published 런타임 렌더. noindex(공개 인덱싱은 정적만).
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchPublished, type PublishedBlog } from '../services/blogPublishService';

export function BlogPreviewPage() {
  const { articleId = '' } = useParams();
  const [params] = useSearchParams();
  const lang = params.get('lang') || 'ko';
  const [post, setPost] = useState<PublishedBlog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPublished(articleId).then((rows) => {
      if (!alive) return;
      setPost(rows.find((r) => r.language === lang) ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [articleId, lang]);

  if (loading) return <div className="p-10 text-center text-sm text-gray-400">불러오는 중…</div>;
  if (!post) return <div className="p-10 text-center text-sm text-gray-400">발행본이 없습니다. 먼저 발행하세요.</div>;

  return (
    <div className="mx-auto max-w-[740px] px-6 py-8">
      <div className="mb-4 rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
        미리보기 (noindex) · 상태: {post.status} · /{post.language}/blog/{post.slug}
      </div>
      <h1 className="text-3xl font-black leading-snug text-gray-900">{post.seoTitle}</h1>
      <article
        className="prose mt-6 max-w-none text-[16px] leading-[1.85] text-gray-800"
        dangerouslySetInnerHTML={{ __html: post.htmlBody }}
      />
    </div>
  );
}
```

> `dangerouslySetInnerHTML`은 본문이 TipTap에서 생성된 자체 콘텐츠(어드민 작성)라 신뢰 범위. 외부 입력 아님.

- [ ] **Step 2: 라우트 추가**

`router.tsx`에 lazy import:

```ts
const BlogPreviewPage = lazy(() =>
  import('@/features/marketing/components/BlogPreviewPage').then((m) => ({ default: m.BlogPreviewPage })),
);
```

marketing children에 추가:

```tsx
      {
        path: 'blog-preview/:articleId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <BlogPreviewPage />
          </Suspense>
        ),
      },
```

- [ ] **Step 3: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: PublishDialog(블로그) "미리보기 발행" → 새 탭이 `/marketing/blog-preview/:id?lang=ko`로 열리고 본문 렌더 확인.

- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/components/BlogPreviewPage.tsx v4/src/app/router.tsx
git commit -m "feat(marketing): 블로그 동적 미리보기 페이지(noindex) + 라우트"
```

---

### Task 16: 정적 빌드용 published 로더 + 매퍼(TDD)

**Files:**
- Create: `v4/scripts/lib/blog-supabase.mjs`
- Create: `v4/scripts/test/blogSupabase.test.mjs`

- [ ] **Step 1: 실패 테스트 작성 (순수 매퍼)**

`v4/scripts/test/blogSupabase.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedRowToPost } from '../lib/blog-supabase.mjs';

test('blog_published row → ContentFlow 포스트 shape', () => {
  const post = publishedRowToPost({
    slug: '키-크는-법-abcdef12',
    seo_title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    html_body: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
  assert.deepEqual(post, {
    slug: '키-크는-법-abcdef12',
    title: '키 크는 법',
    meta_description: '잘 자고 잘 먹기',
    body_html: '<p>본문</p>',
    published_at: '2026-06-06T00:00:00Z',
  });
});
```

> 매퍼가 만드는 키(`title`,`meta_description`,`body_html`,`published_at`,`slug`)는 `blog-post.html`/`blog-index.html` 템플릿이 쓰는 필드(`post.title`,`post.body_html`,`post.published_at`,`meta_description`,`slug`)와 일치해야 한다.

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && npm run test:i18n`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

`v4/scripts/lib/blog-supabase.mjs`:

```js
import { createClient } from '@supabase/supabase-js';

// blog_published row → 기존 블로그 템플릿이 기대하는 포스트 shape.
export function publishedRowToPost(r) {
  return {
    slug: r.slug,
    title: r.seo_title ?? '',
    meta_description: r.meta_description ?? '',
    body_html: r.html_body ?? '',
    published_at: r.published_at ?? null,
  };
}

// 정적 빌드 시 published 블로그를 언어별로 로드. 키/URL 없으면 빈 객체(graceful).
export async function loadPublishedBlogAll(langs) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const result = {};
  for (const lang of langs) result[lang] = [];
  if (!url || !key) {
    console.warn('  [blog] VITE_SUPABASE_URL/ANON_KEY missing — skipping published blog load');
    return result;
  }
  const supabase = createClient(url, key);
  for (const lang of langs) {
    const { data, error } = await supabase
      .from('blog_published')
      .select('slug, seo_title, meta_description, html_body, published_at')
      .eq('language', lang)
      .eq('status', 'published');
    if (error) {
      console.warn(`  [blog] published load failed for ${lang}: ${error.message}`);
      continue;
    }
    result[lang] = (data ?? []).map(publishedRowToPost);
    console.log(`  [blog] loaded ${result[lang].length} published posts for ${lang}`);
  }
  return result;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd v4 && npm run test:i18n`
Expected: PASS (publishedRowToPost).

- [ ] **Step 5: Commit**

```bash
git add v4/scripts/lib/blog-supabase.mjs v4/scripts/test/blogSupabase.test.mjs
git commit -m "feat(i18n): 정적 빌드용 published 블로그 로더 + 포스트 매퍼(테스트)"
```

---

### Task 17: build-i18n — published 블로그 병합

**Files:**
- Modify: `v4/scripts/build-i18n.mjs`

- [ ] **Step 1: import + buildBlog가 posts를 받도록**

상단 import에 추가:

```js
import { loadPublishedBlogAll } from './lib/blog-supabase.mjs';
```

`buildBlog` 함수 시그니처를 `posts`를 받도록 변경(내부 `loadCachedPosts` 제거):

```js
async function buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts }) {
  const indexHtml = renderIndex({
    posts, template: indexTemplate, locale,
    seoHead: buildBlogIndexHead(lang),
  });
  writeFile(join(ROOT, 'public', lang, 'blog/index.html'), indexHtml);

  for (const post of posts) {
    const html = renderPost({
      post, template: postTemplate, locale, messenger,
      seoHead: buildBlogPostHead({ post, lang }),
    });
    writeFile(join(ROOT, 'public', lang, 'blog', post.slug, 'index.html'), html);
  }
  return posts.length;
}
```

- [ ] **Step 2: main에서 published 로드 + 병합**

`main()`에서 ContentFlow 캐시 처리(`blogSlugs` 계산) 블록 다음, 템플릿 읽기 전에 published 로드 추가:

```js
  // 자체 사이트 published 블로그 (Supabase) — ContentFlow 캐시와 병합. published 우선.
  const publishedByLang = await loadPublishedBlogAll(ACTIVE_LANGS);
```

언어 루프 안 블로그 렌더 분기를 교체. 기존:

```js
    if (blogSlugs[lang] && blogSlugs[lang].length > 0) {
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate });
      console.log(`  [blog] ${n} posts rendered for ${lang}`);
    }
```

→

```js
    const cached = loadCachedPosts(CACHE_DIR, lang);
    const published = publishedByLang[lang] ?? [];
    // slug 기준 dedup, published 우선
    const bySlug = new Map();
    for (const p of cached) bySlug.set(p.slug, p);
    for (const p of published) bySlug.set(p.slug, p);
    const posts = [...bySlug.values()];
    blogSlugs[lang] = posts.map((p) => p.slug);
    if (posts.length > 0) {
      const n = await buildBlog({ lang, locale, messenger, postTemplate, indexTemplate, posts });
      console.log(`  [blog] ${n} posts rendered for ${lang} (cached ${cached.length} + published ${published.length})`);
    }
```

> `blogSlugs[lang]`을 여기서 다시 세팅하므로 sitemap(`buildSitemap`)도 published 포스트를 포함한다.

- [ ] **Step 3: 빌드 확인**

Run: `cd v4 && npm run build:i18n`
Expected: 에러 없이 완료. published 데이터가 있으면 `[blog] loaded N published posts` + 해당 `/{lang}/blog/{slug}/index.html` 생성 로그. 없으면 graceful skip(경고만).

- [ ] **Step 4: Commit**

```bash
git add v4/scripts/build-i18n.mjs
git commit -m "feat(i18n): 정적 블로그 빌드에 published(자체 발행) 병합 + sitemap 반영"
```

---

# Phase D — 카드뉴스 이미지 업로드

### Task 18: aiImageService — File 직접 업로드

**Files:**
- Modify: `v4/src/features/marketing/services/aiImageService.ts`

- [ ] **Step 1: uploadImageFile 추가**

파일 끝에 추가(기존 `uploadGeneratedImage`의 R2 업로드 경로 재사용, WebP 변환 포함):

```ts
/** Uploads a user-selected image File to R2 as WebP. Returns the public URL. */
export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
  return uploadGeneratedImage(dataUrl);
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/services/aiImageService.ts
git commit -m "feat(marketing): 카드뉴스용 외부 이미지 File → R2(WebP) 업로드 헬퍼"
```

---

### Task 19: CardNewsPanel — 다중 이미지 업로드 → 슬라이드

**Files:**
- Modify: `v4/src/features/marketing/components/content/CardNewsPanel.tsx`

- [ ] **Step 1: import + 업로드 핸들러**

상단 import에 추가:

```ts
import { uploadImageFile } from '../../services/aiImageService';
```

`handleAddBlank` 다음에 업로드 핸들러 추가(업로드 이미지 1장 = 슬라이드 1개, 풀블리드 배경, textBlocks 빈 배열):

```ts
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!cardnews || !files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const arr = Array.from(files);
      for (let i = 0; i < arr.length; i++) {
        const url = await uploadImageFile(arr[i]);
        const canvas: CardCanvasData = { bgColor: '#000000', imageUrl: url, imageY: 50, textBlocks: [] };
        await addSlide(cardnews.id, canvas, slides.length + i);
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  };
```

- [ ] **Step 2: 헤더에 업로드 버튼**

헤더 영역 `✨ 슬라이드 생성` 버튼 다음에 업로드 라벨 추가(같은 `<div className="flex items-center gap-2">` 안):

```tsx
          <label className="shrink-0 cursor-pointer rounded px-3 py-1.5 text-sm font-semibold text-[#4A2D6B] ring-1 ring-[#4A2D6B] hover:bg-[#4A2D6B]/5">
            {uploading ? '업로드 중…' : '🖼 이미지 업로드'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => { void handleUpload(e.target.files); e.target.value = ''; }}
            />
          </label>
```

- [ ] **Step 3: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: dev → 카드뉴스 탭 → 🖼 이미지 업로드로 이미지 3장 선택 → 슬라이드 3개 추가(풀블리드 배경) 확인. 업로드 수만큼 슬라이드 증가.

- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/components/content/CardNewsPanel.tsx
git commit -m "feat(marketing): 카드뉴스 외부 이미지 다중 업로드 → 업로드 수만큼 슬라이드"
```

---

# Phase E — 광고 지역 레이어

### Task 20: 마이그레이션 040 (광고 region + channel_id)

**Files:**
- Create: `v4/scripts/migrations/040_ad_region.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- 040_ad_region.sql
-- 유료광고는 '지역'으로 관리(언어 콘텐츠와 직교). region + 채널(계정) 선택 연결.
-- Supabase Dashboard에서 1회 적용.
alter table marketing_ad_campaigns
  add column if not exists region text not null default '';
alter table marketing_ad_campaigns
  add column if not exists channel_id uuid references marketing_channels(id) on delete set null;
```

- [ ] **Step 2: Commit**

```bash
git add v4/scripts/migrations/040_ad_region.sql
git commit -m "feat(marketing): 광고 캠페인 region·channel_id 마이그레이션"
```

---

### Task 21: marketingAdsService — region/channelId + REGIONS

**Files:**
- Modify: `v4/src/features/marketing/services/marketingAdsService.ts`

- [ ] **Step 1: 타입 + 상수**

`AdCampaign` 인터페이스에 필드 추가(`note: string;` 위):

```ts
  region: string;
  channelId: string | null;
  note: string;
```

`AdPlatform` 등 type 선언 근처에 REGIONS 추가:

```ts
export const AD_REGIONS: { code: string; label: string }[] = [
  { code: 'kr', label: '🇰🇷 한국' },
  { code: 'th', label: '🇹🇭 태국' },
  { code: 'vi', label: '🇻🇳 베트남' },
  { code: 'sea_en', label: '🌏 동남아 영어권' },
  { code: 'global', label: '🌐 글로벌' },
];
```

- [ ] **Step 2: 매퍼 보강**

`rowToCampaign` return에 추가(`note` 위):

```ts
    region: (r.region as string) ?? '',
    channelId: (r.channel_id as string | null) ?? null,
    note: (r.note as string) ?? '',
```

`campaignToRow` return에 추가(`note` 위):

```ts
    region: c.region ?? '',
    channel_id: c.channelId ?? null,
    note: c.note ?? '',
```

- [ ] **Step 3: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: `AdCampaignForm`/`AdsManagerPage`가 새 필수 필드를 안 채워 **에러 가능** → Task 22에서 해소. Task 21·22 연달아 진행 후 커밋 권장.

- [ ] **Step 4: Commit (Task 22 통과 후)**

```bash
git add v4/src/features/marketing/services/marketingAdsService.ts
git commit -m "feat(marketing): 광고 서비스에 region·channelId + AD_REGIONS"
```

---

### Task 22: AdCampaignForm + AdsManagerPage — 지역 입력/필터

**Files:**
- Modify: `v4/src/features/marketing/components/AdCampaignForm.tsx`
- Modify: `v4/src/features/marketing/components/AdsManagerPage.tsx`

- [ ] **Step 1: 폼에 region select**

`AdCampaignForm.tsx` import에 `AD_REGIONS` 추가:

```ts
import { deriveMetrics, AD_REGIONS } from '../services/marketingAdsService';
```

state 추가(`const [language, setLanguage] ...` 다음):

```ts
  const [region, setRegion] = useState(initial?.region ?? '');
```

`submit()`의 `onSave({...})`에 추가(`language:` 다음):

```ts
      region,
      channelId: initial?.channelId ?? null,
```

언어 입력 `<div>` 다음에 지역 select `<div>` 추가:

```tsx
        <div>
          <label className={labelCls}>지역 (광고 타겟)</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={fieldCls}>
            <option value="">미지정</option>
            {AD_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
        </div>
```

- [ ] **Step 2: AdsManagerPage 지역 필터**

`AdsManagerPage.tsx` import에 `AD_REGIONS` 추가:

```ts
import {
  fetchCampaigns,
  saveCampaign,
  deleteCampaign,
  deriveMetrics,
  requestAdsInsights,
  AD_REGIONS,
} from '../services/marketingAdsService';
```

state 추가(`const [platform, setPlatform] ...` 다음):

```ts
  const [region, setRegion] = useState<string>('all');
```

`filtered` useMemo 교체(플랫폼 + 지역 동시 필터):

```ts
  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (platform === 'all' || c.platform === platform) &&
          (region === 'all' || c.region === region),
      ),
    [campaigns, platform, region],
  );
```

플랫폼 탭 `<div className="flex flex-wrap gap-1">...</div>` 다음에 지역 필터 칩 추가:

```tsx
      {/* 지역 필터 */}
      <div className="flex flex-wrap gap-1">
        {[{ code: 'all', label: '전체 지역' }, ...AD_REGIONS].map((r) => (
          <button
            type="button"
            key={r.code}
            onClick={() => setRegion(r.code)}
            className={`rounded-full px-3 py-1 text-xs ${
              region === r.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
```

캠페인 표에 지역 열 추가(선택) — `<th className="px-3 py-2">플랫폼</th>` 다음:

```tsx
              <th className="px-3 py-2">지역</th>
```

행에도 대응 셀(`<td ...>{PLATFORM_LABEL[c.platform]}</td>` 다음):

```tsx
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {AD_REGIONS.find((r) => r.code === c.region)?.label ?? '—'}
                  </td>
```

- [ ] **Step 3: 타입체크 + 수동 확인**

Run: `cd v4 && npx tsc --noEmit` → 에러 없음.
Run: dev → `/marketing/ads` → 캠페인 추가/편집에 지역 select, 상단 지역 필터 칩으로 필터, 표에 지역 열 확인.

- [ ] **Step 4: Commit (Task 21과 함께)**

```bash
git add v4/src/features/marketing/components/AdCampaignForm.tsx v4/src/features/marketing/components/AdsManagerPage.tsx
git commit -m "feat(marketing): 광고를 지역(region)으로 입력·필터 — 유료광고 지역 레이어"
```

---

# 마무리 검증

### Task 23: 전체 회귀 점검

- [ ] **Step 1: 테스트 + 타입체크 + 빌드**

```bash
cd v4 && npm test && npx tsc --noEmit && npm run build:i18n
```
Expected: 테스트 통과(publishRows 3 + blogPublish 5 + blogSupabase 1), tsc 0 에러, i18n 빌드 완료.

- [ ] **Step 2: 수동 end-to-end (dev)**

1. 채널 관리 → ko/th/en 각각 IG·FB 계정 등록(언어·활성 지정).
2. 콘텐츠 1개에서 th 번역 본문 작성 → 🚀 발행:
   - 카드뉴스 탭 → th 계정만 후보로 나오는지 → 큐 추가 → `/marketing/publish`에 계정명 표시.
   - N블로그 탭 → 미리보기 발행(새 탭 noindex 렌더) → 정식 발행(큐 website 행 + 안내 메시지).
3. 카드뉴스 탭 → 이미지 3장 업로드 → 슬라이드 3개.
4. 광고 → 지역별 캠페인 추가 + 지역 필터.
5. `npm run build:i18n` 후 published th 글이 `public/th/blog/{slug}/index.html` 로 생성됐는지 확인.

- [ ] **Step 3: (커밋 없음)** 회귀 점검은 별도 커밋 불필요. 미적용 마이그레이션(037~040)은 사용자가 Supabase Dashboard에 적용해야 발행/광고 신규 컬럼이 영속됨 — 적용 전엔 graceful 동작.

---

## 미적용 마이그레이션 요약 (사용자 수동 적용)

| # | 파일 | 내용 |
|---|------|------|
| 037 | `037_marketing_channel_active.sql` | 채널 `is_active` |
| 038 | `038_publish_queue_channel_ref.sql` | 큐 `channel_id`·`content_kind` |
| 039 | `039_blog_published.sql` | 자체 사이트 블로그 발행본 테이블 |
| 040 | `040_ad_region.sql` | 광고 `region`·`channel_id` |

## 스펙 대비 커버리지

- 채널 언어축(스펙 §A) → Task 1–4
- 발행 재설계(스펙 §B) → Task 5–8, 12–14
- 블로그 임베드 동적+정적(스펙 §C) → Task 9–11, 15–17
- 카드뉴스 업로드(스펙 §D) → Task 18–19
- 광고 지역(스펙 §E) → Task 20–22
- IA 정리(스펙 §7) → Task 4

## 비범위 (스펙과 동일)

Meta/IG/Threads 실제 자동 게시 API, 네이버 블로그 발행(위성 정책 유지), 광고 플랫폼 자동 동기화, prod authMiddleware 일괄 처리.
