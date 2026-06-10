# Research Evidence Library — Phase 1 (DB 구축) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우리 성장치료 관련 국제 SCI 논문 초록을 PubMed에서 발굴하고 OpenAlex·NIH iCite로 품질지표(피인용·IF류·RCR)를 enrich, 저널 화이트리스트 SCI 게이트 + 합성 품질점수로 랭킹해 `evidence_papers` 단일 라이브러리에 적재한다.

**Architecture:** ai-server(Node 20 ESM/TypeScript)에 순수 함수 서비스 4개(pubmed 확장, openalex, icite, journalQuality)를 추가하고, 이를 호출하는 얇은 오케스트레이터 스크립트(`ingest-evidence.mjs`)가 15개 주제축을 돌며 후보 발굴→enrich→SCI 게이트→점수 랭킹→top-N upsert 한다. 임베딩(Gemini)은 키 있을 때만, 없으면 null 저장(Phase 2에서 백필). 마이그레이션 048로 `evidence_papers`에 품질 컬럼만 비파괴 추가.

**Tech Stack:** Node 20 ESM, TypeScript 5(tsc → `dist/`), `node:test`(내장 러너), Supabase JS(service-role), PubMed E-utilities·OpenAlex·NIH iCite REST(전부 무키), pgvector(기존).

**Scope:** 이 plan은 **Phase 1(DB 구축)만** 다룬다. 마케팅 연결(`article_evidence_links` + 링크 엔드포인트 + RAG 주입)은 Phase 2, 공개 배지/UI는 Phase 3 — 별도 plan. 스펙: [`2026-06-10-research-evidence-library-design.md`](../specs/2026-06-10-research-evidence-library-design.md).

---

## 사전 지식 (zero-context 엔지니어용)

- **빌드/테스트 흐름**: ai-server는 `type: module`. 소스는 `src/`(`rootDir`), 컴파일 출력은 `dist/`(`outDir`). 테스트 파일 `ai-server/__tests__/*.test.mjs` 는 **컴파일된** `../dist/services/*.js` 를 import 한다. 따라서 **테스트 실행 전 반드시 `npm run build`(=`tsc`)** 를 돌려야 최신 코드가 테스트된다. 스크립트(`scripts/*.mjs`)도 `../dist/services/*.js` 를 import 한다(예: 기존 [`ingest-papers.mjs`](../../../ai-server/scripts/ingest-papers.mjs) line 5).
- **테스트 실행**: 전체 `cd ai-server && npm test`(=`node --test`), 단일 파일 `node --test __tests__/openalex.test.mjs`.
- **순수 함수 우선 설계**: 네트워크 호출(fetch)과 파싱을 분리한다. 파서(`parseX(json)`)는 순수 → 픽스처로 단위테스트. fetch 래퍼는 파서를 호출하는 얇은 네트워크 함수 → 실제 API smoke 로 검증.
- **DB 위치**: `evidence_papers` 와 `marketing_articles` 는 같은 Supabase 프로젝트 **txirmof**(`txirmofdvuljkrjkpzdg`). 적재 스크립트는 `ai-server/.env` 의 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 를 쓴다 — **`.env` 의 SUPABASE_URL 이 txirmof 를 가리키는지 먼저 확인**(아니면 다른 DB에 적재됨).
- **마이그레이션 적용**: txirmof 는 Supabase MCP(tangobook 연결)로 직접 못 건드릴 수 있음 → **Supabase Dashboard SQL Editor 수동 적용**(기존 마케팅 마이그레이션 전부 이 방식, 예: 033/045 헤더). MCP 로 txirmof 접근 가능하면 `apply_migration` 사용 가능.
- **기존 자산 재사용**: `parsePubmedXml/searchPmids/fetchAbstracts`([pubmed.ts](../../../ai-server/src/services/pubmed.ts)), `tagPopulation`([populationTagger.ts](../../../ai-server/src/services/populationTagger.ts)), `embedText`([gemini.ts](../../../ai-server/src/services/gemini.ts)) — 시그니처 변경 금지(pubmed.ts 는 필드 **추가만**).
- **테스트 설계 가이드**: @superpowers:test-driven-development. 순수 함수는 입력→기대출력을 명시한 단위테스트, 네트워크 오케스트레이터는 `--dry-run` smoke.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `v4/scripts/migrations/048_evidence_quality_columns.sql` | `evidence_papers` 품질/공개 컬럼 12개 + 인덱스 2개 (비파괴 ALTER) | 신규 |
| `ai-server/src/services/pubmed.ts` | PubMed XML 파싱에 `doi`·`publicationTypes` 추출 추가 | 수정 |
| `ai-server/__tests__/pubmed.test.mjs` | 위 두 필드 파싱 테스트 추가 | 수정 |
| `ai-server/src/data/journalWhitelist.ts` | 소아내분비·성장 top SCI 저널 ISSN 화이트리스트(typed const) | 신규 |
| `ai-server/src/services/journalQuality.ts` | 순수: 근거등급 분류·SCI 게이트·정규화·합성 품질점수 | 신규 |
| `ai-server/__tests__/journalQuality.test.mjs` | 위 순수 함수 단위테스트 | 신규 |
| `ai-server/src/services/openalex.ts` | OpenAlex work/source 파서(순수) + PMID→메트릭 fetch(캐시) | 신규 |
| `ai-server/__tests__/openalex.test.mjs` | 파서 단위테스트 | 신규 |
| `ai-server/src/services/icite.ts` | NIH iCite 응답 파서(순수) + 배치 fetch | 신규 |
| `ai-server/__tests__/icite.test.mjs` | 파서 단위테스트 | 신규 |
| `ai-server/scripts/ingest-evidence.mjs` | 15주제축 오케스트레이터(발굴→enrich→게이트→점수→upsert), `--dry-run`/`--limit` | 신규 |
| `ai-server/CLAUDE.md` | 새 서비스·스크립트·엔드포인트(없음) 문서화 | 수정 |

