<!--
title: 마케팅 SP1 — 프로젝트 설정 (Marketing Project Config) 설계
description: dflo /marketing 섹션에 연세새봄 브랜드 보이스 설정(브랜드·마케터 페르소나·블로그 생성 규칙)을 client-direct Supabase 단일 행으로 저장·편집. SP3a 블로그 생성기의 입력 단일 소스. Phase 2 첫 서브프로젝트.
date: 2026-06-02
status: approved
-->

# 마케팅 SP1 — 프로젝트 설정 (Marketing Project Config) 설계

## 1. 개요

Phase 2(ContentFlow 마케팅 도구 native 내재화)의 **첫 서브프로젝트**. dflo `/marketing` 섹션에 연세새봄/187 성장클리닉의 **브랜드 보이스 설정**을 둔다. 이 설정은 다음 서브프로젝트 **SP3a(블로그 AI 생성)** 가 읽어 프롬프트를 조립하는 **단일 소스**다.

- **목적**: 콘텐츠 생성의 기반(브랜드·마케터 페르소나·블로그 작성 규칙)을 편집 가능한 설정으로 내재화.
- **아키텍처(사용자 확정)**: native 내재화 — dflo Supabase 테이블 + Vite UI. 외부 ContentFlow 의존 0.
- **저장/쓰기(사용자 확정)**: A — client-direct Supabase(anon 키), dflo 어드민 패턴과 동일.
- **필드 범위(사용자 확정)**: 블로그 경로만(YAGNI). 인스타·스레드·유튜브 채널 프롬프트는 SP3b/c에서 확장.

### 설계 원칙: 구조화 단일 소스
설정은 **구조화된 사실**(브랜드 필드·마케터 필드·블로그 규칙·카테고리)로 저장한다. ContentFlow의 자유서술 `blog_tone_prompt` 한 덩어리 대신, SP3a 생성기가 이 구조화 필드들을 **조합해** 프롬프트를 만든다(중복 제거, 부분 편집 용이). "당신은 …블로그 에디터입니다" 같은 프롬프트 골격은 SP3a의 템플릿이지 설정이 아니다.

---

## 2. 범위

### IN (SP1)
1. dflo Supabase `marketing_config` 테이블(단일 행) + migration SQL.
2. 연세새봄 초기값 시드(ContentFlow `projects` 행 + 블로그 페르소나 프롬프트에서 1회 추출).
3. `/marketing/settings` 편집 폼(4섹션) + 사이드바 항목 추가.
4. `marketingConfigService` (client-direct Supabase read/write) + `MarketingConfig` 타입.

### OUT (다음 사이클 / 명시 연기)
- **블로그 생성기 자체(SP3a)** — 이 설정을 *소비*하는 쪽. SP1은 설정 + 그 소비 인터페이스(타입)만 정의.
- 인스타·스레드·유튜브 채널 프롬프트(SP3b/c).
- 외부 API 키(네이버·DataForSEO·Meta) — **여기 저장 금지**. SP2/SP4에서 ai-server `.env`(서버 시크릿)로.
- 멀티 프로젝트(연세새봄 단일 브랜드라 불필요).

---

## 3. 핵심 설계 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | 단일 행 config(`id=1` 고정) | 연세새봄 단일 브랜드, 멀티프로젝트 불필요 |
| D2 | client-direct Supabase(anon) read/write, **RLS enable + permissive anon 정책** | dflo migration 관례(011~013과 동일), 설정은 비밀 아님 |
| D3 | **비밀 아닌 설정만** 저장. 외부 API 키는 ai-server `.env` | 클라이언트에 시크릿 노출 금지(보안 경계) |
| D4 | 구조화 필드 저장 → SP3a가 프롬프트 조립 | 단일 소스·부분 편집·중복 제거 |
| D5 | 블로그 경로 필드만(YAGNI) | SP3a에 필요한 범위로 한정, 이후 확장 |
| D6 | 마이그레이션은 SQL 파일 → 사용자가 Supabase Dashboard 적용 | 기존 dflo migration 관례(MCP 자동 적용 불가) |

---

## 4. 데이터 모델 — `marketing_config`

단일 행. 모든 필드 nullable(부분 편집 허용). 시드 후 UI에서 수정. 마이그레이션 파일: `v4/scripts/migrations/016_marketing_config.sql` (다음 시퀀스 번호; Supabase Dashboard SQL Editor에서 수동 적용).

