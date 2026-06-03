<!--
title: 마케팅 R1-키워드 라이브 (슬라이스 1) — 네이버 + 구글 키워드 분석 + 보관함 설계
description: /marketing/keywords 를 라이브 키워드 분석 도구로. ai-server에 네이버 검색광고(HMAC) + DataForSEO(구글) 라우트 이식, dflo IdeasPage 3탭(네이버/구글/보관함), marketing_keywords 핀 테이블. R1 첫 실제 도구(ContentFlow 키워드/아이디어 이식 슬라이스 1).
date: 2026-06-03
status: approved
-->

# 마케팅 R1-키워드 라이브 (슬라이스 1) — 네이버 + 구글 키워드 분석 + 보관함

## 1. 개요

R0(구조 재정렬)로 `/marketing`이 ContentFlow 파이프라인 구조를 갖췄고, "준비 중" 자리를 실제 도구로 채우는 **R1의 첫 도구 = 키워드/아이디어 라이브**(파이프라인 시작 = 최고 가치). 현재 `/marketing/keywords`는 정적 키워드 72개 보관함뿐 → **라이브 분석 도구**로 업그레이드.

ContentFlow의 키워드/아이디어는 탭이 많다(네이버·구글·유튜브·AI아이디어·보관함·황금키워드). **슬라이스 1 = 네이버 + 구글(DataForSEO) 분석 + 보관함**(사용자 확정). 유튜브·AI아이디어·황금키워드는 슬라이스 2+.

- **아키텍처**: native 내재화 — dflo ai-server(외부 API 시크릿 프록시) + dflo Supabase + Vite UI. ContentFlow의 네이버/DataForSEO 라우트 로직 이식.

## 2. 범위

### IN (슬라이스 1)
1. ai-server `services/keywordSearch.ts` — `searchNaverKeywords` (네이버 검색광고 HMAC) + `searchGoogleKeywords` (DataForSEO Basic auth). ContentFlow `api/naver/keywords` + `api/google/keywords` 이식.
2. ai-server `routes/marketing.ts`에 `POST /naver-keywords` + `POST /google-keywords` 엔드포인트.
3. dflo Supabase `marketing_keywords` 핀 테이블(migration 018).
4. dflo `marketingKeywordService.ts` (검색 ai-server 호출 + 핀 CRUD Supabase).
5. dflo `IdeasPage` 3탭(🟢 네이버 분석 / 🔵 구글 분석 / 📁 보관함). `/marketing/keywords` 라우트 element를 IdeasPage로 교체.

### OUT (슬라이스 2+ / 명시 연기)
- 🔴 유튜브 유행 분석 · ✨ AI 아이디어(Gemini) · 🏆 황금 키워드 발굴(AI 시드→볼륨→티어).
- 콘텐츠 생성 연동(보관함 키워드 → 글 생성 입력)은 후속.

## 3. 핵심 설계 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | 검색 = ai-server 라우트(요청/응답) | 네이버 HMAC·DataForSEO Basic = 서버 시크릿. CORS·서명 서버에서 |
| D2 | 핀 저장 = client-direct Supabase `marketing_keywords` | 비밀 아님(SP1·SP3a 동일 패턴) |
| D3 | 보관함 = **정적 72(keywords.json) ∪ DB 핀** (keyword로 dedupe) | 기존 큐레이션 72 보존 + 새 핀 영속. 72 마이그레이션 불필요 |
| D4 | `KeywordTable`을 `keywords` prop 받게 리팩토링 | 보관함 탭이 병합 리스트를 주입해 기존 검색/정렬/필터/골든 재사용 |
| D5 | 외부 키는 ai-server `.env`에만(클라 노출 X) | 보안 경계. NAVER_*(3) + DATAFORSEO_*(2) |

## 4. 데이터 흐름

