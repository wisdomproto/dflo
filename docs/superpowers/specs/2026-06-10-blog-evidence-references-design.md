# 블로그 근거 논문 자동 인용 (Blog Evidence References) — 설계

**날짜**: 2026-06-10
**상태**: ✅ 구현 완료 (2026-06-10) — 매처·스토리지(migration 049)·스튜디오 패널·렌더 능력 전부. 적재 sim≥0.66 top5 → 61/62 토픽(평균 4.6편). 공개 노출만 SEO블로그 발행 파이프라인(별도) 대기.
**부모 스펙**: `2026-06-10-research-evidence-library-design.md` (Phase 2 의 "마케팅 연결" 슬라이스, 블로그 한정)

## 1. 목적 / 배경

연구 근거 라이브러리(`evidence_papers`, 281편 SCI 논문, 768d 임베딩 **백필 완료** — 2026-06-10 본 세션, `embedding IS NULL` = 0 검증)를 **자체 블로그 콘텐츠에 참고문헌으로 자동 연결**한다. 의료 사이트의 E-E-A-T(전문성·신뢰도)와 의료광고 근거 확보가 목적.

> **전제조건 (검증됨)**: 281편 전부 임베딩 보유. 상위 Phase 1 플랜 문서(`...-research-evidence-library-phase1.md`)의 DoD 는 **백필 이전** 상태로 작성돼 "임베딩 null·Phase 2 대기"로 적혀 있으나, 본 세션에서 백필이 완료됐다(그 플랜 문서는 "업데이트 하자" 시 갱신 예정). 매처는 이와 무관하게 **방어적으로** `embedding IS NOT NULL` 만 로드하고 커버리지를 검증한다(§6).

**범위를 블로그로 한정한 이유**: 카드뉴스·릴스는 분량이 짧아 인용이 어울리지 않음. 블로그는 장문 + SEO 타겟이라 "참고문헌" 리스트가 신뢰도에 직접 기여.

**운영 방식 (사용자 결정)**: **자동 + 임계값 게이트** — 유사도 임계값 이상인 논문만 토픽별 top-N 자동 첨부, 약한 매칭은 자동 제외, 스튜디오에서 수동 편집 가능.

## 2. 현재 상태 (조사 결과)

- **블로그 콘텐츠**: `marketing_articles` 62개 토픽 전부 `blog` JSONB 보유. 6언어(ko/en/th/vi/ch/cn) × 62, 토픽당 6섹션. `blog[lang]` = `BlogSeoArticle{seoTitle,slug,metaDescription,h1,primaryKeyword,secondaryKeywords[],sections[{heading,html,imagePrompt,imageUrl}],faq[{q,a}]}`.
- **논문**: `evidence_papers` 281편. 인용 필드: `pmid,title,journal,year,url,doi`(저자 컬럼 없음), `korean_summary`/`key_finding`(현재 null). **281편 전부 768d 임베딩 보유** (본 세션 백필 완료, NULL=0 검증). 매처는 그래도 `embedding IS NOT NULL` 로 방어 필터.
- **발행 상태**: `blog_published` 테이블 존재(migration 039)하나 **0행**. SEO 블로그(`blog` JSONB)는 아직 라이브 사이트 미발행 (별도 기존 TODO). 라이브 블로그는 현재 ContentFlow 캐시만 렌더.

→ **함의**: 매칭·저장·스튜디오 큐레이션은 지금 완결 가능. **라이브 공개 노출은 별도 블로그 발행 파이프라인(SEO `blog`→`blog_published`→i18n 빌드, 미구현 TODO)이 돌아야** 보임. 본 스펙은 그 파이프라인을 만들지 않고, references 가 발행 시 자연히 실릴 수 있도록 **렌더 능력(함수+템플릿)만** 준비한다.

## 3. 스코프

### In
1. **배치 매처** (ai-server 스크립트): 토픽별 영어 블로그 대표 텍스트 임베딩 → 281편과 코사인 → sim≥임계값 top-N 선택 → `marketing_articles.blog_references` 에 스냅샷 저장.
2. **저장**: `marketing_articles.blog_references` JSONB 컬럼 신규 (아티클 단위, 언어 독립). migration 049 (txirmof, Dashboard 수동 적용).
3. **스튜디오 큐레이션 UI**: 블로그 편집기에 "참고문헌" 패널(전 언어 공통). 매칭 결과 표시 + 제거·순서변경 + 검색 추가.
4. **렌더 능력 (forward-looking)**: `blog-post.html` 템플릿 참고문헌 섹션 + `blog.mjs` 순수 렌더 함수 `renderReferencesHtml(refs, lang)`. 발행 파이프라인이 references 를 post 객체에 넘기면 자동 노출. (현재 미발행이라 공개 노출은 안 됨 — 능력만 배선·테스트)

