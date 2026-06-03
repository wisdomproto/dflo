<!--
title: 마케팅 R0 — ContentFlow 구조 재정렬 (Structural Realignment) 설계
description: /marketing 사이드바를 ContentFlow 파이프라인 구조(설정 / 오가닉[키워드·콘텐츠·발행] / 성장[모니터링] / 유료[광고] / 분석[사이트·채널·경쟁사] / 전략)로 재편. 기존 6화면 재배치 + 미구축 6기능 "준비 중" 자리표시. 실제 도구 구현은 R1+.
date: 2026-06-03
status: approved
-->

# 마케팅 R0 — ContentFlow 구조 재정렬 설계

## 1. 개요 & 동기

`/marketing` 섹션이 ContentFlow와 **구성이 너무 다르다**는 피드백. 원인 진단(정직):
- ContentFlow는 **생산 파이프라인 플랫폼**(키워드 발굴 → 콘텐츠 생성 → 발행 → 모니터링 → 광고 → 분석 → 전략, 모두 살아있는 도구). 사이드바 실측(`ContentFlow/contentflow/src/components/layout/sidebar.tsx`)으로 확인.
- 지금까지 빌드한 `/marketing`은 **연세새봄 데이터를 정적 박제한 자료실 + 설정 + 얇은 블로그 툴**이라 ContentFlow 구조/도구와 안 맞음.

**R0의 목적**: `/marketing` 사이드바·라우트를 **ContentFlow 구조 그대로 재편**하고, 기존 화면을 올바른 자리로 재배치하며, 미구축 기능은 "준비 중" 자리표시로 채워서 — `/marketing`이 **즉시 ContentFlow처럼 보이고 전부 클릭되게** 한다.

R0는 **구조만**. 실제 도구(라이브 키워드 분석, 7채널 콘텐츠 스튜디오, 발행 등)는 R1+에서 ContentFlow 동등 수준으로 구현(사용자 확정: full feature, 단 단계적).

---

## 2. 범위

### IN (R0)
1. `MarketingSidebar` 를 ContentFlow 그룹 구조로 재작성(설정 / 오가닉 마케팅 / 성장 / 유료 마케팅 / 분석 / 전략).
2. 기존 화면 재배치 + 라우트 정리(아래 §4 매핑).
3. 공용 `MarketingPlaceholder` 화면 + 미구축 6기능 자리표시 라우트.
4. `/marketing` 진입 리다이렉트 + "대시보드"·"주제 백로그" 단독 탭 제거.

### OUT (R1+)
- 실제 도구 구현: 라이브 키워드/아이디어(네이버·DataForSEO), 7채널 콘텐츠 스튜디오, 발행 큐, 모니터링, 광고, 사이트/채널 분석, 경쟁사. 각각 별도 서브프로젝트(spec→plan→build).
- 외부 API 키 연동(네이버·DataForSEO·Meta·YouTube) — 해당 도구 슬라이스에서.

---

## 3. 목표 사이드바 구조 (ContentFlow 미러)

`⚙️ 설정`을 맨 위 고정, 그 아래 5개 그룹:

| 그룹 | 아이콘·라벨 | 라우트 | 상태 |
|---|---|---|---|
| (고정) | ⚙️ 설정 | `/marketing/settings` | ✅ 기존 |
| 오가닉 마케팅 | 💡 키워드 / 아이디어 | `/marketing/keywords` | ✅ 기존(보관함) + 라이브 준비중 |
| 오가닉 마케팅 | 📝 콘텐츠 생성 | `/marketing/content` | ✅ 기존(블로그=첫 채널) |
| 오가닉 마케팅 | 🚀 발행 | `/marketing/publish` | 🔶 준비 중 |
| 성장 | 💬 모니터링 / 댓글 | `/marketing/monitoring` | 🔶 준비 중 |
| 유료 마케팅 | 📢 광고 관리 | `/marketing/ads` | 🔶 준비 중 |
| 분석 | 📊 사이트 분석 | `/marketing/site-analysis` | 🔶 준비 중 |
| 분석 | 📱 채널 분석 | `/marketing/channel-analytics` | 🔶 준비 중 |
| 분석 | 🎯 경쟁사 | `/marketing/competitors` | 🔶 준비 중 |
| 전략 | 💡 마케팅 전략 | `/marketing/strategy` | ✅ 기존(ContentFlow와 동일 HTML 뷰어) |

- 그룹 헤더 표시(ContentFlow처럼 작은 uppercase 라벨). "준비 중" 항목은 클릭 가능하되 dimmed + 작은 "준비 중" 배지.
- **경로 1:1 (의도적 예외 1개)**: 라우트는 ContentFlow와 1:1(`/settings`·`/publish`·`/monitoring`·`/ads`·`/site-analysis`·`/competitors`·`/strategy`). 단 채널 분석은 ContentFlow `/meta-analytics` → dflo `/marketing/channel-analytics`로 **의도적 일반화**(추후 Meta 외 채널 확장 대비). 플랜에서 `meta-analytics`로 되돌리지 말 것.

---

## 4. 라우트 변경 매핑

