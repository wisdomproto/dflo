# 연구 근거 라이브러리 (Research Evidence Library) — 설계 스펙

> 상태: 설계 → **Phase 1 구현·적재 완료** (2026-06-10, txirmof `evidence_papers` 에 250 SCI 논문). 구현 계획·실제 결과: [`../plans/2026-06-10-research-evidence-library-phase1.md`](../plans/2026-06-10-research-evidence-library-phase1.md). Phase 2~3(임베딩 백필·마케팅 연결·공개 배지)은 미착수.
> 부모 스펙: [`2026-06-06-clinical-rag-knowledge-brain-design.md`](2026-06-06-clinical-rag-knowledge-brain-design.md) 의 **논문 라이브러리(§3-1)** 를 품질 랭킹 + 마케팅 연결로 확장.

## 1. 비전 / 목표

우리 성장치료와 관련된 **국제 SCI 논문의 초록**을, **Impact Factor·피인용·근거등급 기준으로 품질 랭킹**해 DB화하고, 이를 **마케팅 콘텐츠와 연결**한다. 두 가지 출력을 동시에 받친다:

1. **공개 인용** — 블로그·카드뉴스 같은 공개 콘텐츠에 "이 내용은 [JCEM 2021] 연구 근거" 식 출처/배지. E-E-A-T·SEO·의료광고 근거 신뢰도.
2. **AI RAG 소스** — 콘텐츠 생성·수정 시 AI가 관련 논문 초록을 참고해 더 정확·신뢰도 높은 글 작성.

논문 라이브러리는 **하나(`evidence_papers`)로 유지** — clinical RAG(처방추천)와 마케팅이 같은 corpus를 공유한다(단일 진실원천). 이 스펙은 그 위에 **품질 레이어 + 마케팅 연결 레이어**를 얹는다.

## 2. 브레인스토밍 결정 요약

| # | 결정 | 선택 |
|---|------|------|
| 1 | 연결 목적 | **둘 다** — 공개 인용 + AI RAG |
| 2 | 품질 전략 | **OpenAlex + NIH iCite RCR + 저널 화이트리스트** |
| 3 | 수집 범위 | **치료+마케팅 핵심 과학 ~15테마** (기존 8 + 마케팅 과학 7) |
| 4 | 아키텍처 | **`evidence_papers` 확장** + 연결 테이블 + enrich 파이프라인 (별도 테이블 X) |

추가 판단(승인됨):
- 연결 = **의미 임베딩 자동 매칭 + 공개는 사람 confirm 게이트** (자동 인용은 의료광고 리스크).
- **"일단 DB" 우선** — Phase 1(수집·품질 DB)만 먼저 빌드, 마케팅 노출은 Phase 2~3.

## 3. 데이터 소스 & 품질 전략

PubMed 자체엔 IF·피인용이 없다 → 외부 무료 API로 enrich. **전부 무료·키 불필요** (마케팅 도구의 "no-key 코어" 철학과 동일).

| 소스 | 역할 | 가져오는 값 | 비고 |
|---|---|---|---|
| **PubMed E-utilities** | 발굴(discovery) | 후보 PMID, 초록, 제목, 저널, 연도, 소속, **PublicationType** | 기존 `pubmed.ts` (PublicationType·DOI 파싱 추가) |
| **OpenAlex** | enrich + 저널품질 | `cited_by_count`, `doi`, 저널(ISSN-L), `publication_year`, `type`(article/review), `concepts`, 저널 `summary_stats.2yr_mean_citedness`(≈IF) + `h_index` | `works/pmid:{pmid}` → source id → `sources/{id}`(ISSN별 캐시). polite pool `mailto=` |
| **NIH iCite** | 공정 랭킹 | `relative_citation_ratio`(**RCR**, 분야·연도 보정 피인용), `citation_count`, `nih_percentile`, `is_research_article` | `api/pubs?pmids=...` 배치(≤1000), 무키 |
| **저널 화이트리스트** | SCI 품질 게이트 | 소아내분비·성장 top 저널 ISSN 목록 | 버전드 JSON 자산(원장 큐레이션), ISSN 매칭 + 이름 폴백 |
| **(선택) SCImago SJR** | 사분위 보강 | 저널 SJR·Quartile(Q1~Q4) | 연도별 CSV → 소형 `journal_quality` 테이블/JSON. 화이트리스트로 충분하면 생략 |

**핵심 보정 — RCR을 쓰는 이유:** 피인용 절대수만 쓰면 오래된 논문이 무조건 이긴다(2023 핵심 논문 < 2010 평범 논문). RCR은 분야·연도 정규화값이라 **최신 핵심 논문도 공정하게 생존**.

