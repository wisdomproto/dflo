<!--
title: 마케팅 SP3a — 블로그 AI 생성 (Blog Generator) 설계
description: SP1 설정 + 주제로 Gemini가 187 블로그 글을 생성·편집·저장. ai-server 신규 라우트(/api/marketing/generate-article) + dflo Supabase marketing_articles + /marketing/articles UI. Phase 2 두 번째 서브프로젝트. 발행은 별도 슬라이스로 연기.
date: 2026-06-03
status: approved
-->

# 마케팅 SP3a — 블로그 AI 생성 (Blog Generator) 설계

## 1. 개요

Phase 2의 **두 번째 서브프로젝트**. SP1의 브랜드 보이스 설정(`marketing_config`)과 주제를 입력해 **Gemini가 187 성장클리닉 블로그 글을 생성**하고, 사용자가 편집·저장한다. ContentFlow 블로그 채널의 *핵심 생성 루프*만 MVP로 가져온다.

- **핵심 루프**: SP1 설정 + 주제 → Gemini → 글 → 편집 → 저장.
- **아키텍처(확정)**: native 내재화 — dflo ai-server(Express) 신규 라우트 + dflo Supabase 테이블 + Vite UI. 외부 ContentFlow/Vercel 의존 0.
- **결정(사용자 확정)**: 생성 응답 = **단순 요청/응답**(SSE 아님) · 주제 입력 = **백로그 + 직접입력** · 출력 범위 = **생성·편집·저장까지**(발행 연기).

### 가치
dflo가 **자체적으로 블로그 글을 생성**하기 시작 → 장기적으로 외부 ContentFlow 블로그 의존을 끊는 토대(발행 슬라이스에서 완성).

---

## 2. 범위

### IN (SP3a MVP)
1. ai-server 신규 라우트 `POST /api/marketing/generate-article` — 서버에서 `marketing_config` 읽고 프롬프트 조립 → Gemini `generateText` → 글 반환.
2. dflo Supabase `marketing_articles` 테이블(migration 017) — 생성/편집된 글 저장.
3. dflo UI `/marketing/articles`(사이드바 6번째) — 글 목록 + "새 글 생성" 플로우(주제 선택/직접입력 → 생성 → 편집 → 저장) + 편집/삭제.
4. 주제 입력 = Phase1 주제 백로그(`topics.json` 78개) 선택 또는 직접 입력.

### OUT (다음 슬라이스 / 명시 연기)
- **이미지 생성**(Gemini 이미지) · **SEO 점수/카드/구조화 블로그 포맷** · **모바일 정리**.
- **멀티채널**(카드뉴스·스레드·유튜브 = SP3b/c) · **다국어 번역**(SP3d).
- **실제 블로그 사이트로 발행/출력** — dflo 블로그가 현재 ContentFlow API에서 읽는 구조라, 자체 발행은 스키마·렌더러 재설계가 필요한 **큰 별도 슬라이스**.
- TipTap 리치 에디터(글은 평문이라 textarea로 충분 — YAGNI).
- SSE 스트리밍(요청/응답으로 충분 — YAGNI).

---

## 3. 핵심 설계 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | 생성 = ai-server 라우트(요청/응답), 설정은 **서버에서** 읽음 | Gemini 키는 서버 전용. 설정 단일 소스(클라가 config 전달 X) |
| D2 | 저장 = client-direct Supabase `marketing_articles` | SP1과 동일 패턴(비밀 아님), 편집 후 저장 분리 |
| D3 | 글 1개 = `marketing_articles` 단일 테이블(MVP) | ContentFlow의 contents/base_articles/blog_contents/cards 4분할 미복제(YAGNI) |
| D4 | 편집 = 평문 textarea | 글이 순수 텍스트(작성규칙 1번)라 리치에디터 불요 |
| D5 | 주제 = Phase1 `topics.json` 재활용 + 직접입력 | 백로그 78개 즉시 활용, 신규 데이터 0 |
| D6 | 발행/출력은 SP3a 밖 | 큰 재설계라 별도 슬라이스 |

---

## 4. 아키텍처 & 데이터 흐름