### Out (별도/추후)
- SEO `blog`→`blog_published`→발행 파이프라인 구현 (독립 기존 TODO).
- 인라인 번호 인용([1][2] 문장 단위 근거) — AI 생성 본문이라 문장-논문 정합 위험, 과함.
- `korean_summary`/`key_finding` 생성 (참고문헌은 서지정보면 충분, 추후 옵션).
- 저자(authors) 수집 (현재 스키마에 없음, 서지 표기는 title·journal·year·link 로 충분).
- 클리니컬 RAG(처방추천)·기타 마케팅 콘텐츠 연결.

## 4. 아키텍처 (Approach A: JSONB 스냅샷)

```
[배치 매처: ai-server/scripts/attach-references.mjs]
  evidence_papers(281편 임베딩) ──┐
                                  ├─→ 토픽별 코사인 → selectReferences(threshold,topN)
  marketing_articles.blog[en] ────┘        │
   (h1+keywords+섹션제목 임베딩)            ▼
                              marketing_articles.blog_references (JSONB 스냅샷)
                                            │
            ┌───────────────────────────────┼───────────────────────────────┐
            ▼                                                                ▼
[스튜디오 패널: BlogReferencesPanel]                        [렌더: blog.mjs renderReferencesHtml
  표시·제거·순서변경·검색추가                                  + blog-post.html 섹션]
  → saveBlogReferences(articleId, refs)                       (발행 파이프라인이 호출 시 노출)
```

**스냅샷 선택 근거**: 논문은 언어 독립 → 토픽당 1세트. 스냅샷이라 evidence_papers 조인 없이 6언어 페이지에 그대로 렌더. 발행 파이프라인과 결합 없음. 62×~5 규모에 정규화 링크테이블은 YAGNI.

## 5. 데이터 모델

### migration 049 — `marketing_articles.blog_references`
```sql
ALTER TABLE marketing_articles ADD COLUMN IF NOT EXISTS blog_references JSONB DEFAULT '[]'::jsonb;
```
- 컬럼명 `blog_references` (예약어 `references` 회피).
- 값 = `BlogReference[]` (아티클 단위, 언어 무관).

### `BlogReference` (TS + JSONB)
```ts
interface BlogReference {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;            // PubMed link
  similarity: number;     // 0~1, 매칭 점수 (배지 표시·정렬용)
}
```
스냅샷이므로 evidence_papers 변경과 무관(논문은 published 정적). 수동 편집은 이 배열을 직접 변형. 논문 서지가 추후 수정되면 스냅샷은 stale 해지나, 매처를 `--force` 로 재실행하면 스냅샷이 갱신됨(62×~5 규모라 허용 가능한 트레이드오프).

## 6. 매칭 (배치 매처)

**파일**: `ai-server/scripts/attach-references.mjs` + 순수 로직 `ai-server/src/services/evidenceMatch.ts`.

**순수 함수 (`evidenceMatch.ts`, 테스트 대상)**:
- `cosineSim(a: number[], b: number[]): number` — 코사인 유사도(0~1).
- `selectReferences(scored: ScoredPaper[], opts: {threshold: number, topN: number}): BlogReference[]` — `sim` 내림차순 정렬 → `sim >= threshold` 필터 → 상위 `topN` 슬라이스 → 각 항목을 `BlogReference` 로 매핑(**`sim` → `similarity` 리네임**, 나머지 서지 필드 그대로 복사).
  - 입력 타입: `ScoredPaper = { pmid: string; title: string; journal: string; year: number|null; doi: string|null; url: string; sim: number }`. 즉 임베딩 코사인 계산 후, 각 논문 행을 서지 필드 + `sim` 으로 채운 객체 배열을 넘긴다. `selectReferences` 는 임베딩·DB 를 모르는 순수 변환(정렬·필터·슬라이스·필드 리네임)만 담당 → 합성 점수로 단위테스트 가능.

