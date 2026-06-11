# 원장 저서 RAG 통합 (Book Knowledge RAG) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원장 저서 「우리 아이 키 성장 바이블」을 청크·임베딩해 `searchKnowledge`의 3번째 지식 소스(도서)로 추가하고, 처방추천이 원장 방침을 1차 기준으로 활용하게 한다.

**Architecture:** (1) Python으로 PDF 본문 추출→장 태그→~800자 청크(결정적, 생성 없음). (2) gemini-embedding-001로 임베딩해 신규 `knowledge_documents` 테이블 저장. (3) `searchKnowledge`에 3번째 병렬 RPC. (4) `buildRxPrompt`에 "원장님 진료 철학(저서)" 섹션 = 1차 권위.

**Tech Stack:** Python 3.13 + PyMuPDF(fitz), Node20 ESM, `@supabase/supabase-js`(txirmof service_role), Gemini embedding 768d, pgvector RPC, `node --test`.

**스펙:** `docs/superpowers/specs/2026-06-11-book-knowledge-rag-design.md`

**커밋 정책:** main 작업, 커밋은 "업데이트 하자"로 일괄. 각 태스크 체크포인트 = 테스트/빌드 green, per-task `git commit` 생략.

**저작권:** PDF(Drive)·`cases/book-chunks.json`(중간산출)은 repo 미커밋(gitignore). 커밋 = 스크립트·마이그레이션·코드만. DB 임베딩 청크 = 병원 자체 책을 병원 내부 도구에 적재(내부용).

---

## 파일 구조
**신규**
- `cases/extract_book.py` — PDF→청크 JSON (`chunk_text` 순수함수 + `extract` I/O)
- `cases/test_chunk.py` — `chunk_text` 단위테스트(plain assert)
- `ai-server/scripts/ingest-book.mjs` — chunks→임베딩→`knowledge_documents`
- `v4/scripts/migrations/056_knowledge_documents.sql` — 테이블 + RPC

**수정**
- `ai-server/src/services/knowledgeRetrieval.ts` — `KnowledgeResult.documents` + 3번째 RPC
- `ai-server/src/services/rxRecommend.ts` — `bookPassages` + 프롬프트 섹션·규칙
- `ai-server/src/routes/knowledge.ts` — documents 검색·전달
- `ai-server/__tests__/rxRecommend.test.mjs` — **기존 파일에 append**(bookPassages 테스트)
- `.gitignore` — `cases/book-chunks.json`

---

## Chunk 1: 추출 + 청킹 (Python)

### Task 1: `chunk_text` 순수함수 — 실패 테스트 먼저

**Files:** Create `cases/test_chunk.py` (imports from `cases/extract_book.py`, 미존재)

- [ ] **Step 1: 실패 테스트 작성**

```python
# cases/test_chunk.py — chunk_text 단위테스트 (plain assert, no pytest 의존)
from extract_book import chunk_text

assert chunk_text("") == [], "empty"
assert chunk_text("   ") == [], "whitespace"
assert chunk_text("한 문장입니다.") == ["한 문장입니다."], "short single"

long = " ".join([f"이것은 {i}번째 테스트 문장입니다." for i in range(100)])
cs = chunk_text(long, size=400, overlap=50)
assert len(cs) >= 3, f"expected >=3 chunks, got {len(cs)}"
assert all(c.strip() for c in cs), "no empty chunks"
assert all(len(c) <= 470 for c in cs), f"chunk too big: {max(len(c) for c in cs)}"
assert "0번째" in cs[0], "first sentence in first chunk"
assert "99번째" in cs[-1], "last sentence in last chunk"

print("chunk_text OK", len(cs), "chunks")
```

- [ ] **Step 2: 실패 확인** — Run: `cd cases && python test_chunk.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'extract_book'` (또는 ImportError).

### Task 2: `extract_book.py` 구현 → 통과

**Files:** Create `cases/extract_book.py`

- [ ] **Step 1: 구현**