---

## Chunk 1: 스키마 + 검증된 순수 단위

### Task 1: 마이그레이션 048 — evidence_papers 품질 컬럼

**Files:**
- Create: `v4/scripts/migrations/048_evidence_quality_columns.sql`

- [ ] **Step 1: 사전 점검 — evidence_papers 존재/적재 상태 확인**

`ai-server/.env` 의 `SUPABASE_URL` 이 txirmof 인지 확인 후, Dashboard SQL Editor(또는 접근 가능하면 Supabase MCP `execute_sql`)에서:

```sql
select count(*) as rows from evidence_papers;
```

Expected: 테이블 존재(행 0 이상). **테이블이 없으면** 먼저 [`035_evidence_papers.sql`](../../../v4/scripts/migrations/035_evidence_papers.sql) 를 적용(파이프라인의 upsert 대상). 행 수는 기록만(0이면 신규 적재, >0이면 기존 clinical 행 — Task 6 가 품질 컬럼 백필).

- [ ] **Step 2: 마이그레이션 파일 작성**

```sql
-- 048_evidence_quality_columns.sql
-- Research Evidence Library Phase 1 — evidence_papers 품질/공개 컬럼 확장 (비파괴).
-- Supabase Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
alter table evidence_papers add column if not exists doi            text default '';
alter table evidence_papers add column if not exists openalex_id    text default '';
alter table evidence_papers add column if not exists journal_issn   text default '';
alter table evidence_papers add column if not exists citation_count integer default 0;
alter table evidence_papers add column if not exists rcr            numeric;          -- NIH RCR (분야·연도 보정 피인용)
alter table evidence_papers add column if not exists if_proxy       numeric;          -- OpenAlex 저널 2yr mean citedness ≈ IF
alter table evidence_papers add column if not exists study_type     text default '';  -- meta_analysis|systematic_review|rct|cohort|case_control|cross_sectional|review|other
alter table evidence_papers add column if not exists is_sci         boolean default false;
alter table evidence_papers add column if not exists quality_score  numeric default 0;-- 0~100 합성
alter table evidence_papers add column if not exists korean_summary text default '';  -- 공개용 1줄 근거 (Gemini, Phase 2 백필)
alter table evidence_papers add column if not exists key_finding    text default '';  -- 핵심 결론 (Gemini, Phase 2 백필)
alter table evidence_papers add column if not exists confirmed      boolean default false; -- 공개 인용 승인 게이트
-- (sjr_quartile 은 의도적 생략 — Phase 1 미사용. 화이트리스트 + if_proxy 로 SCI 게이트 충족. 필요 시 후속 추가)
create index if not exists idx_evidence_quality on evidence_papers(quality_score desc);
create index if not exists idx_evidence_sci on evidence_papers(is_sci);
```

- [ ] **Step 3: 적용 + 검증**

Dashboard SQL Editor 에서 위 SQL 실행 후:

```sql
select column_name from information_schema.columns
where table_name = 'evidence_papers' and column_name in
('doi','openalex_id','journal_issn','citation_count','rcr','if_proxy','study_type','is_sci','quality_score','korean_summary','key_finding','confirmed')
order by column_name;
```

Expected: 12개 컬럼 모두 반환. (idempotent — 재실행 안전)

- [ ] **Step 4: Commit**

```bash
git add v4/scripts/migrations/048_evidence_quality_columns.sql
git commit -m "feat(evidence): add quality columns to evidence_papers (research library phase 1)"
```

---

### Task 2: pubmed.ts — doi·publicationTypes 추출

근거등급 분류(`study_type`)에 PublicationType 이, OpenAlex 매칭 보조에 DOI 가 필요. 기존 파서에 **필드 추가만**(기존 필드·시그니처 불변).

**Files:**
- Modify: `ai-server/src/services/pubmed.ts`
- Test: `ai-server/__tests__/pubmed.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`ai-server/__tests__/pubmed.test.mjs` 끝에 추가:

```js
test('parsePubmedXml extracts doi and publicationTypes', () => {
  const x = xml
    .replace('</Article>',
      '<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType>' +
      '<PublicationType UI="D016449">Randomized Controlled Trial</PublicationType></PublicationTypeList></Article>')
    .replace('</PubmedArticle>',
      '<PubmedData><ArticleIdList><ArticleId IdType="pubmed">12345678</ArticleId>' +
      '<ArticleId IdType="doi">10.1210/jc.2021-001</ArticleId></ArticleIdList></PubmedData></PubmedArticle>');
  const a = parsePubmedXml(x)[0];
  assert.equal(a.doi, '10.1210/jc.2021-001');
  assert.deepEqual(a.publicationTypes, ['Journal Article', 'Randomized Controlled Trial']);
});

test('parsePubmedXml defaults doi/publicationTypes when absent', () => {
  const a = parsePubmedXml(xml)[0];
  assert.equal(a.doi, '');
  assert.deepEqual(a.publicationTypes, []);
});
```

- [ ] **Step 2: 빌드 후 테스트 실패 확인**

Run: `cd ai-server && npm run build && node --test __tests__/pubmed.test.mjs`
Expected: FAIL — `a.doi` is undefined / `a.publicationTypes` is undefined (아직 미구현).

- [ ] **Step 3: 최소 구현**

`pubmed.ts` 의 `PubmedArticle` 인터페이스에 두 필드 추가:

```ts
export interface PubmedArticle {
  pmid: string; title: string; abstract: string; year: number | null; journal: string; affiliation: string;
  doi: string; publicationTypes: string[];
}
```

`parsePubmedXml` 내부, 객체 push 직전에 추출 추가하고 push 객체에 포함:

```ts
    const doiM = b.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/i)
              || b.match(/<ELocationID[^>]*EIdType="doi"[^>]*>([\s\S]*?)<\/ELocationID>/i);
    const doi = doiM ? strip(doiM[1]) : '';
    const publicationTypes = [...b.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) => strip(m[1]));
    if (pmid) out.push({ pmid, title, abstract, year: Number.isNaN(year) ? null : year, journal, affiliation, doi, publicationTypes });