**스크립트 흐름** (`attach-references.mjs`, 토픽별):
1. **논문 로드(1회)**: `evidence_papers` 에서 `embedding IS NOT NULL` 행만 `select(pmid,title,journal,year,doi,url,embedding)`. 로드 수를 로깅하고, **기대치(281) 대비 커버리지가 낮으면 경고**(예: < 95% 면 `--allow-partial` 없이는 abort) → 임베딩 미백필 상태에서 잘못된(35편만) 매칭 방지.
2. 대표 텍스트 = en 블로그 `h1 + primaryKeyword + secondaryKeywords + 섹션 heading들`. en 없으면 ko 폴백(교차언어 검증됨).
3. `embedText(대표텍스트)` (Gemini, 토픽당 1콜 = 62콜).
4. 로드한 논문들과 `cosineSim` → 각 논문을 `ScoredPaper` 로 만들어 `selectReferences(threshold=0.72, topN=5)`.
5. `BlogReference[]` 스냅샷을 `marketing_articles.blog_references` 에 upsert.

**플래그** (전체 CLI 표면): `--dry-run`(점수 분포·선택 표만, write 없음 — 임계값 캘리브레이션용), `--force`(기존 references 있어도 덮어씀; 기본은 비어있는 토픽만 채움 → 수동 편집 보존), `--threshold N`, `--top N`, `--only <sort_order>`, `--allow-partial`(임베딩 커버리지가 기대치 미만이어도 abort 하지 않고 진행 — 부분 백필 상태 디버그용; 기본은 abort).

**임계값 캘리브레이션**: 검증 단계 Q→논문 매칭은 0.78~0.85였으나 아티클(질문 아님)→논문 점수 분포는 다를 수 있음. 구현 시 `--dry-run` 으로 62토픽 점수 분포를 보고 threshold(기본 0.72)·topN(기본 5)을 확정한다. (DoD: dry-run 분포 캡처 + 임계값 근거 기록)

## 7. 스튜디오 큐레이션 UI

**컴포넌트**: `v4/src/features/marketing/components/content/BlogReferencesPanel.tsx` (신규).
- **위치**: `BlogWizard` 3단계(글쓰기) 안, `BlogSeoEditor` 아래. **"참고문헌 (전 언어 공통)"** 라벨(블로그 섹션 이미지의 "전 언어 공통" 패턴과 동일) — 언어 탭 밖, 아티클 단위.
- **표시**: 매칭된 `BlogReference[]` 리스트 — `title` · `journal · year` · 유사도 배지 · PubMed/DOI 링크.
- **편집**: 제거(✕), 순서변경(↑↓), **검색 추가**(evidence_papers `title` ilike 검색 → 선택 추가, supabase 클라 직접 쿼리, 신규 ai-server 엔드포인트 없음).
  - **접근 전제**: v4 클라는 txirmof anon 키 사용 → `evidence_papers` 의 anon SELECT 가 RLS 로 허용돼야 함(클라 직접 읽기는 신규 접근 패턴 — 기존 clinical RAG 는 ai-server 경유). 구현 시 RLS 확인; 막혀 있으면 (a) anon SELECT 정책 추가 or (b) ai-server 경유 검색 엔드포인트로 폴백. (플랜에서 결정)
- **저장**: `marketingArticleService.saveBlogReferences(articleId, refs)` → `marketing_articles.update({ blog_references })`. `fetchArticles` 매핑에 `blog_references` → `article.blogReferences` 추가.

**types/service 변경**:
- `types.ts`: `BlogReference` 추가 + Article 모델에 `blogReferences: BlogReference[]`.
- `marketingArticleService.ts`: `saveBlogReferences` + fetch 매핑.

## 8. 렌더 능력 (forward-looking)

- `v4/scripts/lib/blog.mjs`: 순수 함수 `renderReferencesHtml(refs, lang)` — refs 비면 `''`, 아니면 언어별 헤딩 + `<ol>` 인용 리스트(항목 텍스트·URL escape). 헤딩 맵: `ko:참고문헌 / en:References / th:เอกสารอ้างอิง / vi:Tài liệu tham khảo / ch:參考文獻 / cn:参考文献`. 미지원 lang 은 en 폴백.
  - **언어 범위 메모**: 블로그 JSONB 데이터는 6언어 키 보유(ch/cn 포함, 본 세션 DB 확인)이나 `BLOG_SEO_LANGS` 타입은 4언어(ko/en/th/vi)로 선언됨. references 는 아티클 단위(언어 독립)라 헤딩만 페이지 lang 으로 선택 → 6언어 다 제공해 forward-compatible. (타입 4언어 확장은 본 스펙 범위 밖, references 동작엔 무영향.)