```sql
create table if not exists marketing_config (
  id            int primary key default 1,
  -- 브랜드
  brand_name        text,
  brand_description text,
  target_audience   text,        -- 블로그 경로엔 서술 텍스트로 단순화 (ContentFlow의 JSONB 대신)
  usp               text,
  brand_tone        text,
  banned_keywords   text[] default '{}',
  -- 마케터 페르소나
  marketer_name      text,
  marketer_expertise text,
  marketer_style     text,
  marketer_phrases   text[] default '{}',
  -- 블로그 생성
  blog_rules      text,          -- 작성 규칙 블록(자유 편집, SP3a가 프롬프트에 그대로 주입)
  blog_categories jsonb default '[]'::jsonb,  -- [{code,name,context}] A/B/D/E
  blog_image_style text,
  -- 일반
  target_languages text[] default '{ko,th,vi,en}',
  ai_model        text default 'gemini-2.5-flash',
  updated_at      timestamptz default now(),
  constraint marketing_config_singleton check (id = 1)
);
-- dflo 관례(011~013과 동일): RLS 켜고 anon/authenticated 전체 허용 정책.
alter table marketing_config enable row level security;
create policy marketing_config_all on marketing_config
  for all to anon, authenticated using (true) with check (true);
```

`blog_categories` 항목 형태: `{ "code": "A", "name": "성장과학", "context": "성장 의학/과학 지식을 쉽게 풀어 …" }`.

### TypeScript 타입 (`features/marketing/types.ts` 확장)
```ts
export interface BlogCategory { code: string; name: string; context: string; }

export interface MarketingConfig {
  brandName: string;
  brandDescription: string;
  targetAudience: string;
  usp: string;
  brandTone: string;
  bannedKeywords: string[];
  marketerName: string;
  marketerExpertise: string;
  marketerStyle: string;
  marketerPhrases: string[];
  blogRules: string;
  blogCategories: BlogCategory[];
  blogImageStyle: string;
  targetLanguages: string[];
  aiModel: string;
}
```
DB snake_case ↔ TS camelCase 매핑은 서비스에서 처리.

---

## 5. 시드 (초기 연세새봄 값)

migration SQL 안에 `INSERT ... (id=1) ON CONFLICT DO NOTHING`로 1회 시드. 출처:
- **ContentFlow `scripts/generate-base-articles.mjs`**의 블로그 에디터 페르소나·카테고리 컨텍스트(A 성장과학 / B 부모공감 / D 생활습관 / E 기타·트렌드)·작성 10규칙.
- **알려진 브랜드 팩트**: 187성장클리닉(연세새봄의원, 강남 압구정), 채용현 원장 = "쌍둥이 아빠 의사", 1,000+ 치료사례, 소아 성장·성조숙증·뼈나이·성장호르몬 전문, 국내외(의료관광) 진료.

시드 값(요약):
- `brand_name`: "187 성장클리닉"
- `brand_description`: 소아 성장/성조숙증 전문, 강남 압구정, 뼈나이 분석·성장호르몬·생활습관 코칭, 국내외 진료
- `target_audience`: 키 성장이 고민인 아이의 부모(주 결정자 = 어머니)
- `usp`: 1,000+ 치료사례, 호르몬 통합 관점, 원장 직접 진료
- `brand_tone`: 부모 눈높이의 쉬운 설명 + 의학적 근거, 과장 없음
- `marketer_name`: 채용현 원장, `marketer_style`: 쌍둥이 아빠 의사(전문성+부모 공감)
- `blog_rules`: 순수 텍스트·■ 소제목·1500~2500자·의료광고법 준수·SEO 키워드 3~5회·면책문 등(원본 10규칙)
- `blog_categories`: A/B/D/E 4개(C 치료사례는 환자 데이터 기반이라 블로그 자동생성 제외 — 원본 스크립트도 A/B/D/E만)
- `target_languages`: `{ko,th,vi,en}`, `ai_model`: `gemini-2.5-flash`

> 정확한 `brand_description`/`marketer_*` 일부는 ContentFlow Supabase `projects` 행에 있으나 직접 쿼리 불가(MCP 권한). 위 알려진 팩트로 시드하고, 사용자가 UI에서 미세 조정. 시드는 출발점일 뿐.

---

## 6. 서비스 — `marketingConfigService`

