# 블로그 근거 논문 자동 인용 (Blog Evidence References) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `evidence_papers`(281편, 임베딩 완료) 를 의미매칭해 블로그 62토픽에 참고문헌 스냅샷을 자동 첨부하고, 스튜디오에서 큐레이션·블로그 템플릿 렌더까지 배선한다.

**Architecture:** Approach A(JSONB 스냅샷). 배치 매처(ai-server)가 토픽별 영어 블로그 대표텍스트를 임베딩→코사인→`sim≥0.72 top-5`→`marketing_articles.blog_references` 에 스냅샷 저장. 스튜디오 패널(v4)이 표시·편집. 순수 `renderReferencesHtml` + 템플릿 슬롯이 발행 시 노출(현재 캐시 경로엔 inert).

**Tech Stack:** Node20 ESM, `@supabase/supabase-js`(service_role=txirmof), Gemini `gemini-embedding-001`(768d), React 19 + TS, `node --test`.

**스펙:** `docs/superpowers/specs/2026-06-10-blog-evidence-references-design.md`

**커밋 정책:** 이 프로젝트는 main 에서 작업하고 커밋은 "업데이트 하자" 워크플로우로 일괄한다. 따라서 각 태스크의 체크포인트는 **테스트/빌드/tsc green** 이며 per-task `git commit` 은 생략한다(실행 시 subagent 에도 커밋 생략 지시).

---

## 파일 구조

**신규**
- `v4/scripts/migrations/049_blog_references.sql` — `marketing_articles.blog_references` JSONB 컬럼
- `ai-server/src/services/evidenceMatch.ts` — 순수: `cosineSim`, `selectReferences` + 타입 `ScoredPaper`/`BlogReference`
- `ai-server/__tests__/evidenceMatch.test.mjs` — 순수 함수 단위테스트
- `ai-server/scripts/attach-references.mjs` — 배치 매처 (오케스트레이터)
- `v4/src/features/marketing/components/content/BlogReferencesPanel.tsx` — 스튜디오 큐레이션 패널
- `v4/scripts/test/blog-references.test.mjs` — `renderReferencesHtml` 단위테스트

**수정**
- `v4/src/features/marketing/types.ts` — `BlogReference` 인터페이스 + `MarketingArticle.blogReferences`
- `v4/src/features/marketing/services/marketingArticleService.ts` — `saveBlogReferences` + `searchEvidencePapers` + row 매핑
- `v4/src/features/marketing/components/content/BlogWizard.tsx` — step 3 에 패널 렌더
- `v4/scripts/lib/blog.mjs` — `renderReferencesHtml` + `renderPost` 가 `references_html` 주입
- `v4/i18n/template/blog-post.html` — `{{post.references_html}}` 슬롯 + CSS

---

## Chunk 1: 저장 + 매처 (ai-server)

> **전제조건 (매처 Tasks 4–6):** `GEMINI_API_KEY` 가 살아있어야 함 — dry-run 도 점수 계산 전에 쿼리 텍스트를 임베딩하므로 키 필요(키 없으면 모든 토픽이 `embed fail`→`continue`, `papers with embedding: 281/281` 커버리지 라인만 출력). **✅ 이번 세션에서 새 키로 교체·검증 완료**(임베딩 백필 281/281 성공) — 지금 동작함. (CLAUDE.md/memory 의 "Gemini 키 만료" 표기는 백필 이전 상태로, "업데이트 하자" 시 갱신 예정.) Tasks 1–3, 7–12(마이그레이션·순수함수·UI·렌더·테스트)는 키와 무관하게 실행 가능.

### Task 1: migration 049 — blog_references 컬럼

**Files:**
- Create: `v4/scripts/migrations/049_blog_references.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 049_blog_references.sql — 블로그 근거 논문 인용 (아티클 단위 스냅샷). Dashboard(txirmof) 수동 적용.
-- marketing_articles RLS 는 기존 정책(anon/authenticated all)으로 충분 — 신규 정책 불필요.
alter table marketing_articles
  add column if not exists blog_references jsonb not null default '[]'::jsonb;
```

