# 마케팅 R0 — ContentFlow 구조 재정렬 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/marketing` 사이드바·라우트를 ContentFlow 파이프라인 구조(설정 / 오가닉[키워드·콘텐츠·발행] / 성장[모니터링] / 유료[광고] / 분석[사이트·채널·경쟁사] / 전략)로 재편하고, 미구축 6기능은 "준비 중" 자리표시로 채운다.

**Architecture:** 순수 라우팅/네비 재편(데이터·서비스·migration 변동 0). 기존 화면 재배치, MarketingDashboard 네비 제거(인덱스는 키워드로 리다이렉트), articles→content 경로 정리, 공용 `MarketingPlaceholder`로 6개 미구축 기능 자리표시.

**Tech Stack:** React 19, Vite, TS strict(`verbatimModuleSyntax`/`noUnusedLocals`), React Router 7, Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-03-marketing-r0-contentflow-structure-design.md`

---

## 검증/실행 노트 (읽고 시작)

- src 테스트 하니스 없음 → 검증 = `npx tsc --noEmit` + `npx vite build` + `npx eslint src/features/marketing`. preview 자동검증 미사용(사용자 선호).
- strict: 타입 전용 import는 `import type`, 미사용 import 금지(MarketingDashboard 라우트 제거 시 그 lazy import도 제거). 모든 `<button>`/링크 그대로 Tailwind.
- **router.tsx WIP**: Chunk 수정 전 컨트롤러가 `git status`로 router.tsx dirty 확인 → dirty면 `git stash push -- v4/src/app/router.tsx`, 커밋 후 pop. (현재 clean.)
- `Navigate`는 router.tsx 상단에서 이미 import됨(`import { Navigate, createBrowserRouter, useParams } from 'react-router-dom'`) — 추가 import 불필요.
- 커밋 trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. 명령은 `v4`에서, git은 `git -C c:/projects/dflo_0.1`.
- 단일 청크. 파일은 순서대로(placeholder → router → sidebar → keyword) 만들고 **끝에 한 번 커밋**(중간 상태가 컴파일 안 될 수 있음). 스테이징은 아래 4개 파일만(병렬 WIP 제외).

## File Structure

```
v4/src/features/marketing/components/
  MarketingPlaceholder.tsx   # CREATE 공용 "준비 중" 화면 {title, planned}
  MarketingSidebar.tsx       # REWRITE ContentFlow 그룹 네비 (설정 + 5그룹, soon 배지)
  KeywordTable.tsx           # MODIFY 상단 "보관함/라이브 준비중" 안내 배너 1개
v4/src/app/router.tsx        # MODIFY MarketingDashboard 제거→Navigate, articles→content+redirect, 6 placeholder 라우트
```

---

## Chunk 1: 구조 재정렬

### Task 1.1: MarketingPlaceholder (신규)

**Files:** Create `v4/src/features/marketing/components/MarketingPlaceholder.tsx`

- [ ] **Step 1: 작성** (EXACT content)
```tsx
// src/features/marketing/components/MarketingPlaceholder.tsx
export function MarketingPlaceholder({ title, planned }: { title: string; planned: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="mb-2 text-3xl">🔶</div>
      <h1 className="mb-1 text-lg font-bold text-gray-700">{title}</h1>
      <p className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
        준비 중
      </p>
      <p className="max-w-md text-sm text-gray-500">{planned}</p>
    </div>
  );
}
```
- [ ] **Step 2:** `npx tsc --noEmit` 통과.

### Task 1.2: 라우터 재배치

**Files:** Modify `v4/src/app/router.tsx`

- [ ] **Step 1: MarketingDashboard lazy import 제거 → MarketingPlaceholder import 로 교체.** 아래 블록을
```tsx
const MarketingDashboard = lazy(() =>
  import('@/features/marketing/components/MarketingDashboard').then((m) => ({ default: m.MarketingDashboard })),
);
```
다음으로 바꾼다:
```tsx
const MarketingPlaceholder = lazy(() =>
  import('@/features/marketing/components/MarketingPlaceholder').then((m) => ({ default: m.MarketingPlaceholder })),
);
```

- [ ] **Step 2: 인덱스 child 를 Navigate 로 교체.** 아래 블록을
```tsx
      {
        index: true,
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingDashboard />
          </Suspense>
        ),
      },