```
[/marketing/articles UI]
   │  주제 선택(백로그/직접) + 언어
   ▼
POST {VITE_AI_SERVER_URL}/api/marketing/generate-article   (요청/응답)
   │   ai-server: marketing_config(service-role) 읽기 → 프롬프트 조립 → generateText(Gemini)
   ▼  { success, content }
[textarea 편집] ── 제목/본문 수정
   │  저장
   ▼
client-direct Supabase upsert → marketing_articles
   ▲
[목록] fetchArticles / deleteArticle (client-direct)
```

---

## 5. ai-server 라우트 — `POST /api/marketing/generate-article`

`ai-server/src/routes/marketing.ts` (`marketingRouter`), `index.ts`에 `app.use('/api/marketing', ...middlewares, marketingRouter)` 추가. 기존 라우트와 동일하게 rate-limit + (prod)authMiddleware.

**요청 body:**
```ts
{ title: string; angle?: string; keywords?: string[]; category?: string; topicId?: string; language?: string }
```

**동작:**
1. `marketing_config` 1행 읽기(service-role `createClient`, 기존 라우트 패턴). 없으면 기본값.
2. step1에서 읽은 **`config.blogCategories`(JSONB 컬럼)에서 `category` 코드로 컨텍스트 매칭** — 별도 쿼리 아님(`find(c => c.code === category)`).
3. **프롬프트 조립**(`ai-server/src/services/articleGenerator.ts`의 순수 `buildArticlePrompt(config, req)`): 187 에디터 페르소나 + brand_description/usp/marketer + 매칭된 카테고리 컨텍스트 + 요청의 title/angle/keywords. **작성 규칙은 `config.blog_rules`에서만** 주입(빌더가 규칙을 하드코딩하지 말 것 — 016 시드에 이미 10규칙 있음, 중복 금지). config가 비면 빌더 내부 기본 규칙 블록으로 폴백.
4. `generateText(prompt)`(기존 `services/gemini.ts`) 호출. **`config.ai_model`은 MVP에서 무시** — `generateText`가 모델(`gemini-2.5-flash`) 고정이라 인자 없음. (language≠ko면 프롬프트에 "{language}로 작성" 지시 한 줄 추가 — MVP는 ko 중심.)
5. 생성 텍스트 길이 가드(예: `<100자`면 실패 처리). 응답 `{ success: true, content: string }` 또는 `{ success: false, error }`.

**테스트 포인트**: `buildArticlePrompt`는 순수 함수 → 설정·요청 주입이 프롬프트에 반영되는지 단위 검증 가능(ai-server 테스트 하니스 유무는 플랜에서 판단; 없으면 tsc + 수동).

---

## 6. 데이터 모델 — `marketing_articles` (migration 017)

```sql
create table if not exists marketing_articles (
  id          uuid primary key default gen_random_uuid(),
  topic_id    text,                      -- 백로그 주제 id("A-02") 또는 null(직접입력)
  title       text not null default '',  -- 관리/목록용 제목(편집 가능)
  body        text not null default '',  -- 생성·편집된 본문(평문)
  category    text,                      -- A/B/D/E
  keywords    text[] default '{}',
  language    text default 'ko',
  status      text default 'draft',      -- draft | done
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
-- dflo 관례(013/016과 동일): RLS on + anon/authenticated 전체 허용.
alter table marketing_articles enable row level security;
drop policy if exists marketing_articles_all on marketing_articles;
create policy marketing_articles_all on marketing_articles
  for all to anon, authenticated using (true) with check (true);
```
파일 `v4/scripts/migrations/017_marketing_articles.sql`, Supabase Dashboard 수동 적용.

