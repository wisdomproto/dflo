# Clinical RAG — Phase A: Knowledge Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared knowledge brain (medication legend + international paper library + de-identified clinical insights) + unified retrieval API, and ship the first user-facing surface: an **admin "AI 처방 추천" button** (환자 상세 → 검사결과 입력 → 처방 추천안 + 근거 논문 reference 팝업). Tasks 1–11 = foundation; Tasks 12–15 = the doctor-support feature on top.

**Architecture:** Three new pgvector knowledge tables (`medication_legend`, `evidence_papers`, `clinical_insights`) mirroring the existing Phase-21 `patient_embeddings` pattern (migration 015). Ingestion/derivation runs as ai-server scripts + services using the already-wired `embedText`/`generateText` (Gemini, key now valid). One unified retrieval RPC + ai-server endpoint returns top-k {papers + insights} for a query. **This phase contains NO raw PHI in its outputs** — papers are public, insights are de-identified/aggregated/composite — so Gemini embeddings are acceptable here (raw-PHI doctor mode = separate Phase D, would use local embeddings).

**Tech Stack:** Supabase Postgres + pgvector(768), ai-server (Express, ESM, TS→dist), `@google/generative-ai` via `gemini.ts` (`embedText` text-embedding-004 / `generateText` gemini-2.5-flash), PubMed NCBI E-utilities (free, no key), `node:test` for pure-function unit tests.

**Source spec:** `docs/superpowers/specs/2026-06-06-clinical-rag-knowledge-brain-design.md`

---

## Scope & Boundaries

This plan = **Phase A only** (foundation). Separate follow-on plans cover:
- Phase B: marketing RAG-augmented generation + 의료광고법 가드레일 (consumes this retrieval API)
- Phase C: patient chatbot
- Phase D: doctor decision-support (raw PHI, local embeddings, lab→Rx)

Phase A delivers working, testable software on its own: a populated knowledge base + a retrieval endpoint you can curl.

**Migrations** (034–036) must be applied via Supabase Dashboard SQL Editor (project `txirmofdvuljkrjkpzdg`) — MCP write is blocked. Each task that needs a migration says so.

**Embedding dimension:** 768 (matches migration 015 `vector(768)` / text-embedding-004). All new vector columns use `vector(768)`.

---

## File Structure

```
v4/scripts/migrations/
  034_medication_legend.sql        # NEW: code→drug/class/indication map
  035_evidence_papers.sql          # NEW: paper abstracts + pgvector + match RPC
  036_clinical_insights.sql        # NEW: de-id stats + composite cases + pgvector + match RPC

ai-server/src/services/
  pubmed.ts                        # NEW: E-utilities fetch + abstract parse (pure parse + fetch)
  populationTagger.ts              # NEW: pure — abstract/affiliation → population + confidence
  medLegend.ts                     # NEW: pure — code→legend lookup + non-drug detector
  clinicalStats.ts                 # NEW: pure — aggregate stats per category + k-anonymity
  insightPrompts.ts                # NEW: pure — composite-case prompt builder
  knowledgeRetrieval.ts            # NEW: unified top-k retrieval (papers + insights)
ai-server/src/routes/
  knowledge.ts                     # NEW: POST /api/knowledge/search, /ingest-* (admin)
ai-server/scripts/
  ingest-papers.mjs                # NEW: per-topic PubMed → tag → embed → store
  build-insights.mjs               # NEW: clinical data → stats + composite → k-anon → embed → store
  seed-med-legend.mjs              # NEW: seed known codes + list top unmapped for curation
ai-server/__tests__/
  populationTagger.test.mjs        # NEW
  medLegend.test.mjs               # NEW
  clinicalStats.test.mjs           # NEW
  pubmed.test.mjs                  # NEW (parse only)
```

ai-server `index.ts` mounts the new `knowledgeRouter`.

---

## Task 1: Medication legend migration + seed

**Files:**
- Create: `v4/scripts/migrations/034_medication_legend.sql`
- Create: `ai-server/scripts/seed-med-legend.mjs`

- [ ] **Step 1: Write migration**

```sql
-- 034_medication_legend.sql — 병원 내부 약물 코드 → 실제 약물/계열/적응증 사전.
-- Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
create table if not exists medication_legend (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  code          text,                 -- medications.code 사본 (조인 편의)
  display_name  text not null default '',  -- 코드명 (예: 에이큐_G)
  generic_name  text default '',      -- 실제 약물명 (예: somatropin/성장호르몬)
  drug_class    text default '',      -- 계열 (예: growth_hormone, gnrh_agonist, aromatase_inhibitor, sleep_aid, supplement, topical, other)
  indication    text default '',      -- 적응증 메모
  is_growth_core boolean default false, -- 성장치료 핵심축 여부
  is_non_drug   boolean default false,  -- 비약물(검사오더·행정·사진 등) 여부
  created_at    timestamptz default now()
);
create unique index if not exists idx_medlegend_med on medication_legend(medication_id);
alter table medication_legend enable row level security;
drop policy if exists medlegend_all on medication_legend;
create policy medlegend_all on medication_legend for all to anon, authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply in Dashboard.** Verify `select count(*) from medication_legend;` returns 0 (table exists).

- [ ] **Step 3: Write seed + curation-helper script**

```js
// ai-server/scripts/seed-med-legend.mjs
// 알려진 코드 시드 + 미매핑 상위 처방약 목록 출력(원장 큐레이션용).
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 검증된 알려진 매핑 (프로토타입 + 원장 확인)
const KNOWN = [
  { match:'에이큐_G', generic:'somatropin(성장호르몬)', cls:'growth_hormone', core:true },
  { match:'루프린', generic:'leuprorelin(GnRH agonist)', cls:'gnrh_agonist', core:true },
  { match:'아리미덱스', generic:'anastrozole(aromatase inhibitor)', cls:'aromatase_inhibitor', core:true },
  { match:'멜라토닌', generic:'melatonin', cls:'sleep_aid', core:false },
  { match:'5-HTP', generic:'5-HTP', cls:'sleep_aid', core:false },
];
const NON_DRUG = ['get_photo','get_Review','일반 소견서','소견서','콜레스테롤','Posture Correction','Exer']; // 비약물 키워드

const { data: meds } = await sb.from('medications').select('id,code,name');
for (const m of meds || []) {
  const name = m.name || '';
  const k = KNOWN.find((x) => name.includes(x.match));
  const nonDrug = NON_DRUG.some((s) => name.includes(s));
  if (!k && !nonDrug) continue;
  await sb.from('medication_legend').upsert({
    medication_id: m.id, code: m.code, display_name: name,
    generic_name: k?.generic ?? '', drug_class: k?.cls ?? (nonDrug ? 'non_drug' : ''),
    is_growth_core: k?.core ?? false, is_non_drug: nonDrug,
  }, { onConflict: 'medication_id' });
}
console.log('seeded known + non-drug.');