```python
# cases/extract_book.py — 「우리 아이 키 성장 바이블」 PDF → 장 태그 청크 JSON.
#   chunk_text: 순수(테스트 대상). extract: PDF I/O. 생성(LLM) 없음.
# 사용: python extract_book.py "<PDF 경로>"  → cases/book-chunks.json
import sys, os, json, re

SOURCE = "우리 아이 키 성장 바이블"
AUTHOR = "채용현 (원장)"

def chunk_text(text, size=800, overlap=120):
    """문장 경계로 ~size 청크 분할, 인접 청크 끝 overlap 글자 carry. 순수함수."""
    text = (text or "").strip()
    if not text:
        return []
    sentences = re.split(r'(?<=[.!?。！？])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks, cur = [], ""
    for s in sentences:
        if cur and len(cur) + 1 + len(s) > size:
            chunks.append(cur)
            cur = (cur[-overlap:] + " " + s).strip() if overlap else s
        else:
            cur = (cur + " " + s).strip() if cur else s
    if cur:
        chunks.append(cur)
    return chunks

def clean_page(text):
    """선두 페이지번호 라인·러닝헤더('N장｜...') 제거."""
    out = []
    for ln in text.split("\n"):
        s = ln.strip()
        if re.fullmatch(r'\d{1,3}', s):       # 페이지번호
            continue
        if re.match(r'^\d+\s*장\s*[｜|]', s):  # 러닝헤더
            continue
        out.append(ln)
    return "\n".join(out)

def extract(pdf_path):
    import fitz
    doc = fitz.open(pdf_path)
    # 본문 p17~255 (0-based 16..254). 앞표지/일러두기·참고문헌·판권 제외.
    chapters, current_chapter, buf = [], "서장", []
    for i in range(16, min(255, doc.page_count)):
        raw = doc[i].get_text()
        if not raw.strip():
            continue
        hm = re.search(r'(\d+\s*장\s*[｜|][^\n]+)', raw)   # 러닝헤더로 현재 장 추적
        if hm:
            ch = re.sub(r'\s+', ' ', hm.group(1)).strip()
            if ch != current_chapter:
                if buf:
                    chapters.append((current_chapter, "\n".join(buf)))
                    buf = []
                current_chapter = ch
        text = clean_page(raw)
        if len(text.strip()) >= 40:           # 타이틀/근빈 페이지 skip
            buf.append(text)
    if buf:
        chapters.append((current_chapter, "\n".join(buf)))
    out, idx = [], 0
    for chapter, text in chapters:
        for ch in chunk_text(text):
            out.append({"source": SOURCE, "author": AUTHOR, "chapter": chapter,
                        "chunk_index": idx, "content": ch})
            idx += 1
    return out

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("usage: python extract_book.py <PDF 경로>"); sys.exit(1)
    chunks = extract(sys.argv[1])
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "book-chunks.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    # 장별 분포 출력 (검수용)
    from collections import Counter
    dist = Counter(c["chapter"] for c in chunks)
    print(f"extracted {len(chunks)} chunks → {dest}")
    for ch, n in dist.items():
        print(f"  {n:3d}  {ch[:40]}")
```

- [ ] **Step 2: 통과 확인** — Run: `cd cases && python test_chunk.py`
Expected: PASS — `chunk_text OK N chunks`.

### Task 3: 실제 추출 + 검수

- [ ] **Step 1: PDF 추출 실행** — Run (PDF 경로는 Drive; 따옴표 필수):
`cd cases && python extract_book.py "G:\.shortcut-targets-by-id\1ElOtLdhI0PGbxmcCeIAsffK1dGmlzswi\C_마케팅&미디어부\B_국내\ai프로세스 자료\책\우리 아이 키 성장 바이블_본문 인쇄용.pdf"`
Expected: `extracted ~200-250 chunks → .../book-chunks.json` + 장별 분포(6-7개 장, 각 수십 청크). **검수**: 장 태그가 "N장｜..." 형태로 맞는지, content에 페이지번호·러닝헤더 노이즈 없는지 `book-chunks.json` 앞 2-3개 청크 eyeball. 노이즈 있으면 `clean_page` 정규식 보정 후 재실행.

- [ ] **Step 2: `.gitignore`에 중간산출 추가**

`v4/.gitignore` 가 아닌 **루트 `.gitignore`**(repo 루트)에 추가:
```
cases/book-chunks.json
```
(없으면 루트 `.gitignore` 에 한 줄 추가. PDF는 Drive라 repo 밖 — 무관.)

---

## Chunk 2: 스토리지 + 임베딩

### Task 4: migration 056 — knowledge_documents

**Files:** Create `v4/scripts/migrations/056_knowledge_documents.sql`

- [ ] **Step 1: 작성**

