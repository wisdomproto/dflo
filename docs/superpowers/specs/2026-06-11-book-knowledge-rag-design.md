# 원장 저서 RAG 통합 — 「우리 아이 키 성장 바이블」 (Book Knowledge RAG)

**날짜**: 2026-06-11
**상태**: ✅ 구현 완료 (2026-06-11) — 227청크 적재·66/66 테스트·end-to-end 회수검증. **migration 056** 적용됨 (원래 053→원격 053~055 선점으로 renumber, RPC chunk_index 반환 추가 + drop function 선행)
**부모/자매**: 클리니컬 RAG ([[clinical_rag_deepening]] — evidence_papers + clinical_insights). 본 스펙 = **3번째 지식 소스(원장 저서)** 추가.

## 1. 목적
원장(채용현)의 저서 **「우리 아이 키 성장 바이블」**(264p, 약 17만자)을 청크·임베딩해 RAG **범용 지식베이스**로 추가. 기존 `searchKnowledge`(논문 + 인사이트)에 **도서**를 3번째 소스로 통합. **책 = 이 클리닉의 1차 권위 소스**(원장의 실제 진료 철학·방침), 국제 논문은 보조 근거. 처방추천에 즉시 활용 + 추후 마케팅·챗봇 재사용.

**생성 없음**: 청킹(기계적) + 임베딩(벡터)만 — 텍스트 생성 0. Gemini 생성 안 씀. 임베딩만 `gemini-embedding-001`(생성 2.5-flash와 **별개 모델·쿼터**, 막힌 적 없음; 사용자 승인). 청킹 스크립트는 Claude가 작성·실행(결정적).

## 2. 현재 상태 (조사)
- 검색 `knowledgeRetrieval.searchKnowledge(query, {kPapers, kInsights})` → `embedText` + **2 병렬 RPC**(`match_evidence_papers`, `match_clinical_insights`) → `{papers, insights}`.
- rx-recommend 라우트(`routes/knowledge.ts`): `searchKnowledge(kPapers:5, kInsights:0)` → `buildRxPrompt({profile,labText,cohortMeds,papers})` → `generateText`.
- `buildRxPrompt`(`rxRecommend.ts`): **papers만 주입**(insights 미사용).
- 책 콘텐츠는 시스템에 없음(신규).
- 테이블/RPC 패턴: `clinical_insights`(migration 036) = `{id, category, cohort_n, stats, composite_case, summary, embedding}` + RLS anon/auth all + `match_clinical_insights(emb, k=3)`. 신규 테이블은 이를 미러.

## 3. 문서 분석 (PyMuPDF 확인)
- 264p, ~172K자 한국어 산문. 원장 직접 저술(2025-10, Oh!kooB 출간).
- 구조: ~6-7개 장("N장｜제목"). 각 장 = 타이틀 페이지(예 p17 "1장 아이 키, 정말 더 자랄 수 있을까요?") + 빈 페이지(0자) + 본문 페이지(러닝헤더 "N장｜제목" + 선두 페이지번호 = 노이즈).
- **청킹 제외**: 앞부분 p1-16(표지·일러두기·헌사), 뒷부분 p256-263(**참고문헌 목록** — 산문 아님), p264(판권).
- **청킹 대상**: p17-255 본문. 러닝헤더·페이지번호 제거.

## 4. 스코프
### In
1. **추출+청킹** (Python `cases/extract_book.py`, PyMuPDF): PDF → 본문 텍스트 → 장 구분 → ~800자 청크 → `cases/book-chunks.json`.
2. **임베딩+저장** (node `ai-server/scripts/ingest-book.mjs`): chunks → `embedText`(gemini-embedding-001) → `knowledge_documents`.
3. **스토리지** (migration 056): `knowledge_documents` 테이블 + `match_knowledge_documents` RPC.
4. **검색 통합** (knowledgeRetrieval.ts): `searchKnowledge` 3번째 소스 → `documents`.
5. **처방추천 주입** (rxRecommend.ts + route): `buildRxPrompt`에 "원장님 진료 철학(저서)" 섹션 — 1차 권위 framing.

### Out (후속/별도)
- 마케팅 콘텐츠 생성 RAG 주입(후속 스펙) · 환자 챗봇(후속).
- 모달에 도서 인용 표시(선택, 추후).
- 책 말미 참고문헌 목록 → `evidence_papers` 링크(추후 가능, 지금 X).
- 추가 문서(현재 이 책 1권만; 테이블은 다중 source 지원).