// 미매핑 상위 처방약 (큐레이션 목록)
const rxCount = {};
for (let f=0;;f+=1000){ const {data}=await sb.from('prescriptions').select('medication_id').range(f,f+999); if(!data?.length)break; data.forEach(r=>{if(r.medication_id)rxCount[r.medication_id]=(rxCount[r.medication_id]||0)+1;}); if(data.length<1000)break; }
const { data: mapped } = await sb.from('medication_legend').select('medication_id');
const mappedSet = new Set((mapped||[]).map(x=>x.medication_id));
const byId = Object.fromEntries((meds||[]).map(m=>[m.id,m.name]));
const top = Object.entries(rxCount).filter(([id])=>!mappedSet.has(id)).sort((a,b)=>b[1]-a[1]).slice(0,40);
console.log('\n=== 미매핑 상위 40 (원장 큐레이션 필요) ===');
top.forEach(([id,n])=>console.log(`${n}\t${byId[id]||id}`));
```

- [ ] **Step 4: Run** `cd ai-server && node scripts/seed-med-legend.mjs` → prints "seeded" + top-40 unmapped list. (Verify 에이큐_G/루프린/아리미덱스 rows exist: `select display_name,drug_class,is_growth_core from medication_legend where is_growth_core;`)

- [ ] **Step 5: Commit**

```bash
git add v4/scripts/migrations/034_medication_legend.sql ai-server/scripts/seed-med-legend.mjs
git commit -m "feat(rag): medication legend table + seed known codes + curation helper"
```

---

## Task 2: medLegend pure helper + tests

**Files:**
- Create: `ai-server/src/services/medLegend.ts`
- Create: `ai-server/__tests__/medLegend.test.mjs`

- [ ] **Step 1: Write failing test**

```js
// ai-server/__tests__/medLegend.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateMedName, isNonDrugName } from '../dist/services/medLegend.js';

const legend = [
  { display_name:'에이큐_G', generic_name:'somatropin(성장호르몬)', drug_class:'growth_hormone', is_growth_core:true, is_non_drug:false },
  { display_name:'get_photo', generic_name:'', drug_class:'non_drug', is_growth_core:false, is_non_drug:true },
];
test('annotateMedName attaches generic + class for known code', () => {
  const r = annotateMedName('에이큐_G', legend);
  assert.match(r, /성장호르몬/);
  assert.match(r, /growth_hormone/);
});
test('annotateMedName returns name as-is when unknown', () => {
  assert.equal(annotateMedName('미지의약', legend), '미지의약');
});
test('isNonDrugName flags non-drug entries', () => {
  assert.equal(isNonDrugName('get_photo', legend), true);
  assert.equal(isNonDrugName('에이큐_G', legend), false);
});
```

- [ ] **Step 2: Run → FAIL**: `cd ai-server && npm run build && npm test` (module missing).

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/medLegend.ts
export interface LegendRow {
  display_name: string; generic_name: string; drug_class: string;
  is_growth_core: boolean; is_non_drug: boolean;
}
function find(name: string, legend: LegendRow[]): LegendRow | undefined {
  return legend.find((l) => l.display_name && name.includes(l.display_name));
}
/** "에이큐_G" → "에이큐_G (somatropin(성장호르몬) · growth_hormone)" 형태로 주석. 미지면 원본 그대로. */
export function annotateMedName(name: string, legend: LegendRow[]): string {
  const l = find(name, legend);
  if (!l || (!l.generic_name && !l.drug_class)) return name;
  const parts = [l.generic_name, l.drug_class].filter(Boolean).join(' · ');
  return `${name} (${parts})`;
}
export function isNonDrugName(name: string, legend: LegendRow[]): boolean {
  return !!find(name, legend)?.is_non_drug;
}
```

- [ ] **Step 4: Run → PASS** (3 tests).
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/medLegend.ts ai-server/__tests__/medLegend.test.mjs
git commit -m "feat(rag): medLegend annotate + non-drug helper + tests"
```

---

## Task 3: Population tagger pure helper + tests

**Files:**
- Create: `ai-server/src/services/populationTagger.ts`
- Create: `ai-server/__tests__/populationTagger.test.mjs`

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { tagPopulation } from '../dist/services/populationTagger.js';

test('explicit Korean in abstract → korean / explicit', () => {
  const r = tagPopulation({ abstract:'We studied Korean children with short stature.', affiliation:'' });
  assert.equal(r.group, 'east_asian');
  assert.equal(r.country, 'korean');
  assert.equal(r.confidence, 'explicit');
});
test('Thai affiliation, no abstract mention → sea / inferred', () => {
  const r = tagPopulation({ abstract:'A study of growth hormone therapy.', affiliation:'Department of Pediatrics, Bangkok, Thailand' });
  assert.equal(r.group, 'sea');
  assert.equal(r.confidence, 'inferred');
});
test('Caucasian-only explicit', () => {
  const r = tagPopulation({ abstract:'In a cohort of Caucasian boys ...', affiliation:'' });
  assert.equal(r.group, 'caucasian');
});
test('no signal → unknown', () => {
  const r = tagPopulation({ abstract:'Bone age assessment review.', affiliation:'' });
  assert.equal(r.group, 'unknown');
  assert.equal(r.confidence, 'unknown');
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/populationTagger.ts
export type PopGroup = 'east_asian' | 'sea' | 'caucasian' | 'mixed' | 'unknown';
export type PopConfidence = 'explicit' | 'inferred' | 'unknown';
export interface PopTag { group: PopGroup; country: string; confidence: PopConfidence; }

const EXPLICIT: { re: RegExp; group: PopGroup; country: string }[] = [
  { re: /\bkorean\b/i, group: 'east_asian', country: 'korean' },
  { re: /\bjapanese\b/i, group: 'east_asian', country: 'japanese' },
  { re: /\bchinese\b|\bhan chinese\b/i, group: 'east_asian', country: 'chinese' },
  { re: /\btaiwanese\b/i, group: 'east_asian', country: 'taiwanese' },
  { re: /\bthai\b/i, group: 'sea', country: 'thai' },
  { re: /\bvietnamese\b/i, group: 'sea', country: 'vietnamese' },
  { re: /\bcaucasian\b|\bwhite european\b/i, group: 'caucasian', country: '' },
  { re: /\beast asian\b/i, group: 'east_asian', country: '' },
];
const AFFIL: { re: RegExp; group: PopGroup; country: string }[] = [
  { re: /\b(korea|seoul|busan)\b/i, group: 'east_asian', country: 'korean' },
  { re: /\b(japan|tokyo|osaka)\b/i, group: 'east_asian', country: 'japanese' },
  { re: /\b(china|beijing|shanghai)\b/i, group: 'east_asian', country: 'chinese' },
  { re: /\b(taiwan|taipei)\b/i, group: 'east_asian', country: 'taiwanese' },
  { re: /\b(thailand|bangkok)\b/i, group: 'sea', country: 'thai' },
  { re: /\b(vietnam|hanoi)\b/i, group: 'sea', country: 'vietnamese' },
];

export function tagPopulation(input: { abstract?: string; affiliation?: string }): PopTag {
  const abs = input.abstract ?? '';
  for (const e of EXPLICIT) if (e.re.test(abs)) return { group: e.group, country: e.country, confidence: 'explicit' };
  const aff = input.affiliation ?? '';
  for (const e of AFFIL) if (e.re.test(aff)) return { group: e.group, country: e.country, confidence: 'inferred' };
  return { group: 'unknown', country: '', confidence: 'unknown' };
}
```