```

(기존 `if (pmid) out.push({...})` 라인을 위 라인으로 교체)

- [ ] **Step 4: 빌드 후 테스트 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/pubmed.test.mjs`
Expected: PASS — 기존 2개 + 신규 2개 테스트 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/pubmed.ts ai-server/__tests__/pubmed.test.mjs
git commit -m "feat(pubmed): parse doi and publicationTypes from efetch XML"
```

---

### Task 3: journalWhitelist + journalQuality (SCI 게이트·품질점수)

**Files:**
- Create: `ai-server/src/data/journalWhitelist.ts`
- Create: `ai-server/src/services/journalQuality.ts`
- Test: `ai-server/__tests__/journalQuality.test.mjs`

- [ ] **Step 1: 화이트리스트 자산 작성**

`ai-server/src/data/journalWhitelist.ts`:

```ts
// 소아내분비·성장 분야 top SCI 저널 ISSN 화이트리스트. 원장 큐레이션으로 보강.
// ISSN 은 OpenAlex issn_l(linking ISSN) 기준, 하이픈 형식("0021-972X").
// ⚠️ ISSN 오타는 해당 저널을 화이트리스트에서 누락시키지만, isSci()가 if_proxy 폴백으로
//    고IF 저널을 살리므로 치명적이지 않음. Task 6 dry-run 에서 후보 저널의 실제 ISSN과 대조 권장.
export interface WhitelistEntry { issn: string; name: string; }
export const JOURNAL_WHITELIST: WhitelistEntry[] = [
  { issn: '0021-972X', name: 'J Clin Endocrinol Metab' },
  { issn: '1663-2818', name: 'Horm Res Paediatr' },
  { issn: '0804-4643', name: 'Eur J Endocrinol' },
  { issn: '0022-3476', name: 'J Pediatr' },
  { issn: '0031-4005', name: 'Pediatrics' },
  { issn: '2168-6203', name: 'JAMA Pediatr' },
  { issn: '0300-0664', name: 'Clin Endocrinol (Oxf)' },
  { issn: '0334-018X', name: 'J Pediatr Endocrinol Metab' },
  { issn: '0018-5043', name: 'Horm Metab Res' },
  { issn: '8756-3282', name: 'Bone' },
  { issn: '1096-6374', name: 'Growth Horm IGF Res' },
  { issn: '1687-9856', name: 'Int J Pediatr Endocrinol' },
  { issn: '0163-769X', name: 'Endocr Rev' },
  { issn: '0140-6736', name: 'Lancet' },
  { issn: '2213-8587', name: 'Lancet Diabetes Endocrinol' },
  { issn: '2352-4642', name: 'Lancet Child Adolesc Health' },
  { issn: '0028-4793', name: 'N Engl J Med' },
  { issn: '1061-4036', name: 'Nat Genet' },
  { issn: '0002-9165', name: 'Am J Clin Nutr' },
  { issn: '0161-8105', name: 'Sleep' },
  { issn: '2047-6302', name: 'Pediatr Obes' },
  { issn: '0307-0565', name: 'Int J Obes' },
  { issn: '0003-9888', name: 'Arch Dis Child' },
  { issn: '0340-6199', name: 'Eur J Pediatr' },
  { issn: '0884-0431', name: 'J Bone Miner Res' },
  { issn: '1521-690X', name: 'Best Pract Res Clin Endocrinol Metab' },
  { issn: '0803-5253', name: 'Acta Paediatr' },
];
export const WHITELIST_ISSNS: Set<string> = new Set(JOURNAL_WHITELIST.map((e) => e.issn));
```

- [ ] **Step 2: 실패하는 테스트 작성**

`ai-server/__tests__/journalQuality.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studyTypeFromPubTypes, studyGrade, isSci, normalize, computeBatchStats, qualityScore,
} from '../dist/services/journalQuality.js';

test('studyTypeFromPubTypes maps highest-evidence type first', () => {
  assert.equal(studyTypeFromPubTypes(['Journal Article', 'Meta-Analysis']), 'meta_analysis');
  assert.equal(studyTypeFromPubTypes(['Randomized Controlled Trial', 'Journal Article']), 'rct');
  assert.equal(studyTypeFromPubTypes(['Systematic Review']), 'systematic_review');
  assert.equal(studyTypeFromPubTypes(['Journal Article']), 'other');
  assert.equal(studyTypeFromPubTypes([]), 'other');
});

test('studyGrade orders evidence', () => {
  assert.ok(studyGrade('meta_analysis') > studyGrade('rct'));
  assert.ok(studyGrade('rct') > studyGrade('cohort'));
  assert.equal(studyGrade('unknownthing'), 0.2);
});

test('isSci passes whitelist ISSN or if_proxy threshold', () => {
  assert.equal(isSci({ issn: '0021-972X' }), true);                 // JCEM whitelist
  assert.equal(isSci({ issn: '9999-9999', ifProxy: 5 }), true);     // ifProxy fallback
  assert.equal(isSci({ issn: '9999-9999', ifProxy: 1 }), false);    // neither
  assert.equal(isSci({ ifProxy: null }), false);
});

test('normalize clamps and handles flat range', () => {
  assert.equal(normalize(5, 0, 10), 0.5);
  assert.equal(normalize(-3, 0, 10), 0);
  assert.equal(normalize(99, 0, 10), 1);
  assert.equal(normalize(5, 4, 4), 0); // max==min
});

test('qualityScore is 0..100 and rewards higher RCR within batch', () => {
  const papers = [
    { rcr: 3.0, ifProxy: 8, citationCount: 200, year: 2022, studyType: 'rct' },
    { rcr: 0.5, ifProxy: 2, citationCount: 10,  year: 2012, studyType: 'review' },
  ];
  const b = computeBatchStats(papers);
  const hi = qualityScore(papers[0], b, 2026);
  const lo = qualityScore(papers[1], b, 2026);
  assert.ok(hi >= 0 && hi <= 100);
  assert.ok(lo >= 0 && lo <= 100);
  assert.ok(hi > lo);
});

