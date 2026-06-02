# 마케팅 콘텐츠 허브 (Marketing Content Hub) — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dflo 사이트에 PIN 보호 `/marketing` 섹션을 신설해, ContentFlow의 연세새봄/187 마케팅 자산(전략 HTML 8종 + 키워드 72 + 주제 78)을 외부 의존 없이 완전 내재화한다.

**Architecture:** 순수 클라이언트 React + Vite(새 백엔드 0). 정적 전략 HTML 8종은 `public/marketing/strategy/`에 복사해 iframe으로 열람. 키워드/주제는 국내 마스터 HTML의 `<script>` JS 배열(`kwData`/`topics`/`ytRows`)에서 **일회성 순수 Node 스크립트**로 추출 → JSON 커밋 → 앱은 JSON만 import(런타임 파싱 0). 라우트는 standalone `/marketing/*`(의사 `/admin`·환자 `/app`과 분리), 자체 PIN 게이트(banner-admin 패턴).

**Tech Stack:** React 19, TypeScript(strict, `verbatimModuleSyntax`), Vite 6, React Router 7, Tailwind CSS 4. 추출 스크립트는 순수 Node(`node:fs`/정규식, 새 의존성 0). 테스트는 `node --test`(dflo `test:i18n` 패턴).

**Spec:** `docs/superpowers/specs/2026-06-02-marketing-content-hub-design.md`

---

## 테스트/검증 전략 (읽고 시작)

