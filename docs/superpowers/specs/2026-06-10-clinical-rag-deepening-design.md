# 클리니컬 RAG 심화 — 처방추천 근거 주입 + 논문 요약 (Phase 2 ③)

**날짜**: 2026-06-10
**상태**: ✅ 구현 완료 (2026-06-10, 코드) — 요약 생성·RPC(migration 051)·프롬프트 주입·모달 표시 전부. ⏳ migration 051 Dashboard 적용 + 요약 백필 재실행(2.5-flash 일일 쿼터 소진 19/281) 대기.
**부모**: 연구 근거 라이브러리 Phase 2 ③ (`research_evidence_library.md`, `2026-06-06-clinical-rag` 지식브레인). 자매(블로그 슬라이스) = `2026-06-10-blog-evidence-references-design.md`.

## 1. 목적
`evidence_papers`(281편, 임베딩 완료)를 **클리니컬 처방추천(AI 처방 추천)에 더 깊이 주입**하고, 논문별 **한국어 요약**을 생성해 의사에게 표시. 사용자 결정: Phase 2 ③ 범위 = **클리니컬 한정**(마케팅 블로그 근거화는 후속 스펙).

## 2. 현재 상태 (조사)
RAG 파이프라인은 **이미 배선**됐으나 **얕음**:
- 검색 `knowledgeRetrieval.searchKnowledge(query, {kPapers})` → `embedText` + `match_evidence_papers` RPC. 반환 `papers[]` = `{pmid,title,abstract,journal,year,url,pop_group,pop_confidence,similarity}` — **abstract 포함**.
- 라우트 `POST /api/knowledge/rx-recommend`(`routes/knowledge.ts`): 프로필+검사+코호트약물 구성 → `searchKnowledge(... k=5)` → `buildRxPrompt({profile,labText,cohortMeds,papers})` → `generateText` → `{recommendation, references: papers}`.
- 프롬프트 `rxRecommend.buildRxPrompt`: `RxPaperRef={title,journal?,year?,url?,pop_group?}` 를 `[n] title (journal year) · 인구:pop` 로만 포맷 — **abstract·findings 미주입** → LLM이 제목만 보고 추천. 프롬프트엔 이미 "## 근거 논문 … 본문에서 [번호]로 인용" 섹션·규칙 존재.
- UI `RxRecommendModal.tsx`: `references`(제목·저널·연도·인구배지) 표시 — **요약 없음**.
- `korean_summary`/`key_finding` 컬럼(migration 048): 281행 전부 빈 문자열, 아무 데서도 안 읽음.

→ **핵심**: (a) abstract 는 이미 검색되나 프롬프트로 안 흘러감(타입에 없음), (b) korean_summary/key_finding 은 미생성·미표시.

## 3. 스코프
### In
1. **논문 요약 생성** — 281편 `korean_summary`(한국어 1~2문장, 의사 관점) + `key_finding`(핵심 결론 한 줄, 효과크기/수치 포함) 배치 생성.
2. **프롬프트 주입 심화** — `buildRxPrompt` 가 논문당 **abstract(트렁케이트) + key_finding** 주입(제목만 → 실제 근거).
3. **검색이 요약 필드 반환** — `match_evidence_papers` RPC(migration 051)가 `korean_summary,key_finding` 도 반환 → 프롬프트·표시 양쪽이 한 검색으로 충족.
4. **모달 표시** — rx-recommend `references` 에 korean_summary/key_finding 포함 → `RxRecommendModal` 에 논문별 한국어 요약·핵심결론.

### Out (후속/별도)
- 마케팅 블로그/카드뉴스 생성 RAG 주입(후속 스펙).
- Phase 3 공개 인용 배지·JSON-LD.
- `match_clinical_insights`(인사이트) 경로 변경 — 본 스펙은 papers 만.
- 추천 결과 캐싱·이력.

## 4. 아키텍처 (4 유닛)
```
[유닛1 요약 생성 (배치, 1회성)]
 evidence_papers(korean_summary='') ─→ buildEvidenceSummaryPrompt(title,abstract)
   → Gemini generateText → parseSummaryResponse → {korean_summary,key_finding}
   → update 2컬럼 (scripts/backfill-summaries.mjs, resume-safe)

[런타임 rx-recommend 흐름 — 유닛2·3·4]
 searchKnowledge ─(RPC migration 051: +korean_summary,key_finding)→ papers[]
   → buildRxPrompt (유닛2: abstract+key_finding 주입) → generateText → recommendation
   → res {recommendation, references: papers}  → RxRecommendModal (유닛4: 요약 표시)
```