test('computeBatchStats handles empty array without Infinity', () => {
  const b = computeBatchStats([]);
  assert.equal(Number.isFinite(b.rcrMax), true);
});
```

- [ ] **Step 3: 빌드 후 테스트 실패 확인**

Run: `cd ai-server && npm run build && node --test __tests__/journalQuality.test.mjs`
Expected: FAIL — `Cannot find module '../dist/services/journalQuality.js'` (아직 미구현).

- [ ] **Step 4: journalQuality.ts 구현**

`ai-server/src/services/journalQuality.ts`:

```ts
import { WHITELIST_ISSNS } from '../data/journalWhitelist.js';

export const IF_THRESHOLD = 3;          // OpenAlex 2yr mean citedness 하한 (whitelist 미스 폴백)
export const WEIGHTS = { rcr: 0.40, ifProxy: 0.25, logCite: 0.20, recency: 0.10, studyGrade: 0.05 };

const STUDY_GRADE: Record<string, number> = {
  meta_analysis: 1.0, systematic_review: 0.9, rct: 0.8, cohort: 0.6,
  case_control: 0.5, cross_sectional: 0.4, review: 0.3, other: 0.2,
};

export function studyTypeFromPubTypes(types: string[]): string {
  const t = types.map((s) => s.toLowerCase());
  const has = (x: string) => t.some((s) => s.includes(x));
  if (has('meta-analysis')) return 'meta_analysis';
  if (has('systematic review')) return 'systematic_review';
  if (has('randomized controlled trial')) return 'rct';
  if (has('cohort')) return 'cohort';
  if (has('case-control')) return 'case_control';
  if (has('cross-sectional') || has('observational study')) return 'cross_sectional';
  if (has('review')) return 'review';
  return 'other';
}

export function studyGrade(studyType: string): number {
  return STUDY_GRADE[studyType] ?? 0.2;
}

export function isSci(opts: { issn?: string; ifProxy?: number | null }): boolean {
  if (opts.issn && WHITELIST_ISSNS.has(opts.issn)) return true;
  if (typeof opts.ifProxy === 'number' && opts.ifProxy >= IF_THRESHOLD) return true;
  return false;
}

export function normalize(v: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  const x = (v - min) / (max - min);
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export interface PaperMetrics {
  rcr: number | null; ifProxy: number | null; citationCount: number; year: number | null; studyType: string;
}
export interface BatchStats {
  rcrMin: number; rcrMax: number; ifMin: number; ifMax: number; logCiteMin: number; logCiteMax: number;
}

export function computeBatchStats(papers: PaperMetrics[]): BatchStats {
  if (!papers.length) return { rcrMin: 0, rcrMax: 0, ifMin: 0, ifMax: 0, logCiteMin: 0, logCiteMax: 0 };
  const rcrs = papers.map((p) => p.rcr ?? 0);
  const ifs = papers.map((p) => p.ifProxy ?? 0);
  const lc = papers.map((p) => Math.log((p.citationCount ?? 0) + 1));
  return {
    rcrMin: Math.min(...rcrs), rcrMax: Math.max(...rcrs),
    ifMin: Math.min(...ifs), ifMax: Math.max(...ifs),
    logCiteMin: Math.min(...lc), logCiteMax: Math.max(...lc),
  };
}

export function qualityScore(p: PaperMetrics, b: BatchStats, currentYear: number): number {
  const rcrN = normalize(p.rcr ?? 0, b.rcrMin, b.rcrMax);
  const ifN = normalize(p.ifProxy ?? 0, b.ifMin, b.ifMax);
  const logCiteN = normalize(Math.log((p.citationCount ?? 0) + 1), b.logCiteMin, b.logCiteMax);
  const recency = p.year ? normalize(p.year, currentYear - 10, currentYear) : 0;
  const gradeN = studyGrade(p.studyType);
  const s = WEIGHTS.rcr * rcrN + WEIGHTS.ifProxy * ifN + WEIGHTS.logCite * logCiteN
          + WEIGHTS.recency * recency + WEIGHTS.studyGrade * gradeN;
  return Math.round(s * 1000) / 10; // 0..100, 소수 1자리
}
```

- [ ] **Step 5: 빌드 후 테스트 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/journalQuality.test.mjs`
Expected: PASS — 6개 테스트 모두 통과.

- [ ] **Step 6: Commit**

```bash
git add ai-server/src/data/journalWhitelist.ts ai-server/src/services/journalQuality.ts ai-server/__tests__/journalQuality.test.mjs
git commit -m "feat(evidence): journal whitelist + SCI gate + quality scoring (pure)"
```

---

### Task 4: openalex.ts — work/source 파서 + PMID fetch

**Files:**
- Create: `ai-server/src/services/openalex.ts`
- Test: `ai-server/__tests__/openalex.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`ai-server/__tests__/openalex.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenAlexWork, parseOpenAlexSource } from '../dist/services/openalex.js';

const workJson = {
  id: 'https://openalex.org/W2741809807',
  doi: 'https://doi.org/10.1210/jc.2021-001',
  publication_year: 2021,
  cited_by_count: 145,
  type: 'article',
  primary_location: {
    source: {
      id: 'https://openalex.org/S125754415',
      display_name: 'The Journal of Clinical Endocrinology and Metabolism',
      issn_l: '0021-972X',
      issn: ['0021-972X', '1945-7197'],
    },
  },
};

test('parseOpenAlexWork strips prefixes and picks issn_l', () => {
  const w = parseOpenAlexWork(workJson);
  assert.equal(w.openalexId, 'W2741809807');
  assert.equal(w.doi, '10.1210/jc.2021-001');
  assert.equal(w.year, 2021);
  assert.equal(w.citedByCount, 145);
  assert.equal(w.type, 'article');
  assert.equal(w.sourceId, 'S125754415');
  assert.equal(w.issn, '0021-972X');
  assert.match(w.journalName, /Clinical Endocrinology/);
});