```
다음으로:
```tsx
      { index: true, element: <Navigate to="/marketing/keywords" replace /> },
```

- [ ] **Step 3: `articles` path 를 `content` 로 + redirect 추가.** 아래 블록을
```tsx
      {
        path: 'articles',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingArticlesPage />
          </Suspense>
        ),
      },
```
다음으로:
```tsx
      {
        path: 'content',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingArticlesPage />
          </Suspense>
        ),
      },
      { path: 'articles', element: <Navigate to="/marketing/content" replace /> },
```

- [ ] **Step 4: 6개 placeholder child 추가.** `/marketing` children 배열 안(예: `content` 다음, `topics` 앞/뒤 무관)에 추가:
```tsx
      {
        path: 'publish',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="발행" planned="전 채널 발행 큐·예약·Meta/YouTube 발행 (ContentFlow 발행 이식 예정)" />
          </Suspense>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="모니터링 / 댓글" planned="키워드 소셜 리스닝 + AI 댓글 생성 (ContentFlow 모니터링 이식 예정)" />
          </Suspense>
        ),
      },
      {
        path: 'ads',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="광고 관리" planned="Meta·YouTube 광고 성과 관리 (ContentFlow 광고 이식 예정)" />
          </Suspense>
        ),
      },
      {
        path: 'site-analysis',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="사이트 분석" planned="GA4 트래픽 + SEO/GEO 감사 (dflo banner-admin GA4 연동 예정)" />
          </Suspense>
        ),
      },
      {
        path: 'channel-analytics',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="채널 분석" planned="Meta·YouTube 채널 인사이트 (ContentFlow 채널분석 이식 예정)" />
          </Suspense>
        ),
      },
      {
        path: 'competitors',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingPlaceholder title="경쟁사" planned="AI 경쟁사 순위·콘텐츠 갭 분석 (ContentFlow 경쟁사 이식 예정)" />
          </Suspense>
        ),
      },
```
> `strategy`·`keywords`·`topics`·`settings` child 는 그대로 둔다(`topics`는 네비에서만 빠지고 라우트는 유지).

- [ ] **Step 5:** `npx tsc --noEmit` 통과(MarketingDashboard 미사용 import 에러 없어야 함 = 완전히 제거됐는지 확인).

### Task 1.3: MarketingSidebar 재작성 (그룹 구조)

**Files:** Modify (전체 교체) `v4/src/features/marketing/components/MarketingSidebar.tsx`

- [ ] **Step 1: 파일 전체를 다음으로 교체** (EXACT content)
```tsx
// src/features/marketing/components/MarketingSidebar.tsx
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  soon?: boolean;
}

const SETTINGS: NavItem = { to: '/marketing/settings', icon: '⚙️', label: '설정' };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '오가닉 마케팅',
    items: [
      { to: '/marketing/keywords', icon: '💡', label: '키워드 / 아이디어' },
      { to: '/marketing/content', icon: '📝', label: '콘텐츠 생성' },
      { to: '/marketing/publish', icon: '🚀', label: '발행', soon: true },
    ],
  },
  {
    label: '성장',
    items: [{ to: '/marketing/monitoring', icon: '💬', label: '모니터링 / 댓글', soon: true }],
  },
  {
    label: '유료 마케팅',
    items: [{ to: '/marketing/ads', icon: '📢', label: '광고 관리', soon: true }],
  },
  {
    label: '분석',
    items: [
      { to: '/marketing/site-analysis', icon: '📊', label: '사이트 분석', soon: true },
      { to: '/marketing/channel-analytics', icon: '📱', label: '채널 분석', soon: true },
      { to: '/marketing/competitors', icon: '🎯', label: '경쟁사', soon: true },
    ],
  },
  {
    label: '전략',
    items: [{ to: '/marketing/strategy', icon: '💡', label: '마케팅 전략' }],
  },
];