```
[IdeasPage / 네이버·구글 탭]  검색어 입력(쉼표 다중 가능)
   ▼ searchNaver/searchGoogle
POST {VITE_AI_SERVER_URL}/api/marketing/{naver|google}-keywords  {keywords:[]}
   │  ai-server: HMAC/Basic 서명 → 네이버 searchad / DataForSEO → 정규화
   ▼ {success, results:[]}
[결과 테이블]  행별 "📌 보관함 추가"
   ▼ savePin (client-direct upsert)
marketing_keywords (Supabase)
   ▲ fetchPins
[보관함 탭] = 정적 72 ∪ DB 핀 → KeywordTable(검색/정렬/필터/골든)
```

## 5. ai-server — 키워드 검색

### `ai-server/src/services/keywordSearch.ts`
ContentFlow 로직 이식(Express, Node `crypto`/`fetch`/`Buffer`).

**`searchNaverKeywords(keywords: string[]): Promise<NaverKw[]>`**
- 서명: `HMAC-SHA256("{timestamp}.GET./keywordstool", NAVER_API_SECRET_KEY)` → base64.
- `GET https://api.searchad.naver.com/keywordstool?hintKeywords={공백제거,쉼표}&showDetail=1`, 헤더 `X-Timestamp`/`X-API-KEY`(license)/`X-Customer`/`X-Signature`.
- `data.keywordList` → `{ keyword: relKeyword, pcSearch: typeof monthlyPcQcCnt === 'number' ? monthlyPcQcCnt : 0, mobileSearch: (동일 가드), totalSearch: pc+mobile, competition: compIdx ?? 'LOW' }`. (네이버 볼륨은 "< 10" 문자열일 수 있어 **`typeof === 'number'` 가드**로 비숫자→0; competition은 `?? 'LOW'` 기본값 — ContentFlow와 정확히 동일.)
- 키워드는 공백 제거(네이버가 공백 거부).
- 키 미설정/응답 오류 → throw(라우트가 502/500 변환).

**`searchGoogleKeywords(keywords: string[]): Promise<GoogleKw[]>`**
- Basic auth: `Buffer.from("{DATAFORSEO_LOGIN}:{DATAFORSEO_PASSWORD}").toString("base64")`.
- `POST https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live`, body `[{ keywords: keywords.slice(0,700), language_code:'ko', location_code:2410 }]`.
- `data.tasks[0].result` → `{ keyword, searchVolume: search_volume||0, competition: competition||null, cpc: cpc||0 }`.

### `ai-server/src/routes/marketing.ts` (엔드포인트 2개 추가)
- `POST /naver-keywords` body `{keywords:string[]}` → 400 if empty → `searchNaverKeywords` → `{success:true, results}` / 오류 `{success:false, error}`.
- `POST /google-keywords` 동일 패턴 → `searchGoogleKeywords`.
- 기존 `marketingRouter`(`/api/marketing` 마운트)에 추가. 기존 rate-limit/(prod)auth 상속. 인증 posture는 SP3a와 동일(클라 bare fetch).

### 환경변수 (dflo `ai-server/.env`에 추가 — ContentFlow `.env`에서 복사)
```
NAVER_API_LICENSE_KEY=
NAVER_API_SECRET_KEY=
NAVER_API_CUSTOMER_ID=
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```
미설정 시 라우트가 명확한 "키 미설정" 에러 반환(빌드/타입은 무관, 분석만 실패).

## 6. 데이터 모델 — `marketing_keywords` (migration 018)

```sql
create table if not exists marketing_keywords (
  keyword      text primary key,
  pc_search    int default 0,
  mobile_search int default 0,
  total_search int default 0,
  competition  text,
  cpc          numeric default 0,
  source       text default 'manual',   -- naver | google | manual
  created_at   timestamptz default now()
);
alter table marketing_keywords enable row level security;
drop policy if exists marketing_keywords_all on marketing_keywords;
create policy marketing_keywords_all on marketing_keywords
  for all to anon, authenticated using (true) with check (true);
```
- `keyword` PK → dedupe 자연 처리(savePin = upsert onConflict keyword). 파일 `v4/scripts/migrations/018_marketing_keywords.sql`, 사용자 수동 적용.