```sql
-- 056_knowledge_documents.sql — 지식 문서(원장 저서 등) 청크 + pgvector. Dashboard(txirmof) 수동 적용.
create extension if not exists vector;
create table if not exists knowledge_documents (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default '',   -- '우리 아이 키 성장 바이블'
  author      text default '',            -- '채용현 (원장)'
  chapter     text default '',            -- 'N장｜제목'
  chunk_index int default 0,
  content     text not null default '',
  embedding   vector(768),
  created_at  timestamptz default now()
);
create index if not exists idx_knowdoc_source on knowledge_documents(source);
alter table knowledge_documents enable row level security;
drop policy if exists knowdoc_all on knowledge_documents;
create policy knowdoc_all on knowledge_documents for all to anon, authenticated using (true) with check (true);

create or replace function match_knowledge_documents(query_embedding vector(768), k int default 4)
returns table (id uuid, source text, author text, chapter text, content text, similarity float)
language sql stable as $$
  select d.id, d.source, d.author, d.chapter, d.content,
         1 - (d.embedding <=> query_embedding) as similarity
  from knowledge_documents d where d.embedding is not null
  order by d.embedding <=> query_embedding limit k;
$$;
```

- [ ] **Step 2: 사용자 Dashboard 수동 적용 (human gate)** — txirmof SQL Editor 실행. Task 5(적재)·Task 9(end-to-end) 전제. 코드 태스크는 적용 전에도 가능.

### Task 5: 임베딩 적재 스크립트

**Files:** Create `ai-server/scripts/ingest-book.mjs`

- [ ] **Step 1: 작성**

```js
// ai-server/scripts/ingest-book.mjs
// cases/book-chunks.json → embedText(gemini-embedding-001) → knowledge_documents.
//   - 재적재 안전: 같은 source 삭제 후 재삽입(책 1권). 임베딩 쿼터는 생성과 별개·여유.
// 사용: node scripts/ingest-book.mjs [book-chunks.json 경로] [--dry-run]
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const jsonArg = args.find(a => !a.startsWith('--'));
const jsonPath = jsonArg || new URL('../../cases/book-chunks.json', import.meta.url).pathname.replace(/^\//,'');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let _embed = null;
async function getEmbed(){ if(!_embed){ _embed = (await import('../dist/services/gemini.js')).embedText; } return _embed; }

async function main(){
  const chunks = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const source = chunks[0]?.source || '우리 아이 키 성장 바이블';
  console.log(`chunks: ${chunks.length} (source: ${source})`);
  if (DRY){ console.log('dry-run — no writes.'); return; }

  const { error: delErr } = await sb.from('knowledge_documents').delete().eq('source', source);
  if (delErr){ console.error('delete fail:', delErr.message); process.exit(1); }

  const embed = await getEmbed();
  let ok=0, fail=0;
  for (const c of chunks){
    let emb = null;
    for (let attempt=1; attempt<=4 && !emb; attempt++){
      try { emb = await embed(`${c.chapter}\n${c.content}`); }
      catch(e){ const m=String(e.message||e);
        if ((m.includes('429')||m.includes('503')) && attempt<4){ await sleep(5000*attempt); }
        else { console.warn('embed fail', c.chunk_index, m.slice(0,80)); break; } }
    }
    if (!emb){ fail++; continue; }
    const { error } = await sb.from('knowledge_documents').insert({
      source:c.source, author:c.author, chapter:c.chapter, chunk_index:c.chunk_index, content:c.content, embedding: emb });
    if (error){ fail++; console.warn('insert fail', c.chunk_index, error.message); }
    else { ok++; if (ok%20===0) console.log(`  ...${ok}/${chunks.length}`); }
    await sleep(700);
  }
  console.log(`done. inserted ${ok} fail ${fail} (of ${chunks.length})`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
```

- [ ] **Step 2: 적재 (migration 056 적용 후)** — Run: `cd ai-server && npm run build && node scripts/ingest-book.mjs --dry-run` (개수 확인) 후 `node scripts/ingest-book.mjs` (배경 권장, ~220청크 × ~1s ≈ 5분). Expected: `done. inserted ~220 fail ~0`. (`npm run build`는 dist/services/gemini.js 보장용.)

---

## Chunk 3: 검색 통합 + 처방추천 주입

### Task 6: knowledgeRetrieval — documents 3번째 소스

**Files:** Modify `ai-server/src/services/knowledgeRetrieval.ts`

- [ ] **Step 1: `KnowledgeResult`에 documents 추가**

`insights: Array<{ category: string; cohort_n: number; summary: string; composite_case: string; similarity: number }>;` 줄 다음(인터페이스 닫기 전)에 추가:
```ts
  documents: Array<{ id: string; source: string; author: string; chapter: string; content: string; similarity: number }>;
```

- [ ] **Step 2: searchKnowledge에 3번째 RPC + kDocuments**