function Item({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          isActive
            ? 'bg-[#4A2D6B] text-white'
            : `${item.soon ? 'text-gray-400' : 'text-gray-600'} hover:bg-gray-100`
        }`
      }
    >
      <span>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">준비 중</span>
      )}
    </NavLink>
  );
}

export function MarketingSidebar() {
  return (
    <aside className="flex w-52 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
      <div className="px-5 py-5">
        <div className="text-base font-bold text-[#4A2D6B]">187 마케팅 센터</div>
        <div className="text-xs text-gray-400">연세새봄의원</div>
      </div>
      <nav className="flex flex-col gap-3 px-3 pb-4">
        <Item item={SETTINGS} />
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {g.label}
            </div>
            {g.items.map((it) => (
              <Item key={it.to} item={it} />
            ))}
          </div>
        ))}
      </nav>
      <a href="/" className="mt-auto px-5 py-4 text-xs text-gray-400 hover:text-gray-600">
        ← 홈으로
      </a>
    </aside>
  );
}
```
- [ ] **Step 2:** `npx tsc --noEmit` 통과.

### Task 1.4: KeywordTable 안내 배너 (보관함 표시)

**Files:** Modify `v4/src/features/marketing/components/KeywordTable.tsx`

- [ ] **Step 1: 최상단 `<div className="p-6">` 바로 다음(필터 바 `<div className="mb-4 flex flex-wrap items-center gap-2">` 앞)에 배너 삽입:**
```tsx
      <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        💡 현재는 <b>보관함</b>(추출된 키워드 72개)입니다. 라이브 키워드 분석(네이버·DataForSEO)은 준비 중.
      </div>
```
(즉, `return (` 직후 `<div className="p-6">` 다음 줄에 위 배너를 두고, 그 아래 기존 필터 바가 이어지게.)

- [ ] **Step 2:** `npx tsc --noEmit` 통과.

### Task 1.5: 검증 + 커밋

- [ ] **Step 1: 전체 검증**
  - `cd v4 && npx tsc --noEmit` → 통과
  - `npx vite build` → 성공 (`MarketingPlaceholder-*.js` lazy chunk emit 확인)
  - `npx eslint src/features/marketing` → 클린(신규 위반 0; router.tsx 기존 react-refresh 경고는 무관)

- [ ] **Step 2: Commit** (4개 파일만)
```bash
git -C c:/projects/dflo_0.1 add v4/src/features/marketing/components/MarketingPlaceholder.tsx v4/src/features/marketing/components/MarketingSidebar.tsx v4/src/features/marketing/components/KeywordTable.tsx v4/src/app/router.tsx
git -C c:/projects/dflo_0.1 commit -m "feat(marketing): realign /marketing to ContentFlow structure (R0)"
```
> 커밋 후 컨트롤러가 stash pop(했다면) + `npx tsc --noEmit` 공존 확인.

---

## 완료 기준

- `/marketing`(PIN `8054`) 사이드바 = ContentFlow 그룹(설정 / 오가닉 / 성장 / 유료 / 분석 / 전략), "준비 중" 6개에 배지.
- 설정·키워드(보관함 배너)·콘텐츠(블로그)·전략 = 기존 화면 동작. 발행·모니터링·광고·사이트분석·채널분석·경쟁사 = 준비 중 화면.
- `/marketing` → `/marketing/keywords`, `/marketing/articles` → `/marketing/content` 리다이렉트.
- `npx tsc --noEmit` 통과, `npx vite build` 성공, lint 클린. 데이터/서비스/migration 변동 0.