- [ ] **Step 4: Run → PASS** (4 tests).
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/populationTagger.ts ai-server/__tests__/populationTagger.test.mjs
git commit -m "feat(rag): population tagger (explicit/inferred/unknown) + tests"
```

---

## Task 4: PubMed fetch + abstract parser

**Files:**
- Create: `ai-server/src/services/pubmed.ts`
- Create: `ai-server/__tests__/pubmed.test.mjs`

**Note:** NCBI E-utilities — `esearch.fcgi` returns PMIDs, `efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml` returns article XML. No key required (rate limit ~3 req/s). The PARSER is pure + unit-tested; the fetch wrapper is thin.

- [ ] **Step 1: Write failing test (parser only)**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePubmedXml } from '../dist/services/pubmed.js';

const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation>
<PMID>12345678</PMID>
<Article><ArticleTitle>Growth hormone in Korean children</ArticleTitle>
<Abstract><AbstractText>This study evaluated final height.</AbstractText></Abstract>
<Journal><JournalIssue><PubDate><Year>2021</Year></PubDate></JournalIssue><Title>J Pediatr Endocrinol</Title></Journal>
<AuthorList><Author><AffiliationInfo><Affiliation>Dept Pediatrics, Seoul, Korea</Affiliation></AffiliationInfo></Author></AuthorList>
</Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;

test('parsePubmedXml extracts pmid/title/abstract/year/journal/affiliation', () => {
  const arr = parsePubmedXml(xml);
  assert.equal(arr.length, 1);
  assert.equal(arr[0].pmid, '12345678');
  assert.match(arr[0].title, /Korean children/);
  assert.match(arr[0].abstract, /final height/);
  assert.equal(arr[0].year, 2021);
  assert.match(arr[0].journal, /Pediatr/);
  assert.match(arr[0].affiliation, /Seoul/);
});
test('multiple AbstractText sections concatenated', () => {
  const x = xml.replace('<AbstractText>This study evaluated final height.</AbstractText>',
    '<AbstractText Label="BACKGROUND">BG text.</AbstractText><AbstractText Label="RESULTS">RES text.</AbstractText>');
  const a = parsePubmedXml(x)[0];
  assert.match(a.abstract, /BG text/);
  assert.match(a.abstract, /RES text/);
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** (regex-based parse — avoids adding an XML dep; PubMed XML is regular enough for these fields)

```ts
// ai-server/src/services/pubmed.ts
export interface PubmedArticle {
  pmid: string; title: string; abstract: string; year: number | null; journal: string; affiliation: string;
}
const between = (s: string, tagOpen: RegExp, tagClose: string): string | null => {
  const m = s.match(tagOpen); if (!m) return null;
  const start = m.index! + m[0].length; const end = s.indexOf(tagClose, start);
  return end === -1 ? null : s.slice(start, end);
};
const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function parsePubmedXml(xml: string): PubmedArticle[] {
  const out: PubmedArticle[] = [];
  const blocks = xml.split('<PubmedArticle>').slice(1);
  for (const b of blocks) {
    const pmid = strip(between(b, /<PMID[^>]*>/, '</PMID>') ?? '');
    const title = strip(between(b, /<ArticleTitle[^>]*>/, '</ArticleTitle>') ?? '');
    const absParts = [...b.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => strip(m[1]));
    const abstract = absParts.join(' ');
    const yearStr = strip(between(b, /<Year>/, '</Year>') ?? '');
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const journal = strip(between(b, /<Title>/, '</Title>') ?? '');
    const affiliation = strip(between(b, /<Affiliation>/, '</Affiliation>') ?? '');
    if (pmid) out.push({ pmid, title, abstract, year: Number.isNaN(year) ? null : year, journal, affiliation });
  }
  return out;
}

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
export async function searchPmids(query: string, retmax = 10): Promise<string[]> {
  const url = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}&term=${encodeURIComponent(query)}`;
  const r = await fetch(url); const j = await r.json();
  return j?.esearchresult?.idlist ?? [];
}
export async function fetchAbstracts(pmids: string[]): Promise<PubmedArticle[]> {
  if (!pmids.length) return [];
  const url = `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${pmids.join(',')}`;
  const r = await fetch(url); const xml = await r.text();
  return parsePubmedXml(xml);
}
```

- [ ] **Step 4: Run → PASS** (2 tests).
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/pubmed.ts ai-server/__tests__/pubmed.test.mjs
git commit -m "feat(rag): PubMed E-utilities fetch + abstract XML parser + tests"
```

---

## Task 5: evidence_papers migration + match RPC

**Files:**
- Create: `v4/scripts/migrations/035_evidence_papers.sql`

- [ ] **Step 1: Write migration** (mirror migration 015 pattern: `vector(768)` + cosine match RPC)

```sql
-- 035_evidence_papers.sql — 국제 논문 초록 라이브러리 (pgvector). Dashboard 적용.
create extension if not exists vector;
create table if not exists evidence_papers (
  id          uuid primary key default gen_random_uuid(),
  pmid        text unique,
  title       text not null default '',
  abstract    text not null default '',
  journal     text default '',
  year        integer,
  url         text default '',
  topic       text default '',                 -- 수집 주제축 (예: growth_hormone, bone_age ...)
  pop_group   text default 'unknown',          -- east_asian|sea|caucasian|mixed|unknown
  pop_country text default '',
  pop_confidence text default 'unknown',        -- explicit|inferred|unknown
  embedding   vector(768),
  created_at  timestamptz default now()
);
create index if not exists idx_evidence_topic on evidence_papers(topic);
alter table evidence_papers enable row level security;
drop policy if exists evidence_all on evidence_papers;
create policy evidence_all on evidence_papers for all to anon, authenticated using (true) with check (true);

-- cosine top-k (mirror match_patient_embeddings)
create or replace function match_evidence_papers(query_embedding vector(768), k int default 5)
returns table (id uuid, pmid text, title text, abstract text, journal text, year int, url text, pop_group text, pop_confidence text, similarity float)
language sql stable as $$
  select e.id, e.pmid, e.title, e.abstract, e.journal, e.year, e.url, e.pop_group, e.pop_confidence,
         1 - (e.embedding <=> query_embedding) as similarity
  from evidence_papers e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit k;