test('parseOpenAlexWork tolerates missing source', () => {
  const w = parseOpenAlexWork({ id: 'https://openalex.org/W1', cited_by_count: 0 });
  assert.equal(w.sourceId, '');
  assert.equal(w.issn, '');
  assert.equal(w.citedByCount, 0);
});

test('parseOpenAlexSource reads 2yr_mean_citedness as ifProxy', () => {
  const s = parseOpenAlexSource({ summary_stats: { '2yr_mean_citedness': 6.4, h_index: 410 } });
  assert.equal(s.ifProxy, 6.4);
  assert.equal(s.hIndex, 410);
});

test('parseOpenAlexSource defaults null when stats missing', () => {
  const s = parseOpenAlexSource({});
  assert.equal(s.ifProxy, null);
  assert.equal(s.hIndex, null);
});
```

- [ ] **Step 2: 빌드 후 테스트 실패 확인**

Run: `cd ai-server && npm run build && node --test __tests__/openalex.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: openalex.ts 구현**

`ai-server/src/services/openalex.ts`:

```ts
export interface OpenAlexWork {
  openalexId: string; doi: string; year: number | null; citedByCount: number;
  type: string; sourceId: string; issn: string; journalName: string;
}
export interface OpenAlexSourceStats { ifProxy: number | null; hIndex: number | null; }

const strip = (url: string | null | undefined, prefix: string) => (url ?? '').replace(prefix, '');

export function parseOpenAlexWork(j: any): OpenAlexWork {
  const src = j?.primary_location?.source ?? {};
  const issn = src.issn_l || (Array.isArray(src.issn) ? src.issn[0] : '') || '';
  return {
    openalexId: strip(j?.id, 'https://openalex.org/'),
    doi: strip(j?.doi, 'https://doi.org/'),
    year: typeof j?.publication_year === 'number' ? j.publication_year : null,
    citedByCount: Number(j?.cited_by_count ?? 0),
    type: String(j?.type ?? ''),
    sourceId: strip(src.id, 'https://openalex.org/'),
    issn,
    journalName: String(src.display_name ?? ''),
  };
}

export function parseOpenAlexSource(j: any): OpenAlexSourceStats {
  const s = j?.summary_stats ?? {};
  const ifp = s['2yr_mean_citedness'];
  return {
    ifProxy: typeof ifp === 'number' ? ifp : null,
    hIndex: typeof s.h_index === 'number' ? s.h_index : null,
  };
}

const OA = 'https://api.openalex.org';
const sourceCache = new Map<string, OpenAlexSourceStats>();

/** PMID → OpenAlex work 메트릭 + 저널 if_proxy(소스 캐시). 못 찾으면 null. */
export async function fetchOpenAlexByPmid(
  pmid: string, mailto = '',
): Promise<(OpenAlexWork & OpenAlexSourceStats) | null> {
  const m = mailto ? `&mailto=${encodeURIComponent(mailto)}` : '';
  const r = await fetch(`${OA}/works/pmid:${pmid}?select=id,doi,publication_year,cited_by_count,type,primary_location${m}`);
  if (!r.ok) return null;
  const work = parseOpenAlexWork(await r.json());
  let stats: OpenAlexSourceStats = { ifProxy: null, hIndex: null };
  if (work.sourceId) {
    const cached = sourceCache.get(work.sourceId);
    if (cached) stats = cached;
    else {
      const sr = await fetch(`${OA}/sources/${work.sourceId}?select=summary_stats${m}`);
      if (sr.ok) { stats = parseOpenAlexSource(await sr.json()); sourceCache.set(work.sourceId, stats); }
    }
  }
  return { ...work, ...stats };
}
```

- [ ] **Step 4: 빌드 후 테스트 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/openalex.test.mjs`
Expected: PASS — 4개 테스트 통과.

- [ ] **Step 5: (선택) 실제 API smoke**

Run: `cd ai-server && node -e "import('./dist/services/openalex.js').then(async m=>console.log(await m.fetchOpenAlexByPmid('28218914')))"`
Expected: `{ openalexId:'W...', citedByCount:>0, issn:'...', ifProxy:<number|null>, ... }` (네트워크 확인용, 실패해도 단위테스트와 무관).

- [ ] **Step 6: Commit**

```bash
git add ai-server/src/services/openalex.ts ai-server/__tests__/openalex.test.mjs
git commit -m "feat(evidence): OpenAlex enrichment (citations, journal, if_proxy)"
```

---

### Task 5: icite.ts — RCR 파서 + 배치 fetch

**Files:**
- Create: `ai-server/src/services/icite.ts`
- Test: `ai-server/__tests__/icite.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`ai-server/__tests__/icite.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseICite } from '../dist/services/icite.js';

const j = { data: [
  { pmid: 28218914, citation_count: 145, relative_citation_ratio: 2.34, is_research_article: 'Yes' },
  { pmid: 99999999, citation_count: 0,   relative_citation_ratio: null, is_research_article: false },
] };

test('parseICite maps by pmid string with rcr and research flag', () => {
  const m = parseICite(j);
  assert.equal(m.get('28218914').rcr, 2.34);
  assert.equal(m.get('28218914').citationCount, 145);
  assert.equal(m.get('28218914').isResearchArticle, true);
  assert.equal(m.get('99999999').rcr, null);       // 최신 논문 RCR 미산출 허용
  assert.equal(m.get('99999999').isResearchArticle, false);
});

test('parseICite tolerates empty/malformed', () => {
  assert.equal(parseICite({}).size, 0);
  assert.equal(parseICite({ data: null }).size, 0);
});
```

- [ ] **Step 2: 빌드 후 테스트 실패 확인**