- **추출 스크립트**(결정적 입출력) → TDD: `node --test scripts/test/extract-marketing-data.test.mjs` (dflo의 `test:i18n`과 동일한 Node 내장 러너). 실측 카운트(키워드 72/골든 4, 주제 78/A20·B15·C15·D18·E10, 상태 new46·done25·similar7)를 단언.
- **UI 컴포넌트** → dflo v4에는 React 컴포넌트 테스트 하니스(vitest/RTL)가 **없다**. 신규 도입은 범위 밖(YAGNI·기존 패턴 준수). 검증 = `npx tsc --noEmit`(strict 타입 통과) + preview 워크플로(dev 서버 → `/marketing` → PIN → 화면 확인). 각 UI 태스크의 "검증" 단계가 이를 수행.
- **커밋 규칙**: 모든 커밋 메시지는 프로젝트 관례대로 마지막에 다음 trailer를 붙인다 — `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. (이하 커밋 명령은 간결성을 위해 trailer를 생략 표기하나 실제로는 포함한다.)
- **strict 주의**: 타입 전용 import는 `import type`(verbatimModuleSyntax). 미사용 변수/파라미터 금지(noUnusedLocals/Parameters). `@/*` → `src/*` alias 사용.
- **작업 위치**: 코드는 `c:\projects\dflo_0.1\v4`. 명령은 `v4` 디렉토리에서 실행. (워크트리 분리 원하면 `superpowers:using-git-worktrees` 사용 가능하나, 본 레포 관례는 main 직접 작업.)
- **셸 주의**: 본 레포 기본 셸은 PowerShell이지만, Task 1.1/1.3/3.5의 `cp`·`mkdir -p`·`$SRC`·`ls … | wc -l`·`node -e "…require…"` 같은 명령은 **bash 문법**이다 → 반드시 **Bash 툴(Git Bash)** 로 실행(PowerShell로 실행 금지). `npm`/`npx`/`node --test`/`node scripts/…` 는 어느 셸이든 무방.

---

## File Structure

```
v4/public/marketing/strategy/                      # CREATE (static, 그대로 서빙)
  global-market.html  global-strategy.html
  th-operations.html  vn-operations.html  en-operations.html  us-korean-operations.html
  domestic-strategy.html  youtube-analysis.html

v4/scripts/extract-marketing-data.mjs              # CREATE 일회성 추출기(순수 Node, export 가능 함수 + main)
v4/scripts/test/extract-marketing-data.test.mjs    # CREATE node --test

v4/src/features/marketing/
  types.ts                                         # CREATE Keyword/Topic/StrategyDoc/Competition/TopicStatus
  data/keywords.json                               # GENERATED (커밋)
  data/topics.json                                 # GENERATED (커밋)
  data/strategy-index.json                         # GENERATED (커밋)
  hooks/useMarketingAuth.ts                        # CREATE PIN sessionStorage
  components/
    MarketingPinGate.tsx                           # CREATE PIN 화면
    MarketingSidebar.tsx                           # CREATE 4영역 네비
    MarketingLayout.tsx                            # CREATE PIN 게이트 + 사이드바 + <Outlet/> (default export)
    MarketingDashboard.tsx                         # CREATE 요약/하이라이트
    StrategyViewer.tsx                             # CREATE 목록 + iframe
    KeywordTable.tsx                               # CREATE 72행 검색·정렬·필터
    TopicBoard.tsx                                 # CREATE 78행 카테고리·상태

v4/src/app/router.tsx                              # MODIFY: /marketing/* 라우트 추가
```

각 파일은 단일 책임. 라우트 레벨 컴포넌트는 `components/`에 두고 router에서 lazy import.

---

## Chunk 1: 정적 자산 + 데이터 추출

목표: 전략 HTML 8종을 dflo에 복사하고, 국내 마스터에서 키워드/주제를 추출해 커밋된 JSON 3종을 만든다. (UI 없이도 데이터가 완결되어 검증 가능.)

### Task 1.1: 전략 HTML 8종 복사 (ASCII 리네임)

**Files:**
- Create: `v4/public/marketing/strategy/{global-market,global-strategy,th-operations,vn-operations,en-operations,us-korean-operations,domestic-strategy,youtube-analysis}.html`

- [ ] **Step 1: 디렉토리 생성 + 6종 복사 (strategy-templates)**

`v4` 디렉토리에서:
```bash
mkdir -p public/marketing/strategy
SRC="/c/projects/ContentFlow/contentflow/public/strategy-templates"
cp "$SRC/187-global-market.html"        public/marketing/strategy/global-market.html
cp "$SRC/187-global-strategy.html"      public/marketing/strategy/global-strategy.html
cp "$SRC/187-th-operations.html"        public/marketing/strategy/th-operations.html
cp "$SRC/187-vn-operations.html"        public/marketing/strategy/vn-operations.html
cp "$SRC/187-en-operations.html"        public/marketing/strategy/en-operations.html
cp "$SRC/187-us-korean-operations.html" public/marketing/strategy/us-korean-operations.html
```

- [ ] **Step 2: documents 2종 복사 (국내 마스터 + 유튜브 분석)**

```bash
DOCS="/c/projects/ContentFlow/documents"
cp "$DOCS/연세새봄의원_마케팅전략 260323.html" public/marketing/strategy/domestic-strategy.html
cp "$DOCS/187growup-analysis.html"            public/marketing/strategy/youtube-analysis.html
```

- [ ] **Step 3: 8개 파일 존재 + UTF-8 확인**

Run:
```bash
ls -1 public/marketing/strategy/*.html | wc -l
node -e "const s=require('fs').readFileSync('public/marketing/strategy/domestic-strategy.html','utf8'); console.log('len',s.length,'has kwData', s.includes('const kwData='))"
```
Expected: `8` / `len 12xxxx has kwData true`

- [ ] **Step 4: Commit**

```bash
git add public/marketing/strategy
git commit -m "feat(marketing): vendor 187 strategy HTML assets into dflo"
```

---

### Task 1.2: 추출기 테스트 먼저 작성 (failing)

**Files:**
- Create: `v4/scripts/test/extract-marketing-data.test.mjs`

추출기의 순수 함수(`extractDomestic`)를 import해 실측 카운트를 단언한다. (이 시점엔 추출기가 없어 import 실패 → 테스트 실패.)

- [ ] **Step 1: 테스트 작성**

```js
// scripts/test/extract-marketing-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractDomestic, STRATEGY_INDEX } from '../extract-marketing-data.mjs';

const HTML = readFileSync(
  resolve(process.cwd(), 'public/marketing/strategy/domestic-strategy.html'),
  'utf8',
);

test('extracts 72 keywords with 4 golden', () => {
  const { keywords } = extractDomestic(HTML);
  assert.equal(keywords.length, 72);
  assert.equal(keywords.filter((k) => k.isGolden).length, 4);
  const sample = keywords[0];
  assert.ok(typeof sample.keyword === 'string' && sample.keyword.length > 0);
  assert.ok(['high', 'medium', 'low'].includes(sample.competition));
  assert.equal(typeof sample.totalSearch, 'number');
});

test('extracts 78 topics with correct category + status distribution', () => {
  const { topics } = extractDomestic(HTML);
  assert.equal(topics.length, 78);
  const byCat = topics.reduce((m, t) => ((m[t.category] = (m[t.category] || 0) + 1), m), {});
  assert.deepEqual(byCat, { A: 20, B: 15, C: 15, D: 18, E: 10 });
  const byStatus = topics.reduce((m, t) => ((m[t.status] = (m[t.status] || 0) + 1), m), {});
  assert.deepEqual(byStatus, { new: 46, done: 25, similar: 7 });
  assert.equal(topics[0].categoryName, '성장과학'); // A
});

test('strategy index lists 8 docs', () => {
  assert.equal(STRATEGY_INDEX.length, 8);
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node --test scripts/test/extract-marketing-data.test.mjs`
Expected: FAIL — `Cannot find module '../extract-marketing-data.mjs'`

---

### Task 1.3: 추출기 구현 (pass)

**Files:**
- Create: `v4/scripts/extract-marketing-data.mjs`

- [ ] **Step 1: 추출기 작성**

```js
// scripts/extract-marketing-data.mjs
// One-time extractor: parses domestic-strategy.html <script> arrays (kwData/topics/ytRows)
// into committed JSON. Pure Node (no cheerio). Re-run after the source HTML changes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.cwd());
const SRC_HTML = resolve(ROOT, 'public/marketing/strategy/domestic-strategy.html');
const OUT_DIR = resolve(ROOT, 'src/features/marketing/data');

// 8-doc viewer manifest (filenames fixed by Task 1.1).
export const STRATEGY_INDEX = [
  { file: 'domestic-strategy.html', title: '국내 마케팅 마스터', description: '키워드·주제·예산·채널·퍼널·KPI 종합', group: '국내', order: 1 },
  { file: 'global-market.html', title: '글로벌 시장 분석 (10개국)', description: '검색량·CPC·골든키워드 국가별 매트릭스', group: '글로벌', order: 2 },
  { file: 'global-strategy.html', title: '글로벌 실행 전략', description: 'hub-spoke·퍼널·24개월 로드맵', group: '글로벌', order: 3 },
  { file: 'th-operations.html', title: '태국 작전', description: '페르소나·키워드·예산·90일 캘린더', group: '국가별 작전', order: 4 },
  { file: 'vn-operations.html', title: '베트남 작전', description: 'Zalo·TikTok 중심', group: '국가별 작전', order: 5 },
  { file: 'en-operations.html', title: '영어 4시장 작전', description: 'US·IN·PH·MY', group: '국가별 작전', order: 6 },
  { file: 'us-korean-operations.html', title: '미국 한인 작전', description: '디아스포라 Meta 리드젠', group: '국가별 작전', order: 7 },
  { file: 'youtube-analysis.html', title: '유튜브 채널 분석', description: '@187growup 성과 분석', group: '채널분석', order: 8 },
];

// Bracket-depth scanner (string/escape aware) → JSON.parse a `const NAME=[ ... ];` array.
function extractArray(html, name) {
  const start = html.indexOf('const ' + name + '=');
  if (start < 0) throw new Error(`array not found: ${name}`);
  let i = html.indexOf('[', start);
  let depth = 0, inStr = false, q = '', out = '';
  for (; i < html.length; i++) {
    const c = html[i];
    out += c;
    if (inStr) { if (c === q && html[i - 1] !== '\\') inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  return JSON.parse(out);
}

function categoryMap(html) {
  const re = /<div class="cycle-letter"[^>]*>([A-E])<\/div><div class="cycle-name">([^<]+)<\/div>/g;
  const map = {};
  let m;
  while ((m = re.exec(html))) map[m[1]] = m[2].trim();
  return map;
}

function toCompetition(s) {
  if (s === '높음') return 'high';
  if (s === '낮음') return 'low';
  return 'medium';
}

// Pure transform — used by tests. Input: HTML string. Output: { keywords, topics }.
export function extractDomestic(html) {
  const kwData = extractArray(html, 'kwData');   // [kw, pc, mobile, total, comp, tag]
  const topics = extractArray(html, 'topics');   // [id, cat, title, angle, kwStr, source]
  const ytRows = extractArray(html, 'ytRows');   // [id, status, title, note]
  const catNames = categoryMap(html);

  const keywords = kwData.map((r) => {
    const tag = String(r[5] ?? '');
    return {
      keyword: String(r[0] ?? ''),
      pcSearch: Number(r[1]) || 0,
      mobileSearch: Number(r[2]) || 0,
      totalSearch: Number(r[3]) || 0,
      competition: toCompetition(String(r[4] ?? '')),
      category: tag,
      isGolden: tag.includes('gold'),
    };
  }).filter((k) => k.keyword);

  const statusById = new Map(ytRows.map((r) => [String(r[0]), String(r[1] || 'new')]));

  const topicsOut = topics.map((r) => {
    const id = String(r[0] ?? '');
    const cat = String(r[1] ?? '');
    const raw = statusById.get(id) ?? 'new';
    const status = raw === 'done' || raw === 'similar' ? raw : 'new';
    return {
      id,
      category: cat,
      categoryName: catNames[cat] ?? cat,
      title: String(r[2] ?? ''),
      angle: String(r[3] ?? ''),
      keywords: String(r[4] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      source: String(r[5] ?? ''),
      status,
    };
  }).filter((t) => t.title && t.category);

  return { keywords, topics: topicsOut };
}

function validate(keywords, topics) {
  const errs = [];
  if (keywords.length !== 72) errs.push(`keywords=${keywords.length} (expected 72)`);
  if (keywords.filter((k) => k.isGolden).length !== 4) errs.push('golden != 4');
  if (topics.length !== 78) errs.push(`topics=${topics.length} (expected 78)`);
  if (errs.length) throw new Error('extract validation failed: ' + errs.join('; '));
}

function writeJson(name, data) {
  const p = resolve(OUT_DIR, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[extract] wrote ${name} (${Array.isArray(data) ? data.length : '?'} rows)`);
}

function main() {
  const html = readFileSync(SRC_HTML, 'utf8');
  const { keywords, topics } = extractDomestic(html);
  validate(keywords, topics);
  writeJson('keywords.json', keywords);
  writeJson('topics.json', topics);
  writeJson('strategy-index.json', STRATEGY_INDEX);
  console.log('[extract] done.');
}

// Run main only when invoked directly (not when imported by tests). Cross-platform safe.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `node --test scripts/test/extract-marketing-data.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 3: 추출 실행 → JSON 3종 생성**

Run: `node scripts/extract-marketing-data.mjs`
Expected:
```
[extract] wrote keywords.json (72 rows)
[extract] wrote topics.json (78 rows)
[extract] wrote strategy-index.json (8 rows)
[extract] done.
```

- [ ] **Step 4: 산출물 sanity 확인**

Run:
```bash
node -e "const k=require('./src/features/marketing/data/keywords.json'); console.log('kw',k.length,'gold',k.filter(x=>x.isGolden).length); const t=require('./src/features/marketing/data/topics.json'); console.log('topics',t.length,'new',t.filter(x=>x.status==='new').length)"
```
Expected: `kw 72 gold 4` / `topics 78 new 46`

- [ ] **Step 5: `test:i18n` 스크립트에 포함되는지 확인(이미 glob `scripts/test/*.mjs`)**

Run: `npm run test:i18n`
Expected: 기존 i18n 테스트 + 신규 extract 테스트 모두 PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/extract-marketing-data.mjs scripts/test/extract-marketing-data.test.mjs src/features/marketing/data
git commit -m "feat(marketing): extract keyword DB (72) + topic backlog (78) from strategy HTML"
```

---

## Chunk 2: 타입 + 인증 + 레이아웃 + 라우팅 (쉘)

목표: PIN 게이트 + 사이드바 + 라우트가 동작해, `/marketing` 진입 시 PIN → 빈 대시보드 자리까지 도달.

### Task 2.1: 타입 정의

**Files:**
- Create: `v4/src/features/marketing/types.ts`

- [ ] **Step 1: 작성**

```ts
// src/features/marketing/types.ts
export type Competition = 'high' | 'medium' | 'low';

export interface Keyword {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: Competition;
  category: string;
  isGolden: boolean;
}

export type TopicStatus = 'new' | 'done' | 'similar';

export interface Topic {
  id: string;
  category: string;      // A~E
  categoryName: string;  // 성장과학 등
  title: string;
  angle: string;
  keywords: string[];
  source: string;
  status: TopicStatus;
}

export interface StrategyDoc {
  file: string;
  title: string;
  description: string;
  group: '국내' | '글로벌' | '국가별 작전' | '채널분석';
  order: number;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 통과 (신규 에러 없음)

---

### Task 2.2: PIN 인증 훅

**Files:**
- Create: `v4/src/features/marketing/hooks/useMarketingAuth.ts`

- [ ] **Step 1: 작성** — banner-admin과 동일 PIN 값(`8054`), **자체 sessionStorage 키**(`marketing-admin-auth`).

```ts
// src/features/marketing/hooks/useMarketingAuth.ts
import { useCallback, useState } from 'react';

const MARKETING_PIN = '8054';
const AUTH_KEY = 'marketing-admin-auth';

export function useMarketingAuth() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === 'true',
  );

  const submitPin = useCallback((pin: string): boolean => {
    if (pin === MARKETING_PIN) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  return { authed, submitPin };
}
```

- [ ] **Step 2: 타입 체크** → `npx tsc --noEmit` 통과

---

### Task 2.3: PIN 게이트 + 사이드바 + 레이아웃

**Files:**
- Create: `v4/src/features/marketing/components/MarketingPinGate.tsx`
- Create: `v4/src/features/marketing/components/MarketingSidebar.tsx`
- Create: `v4/src/features/marketing/components/MarketingLayout.tsx`

- [ ] **Step 1: MarketingPinGate 작성**

```tsx
// src/features/marketing/components/MarketingPinGate.tsx
import { useState } from 'react';

interface Props {
  onSubmit: (pin: string) => boolean;
}

export function MarketingPinGate({ onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handle = () => {
    if (!onSubmit(pin)) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#fafaf8]">
      <div className="w-80 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#4A2D6B]">187 마케팅 센터</h1>
        <p className="mb-5 text-sm text-gray-500">PIN을 입력하세요</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handle()}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-center tracking-widest focus:border-[#4A2D6B] focus:outline-none"
          placeholder="••••"
          autoFocus
        />
        {error && <p className="mb-2 text-xs text-red-500">PIN이 올바르지 않습니다</p>}
        <button
          onClick={handle}
          disabled={!pin}
          className="w-full rounded-lg bg-[#4A2D6B] py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          입장
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: MarketingSidebar 작성**

```tsx
// src/features/marketing/components/MarketingSidebar.tsx
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/marketing', label: '대시보드', end: true },
  { to: '/marketing/strategy', label: '전략 문서', end: false },
  { to: '/marketing/keywords', label: '키워드 DB', end: false },
  { to: '/marketing/topics', label: '주제 백로그', end: false },
];

export function MarketingSidebar() {
  return (
    <aside className="flex w-52 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-5 py-5">
        <div className="text-base font-bold text-[#4A2D6B]">187 마케팅 센터</div>
        <div className="text-xs text-gray-400">연세새봄의원</div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-[#4A2D6B] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <a href="/" className="mt-auto px-5 py-4 text-xs text-gray-400 hover:text-gray-600">
        ← 홈으로
      </a>
    </aside>
  );
}
```

- [ ] **Step 3: MarketingLayout 작성** (default export — router lazy import용)

```tsx
// src/features/marketing/components/MarketingLayout.tsx
import { Outlet } from 'react-router-dom';
import { useMarketingAuth } from '../hooks/useMarketingAuth';
import { MarketingPinGate } from './MarketingPinGate';
import { MarketingSidebar } from './MarketingSidebar';

export default function MarketingLayout() {
  const { authed, submitPin } = useMarketingAuth();
  if (!authed) return <MarketingPinGate onSubmit={submitPin} />;
  return (
    <div className="flex h-screen bg-[#fafaf8]">
      <MarketingSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크** → `npx tsc --noEmit` 통과

---

### Task 2.4: 라우터 배선 (임시 대시보드 placeholder)

**Files:**
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: lazy import 추가** — 파일 상단 Admin pages lazy 블록 근처에 추가:

```tsx
// Marketing hub (PIN-protected standalone section)
const MarketingLayout = lazy(() => import('@/features/marketing/components/MarketingLayout'));
```

- [ ] **Step 2: 라우트 객체 추가** — `createBrowserRouter([...])` 배열에서 `/banner-admin` 블록 뒤(또는 `/app-home-admin` 뒤)에 삽입. 자식 라우트의 element는 이 태스크에선 임시 placeholder로 둔다(다음 청크에서 실제 컴포넌트로 교체).

```tsx
{
  path: '/marketing',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <MarketingLayout />
    </Suspense>
  ),
  children: [
    { index: true, element: <div className="p-8 text-gray-500">대시보드 (작업 예정)</div> },
    { path: 'strategy', element: <div className="p-8 text-gray-500">전략 문서 (작업 예정)</div> },
    { path: 'keywords', element: <div className="p-8 text-gray-500">키워드 DB (작업 예정)</div> },
    { path: 'topics', element: <div className="p-8 text-gray-500">주제 백로그 (작업 예정)</div> },
  ],
},
```

- [ ] **Step 3: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 4: preview 검증** — dev 서버에서 PIN 게이트 → 진입 → 사이드바 + placeholder 확인.
  1. dev 서버 기동(preview_start, `npm run dev`).
  2. `/marketing` 이동 → PIN 화면 노출 확인(preview_snapshot).
  3. `8054` 입력 → 입장 → 사이드바 4항목 + "대시보드 (작업 예정)" 확인.
  4. 사이드바 "키워드 DB" 클릭 → URL `/marketing/keywords`, placeholder 전환 확인.
  Expected: PIN 게이트 동작, 라우팅 동작, 콘솔 에러 없음(preview_console_logs).

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/types.ts src/features/marketing/hooks src/features/marketing/components/MarketingPinGate.tsx src/features/marketing/components/MarketingSidebar.tsx src/features/marketing/components/MarketingLayout.tsx src/app/router.tsx
git commit -m "feat(marketing): PIN-gated /marketing shell (layout, sidebar, routes)"
```

---

## Chunk 3: 콘텐츠 화면 (뷰어·키워드·주제·대시보드)

목표: 4개 화면을 실제 데이터로 채우고 라우트 placeholder를 교체한다.

### Task 3.1: StrategyViewer (목록 + iframe)

**Files:**
- Create: `v4/src/features/marketing/components/StrategyViewer.tsx`
- Modify: `v4/src/app/router.tsx` (placeholder → 실제)

- [ ] **Step 1: StrategyViewer 작성**

```tsx
// src/features/marketing/components/StrategyViewer.tsx
import { useState } from 'react';
import strategyIndexRaw from '../data/strategy-index.json';
import type { StrategyDoc } from '../types';

const DOCS = (strategyIndexRaw as StrategyDoc[]).slice().sort((a, b) => a.order - b.order);
const GROUPS: StrategyDoc['group'][] = ['국내', '글로벌', '국가별 작전', '채널분석'];

export function StrategyViewer() {
  const [active, setActive] = useState<string>(DOCS[0]?.file ?? '');
  const activeDoc = DOCS.find((d) => d.file === active);

  return (
    <div className="flex h-full">
      <div className="w-60 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
        {GROUPS.map((g) => {
          const docs = DOCS.filter((d) => d.group === g);
          if (!docs.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="mb-1 px-2 text-xs font-bold text-gray-400">{g}</div>
              {docs.map((d) => (
                <button
                  key={d.file}
                  onClick={() => setActive(d.file)}
                  className={`mb-0.5 block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    active === d.file ? 'bg-[#4A2D6B] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col bg-white">
        {activeDoc && (
          <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
            {activeDoc.description}
          </div>
        )}
        {active && (
          <iframe
            key={active}
            src={`/marketing/strategy/${active}`}
            title={active}
            className="w-full flex-1 border-0"
          />
        )}
      </div>
    </div>
  );
}
```

> 주: iframe `src`는 `public/marketing/strategy/`의 실제 정적 파일을 가리킨다. Vite dev/preview는 존재하는 파일을 SPA fallback보다 먼저 서빙하므로(기존 `/programs/*.html` 패턴과 동일) React 라우트 `/marketing/strategy`와 충돌하지 않는다. Step 4에서 실제 로드를 검증한다.

- [ ] **Step 2: 라우터에서 placeholder 교체**

`strategy` 자식 라우트 element를 실제 컴포넌트로:
```tsx
{ path: 'strategy', element: <StrategyViewer /> },
```
그리고 상단에 named import 추가(`StrategyViewer`는 named export):
```tsx
// router.tsx 상단 — 가벼운 컴포넌트는 직접 import (lazy 불필요)
import { StrategyViewer } from '@/features/marketing/components/StrategyViewer';
```

- [ ] **Step 3: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 4: preview 검증** — `/marketing/strategy` 진입 → 좌측 목록 4그룹(국내/글로벌/국가별 작전/채널분석) → 기본 "국내 마케팅 마스터" iframe 로드 확인 → 다른 문서 클릭 시 iframe 교체 확인. **iframe 내부에 실제 전략 HTML(테이블/차트)이 렌더되는지** 스크린샷으로 확인(preview_screenshot). 콘솔 404 없음(preview_network).
  Expected: 8개 문서 전환 정상, iframe 정적 HTML 정상 로드.

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/components/StrategyViewer.tsx src/app/router.tsx
git commit -m "feat(marketing): strategy document viewer (list + iframe)"
```

---

### Task 3.2: KeywordTable (72행 검색·정렬·필터)

**Files:**
- Create: `v4/src/features/marketing/components/KeywordTable.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: KeywordTable 작성**

```tsx
// src/features/marketing/components/KeywordTable.tsx
import { useMemo, useState } from 'react';
import keywordsRaw from '../data/keywords.json';
import type { Keyword, Competition } from '../types';

const KEYWORDS = keywordsRaw as Keyword[];
type SortKey = 'keyword' | 'pcSearch' | 'mobileSearch' | 'totalSearch';
const COMP_LABEL: Record<Competition, string> = { high: '높음', medium: '중간', low: '낮음' };
const COMP_COLOR: Record<Competition, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

export function KeywordTable() {
  const [q, setQ] = useState('');
  const [comp, setComp] = useState<'all' | Competition>('all');
  const [goldenOnly, setGoldenOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('totalSearch');
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    let r = KEYWORDS.filter((k) => k.keyword.includes(q));
    if (comp !== 'all') r = r.filter((k) => k.competition === comp);
    if (goldenOnly) r = r.filter((k) => k.isGolden);
    r = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return r;
  }, [q, comp, goldenOnly, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc((v) => !v);
    else { setSortKey(k); setAsc(false); }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="키워드 검색"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        {(['all', 'high', 'medium', 'low'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setComp(c)}
            className={`rounded-full px-3 py-1 text-xs ${
              comp === c ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {c === 'all' ? '전체' : COMP_LABEL[c]}
          </button>
        ))}
        <button
          onClick={() => setGoldenOnly((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs ${
            goldenOnly ? 'bg-amber-400 text-amber-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          ⭐ 골든만
        </button>
        <span className="ml-auto text-xs text-gray-400">{rows.length}개</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
            <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('keyword')}>키워드</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('pcSearch')}>PC</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('mobileSearch')}>모바일</th>
            <th className="cursor-pointer px-3 py-2 text-right" onClick={() => toggleSort('totalSearch')}>총검색</th>
            <th className="px-3 py-2">경쟁도</th>
            <th className="px-3 py-2">분류</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.keyword} className={`border-b border-gray-100 ${k.isGolden ? 'bg-amber-50' : ''}`}>
              <td className="px-3 py-2 font-medium text-gray-800">
                {k.isGolden && <span className="mr-1">⭐</span>}
                {k.keyword}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.pcSearch.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.mobileSearch.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.totalSearch.toLocaleString()}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${COMP_COLOR[k.competition]}`}>
                  {COMP_LABEL[k.competition]}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{k.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 라우터 교체** — `import { KeywordTable } ...` 추가 + `{ path: 'keywords', element: <KeywordTable /> }`

- [ ] **Step 3: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 4: preview 검증** — `/marketing/keywords`: 72행 표시, 검색("예상키") 필터, 경쟁도 칩, "골든만"=4행, 총검색 헤더 클릭 정렬 토글, 골든 행 amber 확인.

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/components/KeywordTable.tsx src/app/router.tsx
git commit -m "feat(marketing): keyword DB table (search/sort/filter, 72 rows)"
```

---

### Task 3.3: TopicBoard (78행 카테고리·상태)

**Files:**
- Create: `v4/src/features/marketing/components/TopicBoard.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: TopicBoard 작성**

```tsx
// src/features/marketing/components/TopicBoard.tsx
import { useMemo, useState } from 'react';
import topicsRaw from '../data/topics.json';
import type { Topic, TopicStatus } from '../types';

const TOPICS = topicsRaw as Topic[];
const CATS = ['A', 'B', 'C', 'D', 'E'];
const CAT_COLOR: Record<string, string> = {
  A: 'text-teal-600', B: 'text-amber-600', C: 'text-rose-600', D: 'text-purple-600', E: 'text-gray-500',
};
const STATUS_LABEL: Record<TopicStatus, string> = { new: '미발행', done: '발행', similar: '유사' };
const STATUS_COLOR: Record<TopicStatus, string> = {
  new: 'bg-rose-100 text-rose-700', done: 'bg-emerald-100 text-emerald-700', similar: 'bg-gray-100 text-gray-500',
};

export function TopicBoard() {
  const [status, setStatus] = useState<'all' | TopicStatus>('all');

  const shown = useMemo(
    () => (status === 'all' ? TOPICS : TOPICS.filter((t) => t.status === status)),
    [status],
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        {(['all', 'new', 'done', 'similar'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs ${
              status === s ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{shown.length}개</span>
      </div>

      <div className="space-y-6">
        {CATS.map((cat) => {
          const items = shown.filter((t) => t.category === cat);
          if (!items.length) return null;
          const name = items[0]?.categoryName ?? cat;
          return (
            <div key={cat}>
              <h3 className={`mb-2 text-sm font-bold ${CAT_COLOR[cat] ?? 'text-gray-600'}`}>
                {cat} · {name} ({items.length})
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((t) => (
                  <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{t.title}</span>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    {t.angle && <div className="mb-1 text-xs text-gray-500">{t.angle}</div>}
                    <div className="flex flex-wrap gap-1">
                      {t.keywords.map((kw) => (
                        <span key={kw} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 라우터 교체** — `import { TopicBoard } ...` + `{ path: 'topics', element: <TopicBoard /> }`

- [ ] **Step 3: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 4: preview 검증** — `/marketing/topics`: 카테고리 A~E 그룹(20/15/15/18/10), 상태 필터(미발행=46), 카드에 제목·앵글·키워드 태그·상태 뱃지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/components/TopicBoard.tsx src/app/router.tsx
git commit -m "feat(marketing): topic backlog board (category + status, 78 rows)"
```

---

### Task 3.4: MarketingDashboard (요약 + 하이라이트)

**Files:**
- Create: `v4/src/features/marketing/components/MarketingDashboard.tsx`
- Modify: `v4/src/app/router.tsx` (index placeholder → 실제)

- [ ] **Step 1: MarketingDashboard 작성** — 수치는 JSON에서 계산.

```tsx
// src/features/marketing/components/MarketingDashboard.tsx
import { Link } from 'react-router-dom';
import keywordsRaw from '../data/keywords.json';
import topicsRaw from '../data/topics.json';
import strategyIndexRaw from '../data/strategy-index.json';
import type { Keyword, Topic, StrategyDoc } from '../types';

const KEYWORDS = keywordsRaw as Keyword[];
const TOPICS = topicsRaw as Topic[];
const DOCS = strategyIndexRaw as StrategyDoc[];

const goldenTop = KEYWORDS.filter((k) => k.isGolden).sort((a, b) => b.totalSearch - a.totalSearch);
const newCount = TOPICS.filter((t) => t.status === 'new').length;

function Card({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#4A2D6B]">
      <div className="text-2xl font-bold text-[#4A2D6B]">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </Link>
  );
}

export function MarketingDashboard() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-gray-800">마케팅 콘텐츠 허브</h1>
      <p className="mb-5 text-sm text-gray-500">연세새봄의원 / 187 성장클리닉</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="전략 문서" value={DOCS.length} to="/marketing/strategy" />
        <Card label="키워드" value={KEYWORDS.length} to="/marketing/keywords" />
        <Card label="골든 키워드" value={goldenTop.length} to="/marketing/keywords" />
        <Card label="주제" value={TOPICS.length} to="/marketing/topics" />
        <Card label="미발행" value={newCount} to="/marketing/topics" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-gray-700">⭐ 골든 키워드</h2>
        <ul className="space-y-1">
          {goldenTop.map((k) => (
            <li key={k.keyword} className="flex justify-between text-sm">
              <span className="text-gray-700">{k.keyword}</span>
              <span className="tabular-nums text-gray-500">{k.totalSearch.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 라우터 index 교체** — `import { MarketingDashboard } ...` + `{ index: true, element: <MarketingDashboard /> }`

- [ ] **Step 3: 타입 체크** → `npx tsc --noEmit` 통과

- [ ] **Step 4: preview 종합 검증** — `/marketing`: 카드 5개(8·72·4·78·46) + 골든 4개 리스트. 카드 클릭 시 해당 영역 이동. 4영역 전체 한 바퀴(대시보드→전략→키워드→주제) 콘솔 에러 0 확인.

- [ ] **Step 5: Commit**

```bash
git add src/features/marketing/components/MarketingDashboard.tsx src/app/router.tsx
git commit -m "feat(marketing): hub dashboard (summary cards + golden keyword highlights)"
```

---

### Task 3.5: 프로덕션 빌드 검증 + 문서 갱신

**Files:**
- Modify: `v4/CLAUDE.md` (마케팅 허브 섹션 1개 + Current Progress 항목 추가)

- [ ] **Step 1: 전체 빌드** — iframe 정적 자산이 dist에 포함되고 타입/빌드가 통과하는지.

Run: `npm run build`
Expected: 성공. `dist/marketing/strategy/`에 HTML 8종 존재 확인:
```bash
ls -1 dist/marketing/strategy/*.html | wc -l   # → 8
```

- [ ] **Step 2: preview(프로덕션) 검증** — `npm run preview` → `/marketing` PIN → iframe 로드(프로덕션 정적 서빙에서 SPA fallback이 `.html`을 가로채지 않는지 최종 확인).

- [ ] **Step 3: CLAUDE.md 갱신** — 루트 `CLAUDE.md`에 마케팅 허브 설계결정 1줄 + `Current Progress`에 Phase 추가(예: "Phase 28: COMPLETE (마케팅 콘텐츠 허브 — PIN 보호 /marketing, 전략 HTML 8종 iframe 뷰어 + 키워드 72/골든 4 + 주제 78/미발행 46, ContentFlow 자산 내재화)"). 상세는 `docs/superpowers/specs/2026-06-02-marketing-content-hub-design.md` 참조 표기.

- [ ] **Step 4: Commit**

```bash
git add v4/CLAUDE.md
git commit -m "docs(marketing): record marketing content hub in CLAUDE.md"
```

---

## 완료 기준 (Definition of Done)

- `/marketing` PIN(`8054`) 게이트 → 4영역(대시보드/전략/키워드/주제) 동작.
- 전략 HTML 8종 iframe 정상 로드(국내/글로벌/국가별 작전/채널분석).
- 키워드 72(골든 4) 검색·정렬·필터, 주제 78(A20/B15/C15/D18/E10, 미발행 46) 카테고리·상태.
- `npm run test:i18n` PASS(추출 테스트 포함), `npx tsc --noEmit` PASS, `npm run build` 성공.
- 런타임에 ContentFlow/외부 API 호출 0(자체 내재화).
- 의사 `/admin`·환자 `/app` 인증과 완전 분리(별도 sessionStorage 키).