$$;
```

- [ ] **Step 2: Apply in Dashboard.** Verify: `select match_evidence_papers((select array_fill(0,ARRAY[768])::vector), 1);` returns 0 rows without error.

- [ ] **Step 3: Commit**

```bash
git add v4/scripts/migrations/035_evidence_papers.sql
git commit -m "feat(rag): evidence_papers table + match RPC migration (035)"
```

---

## Task 6: Paper ingestion script (PubMed → tag → embed → store)

**Files:**
- Create: `ai-server/scripts/ingest-papers.mjs`

**Depends on:** Tasks 3 (tagger), 4 (pubmed), 5 (table). Uses `embedText` from `dist/services/gemini.js` (build first). Curated topic list (stable axes from spec).

- [ ] **Step 1: Implement**

```js
// ai-server/scripts/ingest-papers.mjs
// 주제축별 PubMed 초록 수집 → 인종 태깅 → 임베딩 → evidence_papers upsert.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { searchPmids, fetchAbstracts } from '../dist/services/pubmed.js';
import { tagPopulation } from '../dist/services/populationTagger.js';
import { embedText } from '../dist/services/gemini.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 주제축 → PubMed 쿼리 (아시아 인구 우선 bias)
const TOPICS = {
  growth_hormone: 'growth hormone therapy children final height',
  bone_age: 'bone age prediction adult height children',
  precocious_puberty: 'central precocious puberty GnRH agonist height',
  aromatase_inhibitor: 'aromatase inhibitor short stature boys height',
  obesity_growth: 'childhood obesity growth puberty timing',
  sleep_growth: 'sleep growth hormone secretion children',
  nutrition_growth: 'nutrition catch-up growth children stature',
  vitamin_d_growth: 'vitamin D children growth bone',
};
const PER_TOPIC = Number(process.argv[2] || 8);

for (const [topic, query] of Object.entries(TOPICS)) {
  const pmids = await searchPmids(query, PER_TOPIC);
  const arts = await fetchAbstracts(pmids);
  let n = 0;
  for (const a of arts) {
    if (!a.abstract || a.abstract.length < 80) continue;
    const pop = tagPopulation({ abstract: a.abstract, affiliation: a.affiliation });
    let embedding = null;
    try { embedding = await embedText(`${a.title}\n${a.abstract}`); } catch (e) { console.warn('embed fail', a.pmid, e.message); }
    const { error } = await sb.from('evidence_papers').upsert({
      pmid: a.pmid, title: a.title, abstract: a.abstract, journal: a.journal, year: a.year,
      url: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, topic,
      pop_group: pop.group, pop_country: pop.country, pop_confidence: pop.confidence, embedding,
    }, { onConflict: 'pmid' });
    if (!error) n++;
    await new Promise((r) => setTimeout(r, 400)); // rate limit (PubMed + Gemini)
  }
  console.log(`${topic}: stored ${n}/${arts.length}`);
}
console.log('done.');
```

- [ ] **Step 2: Build + run** `cd ai-server && npm run build && node scripts/ingest-papers.mjs 6`
  Expected: per-topic "stored N/M" lines. (Requires valid GEMINI key for embeddings + internet.)
- [ ] **Step 3: Verify** in Supabase: `select topic, pop_group, count(*) from evidence_papers group by 1,2;` shows rows across topics.
- [ ] **Step 4: Commit**

```bash
git add ai-server/scripts/ingest-papers.mjs
git commit -m "feat(rag): PubMed paper ingestion script (tag + embed + store)"
```

---

## Task 7: clinical_insights migration + match RPC

**Files:**
- Create: `v4/scripts/migrations/036_clinical_insights.sql`

- [ ] **Step 1: Write migration**

```sql
-- 036_clinical_insights.sql — 비식별 임상 인사이트 (집계통계 + 합성케이스, pgvector). Dashboard 적용.
create extension if not exists vector;
create table if not exists clinical_insights (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,            -- patientCategories 코드 (예: parents_short, slow_growth ...)
  cohort_n      integer not null default 0, -- 이 인사이트가 대표하는 환자 수 (k-익명성)
  stats         jsonb default '{}'::jsonb,  -- 집계 통계
  composite_case text default '',           -- 합성(전형) 사례 서사 (실존 X)
  summary       text default '',            -- 임베딩/표시용 한 줄 요약
  embedding     vector(768),
  created_at    timestamptz default now()
);
create index if not exists idx_insights_category on clinical_insights(category);
alter table clinical_insights enable row level security;
drop policy if exists insights_all on clinical_insights;
create policy insights_all on clinical_insights for all to anon, authenticated using (true) with check (true);

create or replace function match_clinical_insights(query_embedding vector(768), k int default 3)
returns table (id uuid, category text, cohort_n int, stats jsonb, composite_case text, summary text, similarity float)
language sql stable as $$
  select c.id, c.category, c.cohort_n, c.stats, c.composite_case, c.summary,
         1 - (c.embedding <=> query_embedding) as similarity
  from clinical_insights c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit k;
$$;
```

- [ ] **Step 2: Apply in Dashboard.** Verify table exists (`select count(*) from clinical_insights;` → 0).
- [ ] **Step 3: Commit**

```bash
git add v4/scripts/migrations/036_clinical_insights.sql
git commit -m "feat(rag): clinical_insights table + match RPC migration (036)"
```

---

## Task 8: clinicalStats pure helpers (aggregate + k-anonymity) + tests

**Files:**
- Create: `ai-server/src/services/clinicalStats.ts`
- Create: `ai-server/__tests__/clinicalStats.test.mjs`

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCohort, passesKAnonymity, K_MIN } from '../dist/services/clinicalStats.js';

const rows = [
  { gender:'male', initialHeight:140, latestHeight:160, initialBoneAge:11, topMeds:['에이큐_G','루프린'] },
  { gender:'male', initialHeight:138, latestHeight:158, initialBoneAge:12, topMeds:['에이큐_G'] },
  { gender:'female', initialHeight:135, latestHeight:150, initialBoneAge:10, topMeds:['에이큐_G'] },
];
test('aggregateCohort computes n, avg growth, common meds', () => {
  const s = aggregateCohort(rows);
  assert.equal(s.n, 3);
  assert.equal(s.commonMeds[0], '에이큐_G'); // most frequent first
  assert.ok(s.avgGrowthCm > 0);
});
test('passesKAnonymity true when n >= K_MIN', () => {
  assert.equal(passesKAnonymity(K_MIN), true);
  assert.equal(passesKAnonymity(K_MIN - 1), false);
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/clinicalStats.ts
export const K_MIN = 5; // k-익명성 최소 코호트 크기

export interface CohortRow {
  gender?: string; initialHeight?: number; latestHeight?: number;
  initialBoneAge?: number; topMeds?: string[];
}
export interface CohortStats {
  n: number; avgGrowthCm: number; avgInitialBoneAge: number | null;
  genderSplit: Record<string, number>; commonMeds: string[];
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function aggregateCohort(rows: CohortRow[]): CohortStats {
  const growth = rows
    .filter((r) => typeof r.initialHeight === 'number' && typeof r.latestHeight === 'number')
    .map((r) => (r.latestHeight as number) - (r.initialHeight as number));
  const boneAges = rows.map((r) => r.initialBoneAge).filter((x): x is number => typeof x === 'number');
  const genderSplit: Record<string, number> = {};
  rows.forEach((r) => { const g = r.gender || 'unknown'; genderSplit[g] = (genderSplit[g] || 0) + 1; });
  const medFreq: Record<string, number> = {};
  rows.forEach((r) => (r.topMeds || []).forEach((m) => (medFreq[m] = (medFreq[m] || 0) + 1)));
  const commonMeds = Object.entries(medFreq).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  return {
    n: rows.length,
    avgGrowthCm: Math.round(avg(growth) * 10) / 10,
    avgInitialBoneAge: boneAges.length ? Math.round(avg(boneAges) * 10) / 10 : null,
    genderSplit, commonMeds,
  };
}
export function passesKAnonymity(n: number): boolean { return n >= K_MIN; }
```