함수 시그니처를 교체:
```ts
export async function searchKnowledge(query: string, opts: { kPapers?: number; kInsights?: number; kDocuments?: number } = {}): Promise<KnowledgeResult> {
```
`Promise.all([...])` 블록을 교체:
```ts
  const [pap, ins, doc] = await Promise.all([
    sb.rpc('match_evidence_papers', { query_embedding: emb, k: opts.kPapers ?? 5 }),
    sb.rpc('match_clinical_insights', { query_embedding: emb, k: opts.kInsights ?? 3 }),
    sb.rpc('match_knowledge_documents', { query_embedding: emb, k: opts.kDocuments ?? 4 }),
  ]);
  if (pap.error) console.warn('[knowledge] papers rpc:', pap.error.message);
  if (ins.error) console.warn('[knowledge] insights rpc:', ins.error.message);
  if (doc.error) console.warn('[knowledge] documents rpc:', doc.error.message);
  return { papers: pap.data ?? [], insights: ins.data ?? [], documents: doc.data ?? [] };
```

- [ ] **Step 3: 빌드** — Run: `cd ai-server && npm run build` → 0 errors.

### Task 7 (TDD): buildRxPrompt — 원장 저서 섹션

**Files:** Modify(append) `ai-server/__tests__/rxRecommend.test.mjs`, Modify `ai-server/src/services/rxRecommend.ts`

- [ ] **Step 1: 실패 테스트 append** — `rxRecommend.test.mjs` 는 **이미 존재**(import + `const input`/`const base` 테스트). 파일 **끝에 append**(import/test/assert/buildRxPrompt 재선언 X; `const bp` 신규):

```js

const bp = { profile: '11세 여아', labText: '검사', cohortMeds: ['성장호르몬'] };

test('buildRxPrompt injects 원장 저서 section when bookPassages present', () => {
  const p = buildRxPrompt({ ...bp, papers: [], bookPassages: [{ chapter: '3장｜성조숙증', content: '원장 방침 발췌입니다.' }] });
  assert.match(p, /## 원장님의 진료 철학·방침/);
  assert.match(p, /1차 기준/);
  assert.match(p, /3장｜성조숙증/);
  assert.match(p, /원장 방침 발췌입니다/);
});

test('buildRxPrompt omits 저서 section when no bookPassages', () => {
  const p = buildRxPrompt({ ...bp, papers: [] });
  assert.ok(!p.includes('## 원장님의 진료 철학·방침'));
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd ai-server && npm run build && node --test __tests__/rxRecommend.test.mjs` → 신규 첫 테스트 FAIL(섹션 미존재), 기존 + omit 테스트 PASS.

- [ ] **Step 3: rxRecommend.ts 수정**

`RxPromptInput` 인터페이스를 교체(`bookPassages?` 추가):
```ts
export interface RxPromptInput {
  profile: string;        // 환자 프로필 한 줄
  labText: string;        // 검사결과 텍스트 (피검사/알러지)
  cohortMeds: string[];   // legend 로 주석된 코호트 빈출 약물
  papers: RxPaperRef[];   // 근거 논문 (retrieval)
  bookPassages?: { chapter: string; content: string }[]; // 원장 저서 발췌 (1차 권위)
}
```
`buildRxPrompt` 안, `const papers = ...` 블록 **다음**에 추가:
```ts
  const book = i.bookPassages && i.bookPassages.length
    ? i.bookPassages.map((b) => `[${b.chapter}] ${b.content}`).join('\n\n')
    : '';
```
프롬프트 템플릿에서 이 줄:
```ts
## 근거 논문 (이 추천을 뒷받침; 본문에서 [번호]로 인용)
${papers}
```
을 교체(앞에 책 섹션 삽입):
```ts
${book ? `## 원장님의 진료 철학·방침 (저서 「우리 아이 키 성장 바이블」 — 이 클리닉의 1차 기준)
${book}

` : ''}## 근거 논문 (이 추천을 뒷받침; 본문에서 [번호]로 인용)
${papers}
```
그리고 규칙 블록 전체를 교체(책 우선 규칙을 1번으로, 나머지 renumber):
```ts
## 규칙
1. (위 "원장님의 진료 철학·방침" 발췌가 있으면) 그 접근·방침을 **1차 기준**으로 우선 따르고, 국제 논문은 이를 뒷받침하는 보조 근거로 쓴다.
2. 자율 처방 아님 — "원장 검토용 추천안", 최종 결정은 의사.
3. 각 추천에 검사 소견과의 임상 근거 + 가능하면 위 논문 [번호] 인용.
4. 수치 표준 관련 주장은 아시아 인구 근거 우선, 비아시아/인구불명 근거면 그 한계를 명시.
5. 신뢰도(높음/중간/낮음) + 향후 추적검사 계획.
6. 성장과 무관한 동반질환(예: ADHD 등 환자 요구사항)은 성장 레지멘에서 제외.
7. 한국어, 의사가 빠르게 훑게 구조화(마크다운).`;
```
(규칙 블록의 옛 `1.~6.` 와 닫는 백틱/세미콜론을 위 7줄 + `\`;` 로 교체.)

