<!--
title: 마케팅 콘텐츠 허브 (Marketing Content Hub) — Phase 1 설계
description: dflo 사이트 내 PIN 보호 /marketing 섹션. ContentFlow의 연세새봄/187 마케팅 자산(전략 HTML 8종 + 키워드 72(분석 모집단 259) + 주제 78)을 dflo로 완전 내재화한 콘텐츠 허브.
date: 2026-06-02
status: approved
-->

# 마케팅 콘텐츠 허브 (Marketing Content Hub) — Phase 1 설계

## 1. 개요 (Overview)

dflo(187 성장케어) 사이트 안에 **자체 마케팅 섹션 `/marketing`** 을 신설한다. 외부 ContentFlow(Next.js, Vercel)에 의존하지 않고, 연세새봄의원 / 187 성장클리닉의 마케팅 자산을 dflo 안으로 **완전 내재화(self-contained)** 한다.

이 문서는 **Phase 1: 콘텐츠 허브**의 설계만 다룬다. 자체 마케팅 *도구*(키워드 분석 API·AI 콘텐츠 생성·발행 등)는 Phase 2 이후로 명시 연기한다.

### 목적 (사용자 확정)
- **자체 마케팅 도구 내재화** — 외부 ContentFlow/Vercel 의존 제거가 최종 목표. Phase 1은 그 토대인 콘텐츠 허브.
- **위치**: 별도 PIN 보호 섹션 (banner-admin 패턴, 의사 `/admin`·환자 `/app`과 분리).
- **범위**: 1단계 콘텐츠 허브 먼저 — 접근법 **C** (전략 뷰어 + 키워드 DB + 주제 백로그 모두 구조화 추출).

### 배경 (ContentFlow 분석 결과 요약)
- ContentFlow = AI 마케팅 자동화 올인원 플랫폼 (Next.js 16, ~24,000 LOC, 대시보드 14개, ~40개 서버 API 라우트).
- ContentFlow Supabase(`hpjvtphijdaketuqtpep`)와 dflo Supabase(`txirmofdvuljkrjkpzdg`)는 **완전히 다른 프로젝트**. 공유 DB 없음.
- dflo는 이미 ContentFlow 블로그 API(`/api/blog/by-project/{6cc3c9c6-1718-4097-b7a0-0f95ae74d913}/posts`)를 빌드 타임에 소비 중(ko·th 정적 렌더).
- 연세새봄 프로젝트 UUID: `6cc3c9c6-1718-4097-b7a0-0f95ae74d913`.
- **핵심 발견**: 마케팅 전략·키워드 DB·주제 백로그·페르소나·예산이 **자기완결적(self-contained) 정적 HTML 8종 안에** 들어있다 → dflo로 복사·추출만 하면 외부 의존 0으로 가져올 수 있다.
- **데이터 위치(실측 검증 완료)**: 국내 마스터(`연세새봄의원_마케팅전략 260323.html`)의 단일 `<script>` 블록 안 JS 배열에 들어있다 — `kwData`(키워드 **72**행, 골든 4) · `topics`(주제 **78**행, 카테고리 A/B/C/D/E) · `ytRows`(주제별 상태 78행). 정적 `.kw-table`/`.topic-table`는 런타임에 JS가 채우는 **빈 렌더 타깃**이라 추출 대상이 아니다. ("259"는 문서 산문에 등장하는 *분석 모집단* 수치이며 구조화된 행이 아니다 — 구조화 추출 가능분은 72개.)

---

## 2. 범위 (Scope)

### Phase 1 — IN
1. PIN 보호 `/marketing/*` 섹션 (standalone, 자체 PIN 게이트).
2. 전략 문서 뷰어 — 정적 HTML 8종을 dflo `public/`에 복사 후 iframe 열람.
3. 키워드 DB — **72개** 키워드(골든 4)를 네이티브 검색·정렬·필터 테이블로 추출.
4. 주제 백로그 — **78개** 주제(A20/B15/C15/D18/E10)를 카테고리·상태별 보드로 추출.
5. 대시보드 — 요약 카드 + 하이라이트.