### 타입 (`features/marketing/types.ts` 확장)
```ts
export type ArticleStatus = 'draft' | 'done';
export interface MarketingArticle {
  id: string;
  topicId: string | null;
  title: string;
  body: string;
  category: string;
  keywords: string[];
  language: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. 서비스 — `marketingArticleService`

`features/marketing/services/marketingArticleService.ts`.
- `fetchArticles(): Promise<MarketingArticle[]>` — client-direct Supabase, `updated_at desc`.
- `saveArticle(a: Partial<MarketingArticle> & {id?}): Promise<MarketingArticle>` — upsert(client-direct). 신규는 id 생성.
- `deleteArticle(id): Promise<void>`.
- `generateArticle(req): Promise<string>` — `fetch(${BASE}/api/marketing/generate-article, POST)` → `content`. `BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/,'') || 'http://localhost:4000'`(신규 dflo 서비스 패턴). **인증 헤더 없음** — 기존 dflo→ai-server 호출 전부 bare fetch(아래 §9 참조).
- snake↔camel 매핑.

---

## 8. UI — `/marketing/articles`

`features/marketing/components/`:
- **ArticleList** — 저장된 글 카드(제목·카테고리 배지·언어·상태·수정일) + 클릭 편집 + 🗑 삭제. "+ 새 글 생성" 버튼.
- **ArticleEditor** — 생성 + 편집 공용:
  - (신규) 주제 입력: `topics.json` 백로그에서 선택(검색/카테고리) → title/angle/keywords/category 자동 채움, 또는 직접 입력 필드.
  - 언어 select(설정의 target_languages).
  - **"생성"** 버튼 → `generateArticle` 호출 → 로딩 스피너(수 초~수십 초) → body textarea 채움.
  - 제목 input + body textarea(큰) 편집.
  - **"저장"** → `saveArticle` → 목록 복귀. 저장/생성 에러 인라인 표시.
- 사이드바 `MarketingSidebar`에 "글 생성"(6번째) + 라우트 `/marketing/articles`(lazy + Suspense).
- 목록 ↔ 에디터 전환은 컴포넌트 내부 상태(또는 `/marketing/articles/:id`까지는 YAGNI — 내부 상태로 충분).

---

## 9. 기술 노트 & 제약

- dflo 컨벤션: feature 디렉토리, Tailwind only, 컴포넌트 named export, `@/` alias, lazy+Suspense.
- ai-server: 기존 라우트 패턴(Router + service-role createClient + `{success,data}` + rate-limit/auth) 그대로. `generateText`(gemini.ts) 재사용. 새 서비스 `articleGenerator.ts`(프롬프트 빌더 + 생성 호출).
- **인증 posture(기존 그대로 상속)**: dflo 클라이언트는 ai-server를 **인증 헤더 없이** 호출한다(patient-analysis·coaching·similar-cases 전부 bare fetch). dev는 `authMiddleware` 비활성이라 동작, prod는 Bearer JWT 요구 → 기존 엔드포인트도 동일하게 미해결. **SP3a는 이 기존 posture를 그대로 따르며 prod 인증을 해결하지 않는다**(프로젝트 전역 선결 과제). PIN 게이트 내부 도구라 MVP엔 무방하나, prod 노출 시 CORS 뒤 open-Gemini 표면 — 추후 별도 과제.
- 생성은 요청/응답 — Gemini 응답이 수십 초 걸릴 수 있어 UI에 명확한 로딩 상태. ai-server rate-limit 10/min로 충분.
- 저장 데이터는 비밀 아님(블로그 카피) → client-direct. 외부 API 키는 여전히 ai-server env에만.
- PII 없음.

## 10. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| marketing_config 미적용(SP1 migration 안 함) → 생성 품질 저하 | 엔드포인트가 config 없으면 기본 프롬프트로 폴백(에러 아님) + UI에 "설정 권장" 안내 |
| 017 migration 수동 적용 누락 → 저장/목록 실패 | `fetchArticles` 에러 시 빈 목록 + 안내. 생성은 config만 있으면 동작(저장만 막힘) |
| Gemini 장시간/실패 | 로딩 상태 + 에러 인라인 표시 + 재시도. 타임아웃은 기본값 |
| prod ai-server 인증 헤더 누락 | 기존 dflo→ai-server 호출과 동일 인증 사용(플랜에서 기존 호출 참조) |

## 11. 완료 기준

- `017_marketing_articles.sql` 작성(사용자 적용).
- `POST /api/marketing/generate-article` — config 읽고 187 프롬프트 조립 → Gemini → 글 반환(`npx tsc` ai-server 통과, 수동 호출 시 글 생성 확인).
- `/marketing/articles`(PIN `8054`): 주제 선택/직접입력 → 생성 → 편집 → 저장 → 목록 표시 → 재편집/삭제.
- `npx tsc --noEmit`(v4) 통과, `npx vite build` 성공.
- 런타임 외부 의존 0(dflo Supabase + dflo ai-server만). 외부 키 미저장.
- SP1 설정을 소비(생성 품질이 설정 편집에 반응).
