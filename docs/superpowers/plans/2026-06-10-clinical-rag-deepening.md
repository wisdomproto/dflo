# 클리니컬 RAG 심화 (Phase 2 ③) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 처방추천 AI 가 검색된 논문의 **초록·핵심결론을 실제로 보고** 추천하게 하고, 281편에 한국어 요약을 생성해 의사에게 표시한다.

**Architecture:** (1) 배치로 `korean_summary`/`key_finding` 생성(순수 빌더+파서+스크립트). (2) `match_evidence_papers` RPC(migration 051)가 두 필드도 반환. (3) `buildRxPrompt` 가 초록(트렁케이트)+key_finding 주입. (4) `RxRecommendModal` 표시. 검색·라우트·UI 골격은 이미 존재 — 깊이만 추가.

**Tech Stack:** Node20 ESM, `@supabase/supabase-js`(txirmof service_role), Gemini(generateText), pgvector RPC, React 19 + TS, `node --test`.

**스펙:** `docs/superpowers/specs/2026-06-10-clinical-rag-deepening-design.md`

**커밋 정책:** main 작업 + 커밋은 "업데이트 하자"로 일괄. 각 태스크 체크포인트 = 테스트/빌드/tsc green, per-task `git commit` 생략(subagent 에도 지시).

---

## 파일 구조
**신규**
- `ai-server/src/services/evidenceSummary.ts` — 순수 `buildEvidenceSummaryPrompt` + `parseSummaryResponse` + 타입
- `ai-server/__tests__/evidenceSummary.test.mjs`
- `ai-server/scripts/backfill-summaries.mjs` — 배치 요약 생성
- `v4/scripts/migrations/051_evidence_match_rpc_summaries.sql` — RPC drop+recreate

**수정**
- `ai-server/src/services/rxRecommend.ts` — `RxPaperRef` + abstract?/key_finding?, buildRxPrompt 포맷
- `ai-server/src/services/knowledgeRetrieval.ts` — `KnowledgeResult.papers` 타입 +2필드
- `ai-server/src/routes/knowledge.ts` — references 에서 abstract strip
- `v4/src/features/hospital/services/clinicalRxService.ts` — `RxReference` +2필드
- `v4/src/features/hospital/components/RxRecommendModal.tsx` — key_finding/korean_summary 표시
- `ai-server/__tests__/rxRecommend.test.mjs` — **기존 파일**(2 테스트)에 buildRxPrompt 주입 테스트 3개 append

---

## Chunk 1: 논문 요약 생성 (ai-server)

### Task 1: evidenceSummary 순수 함수 — 실패 테스트 먼저

**Files:** Create `ai-server/__tests__/evidenceSummary.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceSummaryPrompt, parseSummaryResponse } from '../dist/services/evidenceSummary.js';

test('buildEvidenceSummaryPrompt embeds title+abstract and asks for the 2 JSON fields', () => {
  const p = buildEvidenceSummaryPrompt('GnRH agonist final height', 'We studied 100 girls...');
  assert.match(p, /GnRH agonist final height/);
  assert.match(p, /We studied 100 girls/);
  assert.match(p, /korean_summary/);
  assert.match(p, /key_finding/);
});

test('parseSummaryResponse: plain JSON', () => {
  assert.deepEqual(parseSummaryResponse('{"korean_summary":"요약","key_finding":"+4.5cm"}'),
    { korean_summary: '요약', key_finding: '+4.5cm' });
});

test('parseSummaryResponse: code-fence wrapped', () => {
  assert.deepEqual(parseSummaryResponse('```json\n{"korean_summary":"가","key_finding":"나"}\n```'),
    { korean_summary: '가', key_finding: '나' });
});

test('parseSummaryResponse: extracts JSON from surrounding prose', () => {
  assert.deepEqual(parseSummaryResponse('결과: {"korean_summary":"가","key_finding":"나"} 끝'),
    { korean_summary: '가', key_finding: '나' });
});

test('parseSummaryResponse: throws on garbage or missing field', () => {
  assert.throws(() => parseSummaryResponse('no json'));
  assert.throws(() => parseSummaryResponse('{"korean_summary":"only"}'));
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd ai-server && npm run build && node --test __tests__/evidenceSummary.test.mjs` → FAIL(module 없음).