Run: `cd ai-server && npm run build && node --test __tests__/icite.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: icite.ts 구현**

`ai-server/src/services/icite.ts`:

```ts
export interface ICiteMetric { rcr: number | null; citationCount: number; isResearchArticle: boolean; }

export function parseICite(j: any): Map<string, ICiteMetric> {
  const out = new Map<string, ICiteMetric>();
  const data = Array.isArray(j?.data) ? j.data : [];
  for (const d of data) {
    const pmid = String(d?.pmid ?? '');
    if (!pmid) continue;
    const rcrRaw = d?.relative_citation_ratio;
    const ira = d?.is_research_article;
    out.set(pmid, {
      rcr: typeof rcrRaw === 'number' ? rcrRaw : null,
      citationCount: Number(d?.citation_count ?? 0),
      isResearchArticle: ira === true || ira === 'Yes' || ira === 'yes',
    });
  }
  return out;
}

const ICITE = 'https://icite.od.nih.gov/api/pubs';

/** PMID 배열 → RCR/피인용 맵. 400개씩 배치. 실패 배치는 skip. */
export async function fetchICite(pmids: string[]): Promise<Map<string, ICiteMetric>> {
  const merged = new Map<string, ICiteMetric>();
  const BATCH = 400;
  for (let i = 0; i < pmids.length; i += BATCH) {
    const slice = pmids.slice(i, i + BATCH);
    if (!slice.length) continue;
    try {
      const r = await fetch(`${ICITE}?pmids=${slice.join(',')}`);
      if (!r.ok) continue;
      const part = parseICite(await r.json());
      for (const [k, v] of part) merged.set(k, v);
    } catch { /* skip batch */ }
  }
  return merged;
}
```

- [ ] **Step 4: 빌드 후 테스트 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/icite.test.mjs`
Expected: PASS — 2개 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/icite.ts ai-server/__tests__/icite.test.mjs
git commit -m "feat(evidence): NIH iCite RCR enrichment (field-normalized citations)"
```

---

## Chunk 2: 오케스트레이션 + 적재 + 문서

### Task 6: ingest-evidence.mjs — 15주제축 오케스트레이터

기존 [`ingest-papers.mjs`](../../../ai-server/scripts/ingest-papers.mjs) 패턴(env 로드·supabase·rate limit·embedText try/catch)을 그대로 따르되, Task 2~5 의 enrich/게이트/점수를 끼워 넣는다. **임베딩은 키 있을 때만**(없으면 null), **korean_summary/key_finding 은 Phase 1 에서 생성 안 함**(빈 문자열, Phase 2 백필).

**Files:**
- Create: `ai-server/scripts/ingest-evidence.mjs`

- [ ] **Step 1: 스크립트 작성**

`ai-server/scripts/ingest-evidence.mjs`:

```js
// ai-server/scripts/ingest-evidence.mjs
// 15 주제축 PubMed 발굴 → OpenAlex/iCite enrich → SCI 게이트 → 품질점수 랭킹 → top-N
//   → 인종 태깅 → (Gemini 키 있으면) 임베딩 → evidence_papers upsert.
// 사용:
//   node scripts/ingest-evidence.mjs                 # 전체 적재 (실 DB write)
//   node scripts/ingest-evidence.mjs --dry-run       # DB write 없이 랭킹 표만 출력
//   node scripts/ingest-evidence.mjs --dry-run --limit 5 --only growth_hormone  # 빠른 smoke
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { searchPmids, fetchAbstracts } from '../dist/services/pubmed.js';
import { fetchOpenAlexByPmid } from '../dist/services/openalex.js';
import { fetchICite } from '../dist/services/icite.js';
import { studyTypeFromPubTypes, isSci, computeBatchStats, qualityScore } from '../dist/services/journalQuality.js';
import { tagPopulation } from '../dist/services/populationTagger.js';
import { embedText } from '../dist/services/gemini.js';