`features/marketing/services/marketingConfigService.ts`. dflo 공용 Supabase 브라우저 클라이언트(`import { supabase } from '@/shared/lib/supabase'`) 재사용. **마케팅 feature 최초의 DB 연동 서비스**(Phase 1은 정적 JSON뿐).

```ts
fetchConfig(): Promise<MarketingConfig>   // id=1 select, snake→camel 매핑 (없으면 빈 기본값 반환)
saveConfig(patch: Partial<MarketingConfig>): Promise<void>  // upsert({ id: 1, ...patch }, { onConflict: 'id' }), camel→snake 매핑
```
- read/write 모두 client-direct(anon). 단일 행 upsert(`id=1`, `onConflict:'id'`로 부분 저장이 싱글턴에 머지).
- 저장은 명시적 "저장" 버튼(자동저장 아님) — 폼 dirty 상태 추적, 저장 후 "✓ 저장됨" 인디케이터.

---

## 7. UI — `/marketing/settings`

`features/marketing/components/MarketingSettings.tsx`. 4섹션 편집 폼.

1. **브랜드**: brand_name·brand_description(textarea)·target_audience·usp·brand_tone·banned_keywords(태그 입력)
2. **마케터 페르소나**: marketer_name·marketer_expertise·marketer_style·marketer_phrases(태그)
3. **블로그 생성 설정**: blog_rules(큰 textarea)·blog_categories(코드·이름·컨텍스트 행 편집, 추가/삭제)·blog_image_style
4. **일반**: target_languages(ko/th/vi/en 체크)·ai_model(select)

- 마운트 시 `fetchConfig`, 로컬 폼 상태로 편집, "저장" 클릭 시 `saveConfig`.
- 사이드바(`MarketingSidebar`)에 "설정"(5번째) 추가, 라우트 `/marketing/settings`(lazy + Suspense).
- Tailwind, dflo 폼 관례(라벨+input, 섹션 카드). 컴포넌트 ≤200줄 — 길면 섹션별 하위 컴포넌트로 분리.

---

## 8. SP3a 소비 인터페이스 (이번 범위 밖, 계약만 명시)

SP3a 블로그 생성기는 `fetchConfig()`로 `MarketingConfig`를 읽어 프롬프트를 조립한다:
- 시스템 프롬프트 = "당신은 {brandName}의 블로그 에디터입니다 …" + brand_description/usp/marketer + blog_rules + 선택 카테고리의 context 주입.
- SP1은 이 **타입(`MarketingConfig`)과 `fetchConfig` 시그니처**만 확정한다. 프롬프트 조립·Gemini 호출·에디터 UI는 SP3a.

---

## 9. 기술 노트 & 제약

- dflo 컨벤션: feature 디렉토리, Tailwind only, 컴포넌트 named export, `@/` alias, 서비스는 `features/*/services/`.
- `marketing_config`는 PIN 게이트(클라이언트) 안에서 편집되지만, anon 키 write라 PIN 미통과자도 이론상 write 가능 — dflo 기존 dev 테이블과 동일 수준(설정=비밀 아님, 내부 도구). 추후 admin auth 이전 시 RLS 강화 가능.
- PII 없음(브랜드 카피만).
- 외부 API 키는 절대 이 테이블에 저장하지 않는다(D3).

## 10. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| migration 수동 적용 누락 → 폼이 빈 테이블 | `fetchConfig`가 row 없을 때 빈 기본값 반환(crash 방지) + 폼 상단에 "설정 미적용" 안내 |
| 시드 brand/marketer 값 부정확(ContentFlow 직접 쿼리 불가) | 알려진 팩트로 시드 + UI 편집으로 보정(시드=출발점) |
| 단일 행 위반(중복 insert) | `id=1` PK + `check(id=1)` + upsert로 강제 |
| anon write 노출 | dflo 기존 패턴과 동일, 설정엔 비밀 없음. 시크릿은 ai-server env |

## 11. 완료 기준

- `marketing_config` migration SQL 작성 + 시드 INSERT 포함.
- `/marketing/settings` 폼에서 4섹션 편집 → 저장 → 새로고침 후 값 유지.
- `MarketingConfig` 타입 + `fetchConfig`/`saveConfig` 서비스 동작(`npx tsc --noEmit` 통과).
- 사이드바 "설정" 항목 + 라우트 동작.
- 런타임 외부 의존 0(dflo Supabase만). 외부 키 미저장.