### Task 2: evidenceSummary 구현 → 통과

**Files:** Create `ai-server/src/services/evidenceSummary.ts`

- [ ] **Step 1: 구현**

```ts
// ai-server/src/services/evidenceSummary.ts
// 논문 초록 → 한국어 요약/핵심결론 생성용 순수 프롬프트 빌더 + 응답 파서.

export interface EvidenceSummary {
  korean_summary: string;
  key_finding: string;
}

/** 제목+초록 → Gemini 에 JSON {korean_summary, key_finding} 요청하는 프롬프트. */
export function buildEvidenceSummaryPrompt(title: string, abstract: string): string {
  return `다음은 소아 성장·내분비 분야 국제 학술 논문이다. 소아 성장클리닉 원장이 빠르게 참고할 수 있게 한국어로 요약하라.

## 제목
${title}

## 초록
${abstract}

## 규칙
- 초록에 적힌 사실만. 없는 수치·결론을 지어내지 말 것(초록에 수치 없으면 정성적으로).
- korean_summary: 이 논문이 무엇을 보고 무엇을 밝혔는지 한국어 1~2문장(의사 관점).
- key_finding: 임상에 가장 중요한 결론 한 줄. 효과크기·수치(예 "+4.5cm", "OR 2.1")가 있으면 반드시 포함.

반드시 아래 JSON 만 반환(다른 말 금지):
{
  "korean_summary": "...",
  "key_finding": "..."
}`;
}

/** Gemini 응답(코드펜스/주변 텍스트 가능) → {korean_summary, key_finding}. 실패 시 throw. */
export function parseSummaryResponse(raw: string): EvidenceSummary {
  const cleaned = String(raw ?? '').trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('evidence summary: JSON parse 실패');
    parsed = JSON.parse(m[0]);
  }
  const o = parsed as Partial<EvidenceSummary>;
  if (!o.korean_summary || !o.key_finding) throw new Error('evidence summary: 필수 필드 누락');
  return { korean_summary: String(o.korean_summary), key_finding: String(o.key_finding) };
}
```

- [ ] **Step 2: 통과 확인** — Run: `cd ai-server && npm run build && node --test __tests__/evidenceSummary.test.mjs` → PASS(5).
- [ ] **Step 3: 회귀** — Run: `cd ai-server && npm test` → 기존+신규 전부 PASS.

### Task 3: 배치 요약 스크립트

**Files:** Create `ai-server/scripts/backfill-summaries.mjs`

- [ ] **Step 1: 작성**