| 현재 | R0 | 처리 |
|---|---|---|
| `/marketing` (MarketingDashboard) | → redirect `/marketing/keywords` | 대시보드 네비/인덱스 렌더 제거(ContentFlow엔 마케팅 대시보드 없음). `MarketingDashboard` lazy import 제거 |
| `/marketing/settings` | 유지 | ⚙️ 설정 |
| `/marketing/keywords` (KeywordTable 72) | 유지 | 💡 키워드/아이디어. 화면 상단에 "라이브 분석 준비 중 — 현재는 보관함" 안내 배너 1줄 추가(컴포넌트 내) |
| `/marketing/articles` (MarketingArticlesPage) | **rename → `/marketing/content`** | 📝 콘텐츠 생성. 컴포넌트 그대로. `/marketing/articles` → `/marketing/content` redirect 추가 |
| `/marketing/topics` (TopicBoard 78) | 네비에서 제거, 라우트는 유지(URL 접근 가능) | 단독 탭 제거(데이터는 콘텐츠 생성 입력으로 사용 중). R1에서 콘텐츠 화면에 흡수 |
| `/marketing/strategy` | 유지 | 💡 마케팅 전략 |
| (신규) | `/marketing/{publish,monitoring,ads,site-analysis,channel-analytics,competitors}` | 각각 `MarketingPlaceholder` 렌더(lazy) |

> 기존 6개 React 화면 중 **재배치만으로 동작**: 설정·키워드·콘텐츠(블로그)·전략. 드롭: 대시보드(네비/인덱스). 오프-네비 보존: 주제 백로그.

---

## 5. 컴포넌트

### MarketingSidebar (재작성)
- 현 flat `NAV` → ContentFlow 식 `navGroups`(그룹 label + items[]). 각 item `{to, icon, label, soon?}`. `soon` 이면 dimmed + "준비 중" 배지.
- ⚙️ 설정은 그룹 밖 맨 위. 하단 "← 홈으로" 유지.

### MarketingPlaceholder (신규)
- props `{ title, planned }` — 가운데 정렬, "🔶 준비 중", `title`(예 "발행"), `planned`(이 자리에 올 ContentFlow 기능 한 줄 설명). Tailwind, ≤40줄.
- 6개 라우트가 각자 title/planned로 렌더.

### router.tsx
- `/marketing` 인덱스: `MarketingDashboard` 렌더 → **`<Navigate to="/marketing/keywords" replace />`** 로 교체(+ MarketingDashboard lazy import 제거).
- `articles` child 의 path 를 `content` 로 변경 + `articles` → `content` redirect child 추가.
- 6개 placeholder child 라우트 추가(각 `MarketingPlaceholder` with title/planned, Suspense lazy).
- `topics` child 유지(네비에서만 빠짐).

---

## 6. 기존 작업 보존 (재배치, 폐기 아님)

| 기존 | R0 후 위치 |
|---|---|
| SP1 설정 폼 | ⚙️ 설정 (그대로) |
| 전략 문서 뷰어 (HTML 8종) | 💡 마케팅 전략 (그대로 — ContentFlow도 동일 HTML 뷰어) |
| 키워드 DB 72 | 💡 키워드/아이디어의 보관함 (R1에서 라이브 분석 추가) |
| 주제 백로그 78 (topics.json) | 콘텐츠 생성의 주제 입력(SP3a가 이미 사용). 단독 탭만 제거 |
| SP3a 블로그 생성 | 📝 콘텐츠 생성의 블로그 채널 (R1에서 카드뉴스·스레드·유튜브 추가) |

→ R0는 **삭제·재작성 없이 재배치**. MarketingDashboard 컴포넌트만 네비에서 빠짐(파일은 보존, R1에서 키워드/콘텐츠 통계로 재활용 가능).

---

## 7. 기술 노트 & 제약

- dflo 컨벤션: feature 디렉토리, Tailwind only, named export, lazy+Suspense 라우트.
- 라우트는 모두 기존 `MarketingLayout`(PIN `8054`) 하위 child — 인증 자동 상속.
- `verbatimModuleSyntax`/`noUnusedLocals`: MarketingDashboard 라우트 제거 시 lazy import도 제거(미사용 금지). TopicBoard import는 `topics` 라우트 유지로 계속 사용됨.
- 정적 자산(전략 HTML)·서비스(설정/글)·migration 변동 없음. R0는 순수 라우팅/네비 재편.
- preview 자동검증 미사용(사용자 선호) — 검증 = `tsc --noEmit` + `vite build` + lint.

## 8. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| `/marketing/articles` 외부 북마크 깨짐 | `articles` → `content` redirect 추가 |
| 미사용 import tsc 에러(MarketingDashboard) | 라우트와 함께 import 제거 |
| "준비 중" 자리표시가 미완성처럼 보임 | 각 placeholder에 "어떤 ContentFlow 기능이 올지" 명시 → 로드맵으로 읽힘 |
| 주제 백로그 데이터 유실 우려 | topics.json·TopicBoard·라우트 모두 보존(네비만 제거) |

## 9. 완료 기준

- `/marketing`(PIN `8054`) 사이드바가 ContentFlow 그룹 구조(설정 / 오가닉 / 성장 / 유료 / 분석 / 전략)로 표시.
- 설정·키워드·콘텐츠·전략 = 기존 화면 정상 동작. 발행·모니터링·광고·사이트분석·채널분석·경쟁사 = "준비 중" 화면 클릭 동작.
- `/marketing` → `/marketing/keywords` 리다이렉트. `/marketing/articles` → `/marketing/content` 리다이렉트.
- `npx tsc --noEmit` 통과, `npx vite build` 성공, 마케팅 lint 클린.
- 기존 작업(설정·전략·키워드·블로그·주제 데이터) 보존.