## 5. 데이터 모델
### migration 051 — RPC 반환 확장 (txirmof Dashboard)
`match_evidence_papers(...)` 가 `korean_summary text, key_finding text` 도 반환(기존 10컬럼 + 2). **반환 시그니처가 바뀌므로 `create or replace` 불가 → `drop function` 후 재생성**(Postgres 가 OUT 컬럼 변경 시 `cannot change return type of existing function` 에러). **하위호환**(유일 소비자 `searchKnowledge` 는 `pap.data ?? []` 전체 행 통과 → 기존 코드는 새 필드 무시; 스크립트측 evidenceMatch/attach-references 는 RPC 미사용). 컬럼 자체는 migration 048 에 이미 존재 — RPC 노출만.
```sql
drop function if exists match_evidence_papers(vector, int);  -- 반환 시그니처 변경 → create or replace 불가, drop 후 재생성
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

## 6. 유닛 상세
### 유닛 1 — 논문 요약 생성
- **순수 빌더** `buildEvidenceSummaryPrompt(title, abstract): string` (신규 `ai-server/src/services/evidenceSummary.ts`). Gemini 에 JSON `{korean_summary, key_finding}` 요청. 제약: 사실 기반·날조 금지·초록에 수치 없으면 "수치 미보고" 류로. korean_summary=의사 관점 1~2문장, key_finding=핵심 결론 한 줄(효과크기·수치 우선).
- **파서** `parseSummaryResponse(text): {korean_summary, key_finding}` (동 파일, 순수). 코드펜스(```json) 제거 + JSON.parse, 실패 시 throw(스크립트가 skip+경고).
- **배치 스크립트** `ai-server/scripts/backfill-summaries.mjs` (backfill-embeddings 패턴): `korean_summary` 빈 **AND `abstract` 비어있지 않은** 행 select(title-only 행은 skip — 매 resume 재선택·title-only 날조 방지) → 각 행 `generateText(buildEvidenceSummaryPrompt(title,abstract))` → parse → `update({korean_summary,key_finding}).eq('pmid',...)`. resume-safe(빈 행만), 700ms 페이싱 + 429 백오프, `--limit`/`--dry-run`. `.env`→process.env 주입 후 gemini 동적 import(ESM 키검사 회피).

### 유닛 2 — 프롬프트 주입 (`rxRecommend.ts`)
- `RxPaperRef` 에 `abstract?: string; key_finding?: string` 추가.
- `buildRxPrompt` 논문 포맷 변경: 논문당
  ```
  [n] title (journal year, 인구:pop)
     핵심: {key_finding}            # 있을 때만
     초록: {abstract 앞 ~600자}     # 있을 때만
  ```
  key_finding/abstract 없으면 기존 한 줄(하위호환). 라우트는 이미 `papers`(abstract·key_finding 포함, 유닛3 후) 를 그대로 넘김 — 구조적 타입 호환(추가 필드 무시).

### 유닛 3 — 검색 타입 (`knowledgeRetrieval.ts`)
- `KnowledgeResult.papers` 항목 타입에 `korean_summary: string; key_finding: string` 추가. RPC(migration 051)가 채워 반환 → 코드 변경은 타입뿐(런타임은 RPC 행 통과).

### 유닛 4 — 모달 표시 (v4)
- `clinicalRxService.ts` `RxReference` 타입에 `korean_summary?: string; key_finding?: string`.
- `RxRecommendModal.tsx`: 각 reference 제목 아래 `key_finding`(강조) + `korean_summary`(보조 텍스트) 표시(있을 때만). 기존 인구배지·링크 유지.
- (선택) `routes/knowledge.ts` 가 `references` 반환 전 각 paper 의 `abstract` 제거 — 프롬프트가 이미 소비·모달 미사용이라 5편×초록 페이로드 절감. korean_summary/key_finding 은 유지.

## 7. 에러 처리
- 요약 스크립트: Gemini 실패/파싱 실패 → 해당 pmid skip + 경고, 다음 진행(resume 로 재시도 가능). 빈 abstract 행 skip.
- RPC: 하위호환이라 기존 호출 안전. korean_summary 빈 행은 빈 문자열 반환 → 프롬프트/모달이 "있을 때만" 분기.
- rx-recommend: 기존 try/catch 유지. 요약 미생성 상태에서도 abstract 주입은 동작(유닛2가 유닛1과 독립적으로 가치).

## 8. 테스트
- **순수 단위** (`ai-server/__tests__/`): `buildEvidenceSummaryPrompt`(title·abstract 포함, JSON 2필드 요청 문구) · `parseSummaryResponse`(정상 JSON·코드펜스 래핑·malformed throw) · `buildRxPrompt`(papers 에 abstract/key_finding 있으면 "핵심:"·"초록:" 포함, 없으면 기존 한 줄). 테스트 전 `npm run build`.
- **구조적 타입 가드**: `KnowledgeResult.papers` 항목이 `RxPaperRef` 로 할당 가능함을 타입 레벨로 확인(추가 필드 pmid/similarity 무시) — 전체 설계가 이 구조적 타이핑에 의존하므로 컴파일 타임 어서션으로 문서화.
- **타입/빌드**: `ai-server npm run build` + `v4 npx tsc --noEmit`.
- **수동**: `backfill-summaries.mjs --limit 3` → 한국어 요약 품질 eyeball. rx-recommend 호출 → 모달에 요약 노출(사용자 확인, preview 미사용).

## 9. 결정 요약
| 질문 | 결정 |
|------|------|
| 범위 | 클리니컬 처방추천 한정(마케팅 후속) |
| 프롬프트 주입 | abstract(트렁케이트 ~600자) + key_finding (제목만 → 실제 근거) |
| 요약 필드 검색 | RPC 수정(migration 051) — 단일 소스, 하위호환 (vs merge-fetch) |
| 요약 생성 | 논문당 1 Gemini 콜 {korean_summary, key_finding}, 281편 resume-safe |
| 표시 | RxRecommendModal 논문별 key_finding+korean_summary |
| 요약 언어/대상 | 한국어, 의사 관점, key_finding 은 수치/효과크기 우선 |
