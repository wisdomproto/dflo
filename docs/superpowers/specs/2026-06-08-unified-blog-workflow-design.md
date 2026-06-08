# 통합 블로그 워크플로우 설계

작성일: 2026-06-08

## 배경 / 문제

`/marketing/content` 콘텐츠 스튜디오의 채널 탭이 현재 4개다: `기본글 / 블로그(SEO) / 블로그 / 카드뉴스`.

이 중 블로그가 두 개로 갈라져 있고, 사용자 의도와 어긋난다.

- **`블로그(SEO)`** (`BlogSeoPanel`): 자체 도메인(dr187growup.com) 구글 SEO 블로그. 데이터는 `marketing_articles.blog` JSONB(migration 045), 언어별(ko/en/th/vi) 구조화 글(메타/섹션/FAQ). **생성 기능 없이 보기/수정만.** 248편이 외부 멀티에이전트 스크립트(`docs/blog`)로 생성돼 들어옴.
- **`블로그`** (`BlogPanel`): 네이버 블로그(N블로그). 데이터는 별도 테이블 `marketing_blog_contents`/`marketing_blog_cards`(migration 031), 카드 기반. 4단계 워크플로우(키워드→AI카드생성→편집→네이버 SEO 점수).

사용자의 실제 의도:
- **블로그 = 하나의 워크플로우**여야 한다: 키워드 정하기 → 구조 짜기 → 글쓰기 → SEO 점수 분석 → 부족한 부분 수정. 그 **산출물이 곧 구조화 블로그 글**.
- 스크립트로 대량 생성하다 보니 `블로그(SEO)`가 따로 생겨 둘이 분리됨.
- 언어 선택은 **최상단에 이미 있는데**(`LanguageSelector`) 블로그(SEO) 안에 또 중첩돼 있다 → 중복.
- 블로그는 **구글 기준**으로 간다. **네이버는 안 한다** → 네이버 카드/점수 로직 폐기.

## 목표

두 블로그 탭을 **하나의 "블로그" 스텝형 위저드**로 통합한다.

- 단일 데이터 소스: `marketing_articles.blog`(`BlogSeoMap`, 언어별 `BlogSeoArticle`).
- 앱 안에서 AI로 전체 생성(키워드→구조→본문). 스크립트(`docs/blog`)는 대량 초기 생성용으로 유지.
- 구글 SEO 점수를 앱 안에서 계산.
- 최상단 언어 셀렉터로 언어 일원화(중첩 제거).
- 네이버 코드·점수 폐기.

비목표(YAGNI):
- 네이버 발행/카드 워크플로우 보존(이미 발행에서도 제거됨).
- SEO 점수 영구 저장(실시간 계산으로 충분).
- 키워드 도구(IdeasPage)와의 자동 연동(수동 입력 + 기본글 keywords 시드까지만).

## 설계

### 1. 탭 구조

`ContentTabs.tsx`의 채널 탭을 4개 → 3개로 축소.

```
기본글 / 블로그 / 카드뉴스
```

- `블로그(SEO)`와 네이버 `블로그`를 **하나의 "블로그"** 탭으로 통합.
- `Tab` 타입에서 `blogseo` 제거, `blog`만 남김. `contentKind`는 `tab === 'blog' ? 'blog' : tab === 'cardnews' ? 'cardnews' : 'post'`로 단순화.
- 블로그 탭 본문 = 신규 통합 위저드 컴포넌트(아래 2번).

### 2. 언어 일원화

- 블로그 위저드는 `ContentTabs`가 내려주는 최상단 `language`(ko/th/vi/en)를 받아 `article.blog[language]`에 작동.
- 기존 `BlogSeoPanel` 내부의 중첩 언어 탭은 **제거**.
- 최상단 `LanguageSelector`의 언어 집합(ko/th/vi/en)은 이미 `BLOG_SEO_LANGS`와 동일하므로 추가 변경 불필요.
- (참고) `LanguageSelector`의 배지(`hasTr`)는 기본글 번역 유무 기준이라, 블로그 데이터 유무와는 다를 수 있음 — 이번 범위에서는 그대로 둔다(혼동 적음).

### 3. 블로그 위저드 (5단계)

현재 선택 언어의 `BlogSeoArticle`(`article.blog[lang]`) 한 건에 작동한다. 단계는 상단 스텝바로 자유 이동 가능.

`BlogSeoArticle` 형태(기존, migration 045 — 변경 없음):
```ts
interface BlogSeoArticle {
  seoTitle: string; slug: string; metaDescription: string; h1: string;
  primaryKeyword: string; secondaryKeywords: string[];
  sections: { heading: string; html: string; imagePrompt: string; imageUrl: string | null }[];
  faq: { q: string; a: string }[];
}
```