**근거등급(`study_type`):** PubMed `PublicationType` + OpenAlex `type` + iCite `is_research_article` 로 분류. 등급순 = 메타분석/체계적고찰 > RCT > 코호트 > 환자대조 > 단면 > 증례/내러티브리뷰. 랭킹 가중 + 공개 배지("메타분석 근거")에 활용.

## 4. 수집 범위 — 15 테마

연결은 의미 임베딩 자동 매칭이라 토픽을 완벽히 정렬할 필요는 없지만(논문을 충분히 넓게 모아둬야 매칭거리가 생김), 발굴 쿼리축은 15개로 잡는다.

**기존 8 (clinical, [ingest-papers.mjs](../../../ai-server/scripts/ingest-papers.mjs)):** growth_hormone · bone_age · precocious_puberty · aromatase_inhibitor · obesity_growth · sleep_growth · nutrition_growth · vitamin_d_growth

**신규 7 (마케팅 과학):**
| 테마 | PubMed 쿼리(초안) | 받치는 마케팅 토픽 예 |
|---|---|---|
| `height_genetics` | heritability of height children GWAS stature | "키 유전 80% vs 환경 20%" |
| `physical_activity` | physical activity exercise jumping children height growth | 운동/점프/스트레칭 콘텐츠 |
| `psychosocial` | psychosocial stress emotional deprivation children growth | 스트레스·정서와 성장 |
| `diet_specifics` | dairy milk protein sugar intake children growth stature | 우유/단백질/설탕 식이 |
| `puberty_environment` | obesity endocrine disruptor early puberty timing children | 환경·비만과 성조숙 |
| `catch_up_SGA` | small for gestational age catch-up growth final height | 저체중출생 따라잡기 |
| `final_height_prediction` | predicted adult height mid-parental target height accuracy | 성인키 예측·MPH 콘텐츠 |

쿼리·테마는 코드 상수(`TOPICS`)로 두고 원장 피드백으로 조정. 미국 한인/중화권 시장 고려 시 인구축 쿼리(`Asian children` bias)는 기존 패턴 유지.

## 5. 스키마

### 5-1. `evidence_papers` 컬럼 추가 (확장, 비파괴)
기존(035): `pmid, title, abstract, journal, year, url, topic, pop_group, pop_country, pop_confidence, embedding(768), created_at`. 추가:

```sql
alter table evidence_papers add column if not exists doi            text default '';
alter table evidence_papers add column if not exists openalex_id    text default '';
alter table evidence_papers add column if not exists journal_issn   text default '';
alter table evidence_papers add column if not exists citation_count integer default 0;
alter table evidence_papers add column if not exists rcr            numeric;          -- NIH RCR (분야·연도 보정)
alter table evidence_papers add column if not exists if_proxy       numeric;          -- OpenAlex 저널 2yr mean citedness ≈ IF
alter table evidence_papers add column if not exists sjr_quartile   text default '';  -- (선택) Q1~Q4
alter table evidence_papers add column if not exists study_type     text default '';  -- meta_analysis|rct|cohort|...
alter table evidence_papers add column if not exists is_sci         boolean default false;
alter table evidence_papers add column if not exists quality_score  numeric default 0;-- 0~100 합성
alter table evidence_papers add column if not exists korean_summary text default '';  -- 공개용 1줄 근거 (Gemini, 후백필)
alter table evidence_papers add column if not exists key_finding    text default '';  -- 핵심 결론
alter table evidence_papers add column if not exists confirmed      boolean default false; -- 공개 인용 승인 게이트
create index if not exists idx_evidence_quality on evidence_papers(quality_score desc);
create index if not exists idx_evidence_sci on evidence_papers(is_sci);
```
- 기존 `match_evidence_papers` RPC 는 그대로 동작(clinical RAG 무영향). 필요 시 반환 컬럼에 `quality_score, study_type, korean_summary` 추가하는 v2 RPC 별도.
- 이미 적재된 clinical 행(있다면)은 파이프라인이 enrich 단계에서 품질 컬럼 **백필**.

### 5-2. 신규 `article_evidence_links` (마케팅 연결)
```sql
create table if not exists article_evidence_links (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references marketing_articles(id) on delete cascade,
  paper_id    uuid references evidence_papers(id) on delete cascade,
  similarity  numeric,
  rank        integer,
  status      text default 'suggested',  -- suggested|confirmed|rejected
  created_at  timestamptz default now(),
  unique(article_id, paper_id)
);
create index if not exists idx_ael_article on article_evidence_links(article_id);
alter table article_evidence_links enable row level security;
create policy ael_all on article_evidence_links for all to anon, authenticated using (true) with check (true);
```
`evidence_papers` 와 `marketing_articles` 둘 다 같은 DB(txirmof)라 FK 단순.