```js
// ai-server/scripts/backfill-summaries.mjs
// evidence_papers 중 korean_summary 빈 + abstract 있는 행에 한국어 요약/핵심결론 생성.
//   - resume-safe(빈 행만), 700ms 페이싱 + 429 백오프. title-only(abstract 빈) 행 skip.
// 사용: node scripts/backfill-summaries.mjs [--dry-run] [--limit N]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { buildEvidenceSummaryPrompt, parseSummaryResponse } from '../dist/services/evidenceSummary.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
function argVal(name){ const eq=args.find(a=>a.startsWith(`${name}=`)); if(eq) return eq.split('=')[1]; const i=args.indexOf(name); return (i>=0&&args[i+1]&&!args[i+1].startsWith('--'))?args[i+1]:''; }
const LIMIT = Number(argVal('--limit')) || 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _gen = null;
async function getGen(){ if(!_gen){ _gen = (await import('../dist/services/gemini.js')).generateText; } return _gen; }

async function main(){
  // korean_summary 빈(null 또는 '') AND abstract 비어있지 않음
  let q = sb.from('evidence_papers').select('pmid,title,abstract')
    .or('korean_summary.is.null,korean_summary.eq.').neq('abstract', '').order('pmid');
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error){ console.error('fetch fail:', error.message); process.exit(1); }
  console.log(`korean_summary 빈 + abstract 있음: ${data.length} rows (LIMIT=${LIMIT||'none'})`);
  if (DRY){ for (const r of data.slice(0,10)) console.log(`  ${r.pmid} | ${(r.title||'').slice(0,60)}`); console.log('dry-run, no writes.'); return; }

  const gen = await getGen();
  let ok=0, fail=0;
  for (const r of data){
    let summary = null;
    for (let attempt=1; attempt<=4 && !summary; attempt++){
      try {
        const raw = await gen(buildEvidenceSummaryPrompt(r.title || '', r.abstract || ''));
        summary = parseSummaryResponse(raw);
      } catch(e){
        const msg = String(e.message||e);
        if ((msg.includes('429')||msg.includes('503')||msg.toLowerCase().includes('quota')) && attempt<4){
          console.warn(`  rate/transient ${r.pmid} (try ${attempt})`); await sleep(5000*attempt);
        } else { console.warn('gen/parse fail:', r.pmid, msg.slice(0,100)); break; }
      }
    }
    if (!summary){ fail++; continue; }
    const { error: uErr } = await sb.from('evidence_papers')
      .update({ korean_summary: summary.korean_summary, key_finding: summary.key_finding }).eq('pmid', r.pmid);
    if (uErr){ fail++; console.warn('update fail:', r.pmid, uErr.message); }
    else { ok++; if (ok%20===0) console.log(`  ...${ok}/${data.length}`); }
    await sleep(700);
  }
  console.log(`done. ok=${ok} fail=${fail} (of ${data.length})`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
```

- [ ] **Step 2: dry-run + 소량 검증** — Run: `cd ai-server && npm run build && node scripts/backfill-summaries.mjs --dry-run` (대상 행 수 출력). 이어 `node scripts/backfill-summaries.mjs --limit 3` → 3편 생성 → DB 에서 korean_summary/key_finding 채워졌는지 + 한국어 품질 eyeball(수치 포함 여부).

### Task 4: 전체 요약 적재

- [ ] **Step 1: 전체 실행** — Run: `cd ai-server && node scripts/backfill-summaries.mjs` (백그라운드 권장, ~270편 × 0.7s+지연 ≈ 5~8분). Expected: `done. ok=~270 fail=낮음`. (abstract 빈 행은 대상서 제외.) 재실행 시 빈 행만 resume.

---

## Chunk 2: RAG 주입 + 검색 (ai-server)

### Task 5: migration 051 — RPC 가 요약 반환

**Files:** Create `v4/scripts/migrations/051_evidence_match_rpc_summaries.sql`

- [ ] **Step 1: 작성**

```sql
-- 051_evidence_match_rpc_summaries.sql — match_evidence_papers 가 korean_summary/key_finding 도 반환. Dashboard(txirmof) 수동 적용.
-- 반환 시그니처(OUT 컬럼) 변경 → create or replace 불가 → drop 후 재생성.
drop function if exists match_evidence_papers(vector, int);
create or replace function match_evidence_papers(query_embedding vector(768), k int default 5)
returns table (id uuid, pmid text, title text, abstract text, journal text, year int, url text,
               pop_group text, pop_confidence text, korean_summary text, key_finding text, similarity float)
language sql stable as $$
  select e.id, e.pmid, e.title, e.abstract, e.journal, e.year, e.url, e.pop_group, e.pop_confidence,
         e.korean_summary, e.key_finding, 1 - (e.embedding <=> query_embedding) as similarity
  from evidence_papers e where e.embedding is not null
  order by e.embedding <=> query_embedding limit k;
$$;
```

- [ ] **Step 2: 사용자 Dashboard 수동 적용 (human gate)** — Supabase MCP 가 txirmof 미접근 → 사용자가 SQL Editor 실행. **이게 끝나야 rx-recommend 가 요약 반환**(Task 8 end-to-end 검증 전제). 코드 태스크(6·7)·단위테스트는 적용 전에도 가능.

### Task 6: knowledgeRetrieval 타입 확장

**Files:** Modify `ai-server/src/services/knowledgeRetrieval.ts`