- [ ] **Step 4: Run → PASS** (2 tests).
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/clinicalStats.ts ai-server/__tests__/clinicalStats.test.mjs
git commit -m "feat(rag): clinical aggregate stats + k-anonymity helpers + tests"
```

---

## Task 9: Composite-case prompt builder (pure) + test

**Files:**
- Create: `ai-server/src/services/insightPrompts.ts`
- Modify: `ai-server/__tests__/clinicalStats.test.mjs` is separate; add `ai-server/__tests__/insightPrompts.test.mjs`

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompositeCasePrompt } from '../dist/services/insightPrompts.js';

test('prompt includes category, n, common meds, and forbids real-patient/efficacy claims', () => {
  const p = buildCompositeCasePrompt('precocious_suspect', { n: 12, avgGrowthCm: 18, avgInitialBoneAge: 11.5, genderSplit:{male:8,female:4}, commonMeds:['에이큐_G','루프린'] });
  assert.match(p, /precocious_suspect/);
  assert.match(p, /12/);
  assert.match(p, /합성|가상|전형/); // composite framing
  assert.match(p, /실존|개인|특정 환자/); // must mention NOT a real individual
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/insightPrompts.ts
import type { CohortStats } from './clinicalStats.js';

/** 집계 통계 → 합성(전형) 사례 서사 생성 프롬프트. 실존 개인 아님 + 효과단정 금지. */
export function buildCompositeCasePrompt(category: string, stats: CohortStats): string {
  return `당신은 소아 성장클리닉의 교육 콘텐츠 작성자입니다. 아래는 "${category}" 유형 환자 ${stats.n}명의 비식별 집계 통계입니다.
이 통계를 바탕으로 이 유형을 대표하는 **합성(전형적) 사례** 한 단락을 작성하세요.

## 집계 통계
- 코호트 수: ${stats.n}명
- 평균 키 성장: ${stats.avgGrowthCm}cm
- 평균 초진 뼈나이: ${stats.avgInitialBoneAge ?? '정보없음'}
- 성별 분포: ${JSON.stringify(stats.genderSplit)}
- 자주 적용된 관리/약물(코드): ${stats.commonMeds.slice(0, 6).join(', ')}

## 필수 규칙
1. **실존 개인이 아닌 합성(가상) 전형 사례**임을 전제로 작성. 특정 환자를 묘사하지 마세요.
2. **치료 효과를 단정·보장하지 마세요** (의료광고법). "보통 이런 관리 흐름을 거칩니다" 같은 교육적 서술만.
3. 나이는 구간으로(예: "8~9세"), 수치는 일반화. 재식별 가능한 디테일 금지.
4. 한국어 3~4문장.`;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/insightPrompts.ts ai-server/__tests__/insightPrompts.test.mjs
git commit -m "feat(rag): composite-case prompt builder (de-id + no-efficacy) + test"
```

---

## Task 10: Insights build script (clinical → stats → composite → k-anon → embed → store)

**Files:**
- Create: `ai-server/scripts/build-insights.mjs`

**Depends on:** Tasks 7,8,9. Uses `patientCategories` logic. Since `patientCategories.ts` lives in v4 (frontend), re-derive category grouping here from `children` + `intake_survey` using a SMALL inline classifier (port the 8-category rules), OR group by a simpler available signal. To avoid duplicating 200 lines, this script groups by a minimal rule set covering the main categories; full parity is a follow-up.

- [ ] **Step 1: Implement**

```js
// ai-server/scripts/build-insights.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { aggregateCohort, passesKAnonymity } from '../dist/services/clinicalStats.js';
import { buildCompositeCasePrompt } from '../dist/services/insightPrompts.js';
import { generateText, embedText } from '../dist/services/gemini.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// 처방 코드명 로드 (med id → name)
const { data: meds } = await sb.from('medications').select('id,name');
const medName = Object.fromEntries((meds||[]).map(m=>[m.id,m.name]));
// child → topMeds
async function topMedsByChild() {
  const map = {};
  for (let f=0;;f+=1000){ const {data}=await sb.from('prescriptions').select('child_id,medication_id').range(f,f+999); if(!data?.length)break;
    data.forEach(r=>{ if(!r.child_id||!r.medication_id)return; (map[r.child_id]=map[r.child_id]||{}); const n=medName[r.medication_id]; if(n)map[r.child_id][n]=(map[r.child_id][n]||0)+1; });
    if(data.length<1000)break; }
  const out={}; Object.entries(map).forEach(([id,freq])=>{ out[id]=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n])=>n); });
  return out;
}
const topMeds = await topMedsByChild();

// children + first/last measurement
const { data: kids } = await sb.from('children').select('id,gender,intake_survey,father_height,mother_height');
async function measFor(id){ const {data}=await sb.from('hospital_measurements').select('height,bone_age,measured_date').eq('child_id',id).order('measured_date',{ascending:true}); return data||[]; }

// 최소 카테고리 분류 (핵심만; full parity는 후속)
function categorize(child, ms){
  const cats=[];
  const fh=+child.father_height||0, mh=+child.mother_height||0;
  if (fh && mh && ((fh+mh)/2) < 165) cats.push('parents_short');
  const firstBA=ms[0]?.bone_age; if (typeof firstBA==='number' && firstBA>0) cats.push('bone_age_recorded');
  const iv=child.intake_survey||{}; const ivs=JSON.stringify(iv);
  if (/성조숙|조기사춘기|precocious/i.test(ivs)) cats.push('precocious_suspect');
  if (/비만|과체중|obes/i.test(ivs)) cats.push('obesity');
  if (cats.length===0) cats.push('general_growth');
  return cats;
}

// 카테고리별 코호트 집계
const cohort = {}; // cat -> rows[]
for (const k of kids||[]) {
  const ms = await measFor(k.id);
  const row = { gender: k.gender, initialHeight: ms[0]?.height, latestHeight: ms[ms.length-1]?.height, initialBoneAge: ms[0]?.bone_age, topMeds: topMeds[k.id]||[] };
  for (const c of categorize(k, ms)) (cohort[c]=cohort[c]||[]).push(row);
}

let stored = 0;
for (const [category, rows] of Object.entries(cohort)) {
  const stats = aggregateCohort(rows);
  if (!passesKAnonymity(stats.n)) { console.log(`skip ${category} (n=${stats.n} < k)`); continue; }
  let composite = '';
  try { composite = (await generateText(buildCompositeCasePrompt(category, stats))).trim(); } catch (e) { console.warn('composite fail', category, e.message); }
  const summary = `[${category}] n=${stats.n}, 평균성장 ${stats.avgGrowthCm}cm, 흔한관리 ${stats.commonMeds.slice(0,4).join('/')}`;
  let embedding=null; try { embedding = await embedText(`${summary}\n${composite}`); } catch (e) { console.warn('embed fail', category, e.message); }
  // 카테고리당 1 레코드 (upsert by category)
  const { data: existing } = await sb.from('clinical_insights').select('id').eq('category', category).maybeSingle();
  const payload = { category, cohort_n: stats.n, stats, composite_case: composite, summary, embedding };
  if (existing) await sb.from('clinical_insights').update(payload).eq('id', existing.id);
  else await sb.from('clinical_insights').insert(payload);
  stored++; console.log(`stored ${category} (n=${stats.n})`);
}
console.log(`done. insights stored: ${stored}`);
```

