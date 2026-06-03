# 마케팅 R1-키워드 라이브 (슬라이스 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/marketing/keywords` 를 라이브 키워드 분석 도구로 업그레이드 — 네이버 검색광고 + DataForSEO(구글) 분석(ai-server) + 보관함 핀(Supabase) + IdeasPage 3탭.

**Architecture:** ai-server에 네이버(HMAC)·DataForSEO(Basic) 검색 서비스 + 2 엔드포인트(ContentFlow 이식). dflo는 client-direct Supabase `marketing_keywords` 핀 테이블 + IdeasPage(네이버/구글/보관함 3탭). 보관함 = 정적 72 ∪ DB 핀. 외부 키는 ai-server env에만.

**Tech Stack:** ai-server: TS ESM, Express 5, Node `crypto`/`Buffer`/`fetch`. v4: React 19, Vite, TS strict, Tailwind, React Router 7, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-06-03-marketing-keywords-live-design.md`

---

## 검증/실행 노트 (읽고 시작)

- 테스트 하니스 없음(ai-server·v4 둘 다) → 검증 = `npx tsc --noEmit` + `npx vite build`(v4) / `npm run build`(ai-server) + lint. preview 자동검증 미사용.
- strict: `import type`, 미사용 금지. `@/*`→`src/*`. 모든 `<button>` `type="button"`.
- **외부 키 전제**: ai-server 라우트는 `NAVER_API_LICENSE_KEY`·`NAVER_API_SECRET_KEY`·`NAVER_API_CUSTOMER_ID`·`DATAFORSEO_LOGIN`·`DATAFORSEO_PASSWORD`(dflo `ai-server/.env`, ContentFlow에서 복사)가 있어야 **동작**. 없어도 tsc/build는 통과(런타임만 "키 미설정" 에러). 로컬 테스트 시 `VITE_AI_SERVER_URL`도 설정돼 있어야(현 `.env.local`=`http://localhost:4000`, ai-server PORT=4000 일치).
- **router.tsx WIP**: Chunk 3 전 컨트롤러가 dirty 확인 → dirty면 stash, 커밋 후 pop.
- migration은 코드가 적용 안 함 → `018_marketing_keywords.sql` 생성, 사용자 수동 적용.
- 커밋 trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. git은 `git -C c:/projects/dflo_0.1`.

## File Structure

```
ai-server/src/
  services/keywordSearch.ts   # CREATE searchNaverKeywords + searchGoogleKeywords (포팅)
  routes/marketing.ts         # MODIFY: import + 2 endpoints (naver/google-keywords)
v4/scripts/migrations/018_marketing_keywords.sql   # CREATE 핀 테이블
v4/src/features/marketing/
  types.ts                    # MODIFY: KeywordHit, SavedKeyword
  services/marketingKeywordService.ts   # CREATE search* + pin CRUD
  components/
    KeywordAnalysisTab.tsx    # CREATE 검색+결과+핀 (source param)
    IdeasPage.tsx             # CREATE 3탭 컨테이너 + 보관함 병합
    KeywordTable.tsx          # MODIFY: keywords prop, R0 배너 제거
v4/src/app/router.tsx         # MODIFY: keywords element KeywordTable→IdeasPage
```

---

## Chunk 1: ai-server 키워드 검색

### Task 1.1: keywordSearch 서비스

**Files:** Create `ai-server/src/services/keywordSearch.ts`

- [ ] **Step 1: 작성** (EXACT)
```ts
// ai-server/src/services/keywordSearch.ts
// Ported from ContentFlow api/naver/keywords + api/google/keywords.
import { createHmac } from 'node:crypto';

const NAVER_BASE = 'https://api.searchad.naver.com';
const DATAFORSEO_URL = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

export interface NaverKw {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
}
export interface GoogleKw {
  keyword: string;
  searchVolume: number;
  competition: string | null;
  cpc: number;
}

export async function searchNaverKeywords(keywords: string[]): Promise<NaverKw[]> {
  const license = process.env.NAVER_API_LICENSE_KEY || '';
  const secret = process.env.NAVER_API_SECRET_KEY || '';
  const customer = process.env.NAVER_API_CUSTOMER_ID || '';
  if (!license || !secret || !customer) throw new Error('네이버 API 키가 설정되지 않았습니다.');

  const timestamp = String(Date.now());
  const uri = '/keywordstool';
  const signature = createHmac('sha256', secret).update(`${timestamp}.GET.${uri}`).digest('base64');
  const clean = keywords.map((k) => k.replace(/\s+/g, '')).filter(Boolean);
  const params = new URLSearchParams({ hintKeywords: clean.join(','), showDetail: '1' });

  const res = await fetch(`${NAVER_BASE}${uri}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': license,
      'X-Customer': customer,
      'X-Signature': signature,
    },
  });
  if (!res.ok) throw new Error(`네이버 API 오류 (${res.status}): ${await res.text().catch(() => '')}`);
  const data = (await res.json()) as { keywordList?: Array<Record<string, unknown>> };
  return (data.keywordList ?? []).map((item) => {
    const pc = typeof item.monthlyPcQcCnt === 'number' ? item.monthlyPcQcCnt : 0;
    const mobile = typeof item.monthlyMobileQcCnt === 'number' ? item.monthlyMobileQcCnt : 0;
    return {
      keyword: String(item.relKeyword ?? ''),
      pcSearch: pc,
      mobileSearch: mobile,
      totalSearch: pc + mobile,
      competition: (item.compIdx as string) ?? 'LOW',
    };
  });
}

export async function searchGoogleKeywords(keywords: string[]): Promise<GoogleKw[]> {
  const login = process.env.DATAFORSEO_LOGIN || '';
  const password = process.env.DATAFORSEO_PASSWORD || '';
  if (!login || !password) throw new Error('DataForSEO API 키가 설정되지 않았습니다.');

  const creds = Buffer.from(`${login}:${password}`).toString('base64');
  const res = await fetch(DATAFORSEO_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ keywords: keywords.slice(0, 700), language_code: 'ko', location_code: 2410 }]),
  });
  if (!res.ok) throw new Error(`DataForSEO API 오류 (${res.status}): ${await res.text().catch(() => '')}`);
  const data = (await res.json()) as { tasks?: Array<{ result?: Array<Record<string, unknown>> }> };
  const results = data.tasks?.[0]?.result ?? [];
  return results.map((item) => ({
    keyword: String(item.keyword ?? ''),
    searchVolume: (item.search_volume as number) || 0,
    competition: (item.competition as string | null) ?? null,
    cpc: (item.cpc as number) || 0,
  }));
}
```
- [ ] **Step 2:** `c:\projects\dflo_0.1\ai-server` 에서 `npx tsc --noEmit` 통과.

### Task 1.2: 엔드포인트 2개

**Files:** Modify `ai-server/src/routes/marketing.ts`

- [ ] **Step 1: import 추가** — 기존 import 블록(line 7 `articleGenerator` import 다음)에:
```ts
import { searchNaverKeywords, searchGoogleKeywords } from '../services/keywordSearch.js';
```

- [ ] **Step 2: 엔드포인트 추가** — 파일 끝(generate-article 핸들러 다음)에:
```ts
marketingRouter.post('/naver-keywords', async (req: Request, res: Response) => {
  const keywords = (req.body?.keywords ?? []) as string[];
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: 'keywords required' });
  }
  try {
    const results = await searchNaverKeywords(keywords);
    res.json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] naver-keywords failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

marketingRouter.post('/google-keywords', async (req: Request, res: Response) => {
  const keywords = (req.body?.keywords ?? []) as string[];
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: 'keywords required' });
  }
  try {
    const results = await searchGoogleKeywords(keywords);
    res.json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] google-keywords failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 3:** ai-server `npx tsc --noEmit` 통과 + `npm run build` 성공.

- [ ] **Step 4: (선택) 수동 스모크** (키 설정 시): `curl -X POST localhost:4000/api/marketing/naver-keywords -H "Content-Type: application/json" -d '{"keywords":["성장호르몬"]}'` → `{success:true, results:[...]}`.

- [ ] **Step 5: Commit**
```bash
git -C c:/projects/dflo_0.1 add ai-server/src/services/keywordSearch.ts ai-server/src/routes/marketing.ts
git -C c:/projects/dflo_0.1 commit -m "feat(ai-server): Naver + DataForSEO keyword search endpoints"
```

---

## Chunk 2: dflo 데이터 계층

### Task 2.1: migration

**Files:** Create `v4/scripts/migrations/018_marketing_keywords.sql`

- [ ] **Step 1: 작성** (EXACT)
```sql
-- 018_marketing_keywords.sql
-- 마케팅 R1-키워드: 라이브 분석에서 보관함에 추가한 키워드 영속. Supabase Dashboard 적용.
create table if not exists marketing_keywords (
  keyword       text primary key,
  pc_search     int default 0,
  mobile_search int default 0,
  total_search  int default 0,
  competition   text,
  cpc           numeric default 0,
  source        text default 'manual',
  created_at    timestamptz default now()
);
alter table marketing_keywords enable row level security;
drop policy if exists marketing_keywords_all on marketing_keywords;
create policy marketing_keywords_all on marketing_keywords
  for all to anon, authenticated using (true) with check (true);
```
- [ ] **Step 2: Commit**
```bash
git -C c:/projects/dflo_0.1 add v4/scripts/migrations/018_marketing_keywords.sql
git -C c:/projects/dflo_0.1 commit -m "feat(marketing): add marketing_keywords pin table migration"
```

### Task 2.2: 타입

**Files:** Modify `v4/src/features/marketing/types.ts` (끝에 추가)
```ts
export interface KeywordHit {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
  cpc: number;
  source: 'naver' | 'google';
}

export interface SavedKeyword {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
  cpc: number;
  source: string;
  createdAt: string;
}
```
- [ ] `cd v4 && npx tsc --noEmit` 통과.

### Task 2.3: 서비스

**Files:** Create `v4/src/features/marketing/services/marketingKeywordService.ts` (EXACT)
```ts
// src/features/marketing/services/marketingKeywordService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { KeywordHit, SavedKeyword } from '../types';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

interface NaverKw { keyword: string; pcSearch: number; mobileSearch: number; totalSearch: number; competition: string; }
interface GoogleKw { keyword: string; searchVolume: number; competition: string | null; cpc: number; }

async function postKeywords<T>(path: string, keywords: string[]): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `요청 실패: ${res.status}`);
  return body.results as T[];
}

export async function searchNaver(keywords: string[]): Promise<KeywordHit[]> {
  const r = await postKeywords<NaverKw>('/api/marketing/naver-keywords', keywords);
  return r.map((k) => ({ ...k, cpc: 0, source: 'naver' as const }));
}

export async function searchGoogle(keywords: string[]): Promise<KeywordHit[]> {
  const r = await postKeywords<GoogleKw>('/api/marketing/google-keywords', keywords);
  return r.map((k) => ({
    keyword: k.keyword,
    pcSearch: 0,
    mobileSearch: 0,
    totalSearch: k.searchVolume,
    competition: k.competition ?? '',
    cpc: k.cpc,
    source: 'google' as const,
  }));
}

type Row = Record<string, unknown>;
function rowToSaved(r: Row): SavedKeyword {
  return {
    keyword: r.keyword as string,
    pcSearch: (r.pc_search as number) ?? 0,
    mobileSearch: (r.mobile_search as number) ?? 0,
    totalSearch: (r.total_search as number) ?? 0,
    competition: (r.competition as string) ?? '',
    cpc: Number(r.cpc) || 0,
    source: (r.source as string) ?? 'manual',
    createdAt: (r.created_at as string) ?? '',
  };
}

export async function fetchPins(): Promise<SavedKeyword[]> {
  const { data, error } = await supabase
    .from('marketing_keywords')
    .select('*')
    .order('total_search', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchPins failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToSaved(r as Row));
}

export async function savePin(hit: KeywordHit): Promise<void> {
  const { error } = await supabase.from('marketing_keywords').upsert(
    {
      keyword: hit.keyword,
      pc_search: hit.pcSearch,
      mobile_search: hit.mobileSearch,
      total_search: hit.totalSearch,
      competition: hit.competition,
      cpc: hit.cpc,
      source: hit.source,
    },
    { onConflict: 'keyword' },
  );
  if (error) throw new Error(error.message);
}

export async function deletePin(keyword: string): Promise<void> {
  const { error } = await supabase.from('marketing_keywords').delete().eq('keyword', keyword);
  if (error) throw new Error(error.message);
}
```
- [ ] `cd v4 && npx tsc --noEmit` 통과.
- [ ] **Commit**
```bash
git -C c:/projects/dflo_0.1 add v4/src/features/marketing/types.ts v4/src/features/marketing/services/marketingKeywordService.ts
git -C c:/projects/dflo_0.1 commit -m "feat(marketing): KeywordHit/SavedKeyword types + keyword service (search + pins)"
```

---

## Chunk 3: dflo UI (분석 탭 + IdeasPage + KeywordTable 리팩토링)

> **컨트롤러 선행**: router.tsx dirty면 stash, 커밋 후 pop.

### Task 3.1: KeywordTable 리팩토링 (keywords prop + 배너 제거)

**Files:** Modify `v4/src/features/marketing/components/KeywordTable.tsx`

- [ ] **Step 1: const 이름 변경** — `const KEYWORDS = keywordsRaw as Keyword[];` → `const STATIC_KEYWORDS = keywordsRaw as Keyword[];`
- [ ] **Step 2: 시그니처 변경** — `export function KeywordTable() {` → `export function KeywordTable({ keywords = STATIC_KEYWORDS }: { keywords?: Keyword[] }) {`
- [ ] **Step 3: useMemo 본문** — `let r = KEYWORDS.filter((k) => k.keyword.includes(q));` → `let r = keywords.filter((k) => k.keyword.includes(q));`
- [ ] **Step 4: useMemo deps** — `}, [q, comp, goldenOnly, sortKey, asc]);` → `}, [keywords, q, comp, goldenOnly, sortKey, asc]);`
- [ ] **Step 5: R0 배너 제거** — 아래 블록 삭제:
```tsx
      <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        💡 현재는 <b>보관함</b>(추출된 키워드 72개)입니다. 라이브 키워드 분석(네이버·DataForSEO)은 준비 중.
      </div>
```
- [ ] **Step 6:** `cd v4 && npx tsc --noEmit` 통과.

### Task 3.2: KeywordAnalysisTab

**Files:** Create `v4/src/features/marketing/components/KeywordAnalysisTab.tsx` (EXACT)
```tsx
// src/features/marketing/components/KeywordAnalysisTab.tsx
import { useState } from 'react';
import type { KeywordHit } from '../types';
import { searchNaver, searchGoogle, savePin } from '../services/marketingKeywordService';

export function KeywordAnalysisTab({ source, onPinned }: { source: 'naver' | 'google'; onPinned: () => void }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<KeywordHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  const run = async () => {
    const kws = input.split(',').map((s) => s.trim()).filter(Boolean);
    if (!kws.length) {
      setErr('검색어를 입력하세요 (쉼표로 여러 개).');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = source === 'naver' ? await searchNaver(kws) : await searchGoogle(kws);
      setResults(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '분석 실패');
    } finally {
      setLoading(false);
    }
  };

  const pin = async (h: KeywordHit) => {
    try {
      await savePin(h);
      setPinned((s) => new Set(s).add(h.keyword));
      onPinned();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={source === 'naver' ? '네이버 검색어 (쉼표로 여러 개)' : '구글 검색어 (쉼표로 여러 개)'}
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? '분석 중…' : '분석'}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>

      {results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-400">
              <th className="px-3 py-2">키워드</th>
              <th className="px-3 py-2 text-right">PC</th>
              <th className="px-3 py-2 text-right">모바일</th>
              <th className="px-3 py-2 text-right">총검색</th>
              <th className="px-3 py-2 text-right">CPC</th>
              <th className="px-3 py-2">경쟁도</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((k) => (
              <tr key={k.keyword} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{k.keyword}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.pcSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.mobileSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{k.totalSearch.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.cpc.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{k.competition}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => pin(k)}
                    disabled={pinned.has(k.keyword)}
                    className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 disabled:opacity-40"
                  >
                    {pinned.has(k.keyword) ? '✓ 추가됨' : '📌 추가'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```
- [ ] `cd v4 && npx tsc --noEmit` 통과.

### Task 3.3: IdeasPage

**Files:** Create `v4/src/features/marketing/components/IdeasPage.tsx` (EXACT)
```tsx
// src/features/marketing/components/IdeasPage.tsx
import { useEffect, useMemo, useState } from 'react';
import keywordsRaw from '../data/keywords.json';
import type { Keyword, Competition, SavedKeyword } from '../types';
import { fetchPins } from '../services/marketingKeywordService';
import { KeywordAnalysisTab } from './KeywordAnalysisTab';
import { KeywordTable } from './KeywordTable';

const STATIC = keywordsRaw as Keyword[];

function normComp(c: string): Competition {
  const u = c.toUpperCase();
  if (u.includes('HIGH') || c === '높음') return 'high';
  if (u.includes('LOW') || c === '낮음') return 'low';
  return 'medium';
}

function savedToKeyword(s: SavedKeyword): Keyword {
  return {
    keyword: s.keyword,
    pcSearch: s.pcSearch,
    mobileSearch: s.mobileSearch,
    totalSearch: s.totalSearch,
    competition: normComp(s.competition),
    category: s.source,
    isGolden: false,
  };
}

const TABS = [
  { id: 'naver', label: '🟢 네이버 분석' },
  { id: 'google', label: '🔵 구글 분석' },
  { id: 'pins', label: '📁 보관함' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function IdeasPage() {
  const [tab, setTab] = useState<TabId>('naver');
  const [pins, setPins] = useState<SavedKeyword[]>([]);

  const reloadPins = () => {
    fetchPins().then(setPins);
  };
  useEffect(reloadPins, []);

  const merged = useMemo(() => {
    const byKw = new Map<string, Keyword>();
    pins.forEach((p) => byKw.set(p.keyword, savedToKeyword(p)));
    STATIC.forEach((k) => byKw.set(k.keyword, k)); // 정적 72 우선
    return [...byKw.values()];
  }, [pins]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 px-6 pt-4">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm ${
              tab === t.id ? 'bg-[#4A2D6B] text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
            {t.id === 'pins' && <span className="ml-1 text-xs opacity-70">({merged.length})</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'naver' && <KeywordAnalysisTab source="naver" onPinned={reloadPins} />}
        {tab === 'google' && <KeywordAnalysisTab source="google" onPinned={reloadPins} />}
        {tab === 'pins' && <KeywordTable keywords={merged} />}
      </div>
    </div>
  );
}
```
- [ ] `cd v4 && npx tsc --noEmit` 통과.

### Task 3.4: 라우터 스왑

**Files:** Modify `v4/src/app/router.tsx`

- [ ] **Step 1: lazy import 교체** — 아래를
```tsx
const KeywordTable = lazy(() =>
  import('@/features/marketing/components/KeywordTable').then((m) => ({ default: m.KeywordTable })),
);
```
다음으로:
```tsx
const IdeasPage = lazy(() =>
  import('@/features/marketing/components/IdeasPage').then((m) => ({ default: m.IdeasPage })),
);
```
- [ ] **Step 2: keywords child element** — `<KeywordTable />` → `<IdeasPage />` (`/marketing` children 의 `path: 'keywords'` 블록).

> KeywordTable 은 이제 router 가 아니라 IdeasPage 가 import(직접). 따라서 router 의 KeywordTable lazy import 제거가 미사용 에러를 안 낸다.

### Task 3.5: 검증 + 커밋

- [ ] `cd v4 && npx tsc --noEmit` 통과 / `npx vite build` 성공(`IdeasPage-*.js` lazy chunk) / `npx eslint src/features/marketing` 클린.
- [ ] **Commit** (5파일)
```bash
git -C c:/projects/dflo_0.1 add v4/src/features/marketing/components/KeywordTable.tsx v4/src/features/marketing/components/KeywordAnalysisTab.tsx v4/src/features/marketing/components/IdeasPage.tsx v4/src/app/router.tsx
git -C c:/projects/dflo_0.1 commit -m "feat(marketing): live keyword IdeasPage (Naver/Google analysis + 보관함)"
```
> 커밋 후 컨트롤러 stash pop(했다면) + tsc 공존 확인.

---

## 완료 기준

- `018_marketing_keywords.sql` 작성(사용자 적용).
- ai-server `POST /api/marketing/{naver,google}-keywords` — 키 설정 시 검색어 → 라이브 결과(ai-server tsc/build 통과).
- `/marketing/keywords`(PIN `8054`): 네이버/구글 탭 검색 → 결과 테이블 → 📌 추가 → 보관함 탭에 반영(정적 72 + 핀, 검색/정렬/필터/골든 동작).
- `npx tsc --noEmit`(v4) + ai-server tsc 통과, `vite build` 성공, lint 클린.
- 외부 키 미저장(클라), ai-server env에만. R0 "준비 중" 배너 제거됨.