function loadEnv(p){const e={};for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2];}return e;}
const env = loadEnv(new URL('../.env', import.meta.url).pathname.replace(/^\//,''));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const MAILTO = env.OPENALEX_MAILTO || '';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
function argVal(name){ // "--name value" 와 "--name=value" 둘 다 지원
  const eq = args.find(a=>a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const i = args.indexOf(name);
  return (i>=0 && args[i+1] && !args[i+1].startsWith('--')) ? args[i+1] : '';
}
const LIMIT = Number(argVal('--limit')) || 0;   // PubMed 후보 수(retmax). ⚠️ 보존 수 아님(보존=KEEP_TOP)
const ONLY = argVal('--only');                  // 단일 테마만 실행
const CURRENT_YEAR = Number(env.INGEST_YEAR) || 2026; // Date.now 회피(재현성) — 필요시 .env 로 조정
const CANDIDATES = LIMIT || 50;   // 테마당 PubMed 후보 폭(발굴), SCI 게이트로 줄어듦
const KEEP_TOP = 18;              // SCI 게이트 후 보존 상위 N

const TOPICS = {
  // 기존 8 (clinical)
  growth_hormone: 'growth hormone therapy children final height',
  bone_age: 'bone age prediction adult height children',
  precocious_puberty: 'central precocious puberty GnRH agonist height',
  aromatase_inhibitor: 'aromatase inhibitor short stature boys height',
  obesity_growth: 'childhood obesity growth puberty timing',
  sleep_growth: 'sleep growth hormone secretion children',
  nutrition_growth: 'nutrition catch-up growth children stature',
  vitamin_d_growth: 'vitamin D children growth bone',
  // 신규 7 (마케팅 과학)
  height_genetics: 'heritability of height children GWAS stature genetics',
  physical_activity: 'physical activity exercise jumping children height growth',
  psychosocial: 'psychosocial stress emotional deprivation children growth',
  diet_specifics: 'dairy milk protein sugar intake children growth stature',
  puberty_environment: 'obesity endocrine disruptor early puberty timing children',
  catch_up_SGA: 'small for gestational age catch-up growth final height',
  final_height_prediction: 'predicted adult height mid-parental target height accuracy',
};

const sleep = (ms) => new Promise((r)=>setTimeout(r, ms));

async function run() {
  const themes = Object.entries(TOPICS).filter(([k]) => !ONLY || k === ONLY);
  for (const [topic, query] of themes) {
    const pmids = await searchPmids(query, CANDIDATES);
    const arts = await fetchAbstracts(pmids);
    const icite = await fetchICite(arts.map(a=>a.pmid));

    // enrich
    const enriched = [];
    for (const a of arts) {
      if (!a.abstract || a.abstract.length < 80) continue;
      let oa = null;
      try { oa = await fetchOpenAlexByPmid(a.pmid, MAILTO); } catch { /* graceful */ }
      const ic = icite.get(a.pmid);
      const issn = oa?.issn || '';
      const ifProxy = oa?.ifProxy ?? null;
      if (!isSci({ issn, ifProxy })) continue;             // SCI 게이트
      enriched.push({
        art: a,
        issn, ifProxy,
        openalexId: oa?.openalexId || '',
        doi: a.doi || oa?.doi || '',
        citationCount: ic?.citationCount ?? oa?.citedByCount ?? 0,
        rcr: ic?.rcr ?? null,
        year: a.year ?? oa?.year ?? null,
        studyType: studyTypeFromPubTypes(a.publicationTypes),
      });
      await sleep(120); // OpenAlex polite pacing
    }

    // 점수 랭킹
    const metrics = enriched.map(e => ({ rcr:e.rcr, ifProxy:e.ifProxy, citationCount:e.citationCount, year:e.year, studyType:e.studyType }));
    const stats = computeBatchStats(metrics);
    for (const e of enriched) e.score = qualityScore(
      { rcr:e.rcr, ifProxy:e.ifProxy, citationCount:e.citationCount, year:e.year, studyType:e.studyType }, stats, CURRENT_YEAR);
    enriched.sort((a,b)=>b.score-a.score);
    const kept = enriched.slice(0, KEEP_TOP);

    if (DRY) {
      console.log(`\n=== ${topic} (후보 ${arts.length} → SCI ${enriched.length} → top ${kept.length}) ===`);
      for (const e of kept) console.log(
        `${String(e.score).padStart(5)} | ${e.art.year} | rcr ${e.rcr ?? '-'} | cite ${e.citationCount} | if ${e.ifProxy ?? '-'} | ${e.studyType.padEnd(16)} | ${e.art.journal.slice(0,34)}`);
      continue;
    }

    // 적재
    let n = 0;
    for (const e of kept) {
      const pop = tagPopulation({ abstract: e.art.abstract, affiliation: e.art.affiliation });
      let embedding = null;
      try { embedding = await embedText(`${e.art.title}\n${e.art.abstract}`); } catch (err) { console.warn('embed fail', e.art.pmid, err.message); }
      const { error } = await sb.from('evidence_papers').upsert({
        pmid: e.art.pmid, title: e.art.title, abstract: e.art.abstract, journal: e.art.journal, year: e.year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${e.art.pmid}/`, topic,
        pop_group: pop.group, pop_country: pop.country, pop_confidence: pop.confidence, embedding,
        doi: e.doi, openalex_id: e.openalexId, journal_issn: e.issn,
        citation_count: e.citationCount, rcr: e.rcr, if_proxy: e.ifProxy,
        study_type: e.studyType, is_sci: true, quality_score: e.score,
      }, { onConflict: 'pmid' });
      if (!error) n++; else console.warn('upsert fail', e.art.pmid, error.message);
      await sleep(400);
    }
    const avg = kept.length ? (kept.reduce((s,e)=>s+e.score,0)/kept.length).toFixed(1) : '0';
    console.log(`${topic}: stored ${n}/${kept.length} (avg score ${avg})`);
  }
  console.log('done.');
}
run().catch((e)=>{ console.error(e); process.exit(1); });
```

- [ ] **Step 2: dry-run smoke (실 API, DB write 없음)**

Run: `cd ai-server && npm run build && node scripts/ingest-evidence.mjs --dry-run --limit 8 --only growth_hormone`
Expected: `=== growth_hormone (후보 8 → SCI N → top N ===` 헤더 + 점수 내림차순 표(JCEM/Horm Res 등 화이트리스트 저널이 상위, score 0~100). **확인 포인트**: (1) is_sci 통과한 저널이 실제 top 저널인지, (2) score 가 RCR·IF 높은 최신 논문에 높게 붙는지(2010 평범 논문이 2022 핵심 논문보다 위면 가중치 재검토), (3) 후보 저널 ISSN 이 화이트리스트와 매칭되는지(미스인데 ifProxy 로 통과하면 화이트리스트 ISSN 보강 후보).

- [ ] **Step 3: dry-run 전체 테마 점검**

Run: `cd ai-server && node scripts/ingest-evidence.mjs --dry-run --limit 40`
Expected: 15개 테마 전부 헤더 출력, 각 테마 SCI 통과 ≥10 권장(실 적재 Task 7 과 동일 후보폭 40으로 검증). SCI 통과 <5 인 테마는 쿼리 조정 또는 화이트리스트 보강 대상(로그로 식별). (네트워크 ~5~8분 소요)

- [ ] **Step 4: Commit**

```bash
git add ai-server/scripts/ingest-evidence.mjs
git commit -m "feat(evidence): 15-theme ingestion orchestrator with quality ranking (dry-run verified)"
```

---

### Task 7: 실 적재 + DB 검증 + 문서

**Files:**
- Modify: `ai-server/CLAUDE.md`

- [ ] **Step 1: 소규모 실 적재 (1테마)**

Run: `cd ai-server && node scripts/ingest-evidence.mjs --only growth_hormone`
Expected: `growth_hormone: stored N/M (avg score X)` (임베딩 키 없으면 `embed fail` 경고는 정상 — embedding 만 null, 나머지 컬럼 적재됨).

- [ ] **Step 2: DB 검증**

Dashboard SQL Editor(또는 MCP `execute_sql`):

```sql
select pmid, journal, year, study_type, is_sci, citation_count, rcr, if_proxy, round(quality_score,1) as score
from evidence_papers where topic='growth_hormone' order by quality_score desc limit 10;
```

Expected: 행 존재, `is_sci=true` 전부, `quality_score` 내림차순, 품질 컬럼 채워짐(임베딩만 null 가능). 값이 비합리적이면(예: 전부 score 0, rcr 전부 null) Task 6 enrich 연결 점검.

- [ ] **Step 3: 전체 적재**

Run: `cd ai-server && node scripts/ingest-evidence.mjs`
Expected: 15개 테마 `stored` 로그. 총 적재량 확인:

```sql
select topic, count(*) , round(avg(quality_score),1) avg_score, count(embedding) embedded
from evidence_papers group by topic order by topic;
```

Expected: 15개 테마 각 ~10~18행, embedded 는 Gemini 키 상태에 따라 0(키 없음) 또는 채워짐.

- [ ] **Step 4: 문서 업데이트**

`ai-server/CLAUDE.md` 의 Structure(services) 와 Endpoints 사이에 항목 추가:

```markdown
## Research Evidence Library (Phase 1)
- 논문 품질 라이브러리 적재 파이프라인. `scripts/ingest-evidence.mjs` — 15 주제축 PubMed 발굴 → OpenAlex(`openalex.ts`, 피인용·저널 if_proxy) + iCite(`icite.ts`, RCR) enrich → `journalQuality.ts`(화이트리스트 SCI 게이트 + 합성 quality_score) 랭킹 → top-N `evidence_papers` upsert. 전부 무키(PubMed/OpenAlex/iCite). 임베딩만 Gemini(없으면 null, Phase 2 백필).
- 사용: `node scripts/ingest-evidence.mjs [--dry-run] [--limit N] [--only <topic>]`. 화이트리스트 = `src/data/journalWhitelist.ts`(원장 큐레이션). (선택) `.env` `OPENALEX_MAILTO` = OpenAlex polite-pool 우선순위(없어도 동작).
- 마이그레이션 048(evidence_papers 품질 컬럼). 마케팅 연결(article_evidence_links·RAG)은 Phase 2.
```

- [ ] **Step 5: 전체 테스트 회귀 확인**

Run: `cd ai-server && npm run build && npm test`
Expected: 신규 4개 테스트 파일 + 기존 테스트 전부 PASS.

- [ ] **Step 6: Commit**

```bash
git add ai-server/CLAUDE.md
git commit -m "docs(ai-server): document research evidence library phase 1 pipeline"
```

---

## 완료 기준 (Phase 1 Definition of Done) — ✅ 완료 (2026-06-10)
- [x] 마이그레이션 048 적용, `evidence_papers` 에 품질 컬럼 12개 존재 (txirmof).
- [x] `npm test` 48/48 통과(pubmed 확장 + journalQuality + openalex + icite).
- [x] `evidence_papers` 에 15개 테마 SCI 논문 적재 — **250편**(`is_sci=true`·`quality_score` 채워짐), 총 281행, 기존 35 임베딩 보존.
- [x] dry-run 으로 랭킹 합리성 확인(Lancet/Nature/Endocrine Reviews 등 cite 300~1064·RCR 30~48 랜드마크 상위).
- [x] ai-server/CLAUDE.md 문서화.
- [x] **(Phase 2 ① 완료, 2026-06-10)** 임베딩 백필 완료 — 새 Gemini 키로 `gemini-embedding-001` 768d, `scripts/backfill-embeddings.mjs`(`embedding IS NULL` 행만, resume 가능) 로 **281/281 NULL=0**. `validate-evidence-search.mjs` 교차언어(한국어↔영어) 검증 통과. 상세 memory `research_evidence_library.md`·`blog_evidence_references.md`.

## 구현 노트 (실제 적용된 변경, 2026-06-10)
통합 중 dry-run 으로 발견·수정한 계획 대비 차이(코드는 working tree 가 정본):
- **PubMed `sort=relevance`**: 기본 정렬이 최신순이라 후보가 전부 갓 나온 0-피인용 논문 → 랭킹 무력화. `searchPmids(q, n, sort)` 에 sort 파라미터(비파괴) 추가, orchestrator 가 `'relevance'` 전달 → 랜드마크·고피인용 논문 후보화.
- **얇은 테마 쿼리 OR-broaden**: 긴 공백 AND 쿼리(예 `dairy milk protein sugar intake...`)가 PubMed 거의 0건 → `(milk OR dairy OR protein OR calcium) children growth height` 식으로 4개 테마(diet_specifics·final_height_prediction·puberty_environment·psychosocial) 수정.
- **HTML 엔티티 디코딩**: `strip()` 에 `&amp;` 등 디코딩 추가(공개 인용용 깨끗한 텍스트).
- **무키 모드 `--no-embed`** + **gemini lazy import** + `.env`→`process.env` 주입: ESM import-time `GEMINI_API_KEY` throw 회피, 무키로 DB 완주.
- **임베딩 보존 upsert**: 임베딩 성공 시에만 `embedding` 컬럼 기록 → `--no-embed` 재적재가 기존 35행 임베딩을 null 로 덮어쓰지 않음.
- **`topic` 단일값 한계**: 다(多)테마 논문은 마지막 처리 테마로 태깅(upsert by pmid) → 테마별 행수 불균등(bone_age 10 등). 250편 다 존재, Phase 2 의미매칭은 topic 무관이라 영향 없음.

## 후속 (이 plan 범위 밖)
- **Phase 2**: `article_evidence_links` 마이그레이션 + `POST /api/knowledge/link-article|link-all` + 교차언어 매칭 sanity check + contentPrompts RAG 주입 + korean_summary/key_finding 백필.
- **Phase 3**: admin "근거 논문" 패널(confirm/reject) + 공개 배지 + JSON-LD citation.