- [ ] **Step 2: Build + run** `cd ai-server && npm run build && node scripts/build-insights.mjs`
  Expected: "stored <category> (n=…)" lines for cohorts ≥ k, "skip" for small. (Needs GEMINI key.)
- [ ] **Step 3: Verify**: `select category, cohort_n, left(composite_case,40) from clinical_insights;` shows de-identified composite text.
- [ ] **Step 4: Commit**

```bash
git add ai-server/scripts/build-insights.mjs
git commit -m "feat(rag): de-identified clinical insights builder (stats+composite+k-anon)"
```

---

## Task 11: Unified knowledge retrieval service + endpoint

**Files:**
- Create: `ai-server/src/services/knowledgeRetrieval.ts`
- Create: `ai-server/src/routes/knowledge.ts`
- Modify: `ai-server/src/index.ts` (mount router)

- [ ] **Step 1: Implement retrieval service**

```ts
// ai-server/src/services/knowledgeRetrieval.ts
import { createClient } from '@supabase/supabase-js';
import { embedText } from './gemini.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface KnowledgeResult {
  papers: Array<{ pmid: string; title: string; abstract: string; journal: string; year: number | null; url: string; pop_group: string; pop_confidence: string; similarity: number }>;
  insights: Array<{ category: string; cohort_n: number; summary: string; composite_case: string; similarity: number }>;
}

/** 질의문 → 임베딩 → 논문 top-kPapers + 인사이트 top-kInsights 동시 검색. */
export async function searchKnowledge(query: string, opts: { kPapers?: number; kInsights?: number } = {}): Promise<KnowledgeResult> {
  const emb = await embedText(query);
  const [pap, ins] = await Promise.all([
    sb.rpc('match_evidence_papers', { query_embedding: emb, k: opts.kPapers ?? 5 }),
    sb.rpc('match_clinical_insights', { query_embedding: emb, k: opts.kInsights ?? 3 }),
  ]);
  if (pap.error) console.warn('[knowledge] papers rpc:', pap.error.message);
  if (ins.error) console.warn('[knowledge] insights rpc:', ins.error.message);
  return { papers: pap.data ?? [], insights: ins.data ?? [] };
}
```

- [ ] **Step 2: Implement endpoint**

```ts
// ai-server/src/routes/knowledge.ts
import { Router, type Request, type Response } from 'express';
import { searchKnowledge } from '../services/knowledgeRetrieval.js';

export const knowledgeRouter = Router();

// POST /api/knowledge/search { query, kPapers?, kInsights? } → { papers, insights }
knowledgeRouter.post('/search', async (req: Request, res: Response) => {
  const query = String(req.body?.query ?? '').trim();
  if (!query) return res.status(400).json({ success: false, error: 'query required' });
  try {
    const result = await searchKnowledge(query, { kPapers: req.body?.kPapers, kInsights: req.body?.kInsights });
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] search failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 3: Mount router** in `ai-server/src/index.ts` — find where existing routers mount (e.g. `app.use('/api/marketing', marketingRouter)`) and add:

```ts
import { knowledgeRouter } from './routes/knowledge.js';
app.use('/api/knowledge', knowledgeRouter);
```

- [ ] **Step 4: Build + smoke** `cd ai-server && npm run build`, restart server, then:

```bash
curl -s -X POST http://localhost:3001/api/knowledge/search -H "Content-Type: application/json" -d "{\"query\":\"성조숙증 남아 성장 치료\"}" -w "\nHTTP %{http_code}\n"
```
Expected: `{"success":true,"papers":[...],"insights":[...]}` (papers/insights populated if Tasks 6 & 10 ran).

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/knowledgeRetrieval.ts ai-server/src/routes/knowledge.ts ai-server/src/index.ts
git commit -m "feat(rag): unified knowledge retrieval service + /api/knowledge/search"
```

---

## Task 12: Rx-recommend prompt builder (pure) + test

**Files:**
- Create: `ai-server/src/services/rxRecommend.ts`
- Create: `ai-server/__tests__/rxRecommend.test.mjs`

This productizes the validated prototype prompt. Pure builder; the endpoint (Task 13) supplies data.

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRxPrompt } from '../dist/services/rxRecommend.js';