## 6. 수집·품질 파이프라인

[ingest-papers.mjs](../../../ai-server/scripts/ingest-papers.mjs) 확장(또는 `ingest-evidence.mjs` 신규). 테마별 루프:

```
1. PubMed esearch(theme query, retmax≈50)        → 후보 PMID
2. PubMed efetch                                  → 초록/제목/저널/연도/소속/PublicationType/DOI
   (초록 80자 미만, 비영어 등 1차 필터)
3. iCite api/pubs?pmids=batch                     → RCR, citation_count, is_research_article
4. OpenAlex works/pmid:{pmid} (+sources 캐시)     → cited_by_count, ISSN, if_proxy, type, concepts
5. 품질 게이트(is_sci): ISSN∈화이트리스트 OR if_proxy≥THRESH OR SJR∈{Q1,Q2}
                        → 통과만 유지(predatory·비SCI 탈락)
6. quality_score 계산(테마 배치 내 정규화) → 점수순 정렬 → top ~15~20 keep
7. embedText(title+abstract)  [Gemini 키 있을 때만, 없으면 null]
8. (선택) korean_summary/key_finding 생성 [Gemini]
9. upsert evidence_papers (onConflict: pmid)
```
- Rate limit: PubMed 무키 ~3req/s, OpenAlex polite pool(`mailto=`), iCite 배치. 소스(저널) summary_stats는 ISSN별 메모리 캐시로 재호출 방지.
- 결과 로그: 테마별 `후보 N → SCI게이트 통과 M → 저장 K (평균 quality_score, RCR)`.

## 7. quality_score 공식 (튜닝 가능)

- **하드 게이트:** `is_sci=false` 는 애초에 저장 안 함(공개 인용 대상이라 품질 바닥선 필수).
- **점수(0~100), 테마 배치 내 min-max 정규화:**
  ```
  score = 100 × ( 0.40·RCR_n + 0.25·ifProxy_n + 0.20·logCite_n + 0.10·recency + 0.05·studyGrade_n )
  ```
  - `RCR_n` = RCR 정규화 (없으면 0)
  - `ifProxy_n` = 저널 2yr mean citedness 정규화
  - `logCite_n` = log(citation_count+1) 정규화
  - `recency` = (year − (현재−10)) / 10, clamp 0~1 (최근 10년 보너스)
  - `studyGrade_n` = 근거등급 순위 정규화(메타분석 1.0 … 증례 0.1)
- 가중치는 상수로 추출 → 원장/마케팅 피드백으로 조정. 피인용 절대수 비중을 낮게(0.20) 둬 최신·고RCR 논문 보호.

## 8. 마케팅 연결

### 8-1. 의미 매칭 + confirm 게이트
- `POST /api/knowledge/link-article/:articleId` — article(ko master `title`+`body`) 임베딩 → `match_evidence_papers` top-k(예 8) → `article_evidence_links` 'suggested' upsert(similarity·rank).
- `POST /api/knowledge/link-all` — 62편 일괄(또는 confirmed 글만).
- `GET /api/knowledge/article-evidence/:articleId` — 편집기 패널용 목록.
- `PATCH /api/knowledge/evidence-link/:id { status }` — confirm/reject.
- **공개 인용은 `status='confirmed'` 만** published 콘텐츠에 노출(의료광고 리스크 차단 — 사람 승인 필수).
- ⚠️ 연결은 `match_evidence_papers` RPC 를 **직접** 호출(논문만). `searchKnowledge()` 는 `match_clinical_insights`(비식별 임상 인사이트)를 같이 끌어오므로 연결용으로 쓰지 말 것 — RAG 주입(§8-2)에서 임베딩 패턴만 참고.

### 8-2. 출력 표면 (단계적)
- **RAG 주입(Phase 2):** [contentPrompts.ts](../../../ai-server/src/services/contentPrompts.ts) 의 생성·수정 프롬프트에 매칭 논문 초록 + `korean_summary` 를 grounding 컨텍스트로 주입. 부모 스펙 §4(메커니즘=인종무관 / 수치=임상주도) + §5-1(의료광고 가드레일) 준수.
- **공개 배지(Phase 3):** 마케팅 편집기에 "근거 논문" 패널(suggested → confirm/reject). confirmed 논문이 published 블로그에 출처 배지 + JSON-LD `citation`(SEO) 으로 렌더. `korean_summary` 가 null(Gemini 미백필)이면 **저널+연도+제목으로 degrade** 렌더 — 키 없이도 배지 자체는 동작.