### Phase 2 이후 — OUT (명시 연기)
- 블로그 콘텐츠(발행글 + 미발행 초안) 추출 — ContentFlow Supabase에서 별도 추출 필요.
- AI 콘텐츠 생성(7채널) / 키워드 분석 API(네이버·DataForSEO) / 발행 큐 / 모니터링 / SEO 감사.
- 원본 책 PDF/DOCX(콘텐츠 생성 입력) 연동.
- GA4 사이트 분석 — 이미 dflo `banner-admin/analytics`에 존재(중복 구현 금지).
- ContentFlow 라이브 연동 — "자체 내재화" 목표와 충돌(외부 의존·service-role 키 필요)하므로 **하지 않음**.

---

## 3. 핵심 설계 결정 (Decisions)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 라우트 `/marketing/*` standalone (AdminRoute/ProtectedRoute 밖) | 별도 보호 섹션 — 의사/환자 인증과 분리 |
| D2 | PIN 게이트, PIN 값 = `8054` (banner-admin과 동일 값). **sessionStorage 키는 자체(`marketing-admin-auth`)** | PIN 값만 공유, 인증 상태는 분리(마케팅 방문자가 banner-admin에 자동 통과되면 안 됨) |
| D3 | 순수 클라이언트 React + Vite, 새 백엔드 0 | 외부 런타임 의존 0, self-contained |
| D4 | 소스 HTML 8종을 dflo 레포에 복사(`public/marketing/strategy/`) | ContentFlow 폴더 의존 제거, 재현성 |
| D5 | 데이터 추출 = **일회성 스크립트 → JSON 커밋** (런타임 파싱 X) | 빌드/런타임 의존 0, 결과 결정적 |
| D6 | 추출 = `domestic-strategy.html`의 `<script>` JS 배열(`kwData`/`topics`/`ytRows`)을 **브래킷 스캔 + `JSON.parse`** (순수 Node, **cheerio 불필요**) | 데이터가 깨끗한 JSON 배열이라 DOM 파서 불요. dflo `build:i18n`(프레임워크 X) 관례 일치 |
| D7 | 유튜브 채널분석은 전략 뷰어 "채널분석" 그룹에 문서로 포함 | 빈 탭 방지, 사이드바 4영역 유지 |
| D8 | feature 디렉토리 컨벤션 `features/marketing/` | dflo 기존 구조 일관성 |

---

## 4. 아키텍처 & 디렉토리

```
v4/src/features/marketing/
  components/
    MarketingLayout.tsx       # PIN 게이트 + 사이드바 + <Outlet/>
    MarketingPinGate.tsx      # PIN 입력 화면 (banner-admin 패턴)
    MarketingSidebar.tsx      # 4영역 네비 + "← 홈으로"
    MarketingDashboard.tsx    # 요약 카드 + 하이라이트
    StrategyViewer.tsx        # 문서 목록 + iframe
    KeywordTable.tsx          # 72 키워드 검색·정렬·필터
    TopicBoard.tsx            # 78 주제 카테고리·상태 그룹
  data/
    keywords.json             # 추출 산출물 (커밋)
    topics.json               # 추출 산출물 (커밋)
    strategy-index.json       # 뷰어 매니페스트 (커밋)
  hooks/
    useMarketingAuth.ts       # sessionStorage PIN 상태
  types.ts                    # Keyword, Topic, StrategyDoc 타입

v4/public/marketing/strategy/ # 정적 HTML 8종 (커밋)
  global-market.html  global-strategy.html
  th-operations.html  vn-operations.html  en-operations.html  us-korean-operations.html
  domestic-strategy.html  youtube-analysis.html

v4/scripts/extract-marketing-data.mjs  # 일회성 추출 스크립트
```

라우터(`v4/src/app/router.tsx`): `/marketing` 경로에 `MarketingLayout`(자체 PIN 게이트) + 자식 라우트. `AdminRoute`/`ProtectedRoute` 밖에 둔다.

---

## 5. 라우트 & 화면

사이드바 4영역. 모두 `MarketingLayout`(PIN 통과 후) 하위.