## 5. 데이터 모델
### migration 056 — `knowledge_documents` (clinical_insights 미러)
```sql
create extension if not exists vector;
create table if not exists knowledge_documents (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default '',   -- '우리 아이 키 성장 바이블'
  author      text default '',            -- '채용현 (원장)'
  chapter     text default '',            -- 'N장｜제목' (인용·맥락)
  chunk_index int default 0,              -- 책 내 순서
  content     text not null default '',   -- 청크 본문 (한국어)
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

## 6. 유닛 상세

### 유닛 1 — 추출+청킹 (Python, 결정적, 생성 없음)
- `cases/extract_book.py` (PyMuPDF `fitz`). 인자 = **PDF 로컬 경로**(CLI arg; 사용자가 Drive 에서 받아둔 파일 — 도구는 Drive 직접 접근 X). 출력 = `cases/book-chunks.json` `[{source, author, chapter, chunk_index, content}]`.
- 로직: p17-255만 처리 → 장 추적(타이틀 페이지 "N장 …" 단독 + 본문 러닝헤더 "N장｜제목" 파싱) → 페이지 노이즈 제거(선두 페이지번호 라인, 러닝헤더 라인) → 장별 텍스트 이어붙여 **~800자 윈도우**(문장 경계서 끊고 인접 청크 ~1문장 오버랩) → 청크마다 chapter 태그 + 전역 chunk_index.
- **순수 함수 `chunk_text(text, size=800, overlap=120)` 분리** → 파이썬 단위테스트(경계·오버랩·빈입력·짧은 입력).
- PDF 는 외부(Drive)·저작물이라 repo 미커밋. `book-chunks.json` 은 중간 산출(gitignore). 커밋 산출 = 스크립트만. DB 의 임베딩 청크가 실제 자산.

### 유닛 2 — 임베딩+저장 (node)
- `ai-server/scripts/ingest-book.mjs`: `../../cases/book-chunks.json`(또는 인자 경로) 로드 → **재적재 안전**: `delete from knowledge_documents where source=<book>` 후 재삽입(책 1권, 단순). 각 청크 `embedText(`${chapter}\n${content}`)`(장 맥락 포함 — evidence_papers title+abstract 패턴) → insert. 700ms 페이싱(임베딩 쿼터 여유), 실패 청크 skip+경고. `--dry-run`(개수만).

### 유닛 3 — 검색 통합 (knowledgeRetrieval.ts)
- `KnowledgeResult`에 `documents: Array<{id, source, author, chapter, content, similarity}>` 추가.
- `searchKnowledge(query, {kPapers, kInsights, kDocuments})`: 3번째 병렬 RPC `match_knowledge_documents(emb, kDocuments ?? 4)` → `documents` 반환. 기존 papers/insights 무변경.

### 유닛 4 — 처방추천 주입 (rxRecommend.ts + routes/knowledge.ts)
- 라우트: `searchKnowledge(... kDocuments:4)` → `documents`를 `buildRxPrompt`에 전달.
- `RxPromptInput`에 `bookPassages?: { chapter: string; content: string }[]` 추가. `buildRxPrompt`에 새 섹션(있을 때만):
  ```
  ## 원장님의 진료 철학·방침 (저서 「우리 아이 키 성장 바이블」 — 이 클리닉의 1차 기준)
  [{chapter}] {content}
  ...
  ```
  + 규칙에 추가: "추천은 **원장님 저서의 접근·방침을 우선** 따르고, 국제 논문은 이를 뒷받침하는 보조 근거로 쓴다." (책=1차 권위, 논문=보조)

## 7. 에러 처리
- 추출: PDF 못 열면 abort. 빈 장/페이지 skip. 러닝헤더 미검출 장은 'chapter 미상'으로라도 청킹(누락 방지).
- 임베딩: `embedText` 실패 청크 skip+경고(resume용 재실행 가능). 임베딩 쿼터는 생성과 별개·여유.
- 검색: documents RPC 실패 → 빈 배열(papers/insights 정상). `buildRxPrompt`는 bookPassages 없으면 섹션 생략(하위호환).

## 8. 테스트
- **Python 단위**: `chunk_text`(경계·오버랩·빈/짧은 입력).
- **TS 단위**: `buildRxPrompt` — bookPassages 있으면 "원장님 진료 철학" 섹션·"1차 기준" 규칙 포함, 없으면 생략. (기존 papers 테스트 무회귀.) ⚠️ `ai-server/__tests__/rxRecommend.test.mjs` 는 **이미 존재**(papers 테스트) → **append**(신규 파일 X, import 재선언 X). 테스트는 `dist/` import → `npm run build && npm test`.
- **빌드/타입**: `ai-server npm run build` + `npm test`.
- **수동**: ingest 후 `match_knowledge_documents` 샘플 쿼리("성조숙증 치료 방침" 등)로 관련 장 회수 확인. rx-recommend 호출 시 도서 발췌 주입 확인.

## 9. 결정 요약
| 항목 | 결정 |
|------|------|
| 임베딩 | gemini-embedding-001 (생성과 별개 쿼터). 청킹·텍스트는 Claude/script |
| 책 위상 | **1차 권위**(원장 저서), 논문=보조 근거 |
| 저장 | 신규 `knowledge_documents`(evidence_papers 재사용 X — 논문 컬럼 부적합), 다중 source 지원 |
| 청크 | ~800자, 문장경계+오버랩, 장 태그, `chapter\ncontent` 임베딩 |
| 통합 | searchKnowledge 3번째 소스, rx-recommend 즉시 주입 |
| migration | 056 (원래 053이었으나 원격 053~055 선점으로 renumber, 현재 최고 055) |