- `renderPost` 가 `post.references` 존재 시 본문 뒤에 `renderReferencesHtml` 결과 삽입.
- `v4/i18n/template/blog-post.html`: 본문(`{{post.body_html}}`) 뒤, CTA 앞에 `{{post.references_html}}` 플레이스홀더. **주입 메커니즘 확정**: `renderPost` 가 `renderReferencesHtml(post.references, lang)` 결과를 `references_html` 키로 계산해 렌더 데이터 객체에 넣음 → 미니 렌더러(`render.mjs`)가 `{{post.references_html}}` 를 치환. (`references` 없으면 빈 문자열 → 슬롯 무출력.) 본문 HTML 에 직접 끼워넣지 않고 별도 슬롯으로 분리해 관심사 명확화.
- **발행 연결은 미구현**: 발행 파이프라인(별도 TODO)이 `marketing_articles.blog_references` 를 post 객체로 전달하면 노출. 본 스펙은 그 호출부를 만들지 않음(파이프라인 미설계). 능력만 배선 + 단위테스트.
- **현재 렌더 경로에서 inert (무회귀)**: 라이브 블로그는 현재 ContentFlow 캐시(`loadCachedPosts`) 기반이고 그 post 객체엔 `references` 필드가 없음 → 추가하는 `renderReferencesHtml`/템플릿 슬롯은 `post.references` 가 없으면 빈 문자열을 내므로 **기존 캐시 렌더에 아무 변화·회귀 없음**. 플래너는 references 가 라이브에 바로 보일 거라 기대하거나 캐시 경로 배선을 찾지 말 것 — 노출은 SEO-블로그 발행 파이프라인(§3 Out) 구현 시점에 활성화.

## 9. 에러 처리

- 매처: embed 실패 → 토픽 skip + 경고(다른 토픽 계속). en/ko 둘 다 없으면 skip. 281편 로드 실패 → abort. 임계값 미달 토픽 → 빈 배열(정상).
- 스튜디오: 저장 실패 → 에러 토스트, 로컬 상태 유지. 검색 0건 → 빈 결과 안내.
- 렌더: `references` 없거나 빈 배열 → 섹션 생략(`''`).

## 10. 테스트

- **단위 (필수)**: `ai-server/__tests__/evidenceMatch.test.mjs` — `cosineSim`(직교=0, 동일=1), `selectReferences`(threshold 경계·topN 컷·정렬). `v4` 측 `renderReferencesHtml`(빈 배열→'', 헤딩 언어별, 항목 수, 링크 escape) — 테스트 가능한 순수 함수로.
- **타입체크**: `cd v4 && npx tsc --noEmit` (UI/types/service) + `cd ai-server && npm run build`.
- **수동 검증**: 매처 `--dry-run` 분포 확인 → 실 적재 후 몇 토픽 references 적정성 eyeball. (사용자 선호: preview 브라우저 미사용, tsc/코드레벨 + dry-run 으로 검증)
- 테스트는 `dist/` import → ai-server 테스트 전 `npm run build` 필수.

## 11. 결정 요약 (해소된 오픈 질문)

| 질문 | 결정 |
|------|------|
| 운영 방식 | 자동 + 임계값 게이트 (수동 편집 가능) |
| 저장 | JSONB 스냅샷 컬럼 `marketing_articles.blog_references` (아티클 단위) |
| 매칭 기준 | en 블로그 대표 텍스트(h1+키워드+섹션제목) 임베딩 vs 논문 |
| 임계값/개수 | 기본 0.72 / top 5, dry-run 으로 캘리브레이션 |
| 인용 표기 | title·journal·year + PubMed/DOI 링크 (저자 없음) |
| 언어 | references 아티클 단위(공통), 헤딩만 6언어 현지화 |
| 공개 노출 | 렌더 능력만 배선, 실제 노출은 별도 발행 파이프라인 대기 |
```