- [ ] **Step 2: 사용자에게 Dashboard 수동 적용 요청 (human gate)**

migration 048 과 동일하게 Supabase MCP 가 txirmof 미접근 → 사용자가 Dashboard SQL Editor 에 붙여넣어 실행. **이 단계가 끝나기 전에는 Task 5/6(매처 실 적재) 진행 불가.** dry-run(Task 5 전반부)·단위테스트는 적용 전에도 가능.

### Task 2: evidenceMatch 순수 함수 — 실패 테스트 먼저

**Files:**
- Create: `ai-server/__tests__/evidenceMatch.test.mjs`
- Test 대상(아직 없음): `ai-server/src/services/evidenceMatch.ts` → `dist/services/evidenceMatch.js`

- [ ] **Step 1: 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSim, selectReferences } from '../dist/services/evidenceMatch.js';

test('cosineSim: identical=1, orthogonal=0, colinear=1, empty/mismatch=0', () => {
  assert.equal(cosineSim([1, 0], [1, 0]), 1);
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 2, 3], [2, 4, 6]).toFixed(4), '1.0000');
  assert.equal(cosineSim([], []), 0);
  assert.equal(cosineSim([1, 2], [1]), 0);
});

test('selectReferences: threshold filter + desc sort + topN cap + sim→similarity', () => {
  const scored = [
    { pmid: 'a', title: 'A', journal: 'J', year: 2020, doi: null, url: 'u', sim: 0.60 },
    { pmid: 'b', title: 'B', journal: 'J', year: 2021, doi: 'd', url: 'u', sim: 0.90 },
    { pmid: 'c', title: 'C', journal: 'J', year: 2019, doi: null, url: 'u', sim: 0.75 },
    { pmid: 'd', title: 'D', journal: 'J', year: 2018, doi: null, url: 'u', sim: 0.80 },
  ];
  const out = selectReferences(scored, { threshold: 0.72, topN: 2 });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((r) => r.pmid), ['b', 'd']);
  assert.equal(out[0].similarity, 0.9);
  assert.ok(!('sim' in out[0]));
});