**Step 1 — 키워드**
- primary 키워드 + secondary 키워드(쉼표 구분) 입력. 언어별 독립(네이티브 키워드, 직역 금지).
- 비어 있으면 기본글(`article.keywords`)에서 시드 제안.
- 디바운스 저장(`saveBlogSeo`).

**Step 2 — 구조**
- `[AI 아웃라인 생성]` 버튼 → 백엔드 `blog-seo-outline` 호출.
- 결과: `seoTitle`, `slug`, `metaDescription`, `h1`, 섹션 제목 배열(빈 `html`/`imagePrompt`), FAQ 질문 배열(빈 `a`).
- 사용자가 메타 필드 + 섹션 제목 편집, 섹션 추가/삭제/순서 변경, FAQ 질문 편집.

**Step 3 — 글쓰기**
- `[AI 본문 생성]` 버튼 → 백엔드 `blog-seo-body` 호출(아웃라인 + 키워드 + 기본글 본문 참고).
- 결과: 각 섹션 `html` + `imagePrompt`, FAQ `a` 채움. 언어별 네이티브 transcreation.
- 편집 캔버스 = 기존 `BlogSeoPanel`의 섹션 카드 UI 재사용(소제목/본문 HTML/이미지 드롭존/이미지 프롬프트 복사/일괄 업로드/FAQ).

**Step 4 — SEO 점수**
- 클라이언트 점수기(`googleSeoScorer.ts`, 5번)로 실시간 계산.
- 항목별 점수/등급/메시지 표시(11항목, 100점). 총점·등급(A~F).

**Step 5 — 수정**
- 약한 항목(등급 낮음)별 `[AI 수정]` → 백엔드 `blog-seo-improve`(또는 섹션 단위 `/rewrite`) 호출 → 해당 섹션/메타만 패치 → 재채점.

**기존 248편 호환**: `blog[lang]`이 이미 차 있으면 Step 3~5가 즉시 동작(생성 없이 편집·채점·수정). Step 1~2 생성은 빈 글/재생성용.

### 4. 백엔드 (ai-server) — 신규 엔드포인트

모두 Gemini 게이트(키 없으면 graceful 실패). 프롬프트는 `services/contentPrompts.ts`에 추가, 언어별 네이티브 transcreation(`docs/blog` 방식 미러).

- `POST /api/marketing/blog-seo-outline`
  - in: `{ lang, primaryKeyword, secondaryKeywords[], topicTitle, baseBody? }`
  - out: `{ seoTitle, slug, metaDescription, h1, sectionHeadings[], faqQuestions[] }`
- `POST /api/marketing/blog-seo-body`
  - in: `{ lang, outline:{seoTitle,h1,sectionHeadings[],faqQuestions[]}, primaryKeyword, secondaryKeywords[], baseBody? }`
  - out: `{ sections:[{heading,html,imagePrompt}], faq:[{q,a}] }`
- `POST /api/marketing/blog-seo-improve`
  - in: `{ lang, article: BlogSeoArticle, weakItems:[{label, msg}] }`
  - out: 패치된 필드(약한 섹션 html / meta / title 등)
  - 단순화 대안: 섹션 단위로 기존 `POST /api/marketing/rewrite` 재사용.

### 5. SEO 점수기 포팅

- 신규 `v4/src/features/marketing/utils/googleSeoScorer.ts`.
- `docs/blog/lib/seo-check.mjs`의 `scoreArticle`(+`tokenize`/`kwCoverage`/`lcsRatio`/`exactCount`/`stripHtml`/`normalize`/`noSpace`/`isWide`/`gradeOf`) 헬퍼를 순수 TS로 포팅.
- 입력 = `BlogSeoArticle` + `lang`, 출력 = `{ score, max, grade, details: {label,score,max,status,msg}[] }`.
- 순수 함수(Node 의존 없음) — 그대로 클라이언트 동작. 점수 영구 저장 안 함.
- 점수 패널 컴포넌트는 신규 또는 기존 `SeoScorePanel` 형태 차용(네이버 결과형과 형식이 다르면 신규).

### 6. 폐기 / 정리

**코드 제거**
- `components/content/BlogPanel.tsx`
- `services/blogChannelService.ts`
- `utils/seoScorer.ts`(네이버 `calculateNaverSeoScore`)
- 네이버 전용 카드 컴포넌트: `BlogCardItem.tsx`, `SeoScorePanel.tsx`(네이버 결과형이면), `WorkflowStepBar.tsx`(위저드용으로 개조하거나 신규)
- 관련 타입: `BlogContent`, `BlogCard`, `BlogCardType`, `BlogCardContent`, `BlogChannel`, `GlobalCardStyle` — 다른 곳 미사용 확인 후 제거.