| 라우트 | 컴포넌트 | 내용 |
|---|---|---|
| `/marketing` | `MarketingDashboard` | 요약 카드(전략 8·키워드 72·골든 4·주제 78·미발행 46) + 골든키워드 Top·핵심시장 하이라이트 + 각 영역 quick link |
| `/marketing/strategy` | `StrategyViewer` | 좌측 문서 목록(그룹: 국내 / 글로벌 / 국가별 작전 / 채널분석) + 우측 iframe (선택 문서 full-height) |
| `/marketing/keywords` | `KeywordTable` | 72개 테이블. 컬럼: 키워드·PC검색·모바일검색·총검색량·경쟁도·골든(파생 플래그)·카테고리. 검색 박스 + 경쟁도 필터 칩 + 골든전용 토글 + 컬럼 정렬(총검색 기본 desc). 골든 행 amber 강조 |
| `/marketing/topics` | `TopicBoard` | 78개. 카테고리(A 성장과학 20/B 부모공감 15/C 치료사례 15/D 생활습관 18/E 기타/트렌드 10)별 그룹 + 상태 필터(발행 done / 미발행 new / 유사 similar). 각 항목: 제목·앵글·키워드 태그·상태 뱃지 |

---

## 6. 가져올 자산 (연세새봄 데이터)

### 6.1 정적 HTML 8종 — 복사 + ASCII 리네임

| 소스 | → dflo 파일 (`public/marketing/strategy/`) | 그룹 | 내용 |
|---|---|---|---|
| `ContentFlow/documents/연세새봄의원_마케팅전략 260323.html` | `domestic-strategy.html` | 국내 | 국내 마스터(126KB) — 키워드 분석 259(구조화 추출분 72)·주제 78·예산·채널전략·퍼널·KPI. **구조화 추출 소스이자 뷰어 문서** |
| `…/strategy-templates/187-global-market.html` | `global-market.html` | 글로벌 | 10개국 시장분석·검색량·CPC·골든키워드 |
| `…/187-global-strategy.html` | `global-strategy.html` | 글로벌 | 글로벌 실행전략(hub-spoke·24개월 로드맵·퍼널) |
| `…/187-th-operations.html` | `th-operations.html` | 국가별 작전 | 태국 페르소나·키워드·예산·90일 캘린더 |
| `…/187-vn-operations.html` | `vn-operations.html` | 국가별 작전 | 베트남 (Zalo·TikTok 중심) |
| `…/187-en-operations.html` | `en-operations.html` | 국가별 작전 | 영어 4시장(US·IN·PH·MY) |
| `…/187-us-korean-operations.html` | `us-korean-operations.html` | 국가별 작전 | 미국 한인 디아스포라 |
| `ContentFlow/documents/187growup-analysis.html` | `youtube-analysis.html` | 채널분석 | 유튜브 @187growup 분석(구독 2,530·조회 52만) |

- 8종 모두 inline CSS/JS, 외부 데이터 의존 0 → 그대로 iframe 렌더 가능. 소스는 UTF-8(charset meta 없음) → 복사·추출 시 UTF-8로 명시 디코딩.
- `strategy-templates/tangobook-strategy.html`(타 브랜드), `ContentFlow/sample/통합_마케팅_전략.html`(구버전)은 **제외**.
- 한글/공백 파일명은 ASCII slug로 리네임(dflo 정적 자산 한글 sanitize 관례 일치).

### 6.2 구조화 추출 — keywords.json / topics.json

- **소스**: `domestic-strategy.html` **단일 파일만**. (`global-market.html`도 자체 `kwData`/`cycle-item`을 갖고 있어 다중 파일 추출 시 오염되므로, 키워드/주제 추출은 국내 마스터에만 적용. 나머지 7종은 뷰어 전용.)
- **데이터 위치**: 단일 `<script>` 블록 안 JS 배열 — `const kwData`(72) · `const topics`(78) · `const ytRows`(78, 상태 보유). 정적 `.kw-table`/`.topic-table`(빈 렌더 타깃)이 **아니다**.
- **카테고리 이름**: `.cycle-item`의 `.cycle-letter`(A~E) + `.cycle-name` — A 성장과학 / B 부모공감 / C 치료사례 / D 생활습관 / E 기타/트렌드.

---

## 7. 데이터 추출 (extract-marketing-data.mjs)