## 9. 단계별 빌드 + 키 의존성

| Phase | 내용 | 키 의존성 |
|---|---|---|
| **1 (지금)** | 스키마 마이그레이션 + 수집·enrich·품질·저장 파이프라인 + 화이트리스트 자산 | **무료·키 불필요**(PubMed/OpenAlex/iCite). 임베딩·korean_summary 만 Gemini → 없으면 null 저장 후 백필 |
| **2** | `article_evidence_links` + 링크 엔드포인트 + RAG 주입 | 의미 매칭은 **임베딩 필요**(Gemini 키) |
| **3** | admin "근거 논문" 패널(confirm/reject) + 공개 배지 + JSON-LD | — |

→ **"일단 DB 구축"(Phase 1)은 Gemini 키 없이도 완주 가능.** 초록·품질지표·랭킹까지 다 채워지고, 임베딩만 키 복구 후 백필하면 연결(Phase 2)이 깨어남.

## 10. 재사용 가능한 기존 자산
- `evidence_papers` + `match_evidence_papers` RPC (migration 035).
- [pubmed.ts](../../../ai-server/src/services/pubmed.ts) (esearch/efetch/XML 파싱 — PublicationType·DOI 파싱만 추가), [populationTagger.ts](../../../ai-server/src/services/populationTagger.ts) (인종 태깅), `embedText`([gemini.ts](../../../ai-server/src/services/gemini.ts)).
- [knowledgeRetrieval.ts](../../../ai-server/src/services/knowledgeRetrieval.ts) `searchKnowledge()` 의 질의→임베딩→RPC **패턴** 재사용(연결은 `match_evidence_papers` 직접 호출 — §8-1 주의).
- `marketing_articles`(ko master + translations + sort_order), [contentPrompts.ts](../../../ai-server/src/services/contentPrompts.ts), 원장 컨펌 워크플로우.

## 11. 미해결 / 의존성 / 리스크
- **Gemini 키 만료** — 임베딩·korean_summary 막힘. Phase 1 DB는 무영향, Phase 2 연결은 키 복구 후.
- **마케팅 DB = txirmof** — Supabase MCP는 tangobook 만 → 마이그레이션은 Dashboard 수동 적용(기존 패턴). 적재 스크립트는 ai-server `.env`의 `SUPABASE_SERVICE_ROLE_KEY`(현재 임시 anon) 사용.
- **OpenAlex/iCite rate limit·매칭 엣지** — ISSN-L vs issn 배열, PMID↔OpenAlex 누락 케이스 → graceful(해당 enrich 값 null, 게이트는 화이트리스트로 폴백).
- **화이트리스트 큐레이션** — 초기 ~25개 저널 ISSN 시드 후 원장 보강. 너무 좁으면 좋은 논문 누락, 너무 넓으면 SCI 게이트 약화 → if_proxy 보조 게이트로 균형.
- **의료광고법** — confirmed 게이트 + claim 프레이밍(효과 단정·경험담 금지). 논문은 "교육 강화"지 "N cm 키운다" 효과광고 아님(부모 스펙 §5-1·§6).
- **evidence_papers 현재 적재 상태** — 비었는지/clinical ~64행 있는지 플랜 단계에서 확인(파이프라인은 둘 다 처리: 신규 upsert + 기존 행 품질 백필).
- **교차언어 매칭 검증** — 연결은 한국어 article 임베딩 ↔ 영어 초록 임베딩 cosine 비교. `gemini-embedding-001` 의 교차언어 유사도는 그럴듯하나 여기선 미검증 → Phase 2 에서 2~3개 article 의 top-k 를 눈으로 sanity check 후 similarity/rank 신뢰. 약하면 article 임베딩에 영어 키워드/번역 보강 옵션.

## 12. 한 줄 요약
**[우리 치료 관련 국제 SCI 논문 초록 15테마] → PubMed 발굴 + OpenAlex/iCite enrich + 저널 화이트리스트 SCI 게이트 + RCR 공정랭킹 → `evidence_papers` 단일 라이브러리(품질 컬럼 확장) → 의미 임베딩으로 마케팅 콘텐츠 자동 매칭(공개는 confirm 게이트) → 공개 인용 배지 + AI RAG. Phase 1 DB는 무료·키 불필요로 완주.**