test('selectReferences: empty when none meet threshold', () => {
  const scored = [{ pmid: 'a', title: 'A', journal: 'J', year: 2020, doi: null, url: 'u', sim: 0.5 }];
  assert.deepEqual(selectReferences(scored, { threshold: 0.72, topN: 5 }), []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd ai-server && npm run build && node --test __tests__/evidenceMatch.test.mjs`
Expected: FAIL — `Cannot find module '../dist/services/evidenceMatch.js'` (또는 build 에서 미존재).

### Task 3: evidenceMatch 구현 → 통과

**Files:**
- Create: `ai-server/src/services/evidenceMatch.ts`

- [ ] **Step 1: 구현 작성**

```ts
// ai-server/src/services/evidenceMatch.ts
// 블로그 근거 논문 매칭의 순수 로직 — 임베딩·DB 를 모른다(정렬·필터·슬라이스·필드 리네임만).

export interface ScoredPaper {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;
  sim: number;
}

export interface BlogReference {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;
  similarity: number;
}

/** 코사인 유사도. 빈 배열·길이 불일치는 0. */
export function cosineSim(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** sim 내림차순 → threshold 이상 → 상위 topN → BlogReference 매핑(sim→similarity). */
export function selectReferences(
  scored: ScoredPaper[],
  opts: { threshold: number; topN: number },
): BlogReference[] {
  const { threshold, topN } = opts;
  return [...scored]
    .filter((s) => s.sim >= threshold)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topN)
    .map((s) => ({
      pmid: s.pmid, title: s.title, journal: s.journal, year: s.year,
      doi: s.doi, url: s.url, similarity: Number(s.sim.toFixed(4)),
    }));
}
```

- [ ] **Step 2: 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/evidenceMatch.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 3: 전체 테스트 회귀 확인**

Run: `cd ai-server && npm test`
Expected: 기존 테스트 + 신규 3 전부 PASS.

### Task 4: 배치 매처 스크립트

**Files:**
- Create: `ai-server/scripts/attach-references.mjs`

- [ ] **Step 1: 스크립트 작성**

```js
// ai-server/scripts/attach-references.mjs
// evidence_papers(임베딩) ↔ marketing_articles 블로그를 의미매칭해 blog_references 스냅샷 저장.
//   - 토픽별 en(또는 ko) 블로그 대표텍스트 임베딩 → 코사인 → sim>=threshold top-N.
//   - 기본은 blog_references 비어있는 토픽만 채움(수동편집 보존). --force 로 덮어씀.
//   - embedding IS NOT NULL 만 로드 + 커버리지 검증(< 95% 면 --allow-partial 없이는 abort).
// 사용: node scripts/attach-references.mjs [--dry-run] [--force] [--threshold 0.72] [--top 5] [--only <sort_order>] [--allow-partial]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { cosineSim, selectReferences } from '../dist/services/evidenceMatch.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FORCE = args.includes('--force');
const ALLOW_PARTIAL = args.includes('--allow-partial');
function argVal(name){ const eq=args.find(a=>a.startsWith(`${name}=`)); if(eq) return eq.split('=')[1]; const i=args.indexOf(name); return (i>=0&&args[i+1]&&!args[i+1].startsWith('--'))?args[i+1]:''; }
const THRESHOLD = Number(argVal('--threshold')) || 0.72;
const TOP_N = Number(argVal('--top')) || 5;
const ONLY = argVal('--only');
const EXPECTED_PAPERS = 281;

let _embedText = null;
async function getEmbed(){ if(!_embedText){ _embedText=(await import('../dist/services/gemini.js')).embedText; } return _embedText; }
function toVec(v){ return Array.isArray(v) ? v : JSON.parse(v); } // pgvector → string|array
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

// en(없으면 ko) 블로그 대표 텍스트: h1 + primary + secondary + 섹션 제목들.
function repText(blog){
  const pick = (blog && (blog.en || blog.ko)) || null;
  if (!pick) return '';
  const parts = [pick.h1, pick.primaryKeyword, ...(pick.secondaryKeywords||[]), ...((pick.sections||[]).map(s=>s.heading))];
  return parts.filter(Boolean).join(' \n ').trim();
}

async function main(){
  // 1) 논문 로드 (embedding IS NOT NULL) + 커버리지 검증
  const { data: papers, error: pErr } = await sb
    .from('evidence_papers').select('pmid,title,journal,year,doi,url,embedding').not('embedding','is',null);
  if (pErr){ console.error('papers fetch:', pErr.message); process.exit(1); }
  const corpus = papers.map(p=>({ ...p, vec: toVec(p.embedding) }));
  const cov = corpus.length / EXPECTED_PAPERS;
  console.log(`papers with embedding: ${corpus.length}/${EXPECTED_PAPERS} (${(cov*100).toFixed(0)}%)`);
  if (cov < 0.95 && !ALLOW_PARTIAL){ console.error('임베딩 커버리지 < 95% — 백필 미완 의심. --allow-partial 로 강행 가능.'); process.exit(1); }

  // 2) 아티클 로드
  const { data: arts, error: aErr } = await sb
    .from('marketing_articles').select('id,sort_order,blog,blog_references').order('sort_order');
  if (aErr){ console.error('articles fetch:', aErr.message); process.exit(1); }

  let processed=0, stored=0;
  for (const a of arts){
    if (ONLY && String(a.sort_order)!==String(ONLY)) continue;
    const existing = Array.isArray(a.blog_references) ? a.blog_references : [];
    if (existing.length && !FORCE) continue; // 수동편집 보존
    const text = repText(a.blog);
    if (!text){ console.warn(`#${a.sort_order}: en/ko 블로그 없음 — skip`); continue; }
    processed++;
    let qv;
    try { const ef = await getEmbed(); qv = await ef(text); }
    catch(e){ console.warn(`#${a.sort_order} embed fail: ${e.message}`); continue; }
    const scored = corpus.map(p=>({ pmid:p.pmid, title:p.title, journal:p.journal, year:p.year, doi:p.doi, url:p.url, sim: cosineSim(qv, p.vec) }));
    const refs = selectReferences(scored, { threshold: THRESHOLD, topN: TOP_N });

    if (DRY){
      const top = [...scored].sort((x,y)=>y.sim-x.sim).slice(0,8);
      console.log(`\n#${a.sort_order} (선택 ${refs.length} @≥${THRESHOLD}) 상위8:`);
      for (const s of top) console.log(`   ${s.sim.toFixed(3)} | ${(s.title||'').slice(0,66)}`);
      continue;
    }
    const { error: uErr } = await sb.from('marketing_articles')
      .update({ blog_references: refs, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (uErr) console.warn(`#${a.sort_order} update fail: ${uErr.message}`);
    else { stored++; console.log(`#${a.sort_order}: ${refs.length} refs`); }
    await sleep(400);
  }
  console.log(`\ndone. processed=${processed} stored=${stored} dry=${DRY}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
```

- [ ] **Step 2: 단일 토픽 dry-run smoke (migration 적용 전이라도 실행 가능 — 점수만 출력)**

Run: `cd ai-server && npm run build && node scripts/attach-references.mjs --dry-run --only 1`
Expected: `papers with embedding: 281/281 (100%)` + `#1 ... 상위8:` 점수 리스트 출력, write 없음. (커버리지 100% 확인 = 백필 정상.)

### Task 5: 임계값 캘리브레이션 (dry-run 전체)

- [ ] **Step 1: 전체 dry-run 으로 점수 분포 확인**

Run: `cd ai-server && node scripts/attach-references.mjs --dry-run`
62토픽 각 상위8 점수를 콘솔에서 확인(긴 출력은 터미널 스크롤백 또는 임시 gitignore 위치로 리다이렉트 — tracked 디렉토리엔 쓰지 말 것).

- [ ] **Step 2: 임계값 판단**

각 토픽 상위 점수대를 보고 `--threshold`(기본 0.72)·`--top`(기본 5)를 확정. 판단 기준:
- 대부분 토픽에서 명백히 관련된 논문이 컷되면 임계값을 낮추고(예 0.68), 느슨한 매칭이 다수 통과하면 높인다(예 0.76).
- ⚠️ `--threshold 0` 은 falsy 라 기본 0.72 로 떨어짐(0 으로 끄려면 코드상 의도 아님 — 정상). 결정과 근거를 **본 플랜의 DoD 노트**(맨 아래)에 한 줄 기록.

### Task 6: 실 적재 (migration 049 적용 후)

> ⚠️ Task 1 Step 2(Dashboard 적용)가 끝난 뒤에만.

- [ ] **Step 1: 실 적재**

Run: `cd ai-server && node scripts/attach-references.mjs --threshold <확정값> --top <확정값>`
Expected: `#N: K refs` 라인들 + `done. processed=62 stored=~62`. (blog_references 비어있던 토픽만 채워짐.)

- [ ] **Step 2: 적재 검증**

Run: `cd ai-server && node scripts/attach-references.mjs --dry-run --only 1`
또는 임시 점검 스크립트로 `marketing_articles` 중 `blog_references` 길이>0 개수 확인.
Expected: 대부분 토픽이 1~5 refs 보유. 몇 토픽 eyeball 해 관련성 타당.

---

## Chunk 2: 스튜디오 큐레이션 UI (v4)

### Task 7: 타입 + 서비스 — BlogReference

**Files:**
- Modify: `v4/src/features/marketing/types.ts`
- Modify: `v4/src/features/marketing/services/marketingArticleService.ts`

- [ ] **Step 1: 타입 추가 (`types.ts`)**

`MarketingArticle` 인터페이스의 `reels: ReelsMap;` 줄 다음에 추가:

```ts
  blogReferences: BlogReference[]; // 블로그 근거 논문 (migration 049), 아티클 단위·언어 독립
```

그리고 `BlogSeoMap` 타입 정의(`export type BlogSeoMap = ...`) 아래에 추가:

```ts
// ── 블로그 근거 논문 (migration 049) ─────────────────────────────────────────
// 아티클 단위(언어 독립) 인용 스냅샷. 매처가 자동 채우고 스튜디오에서 수동 편집.
export interface BlogReference {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;       // PubMed link
  similarity: number; // 0~1 (매칭 점수, 배지·정렬용; 수동 추가는 1)
}
```

- [ ] **Step 2: 서비스 매핑 + 메서드 (`marketingArticleService.ts`)**

import 에 `BlogReference` 추가:
```ts
import type { MarketingArticle, ArticleStatus, ArticleTranslation, BlogSeoMap, ReelsMap, BlogReference } from '../types';
```

`rowToArticle` 의 `reels:` 줄 다음에:
```ts
    blogReferences: (r.blog_references as BlogReference[]) ?? [],
```

`articleToRow` 의 reels 스프레드 줄 다음에:
```ts
    ...(a.blogReferences !== undefined ? { blog_references: a.blogReferences } : {}),
```

파일 끝(EOF — `generateBlogSeoBody` 함수 뒤, 모듈 스코프라 순서 무관)에 신규 메서드 2개:
```ts
/** Partial update of just blog_references (migration 049) — article-level, language-independent. */
export async function saveBlogReferences(id: string, refs: BlogReference[]): Promise<void> {
  const { error } = await supabase
    .from('marketing_articles')
    .update({ blog_references: refs, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** evidence_papers 제목 검색(수동 추가용). anon SELECT 허용(정책 evidence_all). */
export async function searchEvidencePapers(term: string): Promise<BlogReference[]> {
  const t = term.trim();
  if (!t) return [];
  const { data, error } = await supabase
    .from('evidence_papers')
    .select('pmid,title,journal,year,doi,url')
    .ilike('title', `%${t}%`)
    .limit(10);
  if (error) { logger.warn('[marketing] searchEvidencePapers failed:', error.message); return []; }
  return (data ?? []).map((r) => ({
    pmid: (r.pmid as string) ?? '', title: (r.title as string) ?? '', journal: (r.journal as string) ?? '',
    year: (r.year as number | null) ?? null, doi: (r.doi as string | null) ?? null,
    url: (r.url as string) ?? '', similarity: 1,
  }));
}
```

- [ ] **Step 3: tsc 확인**

Run: `cd v4 && npx tsc --noEmit`
Expected: 0 errors.

### Task 8: BlogReferencesPanel 컴포넌트

**Files:**
- Create: `v4/src/features/marketing/components/content/BlogReferencesPanel.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/marketing/components/content/BlogReferencesPanel.tsx
// 블로그 근거 논문 패널 — 아티클 단위(전 언어 공통, migration 049).
// 매처가 자동 채운 blog_references 를 표시 + 수동 제거/순서변경/검색추가.
// 부모(BlogWizard)에서 key={article.id} 로 글 전환 시 remount(상태 시드).
import { useState } from 'react';
import type { BlogReference } from '../../types';
import { saveBlogReferences, searchEvidencePapers } from '../../services/marketingArticleService';

export function BlogReferencesPanel({ articleId, initial }: { articleId: string; initial: BlogReference[] }) {
  const [refs, setRefs] = useState<BlogReference[]>(initial ?? []);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<BlogReference[]>([]);
  const [searching, setSearching] = useState(false);

  const persist = async (next: BlogReference[]) => {
    setRefs(next); setErr(null);
    try { await saveBlogReferences(articleId, next); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    catch (e) { setErr(e instanceof Error ? e.message : '저장 실패'); }
  };
  const remove = (pmid: string) => persist(refs.filter((r) => r.pmid !== pmid));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= refs.length) return;
    const next = [...refs]; const [m] = next.splice(from, 1); next.splice(to, 0, m); void persist(next);
  };
  const add = (r: BlogReference) => {
    if (refs.some((x) => x.pmid === r.pmid)) return;
    void persist([...refs, r]); setResults([]); setTerm('');
  };
  const search = async () => {
    setSearching(true);
    try { setResults(await searchEvidencePapers(term)); } finally { setSearching(false); }
  };

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold text-gray-800">📚 참고문헌 <span className="text-xs font-normal text-gray-400">(전 언어 공통)</span></h3>
        {saved && <span className="text-xs text-green-600">✓ 저장됨</span>}
        <span className="ml-auto text-xs text-gray-400">{refs.length}편</span>
      </div>
      {err && <div className="mb-2 text-xs text-red-600">{err}</div>}
      {refs.length === 0
        ? <p className="text-xs text-gray-400">아직 없음. 매처를 돌리거나 아래에서 검색해 추가하세요.</p>
        : <ol className="space-y-1">
            {refs.map((r, i) => (
              <li key={r.pmid} className="flex items-start gap-2 rounded bg-gray-50 px-2 py-1.5 text-xs">
                <span className="shrink-0 rounded bg-indigo-100 px-1 text-[10px] font-semibold text-indigo-700">{Math.round(r.similarity * 100)}%</span>
                <span className="flex-1">
                  <span className="font-medium text-gray-800">{r.title}</span>
                  <span className="text-gray-500"> — {r.journal}{r.year ? `, ${r.year}` : ''}</span>
                  {r.url && <a href={r.url} target="_blank" rel="noopener" className="ml-1 text-indigo-600 underline">PubMed↗</a>}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="text-gray-400 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === refs.length - 1} className="text-gray-400 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => remove(r.pmid)} className="text-red-400 hover:text-red-600">✕</button>
                </span>
              </li>
            ))}
          </ol>}
      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" value={term}
          onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
          placeholder="논문 제목으로 검색해 추가 (영문)" />
        <button type="button" onClick={() => void search()} disabled={searching || !term.trim()}
          className="rounded-md bg-gray-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
          {searching ? '검색 중…' : '검색'}</button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 rounded border border-gray-100 p-1">
          {results.map((r) => (
            <li key={r.pmid}>
              <button type="button" onClick={() => add(r)} className="w-full rounded px-2 py-1 text-left text-xs hover:bg-indigo-50">
                <span className="font-medium text-gray-800">{r.title}</span>
                <span className="text-gray-500"> — {r.journal}{r.year ? `, ${r.year}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: tsc 확인**

Run: `cd v4 && npx tsc --noEmit`
Expected: 0 errors (아직 미사용 export 경고 없음 — 컴포넌트는 export 라 OK).

### Task 9: BlogWizard step 3 에 패널 배선

**Files:**
- Modify: `v4/src/features/marketing/components/content/BlogWizard.tsx`

- [ ] **Step 1: import 추가**

`import { BlogSeoScorePanel } ...` 줄 다음에:
```tsx
import { BlogReferencesPanel } from './BlogReferencesPanel';
```

- [ ] **Step 2: step 3 div 끝에 패널 렌더 (article 단위라 cur 삼항 밖)**

`{step === 3 && (` 블록에서 `cur ? (...) : <p ...>구조를 먼저 만드세요.</p>}` 다음, step3 `</div>` 직전에 추가:
```tsx
            <BlogReferencesPanel key={article.id} articleId={article.id} initial={article.blogReferences} />
```
즉:
```tsx
            ) : <p className="text-sm text-gray-400">구조를 먼저 만드세요.</p>}
            <BlogReferencesPanel key={article.id} articleId={article.id} initial={article.blogReferences} />
          </div>
        )}
```

- [ ] **Step 3: tsc 확인**

Run: `cd v4 && npx tsc --noEmit`
Expected: 0 errors. (`article.blogReferences` 는 Task 7 에서 타입에 추가됨.)

---

## Chunk 3: 렌더 능력 (v4 i18n) — forward-looking, inert

### Task 10: renderReferencesHtml — 실패 테스트 먼저

**Files:**
- Create: `v4/scripts/test/blog-references.test.mjs`
- Test 대상: `v4/scripts/lib/blog.mjs` (아직 export 없음)

- [ ] **Step 1: 실패 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { renderReferencesHtml } from '../lib/blog.mjs';

test('renderReferencesHtml: 빈/undefined → 빈 문자열 (inert)', () => {
  assert.equal(renderReferencesHtml([], 'ko'), '');
  assert.equal(renderReferencesHtml(undefined, 'ko'), '');
});

test('renderReferencesHtml: 언어별 헤딩 + 항목 + 링크', () => {
  const refs = [{ pmid: '1', title: 'GH and height', journal: 'JCEM', year: 2020, doi: '10.1/x', url: 'https://pubmed.ncbi.nlm.nih.gov/1/', similarity: 0.8 }];
  const ko = renderReferencesHtml(refs, 'ko');
  assert.match(ko, /참고문헌/);
  assert.match(ko, /GH and height/);
  assert.match(ko, /JCEM\. 2020/);
  assert.match(ko, /pubmed\.ncbi\.nlm\.nih\.gov\/1\//);
  assert.match(ko, /doi\.org\/10\.1\/x/);
  assert.match(renderReferencesHtml(refs, 'th'), /เอกสารอ้างอิง/);
});

test('renderReferencesHtml: 미지원 lang → en 헤딩, HTML escape', () => {
  const refs = [{ pmid: '2', title: 'A & B <x>', journal: 'J', year: null, doi: null, url: '', similarity: 0.7 }];
  const out = renderReferencesHtml(refs, 'zz');
  assert.match(out, /References/);
  assert.match(out, /A &amp; B &lt;x&gt;/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && node --test scripts/test/blog-references.test.mjs`
Expected: FAIL — `renderReferencesHtml` is not a function / undefined import.

### Task 11: renderReferencesHtml 구현 + renderPost 주입 → 통과

**Files:**
- Modify: `v4/scripts/lib/blog.mjs`

- [ ] **Step 1: blog.mjs 상단(`formatDate` 함수 다음)에 헤딩맵·escape·렌더 함수 추가**

```js
const REF_HEADINGS = {
  ko: '참고문헌', en: 'References', th: 'เอกสารอ้างอิง',
  vi: 'Tài liệu tham khảo', ch: '參考文獻', cn: '参考文献',
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 아티클 단위 참고문헌 → <section> HTML. 빈 배열·undefined 면 '' (캐시 렌더 경로에서 inert).
export function renderReferencesHtml(references, lang) {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = REF_HEADINGS[lang] || REF_HEADINGS.en;
  const items = references.map((r) => {
    const cite = [escapeHtml(r.title), [escapeHtml(r.journal), r.year ? escapeHtml(r.year) : ''].filter(Boolean).join('. ')]
      .filter(Boolean).join(' ');
    const links = [];
    if (r.url) links.push(`<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
    if (r.doi) links.push(`<a href="https://doi.org/${escapeHtml(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
    const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
    return `<li>${cite}.${tail}</li>`;
  }).join('');
  return `<section class="post-references"><h2 class="post-references-title">${escapeHtml(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}
```

- [ ] **Step 2: `renderPost` 가 `references_html` 항상 주입**

`renderPost` 를 아래로 교체(키 누락 throw 방지 위해 항상 세팅; cached post 는 references 없어 ''):
```js
export function renderPost({ post, template, locale, messenger, seoHead }) {
  const lang = locale.meta.lang;
  const data = {
    ...locale,
    messenger,
    seo_head: seoHead,
    post: {
      ...post,
      published_at_display: formatDate(post.published_at, lang),
      references_html: renderReferencesHtml(post.references, lang),
    },
  };
  return render(template, data);
}
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `cd v4 && node --test scripts/test/blog-references.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 4: i18n 테스트 전체 회귀**

Run: `cd v4 && npm run test:i18n`
Expected: 기존 + 신규 전부 PASS (renderPost 변경이 기존 blog.test 깨지 않는지 확인).

### Task 12: 템플릿 슬롯 + CSS

**Files:**
- Modify: `v4/i18n/template/blog-post.html`

- [ ] **Step 1: `<style>` 블록에 references CSS 추가**

`.post-cta a { ... }` 규칙 다음 줄에:
```css
  .post-references { margin: 32px 0 0; padding-top: 20px; border-top: 1px solid var(--hairline); }
  .post-references-title { font-size: 18px; font-weight: 800; color: var(--ink); margin-bottom: 10px; }
  .post-references-list { font-size: 13px; line-height: 1.7; color: var(--muted); padding-left: 20px; }
  .post-references-list a { color: var(--ink); text-decoration: underline; }
```

- [ ] **Step 2: 본문과 CTA 사이에 슬롯 삽입**

`</article>` 다음, `<div class="post-cta">` 앞에:
```html
  {{post.references_html}}
```
즉:
```html
  </article>
  {{post.references_html}}
  <div class="post-cta">
```

- [ ] **Step 3: 빌드 스모크 (references 없는 캐시 글이 깨지지 않는지)**

Run: `cd v4 && npm run build:i18n`
Expected: 빌드 성공. (블로그 캐시 글이 있으면 `{{post.references_html}}` 가 ''로 치환돼 무변화. 없으면 블로그 skip 경고만.) `render.mjs` 의 missing-key throw 가 안 나야 함(renderPost 가 references_html 항상 세팅).

---

## DoD (Definition of Done)

- [x] migration 049 적용(txirmof Dashboard) — `marketing_articles.blog_references` 존재 (확인: dry-run select 정상)
- [x] `ai-server` 단위테스트 통과(`cosineSim`/`selectReferences`, 3개) + 전체 `npm test` **51/51** green
- [x] 매처 dry-run 점수 분포 확인 → **임계값 확정**: threshold=**0.66** / top=**5**. 근거: per-topic 최고점수 min0.641/median0.716/max0.842 (블로그→논문은 Q→논문보다 점수 낮음). 0.72=33토픽 빈칸(과빡), 0.66=1토픽만 빈칸·평균4.6편. 블로그 인용은 커버리지 우선(빈 References 섹션 회피) + within-topic 랭킹이 관련성 보장 + 정밀도는 스튜디오 큐레이션이 안전망 → 0.66 채택.
- [x] 매처 실 적재 완료 — `processed=62 stored=62`, **61/62 토픽**에 refs(평균 4.6편; #13만 0=best<0.66)
- [x] `v4` tsc 0 errors + `renderReferencesHtml` 테스트 3개 통과 + `build:i18n` 무회귀(blog.test renderPost ok). `test:i18n` 의 4 fail 은 **기존** TS-import(`.ts`) 구조 이슈(blogPublish/googleSeoScorer/publishRows/seoScorer, tsx 없는 러너), 본 변경 무관
- [x] 스튜디오 블로그 위저드 step 3 에 참고문헌 패널 배선(BlogWizard, article 단위·전 언어 공통, tsc 검증). 런타임 노출은 사용자 확인(preview 미사용 선호)

## 구현 노트 (실행 중 갱신)

- **threshold 캘리브레이션**: 블로그→논문 코사인이 Q→논문(0.78~0.85)보다 낮고 압축됨(per-topic 최고 min0.641/median0.716/max0.842). 0.72=33토픽 빈칸 → **0.66 채택**(61/62 토픽, 평균 4.6). dry-run 62토픽 점수표를 `$env:TEMP` 로 분석.
- **매처 dry-run 도 Gemini 키 필요**(점수계산 전 쿼리 임베딩 호출) — 세션 내 새 키로 동작 확인, 62토픽 embed fail 0.
- **실행 분담**: migration·`evidenceMatch`·UI·렌더는 subagent/직접 구현, 매처 실 적재(0.66/5)는 컨트롤러 실행. 전부 main, 커밋 batch(업데이트 하자).
- **`test:i18n` 4 fail = 기존 `.ts`-import 구조 이슈**(tsx 없는 러너) — 본 변경(.mjs/.html) 무관, 회귀 0. `renderReferencesHtml`·`renderPost` 테스트는 통과.
- **미해결(사소)**: evidence_papers 일부 제목에 미디코드 HTML 엔티티(`&#x2029;`) → 참고문헌 노출 시 escape 되어 literal. 데이터 정리 추후(공개 발행 전 여유).
- **신규 도구**: `attach-references.mjs`(재매칭 `--force`·`--threshold` 조정) 외 임베딩 백필 `backfill-embeddings.mjs`·검증 `validate-evidence-search.mjs`.