- [ ] **Step 4: 통과 + 회귀** — Run: `cd ai-server && npm run build && node --test __tests__/rxRecommend.test.mjs` → 전체 PASS. 이어 `npm test` → 전체 green(기존 papers 테스트 무회귀).

### Task 8: rx-recommend 라우트 — documents 검색·전달

**Files:** Modify `ai-server/src/routes/knowledge.ts`

- [ ] **Step 1: documents 검색 + bookPassages 전달**

이 블록(rx-recommend 핸들러 내):
```ts
    const { papers } = await searchKnowledge(`${profile} ${labText}`.slice(0, 1500), { kPapers: 5, kInsights: 0 });
    const prompt = buildRxPrompt({ profile, labText, cohortMeds, papers });
```
을 교체:
```ts
    const { papers, documents } = await searchKnowledge(`${profile} ${labText}`.slice(0, 1500), { kPapers: 5, kInsights: 0, kDocuments: 4 });
    const bookPassages = documents.map((d) => ({ chapter: d.chapter, content: d.content }));
    const prompt = buildRxPrompt({ profile, labText, cohortMeds, papers, bookPassages });
```
(이하 `references` strip·`res.json`은 그대로.)

- [ ] **Step 2: 빌드** — Run: `cd ai-server && npm run build` → 0 errors.

### Task 9: end-to-end 수동 검증 (migration 056 + 적재 후)

- [ ] **Step 1: 검색 회수 확인** — 임시 점검: `match_knowledge_documents` 에 샘플 쿼리("성조숙증 치료 방침", "성장호르몬 주사 vs 자연 성장" 등) 임베딩 → top-4 도서 청크가 주제에 맞는 장에서 회수되는지 eyeball. (또는 rx-recommend 호출 후 추천 본문이 원장 방침 톤 반영 + 도서 발췌 주입 확인.)

---

## DoD
- [x] `cases/test_chunk.py` 통과 + `extract_book.py` 추출 **227 청크 / 5개 장**(노이즈 0: 페이지번호·러닝헤더 잔류 0, content len 304~921=size+overlap 준수)
- [x] migration **056** 적용(txirmof Dashboard) — drop function 선행 추가(42P13 회피)
- [x] `ingest-book.mjs` 적재 — **inserted=227 fail=0**
- [x] `ai-server` 단위테스트(rxRecommend bookPassages 3개 append) + 전체 `npm test` **66/66 green** + `npm run build` 0
- [x] end-to-end: 4개 샘플 쿼리 전부 주제 장 정확 회수(sim 0.75~0.86)
- [x] `.gitignore` 에 `cases/book-chunks.json`

## 구현 노트 (편차·결정 기록)
- **migration 번호 056**: 052→053 으로 renumber했으나 원격 마케팅 세션이 053(ad_meta_ids)·054(ad_creatives)·055(articles_kind) 선점 → 내 파일 056_knowledge_documents.sql 로 재번호. SQL 내용 동일(파일명만).
- **RPC에 chunk_index 추가**(코드리뷰 I1): 이미 저장된 컬럼·Dashboard 수동적용이라 나중 추가는 재적용 왕복 → 지금 노출. `documents` TS 타입에도 `chunk_index: number` 반영. → 반환타입 변경이라 `drop function if exists match_knowledge_documents(vector, int);` 선행 필수(42P13, 사용자 적용 시 실제 발생).
- **추출 hardening**(코드리뷰): size 초과 단일문장 하드분할(목록·표 방어)·장헤더 `^`앵커+MULTILINE(본문 상호참조 오탐 방지) + 테스트에 긴문장 케이스 추가.
- **적재 hardening**(코드리뷰): delete 전 `getEmbed()`+existsSync preflight(빌드 누락 시 테이블 비우는 foot-gun 차단)·빈입력 가드·quota 백오프.
- **`/search` 라우트 kDocuments 대칭**(코드리뷰 I1): Task 6 파급으로 `/search`도 documents 반환 → kDocuments 패스스루+주석 갱신. 다중 발췌 join 테스트 추가.
- 환경결합(실제 PDF 추출·임베딩 적재)은 컨트롤러 직접 실행, 코드작성은 implementer 3청크×2단계리뷰.