- [ ] **Step 1: `KnowledgeResult.papers` 타입에 2필드 추가**

이 줄:
```ts
  papers: Array<{ pmid: string; title: string; abstract: string; journal: string; year: number | null; url: string; pop_group: string; pop_confidence: string; similarity: number }>;
```
을 아래로 교체(`korean_summary`·`key_finding` 추가, similarity 앞):
```ts
  papers: Array<{ pmid: string; title: string; abstract: string; journal: string; year: number | null; url: string; pop_group: string; pop_confidence: string; korean_summary: string; key_finding: string; similarity: number }>;
```
(런타임 변화 없음 — RPC 행을 그대로 통과. RPC(051) 적용 후 값이 채워짐.)

- [ ] **Step 2: 빌드** — Run: `cd ai-server && npm run build` → 0 errors.

### Task 7: buildRxPrompt 주입 — 실패 테스트 먼저

**Files:** Modify(append) `ai-server/__tests__/rxRecommend.test.mjs`, Modify `ai-server/src/services/rxRecommend.ts`

- [ ] **Step 1: 실패 테스트 append** — 이 파일은 **이미 존재**(import + 기존 2 테스트 `const input`). 파일 **끝에 아래를 append**(import/test/assert/buildRxPrompt 재선언 금지 — 이미 import 됨; `const base` 는 기존 `input` 과 충돌 없음):

```js

const base = { profile: '10세 남아', labText: '검사', cohortMeds: ['성장호르몬'] };

test('buildRxPrompt injects abstract(트렁케이트 600) + key_finding when present', () => {
  const p = buildRxPrompt({ ...base, papers: [{ title: 'T', journal: 'JCEM', year: 2020, pop_group: 'east_asian', key_finding: '+4.5cm', abstract: 'A'.repeat(800) }] });
  assert.match(p, /\[1\] T \(JCEM 2020\)/);
  assert.match(p, /핵심: \+4\.5cm/);
  const m = p.match(/초록: (A+)/);
  assert.ok(m && m[1].length === 600);
});

test('buildRxPrompt falls back to one-line when no abstract/key_finding', () => {
  const p = buildRxPrompt({ ...base, papers: [{ title: 'T2', journal: 'J', year: 2019 }] });
  assert.match(p, /\[1\] T2 \(J 2019\)/);
  assert.ok(!p.includes('핵심:') && !p.includes('초록:'));
});

test('buildRxPrompt: no papers → 관련 논문 없음', () => {
  assert.match(buildRxPrompt({ ...base, papers: [] }), /관련 논문 없음/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd ai-server && npm run build && node --test __tests__/rxRecommend.test.mjs` → **신규 주입 테스트 FAIL**(현재 buildRxPrompt 가 핵심/초록 미주입), 기존 2개 + fallback/no-papers 는 PASS.

- [ ] **Step 3: rxRecommend.ts 수정**

`RxPaperRef` 를 교체(abstract·key_finding 추가):
```ts
export interface RxPaperRef { title: string; journal?: string; year?: number | null; url?: string; pop_group?: string; abstract?: string; key_finding?: string; }
```
`buildRxPrompt` 의 `const papers = ...` 블록을 교체:
```ts
  const papers = i.papers.length
    ? i.papers.map((p, n) => {
        const head = `[${n + 1}] ${p.title} (${p.journal ?? ''} ${p.year ?? ''})${p.pop_group ? ` · 인구:${p.pop_group}` : ''}`;
        const kf = p.key_finding ? `\n   핵심: ${p.key_finding}` : '';
        const ab = p.abstract ? `\n   초록: ${p.abstract.slice(0, 600)}` : '';
        return head + kf + ab;
      }).join('\n')
    : '(관련 논문 없음)';
```
(라우트는 변경 불필요 — `KnowledgeResult.papers`(추가 필드 포함)가 `RxPaperRef[]` 에 구조적으로 할당 가능. abstract/key_finding 은 옵셔널이라 값 있으면 주입.)