**DB**
- `marketing_blog_contents` / `marketing_blog_cards` 테이블은 **드롭하지 않고 방치**(비파괴적). 코드에서만 분리.

**기존 `BlogSeoPanel`**
- 통합 위저드로 흡수. 섹션 편집 UI(섹션 카드/이미지 드롭존/일괄 업로드/메타 필드/FAQ)는 위저드 Step 2~5 캔버스로 재사용. 내부 언어 탭만 제거.

**발행**
- 변동 없음. `contentKind 'blog'` → i18n 정적 빌드(`blog_published`) 경로 유지.

## 컴포넌트 경계 (신규/변경)

- `ContentTabs.tsx` (변경): 탭 3개, `blogseo` 제거, `language` 그대로 블로그 탭에 전달.
- `BlogWizard.tsx` (신규): 스텝바 + 단계별 패널 오케스트레이션. `{ article, language }` 입력. `marketing_articles.blog[lang]` 로드/저장(`saveBlogSeo`), 생성/수정 엔드포인트 호출.
- `BlogSeoEditor` (기존 `BlogSeoPanel`에서 언어탭 제거 + 위저드에 맞춰 분해): 메타 필드 + 섹션 카드 + FAQ 편집 캔버스(Step 2~5 공용).
- `BlogSeoScorePanel.tsx` (신규): `googleSeoScorer` 결과 표시 + 약한 항목 `[AI 수정]` 트리거.
- `utils/googleSeoScorer.ts` (신규): 순수 점수기.
- ai-server `routes/marketing.ts` (변경) + `services/contentPrompts.ts` (변경): 3개 신규 핸들러/프롬프트.

## 데이터 흐름

1. 사용자가 콘텐츠 항목 + 최상단 언어 선택 → `BlogWizard`가 `article.blog[lang]` 로드(없으면 빈 글).
2. Step 1 키워드 입력 → 디바운스 `saveBlogSeo`.
3. Step 2 아웃라인 생성 → `blog-seo-outline` → 메타/섹션제목/FAQ질문 채움 → 편집 → 저장.
4. Step 3 본문 생성 → `blog-seo-body` → 섹션 HTML/이미지프롬프트/FAQ답변 채움 → 편집 → 저장. 이미지 업로드 → R2 URL → 섹션 `imageUrl`.
5. Step 4 점수 → 클라 계산(저장 안 함).
6. Step 5 약한 항목 → `blog-seo-improve` → 패치 → 저장 → 재채점.
7. 발행은 별도(`📥 발행 큐에 넣기` → `PublishDialog`, `contentKind 'blog'`).

## 에러 처리

- AI 엔드포인트: Gemini 키 없음/실패 시 토스트+에러 메시지, 기존 데이터 보존(생성 실패해도 편집 가능). 기존 `blog-generate` 게이트 패턴 동일.
- 저장 실패: 700ms 디바운스 저장 실패 시 인라인 에러(기존 `BlogSeoPanel` 패턴).
- 이미지 업로드 실패: 항목별 에러(기존 일괄 업로드 패턴).

## 테스트 / 검증

- 타입체크: `cd v4 && npx tsc --noEmit`.
- 점수기 포팅 검증: 기존 248편 중 일부를 `googleSeoScorer`로 채점해 `docs/blog` 스크립트 점수(`rescore.mjs`/`seo-report.mjs`)와 근사치 비교.
- UI 동작(dev): 빈 글에서 키워드→아웃라인→본문→점수→수정 전 단계 + 기존 글 편집/채점. (Gemini 키 만료 상태면 생성 단계는 게이트 메시지 확인까지.)
- 회귀: 카드뉴스/기본글 탭, 발행 큐, i18n 정적 빌드 영향 없음 확인.

## 마이그레이션 / 호환성

- DB 스키마 변경 없음(네이버 테이블 방치).
- `marketing_articles.blog`(045) 그대로 사용.
- 기존 248편 즉시 호환(편집·채점).
- 네이버 카드 데이터는 코드 분리 후 접근 불가(방치) — 사용 안 하므로 무방.

## 미해결 / 후속

- 키워드 도구(IdeasPage)와의 직접 연동(저장 키워드 끌어오기)은 후속.
- SEO 점수 영구 저장/이력은 후속(필요 시).
- `blog-seo-improve`를 전용 엔드포인트로 갈지 섹션 단위 `/rewrite` 재사용으로 갈지는 구현 시 단순한 쪽으로 결정.