### 타입 (`features/marketing/types.ts` 확장)
```ts
export interface NaverKw { keyword: string; pcSearch: number; mobileSearch: number; totalSearch: number; competition: string; }
export interface GoogleKw { keyword: string; searchVolume: number; competition: string | null; cpc: number; }
export interface SavedKeyword {
  keyword: string; pcSearch: number; mobileSearch: number; totalSearch: number;
  competition: string; cpc: number; source: string; createdAt: string;
}
```

## 7. dflo 서비스 — `marketingKeywordService`

`features/marketing/services/marketingKeywordService.ts`.
- `searchNaver(keywords: string[]): Promise<NaverKw[]>` — `fetch ${BASE}/api/marketing/naver-keywords`.
- `searchGoogle(keywords: string[]): Promise<GoogleKw[]>` — `fetch ${BASE}/api/marketing/google-keywords`.
- `fetchPins(): Promise<SavedKeyword[]>` — Supabase select, `total_search desc`.
- `savePin(k: Partial<SavedKeyword> & {keyword}): Promise<void>` — upsert(onConflict 'keyword').
- `deletePin(keyword): Promise<void>`.
- `BASE` 패턴·snake↔camel 매핑은 기존 서비스와 동일.

## 8. dflo UI — `IdeasPage` (3탭)

`features/marketing/components/`:
- **IdeasPage** — 탭 상태(`naver`|`google`|`pins`) + 헤더. `/marketing/keywords` 라우트 element(기존 KeywordTable 대체, lazy).
- **NaverAnalysisTab / GoogleAnalysisTab** — 검색 input(쉼표 다중) + "분석" 버튼 + 로딩 + 결과 테이블 + 행별 "📌 추가"(savePin → 보관함 반영). 에러 인라인.
- **보관함 탭** — `fetchPins` + 정적 72 병합(dedupe by keyword, 72 우선·골든 유지) → **`KeywordTable`(keywords prop)** 로 렌더. R0의 "라이브 준비 중" 배너는 제거(이제 라이브 탭 존재).
- `KeywordTable` 리팩토링: `keywords?: Keyword[]` prop(기본=정적 72) 받아 내부 하드코딩 제거. SavedKeyword→Keyword 매핑(category/isGolden 기본값).

## 9. 기술 노트 & 제약

- ai-server: 기존 라우트 패턴(Router + `{success,...}` + rate-limit/auth) 그대로. `keywordSearch.ts`는 ContentFlow 로직의 충실 이식.
- 인증 posture: dflo 클라 bare fetch(기존 그대로). prod 인증 미해결(프로젝트 전역 선결 과제) — 이 슬라이스도 해결 X.
- 핀 데이터 비밀 아님 → client-direct. 외부 키는 ai-server env에만.
- PII 없음.
- 검증: ai-server `tsc`/`build`, v4 `tsc --noEmit`/`vite build`/lint. preview 자동검증 미사용.

## 10. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 네이버/DataForSEO 키 미설정 → 분석 실패 | 라우트가 명확한 에러 반환 + UI 인라인 표시. 빌드/타입은 무관 |
| 네이버 볼륨 "< 10" 등 비숫자 | 비숫자 → 0 정규화(ContentFlow 동일) |
| 네이버 공백 포함 키워드 거부 | 공백 제거 후 전송 |
| 018 migration 미적용 → 핀 저장/보관함 실패 | `fetchPins` 에러 시 빈 배열(보관함은 정적 72만 표시) + 안내 |
| KeywordTable 리팩토링이 기존 보관함 깨뜨림 | prop 기본값=정적 72로 기존 동작 보존 |

## 11. 완료 기준

- `018_marketing_keywords.sql` 작성(사용자 적용).
- ai-server `POST /api/marketing/{naver,google}-keywords` — 키 설정 시 검색어 → 라이브 결과 반환(ai-server `tsc` 통과, 키 설정 후 수동 호출 확인).
- `/marketing/keywords`(PIN `8054`): 네이버/구글 탭에서 검색 → 결과 테이블 → "📌 추가" → 보관함 탭에 반영(정적 72 + 핀). 보관함 검색/정렬/필터/골든 동작.
- `npx tsc --noEmit`(v4) + ai-server `tsc` 통과, `vite build` 성공, lint 클린.
- 외부 키 미저장(클라), ai-server env에만.