### 동작
1. dflo에 복사된 `public/marketing/strategy/domestic-strategy.html`을 UTF-8로 읽는다(소스 of truth = dflo 레포 내부).
2. `<script>` 블록에서 `kwData`/`topics`/`ytRows` 세 배열을 **브래킷 깊이 스캐너**(문자열 escape 인지)로 잘라 `JSON.parse`. cheerio 등 DOM 파서 불요.
3. `.cycle-item`에서 카테고리 코드→이름 맵을 정규식으로 추출(A~E).
4. 세 배열 + 카테고리 맵을 조합해 산출물 3종을 `features/marketing/data/`에 기록 → **커밋**.
5. 앱은 커밋된 JSON만 import. 런타임/빌드 타임 HTML 파싱 없음.

### 의존성
- **새 의존성 없음.** 순수 Node(`fs` + 정규식/문자열 스캔). dflo `build:i18n`과 동일한 무프레임워크 방식.

### 소스 배열 컬럼 (실측)
- `kwData[i]` = `[키워드, PC검색, 모바일검색, 총검색, 경쟁도("높음"|"중간"|"낮음"), 분류태그(문자열, "gold" 포함 시 골든)]`. 예: `["키크는영양제",2260,15000,17260,"높음","product"]`. **CPC 컬럼 없음.**
- `topics[i]` = `[ID, 카테고리코드, 제목, 앵글, 키워드(쉼표구분 문자열), 출처]`. 예: `["A-01","A","키 유전 80% vs 환경 20% …","오해 교정형","키 유전 비율, 환경 키 성장","바이블+백과"]`.
- `ytRows[i]` = `[ID, 상태("new"|"done"|"similar"), 제목, 비고]`. `topics`와 ID로 조인해 상태 주입.

### 산출물 스키마 (소스에서 실제 생성 가능한 형태)

`keywords.json` — `kwData` 매핑:
```ts
type Keyword = {
  keyword: string;                            // col 0
  pcSearch: number;                           // col 1
  mobileSearch: number;                       // col 2
  totalSearch: number;                        // col 3
  competition: 'high' | 'medium' | 'low';     // col 4 ("높음/중간/낮음" → high/medium/low)
  category: string;                           // col 5 분류태그
  isGolden: boolean;                          // col 5 에 "gold" 포함 여부
};
// CPC 는 kwData 에 없으므로 스키마에서 제외 (산문 카드에만 존재 → Phase 2 별도 소스 필요)
```

`topics.json` — `topics` + `ytRows`(상태) + cycle 카테고리 맵 조인:
```ts
type Topic = {
  id: string;                                 // topics col 0, 예 "A-02"
  category: string;                           // topics col 1 (A~E)
  categoryName: string;                       // cycle-item 맵 (A→"성장과학" 등)
  title: string;                              // topics col 2
  angle: string;                              // topics col 3 (소스에 항상 존재)
  keywords: string[];                         // topics col 4 쉼표 split
  source: string;                             // topics col 5 (출처)
  status: 'new' | 'done' | 'similar';         // ytRows 조인, 없으면 'new'
};
```

`strategy-index.json` — 8개 문서 매니페스트(파일명·그룹은 §6.1 표에서 결정, title/description은 각 HTML `<title>`/meta 추출 또는 수동 매핑):
```ts
type StrategyDoc = {
  file: string;        // "domestic-strategy.html"
  title: string;
  description: string;
  group: '국내' | '글로벌' | '국가별 작전' | '채널분석';
  order: number;
};
```

### 검증 기준 (실측값과 일치해야 함)
- `keywords.json`: **72**행, 골든(`isGolden`) **4**개.
- `topics.json`: **78**행, 카테고리 분포 **A20 / B15 / C15 / D18 / E10**, 상태 분포 **new 46 / done 25 / similar 7**.
- `strategy-index.json`: **8**개 문서.
- 행 수가 위와 다르면 스크립트가 경고를 출력(배열 경계/조인 키 점검). selector 보정이 아니라 **배열 추출/조인 로직** 점검.

---

## 8. 컴포넌트 명세