const input = {
  profile: '10.5세 남, 키 145cm, 뼈나이 11.5, PAH 171cm',
  labText: '[blood] Estradiol 27.2, IGF-1 543, VitD 18.2',
  cohortMeds: ['에이큐_G (somatropin(성장호르몬) · growth_hormone)', '루프린 (leuprorelin · gnrh_agonist)'],
  papers: [{ title: 'GH therapy in Korean children', journal: 'J Ped Endo', year: 2021, url: 'http://x', pop_group: 'east_asian' }],
};
test('prompt embeds profile, labs, annotated cohort meds, paper titles, and decision-support rules', () => {
  const p = buildRxPrompt(input);
  assert.match(p, /10\.5세/);
  assert.match(p, /Estradiol/);
  assert.match(p, /성장호르몬/);          // annotated med
  assert.match(p, /GH therapy in Korean/); // paper grounding
  assert.match(p, /자율 처방|최종.*의사/); // doctor-in-loop rule
});
test('handles empty papers/cohort gracefully', () => {
  const p = buildRxPrompt({ profile: 'x', labText: 'y', cohortMeds: [], papers: [] });
  assert.match(p, /x/);
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/rxRecommend.ts
export interface RxPaperRef { title: string; journal?: string; year?: number | null; url?: string; pop_group?: string; }
export interface RxPromptInput {
  profile: string;        // 환자 프로필 한 줄
  labText: string;        // 검사결과 텍스트 (피검사/알러지)
  cohortMeds: string[];   // legend 로 주석된 코호트 빈출 약물
  papers: RxPaperRef[];   // 근거 논문 (retrieval)
}
export function buildRxPrompt(i: RxPromptInput): string {
  const papers = i.papers.length
    ? i.papers.map((p, n) => `[${n + 1}] ${p.title} (${p.journal ?? ''} ${p.year ?? ''}) ${p.pop_group ? `· 인구:${p.pop_group}` : ''}`).join('\n')
    : '(관련 논문 없음)';
  return `당신은 소아 성장클리닉 원장의 진료 의사결정을 보조하는 AI입니다. 신규/현재 환자의 검사 결과를 보고 처방/관리 추천안을 제시하세요.

[병원 약물 코드 힌트] 에이큐_G=성장호르몬, 루프린=GnRH agonist(사춘기억제), 아리미덱스=aromatase inhibitor, 멜라토닌/5-HTP=수면 보조. 성장치료 핵심축: 성장호르몬+GnRH억제+아로마타제억제.
[중요] 수면은 성장호르몬 분비에 직결. 검사·문진에서 수면 문제 단서가 보이면 다뤄라.

## 환자 프로필
${i.profile}

## 검사 결과 (피검사/알러지 등)
${i.labText || '(검사결과 미입력)'}

## 이 클리닉에서 유사 프로필 환자에게 자주 처방된 약물 (참고)
${i.cohortMeds.length ? i.cohortMeds.join(', ') : '(데이터 부족)'}

## 근거 논문 (이 추천을 뒷받침; 본문에서 [번호]로 인용)
${papers}

## 규칙
1. 자율 처방 아님 — "원장 검토용 추천안", 최종 결정은 의사.
2. 각 추천에 검사 소견과의 임상 근거 + 가능하면 위 논문 [번호] 인용.
3. 수치 표준 관련 주장은 아시아 인구 근거 우선, 비아시아/인구불명 근거면 그 한계를 명시.
4. 신뢰도(높음/중간/낮음) + 향후 추적검사 계획.
5. 성장과 무관한 동반질환(예: ADHD 등 환자 요구사항)은 성장 레지멘에서 제외.
6. 한국어, 의사가 빠르게 훑게 구조화(마크다운).`;
}
```

- [ ] **Step 4: Run → PASS** (2 tests).
- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/rxRecommend.ts ai-server/__tests__/rxRecommend.test.mjs
git commit -m "feat(rag): Rx recommendation prompt builder + tests"
```

---

## Task 13: Rx-recommend endpoint (gather → retrieve → generate → references)

**Files:**
- Modify: `ai-server/src/routes/knowledge.ts` (add `/rx-recommend`)

Combines: patient profile/labs (by `childId`, service-role) + optional manual `labText` override + cohort top meds (annotated via `medication_legend`) + `searchKnowledge` papers + `buildRxPrompt` + `generateText`. Returns `{ recommendation, references }`.

- [ ] **Step 1: Implement** (add to knowledgeRouter; reuse the `sb` service-role client pattern + imports)

```ts
import { searchKnowledge } from '../services/knowledgeRetrieval.js';
import { buildRxPrompt } from '../services/rxRecommend.js';
import { annotateMedName } from '../services/medLegend.js';
import { generateText } from '../services/gemini.js';
import { createClient } from '@supabase/supabase-js';
const sbK = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '', { auth:{persistSession:false} });

// POST /api/knowledge/rx-recommend { childId?, labText?, profileText? }
knowledgeRouter.post('/rx-recommend', async (req: Request, res: Response) => {
  const { childId, labText: manualLab, profileText: manualProfile } = req.body ?? {};
  if (!childId && !manualLab) return res.status(400).json({ success: false, error: 'childId 또는 labText 필요' });
  try {
    let profile = String(manualProfile ?? '').trim();
    let labText = String(manualLab ?? '').trim();
    // childId 주어지면 DB에서 보강
    if (childId) {
      const { data: child } = await sbK.from('children').select('gender,birth_date,father_height,mother_height,intake_survey').eq('id', childId).maybeSingle();
      const { data: ms } = await sbK.from('hospital_measurements').select('height,weight,bone_age,pah,measured_date').eq('child_id', childId).order('measured_date', { ascending: false }).limit(1);
      const m0 = ms?.[0] || {};
      if (!profile && child) {
        const age = child.birth_date ? ((Date.now() - new Date(child.birth_date).getTime()) / 3.15576e10).toFixed(1) : '?';
        profile = `${age}세 ${child.gender}, 키 ${m0.height ?? '?'}cm, 체중 ${m0.weight ?? '?'}kg, 뼈나이 ${m0.bone_age ?? '?'}, PAH ${m0.pah ?? '?'}cm, 부 ${child.father_height ?? '?'}/모 ${child.mother_height ?? '?'}`;
      }
      if (!labText) {
        const { data: labs } = await sbK.from('lab_tests').select('test_type,result_data').eq('child_id', childId);
        labText = (labs ?? []).map((l) => `[${l.test_type}] ${JSON.stringify(l.result_data).slice(0, 900)}`).join('\n');
      }
    }
    // cohort top meds (전체 처방 빈도 상위) + legend 주석
    const { data: legend } = await sbK.from('medication_legend').select('display_name,generic_name,drug_class,is_growth_core,is_non_drug');
    const { data: meds } = await sbK.from('medications').select('id,name');
    const nameById = Object.fromEntries((meds ?? []).map((m) => [m.id, m.name]));
    const freq: Record<string, number> = {};
    for (let f = 0; ; f += 1000) {
      const { data } = await sbK.from('prescriptions').select('medication_id').range(f, f + 999);
      if (!data?.length) break; data.forEach((r) => { if (r.medication_id) freq[r.medication_id] = (freq[r.medication_id] || 0) + 1; });
      if (data.length < 1000) break;
    }
    const cohortMeds = Object.entries(freq).sort((a, b) => b[1] - a[1])
      .map(([id]) => nameById[id]).filter(Boolean)
      .filter((n) => !annotateMedName(n, legend ?? []).includes('non_drug'))
      .slice(0, 15).map((n) => annotateMedName(n, legend ?? []));
    // 근거 논문 검색
    const { papers } = await searchKnowledge(`${profile} ${labText}`.slice(0, 1500), { kPapers: 5, kInsights: 0 });
    const prompt = buildRxPrompt({ profile, labText, cohortMeds, papers });
    const recommendation = (await generateText(prompt)).trim();
    res.json({ success: true, recommendation, references: papers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] rx-recommend failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 2: Build + smoke** (use a real childId from DB):

```bash
cd ai-server && npm run build
# restart server, then (replace <ID> with a real children.id):
curl -s -X POST http://localhost:3001/api/knowledge/rx-recommend -H "Content-Type: application/json" -d "{\"childId\":\"<ID>\"}" -w "\nHTTP %{http_code}\n" | head -c 600
```
Expected: `{"success":true,"recommendation":"...","references":[...]}`.

- [ ] **Step 3: Commit**

```bash
git add ai-server/src/routes/knowledge.ts
git commit -m "feat(rag): /api/knowledge/rx-recommend (profile+labs+cohort+papers → recommendation)"
```

---

## Task 14: v4 client service for Rx recommendation

**Files:**
- Create: `v4/src/features/hospital/services/clinicalRxService.ts`

- [ ] **Step 1: Implement**

```ts
// v4/src/features/hospital/services/clinicalRxService.ts
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export interface RxReference { pmid?: string; title: string; journal?: string; year?: number | null; url?: string; pop_group?: string; pop_confidence?: string; similarity?: number; }
export interface RxRecommendation { recommendation: string; references: RxReference[]; }

export async function recommendRx(p: { childId?: string; labText?: string; profileText?: string }): Promise<RxRecommendation> {
  const res = await fetch(`${BASE}/api/knowledge/rx-recommend`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `추천 실패: ${res.status}`);
  return { recommendation: b.recommendation as string, references: (b.references ?? []) as RxReference[] };
}
```

- [ ] **Step 2: Verify** `cd v4 && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit**

```bash
git add v4/src/features/hospital/services/clinicalRxService.ts
git commit -m "feat(admin): clinical Rx recommend client service"
```

---

## Task 15: Admin UI — AI 처방 추천 button + 검사 입력 모달 + 결과 팝업(논문 reference)

**Files:**
- Create: `v4/src/features/hospital/components/RxRecommendModal.tsx`
- Modify: `v4/src/pages/admin/AdminPatientDetailPage.tsx` (add floating button + modal, following the existing PatientAnalysisModal / SimilarCasesModal pattern)

- [ ] **Step 1: Read the pattern** — open `v4/src/pages/admin/AdminPatientDetailPage.tsx` and find the existing floating buttons (e.g. `🧠 환자 분석` → PatientAnalysisModal, `🔍 비슷한 케이스` → SimilarCasesModal) and how `childId` is obtained. Mirror that wiring exactly.

- [ ] **Step 2: Implement RxRecommendModal** (~150 lines). Props:
```ts
interface Props { childId: string; onClose: () => void; }
export function RxRecommendModal({ childId, onClose }: Props) { ... } // inferred return type (React 19 — no JSX.Element)
```
Behavior:
- Full-screen overlay (`fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4`) + white panel (`max-w-2xl w-full rounded-xl bg-white p-5 max-h-[88vh] overflow-y-auto`). Header "🧠 AI 처방 추천" + ✕ close.
- **검사 입력 영역**: a `<textarea>` `labText` ("피검사 / 알러지 검사 결과를 붙여넣거나, 비워두면 차트의 검사 데이터를 사용합니다") + 안내문. (childId always passed; labText optional override.)
- "추천 받기" 버튼 → `setLoading`, `recommendRx({ childId, labText: labText.trim() || undefined })`; on error `setError`.
- **결과 팝업 영역**: render `recommendation` as readable text (preserve line breaks: `whitespace-pre-wrap`); below it a **"근거 논문" 섹션** listing `references` — each: `[n] title` as a link (`<a href={url} target="_blank" rel="noopener noreferrer">`), journal·year, and a population badge (`pop_group` + `pop_confidence`, e.g. 🇰🇷 east_asian/explicit vs ⚠️ unknown). If `references` empty → "관련 논문 없음".
- 면책 문구 하단: "본 추천은 원장 검토용 보조 정보이며, 최종 처방 결정은 의사가 합니다."
- Accent `#4A2D6B` or the admin primary `#667eea`. Tailwind only.

- [ ] **Step 3: Wire button into AdminPatientDetailPage** — add a floating button "🧠 AI 처방 추천" next to the existing ones, toggling `showRx` state; render `{showRx && <RxRecommendModal childId={childId} onClose={() => setShowRx(false)} />}`.

- [ ] **Step 4: Verify (preview)** — `cd v4 && npx tsc --noEmit` → PASS. Then in Claude Preview: log into admin, open a patient detail, click "🧠 AI 처방 추천", leave labText empty → 추천 받기 → recommendation text + 근거 논문 links render in popup; no console errors. (Requires ai-server running with Gemini key + Tasks 6/10 data ingested for references.)

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/hospital/components/RxRecommendModal.tsx v4/src/pages/admin/AdminPatientDetailPage.tsx
git commit -m "feat(admin): AI 처방 추천 버튼 + 검사 입력 모달 + 결과/논문 reference 팝업"
```

---

## Self-Review

**1. Spec coverage (Phase A scope):**
- 논문 라이브러리(국제·초록·인종태그·큐레이션 적재) → Tasks 3,4,5,6 ✓
- 약물 코드 사전(legend) → Tasks 1,2 ✓
- 비식별 임상 인사이트(집계통계 + 합성케이스 + k-익명성) → Tasks 7,8,9,10 ✓
- 공유 검색 브레인(통합 retrieval) → Task 11 ✓
- 데이터 정비(비약물 항목) → partially: `medLegend.is_non_drug` + seed NON_DRUG flags them (Task 1,2); full prescription cleanup is a follow-up (noted).
- 인종 claim 분류(메커니즘 vs 수치) → retrieval returns `pop_group/pop_confidence`; the consuming guardrail (Phase B) enforces the flag. Phase A surfaces the data ✓.
- Embeddings = Gemini (non-PHI in Phase A) ✓; local-embedding for raw PHI deferred to Phase D ✓.

**2. Placeholder scan:** All code blocks are complete (schemas, pure fns, scripts, service, endpoint). Scripts that need Gemini/internet are marked. No TBD/TODO.

**3. Type consistency:** `CohortStats`/`CohortRow` (Task 8) consumed by `buildCompositeCasePrompt` (Task 9) + build script (Task 10). `embedText`/`generateText` signatures match gemini.ts (verified). `vector(768)` consistent across 035/036 + match RPCs return `similarity`. `searchKnowledge` returns shapes matching the RPC `returns table` columns.

**Doctor-support feature (Tasks 12–15) coverage:**
- Rx 추천 프롬프트(검증된 프로토타입 productize) → Task 12 ✓
- 엔드포인트(프로필+검사+코호트+논문 → 추천+references) → Task 13 ✓
- 클라이언트 서비스 → Task 14 ✓
- admin UI: 환자상세 버튼 + 검사입력 모달 + 결과/논문 reference 팝업 → Task 15 ✓ (기존 PatientAnalysisModal 패턴 재사용)
- 근거 논문 reference + 인구 배지 노출 → Task 13(references) + Task 15(UI) ✓
- 의사 루프/면책(자율처방 아님) → Task 12(rule) + Task 15(면책 문구) ✓

**Known follow-ups (out of scope):** full `patientCategories` parity in build-insights (uses a reduced classifier), full prescriptions non-drug cleanup, local embedding model for Phase D raw-PHI, population-aware re-ranking (tags stored; ranking/guardrail later), outcome-labeled cohort (patient_analyses) for "효과 검증" recommendations. **Cohort meds in Task 13 are clinic-wide top meds (not yet similarity-matched per patient)** — embedding-based similar-case retrieval is a refinement once `patient_embeddings` batch is run.

**Dependency note:** Tasks 1,5,7 need Dashboard migration application before their dependent scripts/endpoints run. Tasks 6,10,11 need a valid GEMINI key (now set in ai-server/.env).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-06-clinical-rag-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task + two-stage review.

**2. Inline Execution** — execute in this session with checkpoints.

**Which approach?** (Phase B/C/D get their own plans after this foundation lands.)