- [ ] **Step 4: 통과 + 회귀** — Run: `cd ai-server && npm run build && node --test __tests__/rxRecommend.test.mjs` → PASS(3). 이어 `npm test` → 전체 PASS. (전체 build 통과 = 라우트의 `buildRxPrompt({...papers})` 구조적 타이핑 가드 — 스펙 §8.)

### Task 8: references 페이로드에서 abstract strip

**Files:** Modify `ai-server/src/routes/knowledge.ts`

- [ ] **Step 1: rx-recommend 응답 수정**

이 줄(line ~66):
```ts
    res.json({ success: true, recommendation, references: papers });
```
을 교체(abstract 제거 — 프롬프트가 이미 소비·모달 미사용, korean_summary/key_finding 유지):
```ts
    const references = papers.map(({ abstract, ...rest }) => rest);
    res.json({ success: true, recommendation, references });
```

- [ ] **Step 2: 빌드** — Run: `cd ai-server && npm run build` → 0 errors.

---

## Chunk 3: 모달 표시 (v4)

### Task 9: RxReference 타입 + 모달 표시

**Files:** Modify `v4/src/features/hospital/services/clinicalRxService.ts`, `v4/src/features/hospital/components/RxRecommendModal.tsx`

- [ ] **Step 1: `RxReference` 타입에 2필드 (`clinicalRxService.ts`)**

`similarity?: number;` 줄 다음(인터페이스 닫기 전)에 추가:
```ts
  korean_summary?: string;
  key_finding?: string;
```

- [ ] **Step 2: 모달 표시 (`RxRecommendModal.tsx`)**

references 항목의 journal/year+popBadge 를 감싼 `<div className="mt-1 flex flex-wrap ...">...</div>`(popBadge 호출이 든 div) 가 닫히는 `</div>` 다음, `</li>` 앞에 추가:
```tsx
                      {ref.key_finding && (
                        <div className="mt-1.5 text-[12px] font-semibold text-indigo-700">💡 {ref.key_finding}</div>
                      )}
                      {ref.korean_summary && (
                        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{ref.korean_summary}</div>
                      )}
```

- [ ] **Step 3: tsc** — Run: `cd v4 && npx tsc --noEmit` → 0 errors.

---

## DoD
- [x] `ai-server` 단위테스트(evidenceSummary 5 + rxRecommend 3 append) + 전체 `npm test` **59/59** green
- [x] `backfill-summaries --limit 3` 품질 eyeball ✅(수치 정확: GnRH→최종키 +2.9cm 등). ⚠️ 전체 적재는 **19/281**(2.5-flash 일일 쿼터 RPD 소진) → **리셋 후 재실행**(resume-safe, 262 남음)
- [ ] migration 051 적용(txirmof Dashboard) — 사용자 대기
- [x] `ai-server npm run build` 0 + `v4 npx tsc --noEmit` 0
- [ ] end-to-end(사용자): migration+백필 후 rx-recommend → 모달 핵심결론·요약 노출 + 추천이 초록 근거 반영

## 구현 노트 (실행 중 갱신)
- ★**rate limit 교훈**: `generateText`(2.5-flash) 무료티어 RPM/RPD 가 `embedText`(임베딩)보다 훨씬 낮음(별개 쿼터). 700ms 페이싱 → 429 폭주, 빠른 4×재시도가 **일일 RPD 를 빠르게 소진**. 4000ms 로 늦춰도 그 시점엔 이미 고갈(전부 실패). → `--sleep`(기본 4000) + **서킷브레이커**(연속 6 fail 중단) 추가. **요약 19/281만** — 한도 리셋 후 `node scripts/backfill-summaries.mjs` 재실행.
- **rxRecommend.test.mjs 이미 존재**(2 테스트) → 플랜 리뷰서 Create→append 로 수정(import 재선언 X, `base`≠`input` 충돌 없음).
- **라우트 무변경 확인**: `KnowledgeResult.papers`(+2필드)→`RxPaperRef[]` 구조적 할당(변수라 excess props OK), `npm run build` 가 가드.
- **요약 품질 우수**: 3샘플 전부 한국어·의사관점·효과크기/수치(p값 포함) 정확.