### MarketingLayout + MarketingPinGate + useMarketingAuth
- `useMarketingAuth`: `sessionStorage` 키(예: `marketing-admin-auth`) 검사/설정. banner-admin과 동일 패턴.
- PIN 미통과 → `MarketingPinGate`(PIN 입력, `8054` 일치 시 sessionStorage 설정 후 통과).
- 통과 → `MarketingSidebar`(4영역 + "← 홈으로" `/`) + `<Outlet/>`. 187 보라(#4A2D6B/#667eea) 톤.

### MarketingDashboard
- 입력: `keywords.json`, `topics.json`, `strategy-index.json`(import).
- 요약 카드: 전략 문서 8 · 키워드 72 · 골든 4(`isGolden`) · 주제 78 · 미발행 46(`status==='new'`). (수치는 JSON에서 계산 — 하드코딩 X.)
- 하이라이트: 골든 키워드 4개(총검색 desc) 리스트 + 각 영역 quick link.

### StrategyViewer
- `strategy-index.json`으로 좌측 목록(그룹 헤더 + 항목). 선택 시 우측 `<iframe src="/marketing/strategy/{file}">` full-height.
- 기본 선택 = `domestic-strategy.html`(국내 마스터).
- ContentFlow strategy-dashboard의 검증된 드롭다운+iframe 패턴 차용(여기선 좌측 목록).

### KeywordTable
- `keywords.json`(72행) 렌더. 검색 박스(키워드 contains) + 경쟁도 필터 칩(전체/높음/중간/낮음) + 골든전용 토글(4개) + 컬럼 정렬(키워드/PC검색/모바일검색/총검색/경쟁도/카테고리). 기본 정렬 = 총검색 desc.
- 골든 행 amber 배경 + ⭐ 뱃지. dflo `AdminPatientsPage` 테이블/정렬 idiom 재사용.

### TopicBoard
- `topics.json`(78행)을 카테고리(A~E)별 그룹. 카테고리 색상 = 소스 cycle-item 톤(A teal / B amber / C coral / D purple / E grey). 카테고리 이름: A 성장과학 / B 부모공감 / C 치료사례 / D 생활습관 / E 기타/트렌드.
- 상태 필터(전체/미발행 new 46/발행 done 25/유사 similar 7). 각 항목 카드: 제목·앵글·키워드 태그·출처·상태 뱃지. "미발행 우선" 정렬 옵션.

---

## 9. 기술 노트 & 제약

- **자체 내재화 검증**: 런타임에 ContentFlow/Vercel/외부 API 호출 0. 모든 데이터 = dflo 레포 내 정적 HTML + 커밋 JSON.
- dflo 컨벤션 준수: feature 디렉토리, Tailwind only, lazy 라우트, 컴포넌트 named export / 페이지 default export, `@/` alias, 컴포넌트 ≤200줄(최대 350).
- 정적 HTML은 Vite가 `public/`에서 직접 서빙(기존 `/programs/`·`/{lang}/` 패턴과 동일).
- PII 없음 — 마케팅 자산만(환자 데이터 무관).
- `extract-marketing-data.mjs`는 dev 전용. 산출 JSON이 진실의 원천이며, 소스 HTML 업데이트 시 재실행 후 재커밋.

## 10. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| 다중 파일 추출 시 `global-market.html`의 `kwData`/`cycle-item`이 섞여 오염 | 키워드/주제 추출은 `domestic-strategy.html` **단일 파일만** 대상(§6.2). 나머지는 뷰어 전용 |
| 브래킷 스캐너가 배열 경계를 잘못 잡음(문자열 내 `]` 등) | 문자열/escape 인지 스캐너 + `JSON.parse` 성공 + 행 수 검증(72/78/78). 실측으로 이미 검증됨 |
| CPC 등 산문 카드에만 있는 수치를 구조화 데이터로 오인 | kwData에 CPC 없음 → 스키마에서 제외. CPC는 Phase 2 별도 소스 |
| iframe 정적 HTML이 dflo 전역 CSS와 충돌 | iframe은 독립 문서 → 격리됨. 충돌 없음 |
| 한글 본문 UTF-8 디코딩 오류 | 읽기/쓰기 모두 UTF-8 명시(소스 charset meta 없음) |

## 11. Phase 2 로드맵 (참고, 본 스펙 범위 밖)

자체 마케팅 *도구* 내재화: 블로그 콘텐츠 추출/관리 → 키워드 분석(네이버·DataForSEO via ai-server) → AI 콘텐츠 생성(Gemini via ai-server) → SEO 감사 → 발행. dflo ai-server(Express)에 서버 라우트 추가하는 방식으로 단계 확장.
