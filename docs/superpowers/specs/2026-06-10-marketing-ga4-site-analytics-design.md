# 마케팅 사이트 분석 — GA4 국가별 대시보드 설계

- **날짜**: 2026-06-10
- **상태**: 설계 승인 (구현 대기)
- **범위**: 정적 사이트 GA4 태깅 + 이벤트 정비 + 마케팅 `/marketing` "사이트 분석" 국가별 탭 대시보드

---

## 1. 배경 & 문제

마케팅 섹션의 **사이트 분석**(`SiteAnalysisPage`)은 이미 GA4 트래픽 요약(좌, `TrafficSummaryPanel` → `/api/analytics/overview`)과 SEO 감사(우)로 2분할돼 있다. ai-server에 GA4 OAuth 프록시(`services/ga4.ts` + `routes/analytics.ts`, 단일 속성, 무인증)도 있다.

그러나 실제 운영 사이트는 **정적 i18n 빌드**(`/ko/…`, `/th/…`)이고, 다음 문제가 있다:

1. **정적 사이트에 GA4 태그(gtag)가 없다.** 코드 전수조사 결과 측정ID·gtag 스니펫은 React SPA(`shared/lib/analytics.ts`, `VITE_GA_MEASUREMENT_ID` 기반)에만 있고, 정적 페이지 템플릿/빌드 파이프라인엔 없다. `_shell.js`의 `trackConsultClick`은 `if (typeof gtag === 'undefined') return`이라, 정적 사이트의 페이지뷰·메신저 클릭이 **GA4에 쌓이지 않고 있을 가능성이 크다.**
2. **"예상키 측정 완료" 이벤트가 없다.** 측정 결과창에서 메신저 클릭만 추적한다(`trackKakaoConsult('height_calc_result')`). 측정 자체(전환 퍼널의 핵심 단계)는 잡히지 않는다.
3. **메신저 클릭 이벤트명이 갈려 있다.** 정적 사이트(`_shell.js`)는 `consult_click`(channel/locale/page_type/source), React는 `kakao_consult_click`(source). 집계가 분산된다.
4. **국가·페이지별 뷰가 없다.** 대시보드에 국가 탭이 없고, 페이지를 메인/병원소개/치료사례/예상키로 묶어 보는 화면이 없다.

## 2. 목표 / 비목표

**목표**
- 정적 사이트(ko/th)에서 페이지뷰·예상키 측정·메신저 클릭이 실제로 GA4에 쌓이게 한다.
- 마케팅 "사이트 분석"에 **국가 탭**(한국/태국)을 추가하고, 각 국가에서 **페이지별 PV**(메인/병원소개/치료사례/예상키)와 **이벤트**(예상키 측정 완료 수, 메신저 클릭 수)를 보여준다.
- 메신저는 국가에 따라 카톡(ko)/라인(th)으로 라벨링한다.

**비목표**
- vi/en 대시보드 노출 (코드 확장 여지만 남기고 이번엔 미노출).
- 별도 GA4 속성 분리 (단일 속성 유지).
- GTM 도입.
- 기존 `/banner-admin/analytics` 대시보드 리팩터링 (호환만 유지).
- 측정값(키·나이 등) 개인 단위 수집 — 익명 카운트만.

## 3. 핵심 결정 (확정)

| 결정 | 선택 | 근거 |
|---|---|---|
| GA4 속성 | **단일 속성** + 경로 분리 | 같은 도메인(`/` · `/th`), 기존 프록시 재사용, 국가 비교 용이 |
| 태깅 방식 | **gtag 직접 삽입** | React 앱과 동일 방식, 가벼움, 새 인프라 불필요 |
| 국가 구분 | **pagePath prefix** (`/ko/`·`/th/`) | 커스텀 디멘션 등록 불필요, 즉시 동작 |
| 측정 완료 이벤트 | **iframe→부모 postMessage** 후 부모가 발사 | `/calc-embed` 경로가 국가 무관 단일이라, 부모 경로로 국가 구분하려면 부모가 쏴야 함 |
| 대시보드 범위 | **한국/태국만** | 사용자 지정. vi/en은 코드 확장 여지만 |

## 4. 아키텍처 (3 레이어)

```
[레이어 1] 정적 사이트 태깅 & 이벤트
  build-i18n → 모든 정적 <head>에 gtag 주입
  page_view(자동) · height_calc_complete(신규) · consult_click(통일)
        │  (GA4 단일 속성에 적재)
        ▼
[레이어 2] ai-server GA4 프록시 확장
  GET /api/analytics/site-breakdown?days=N
  runReport(pagePath, eventName) → 경로 prefix로 국가×페이지×이벤트 집계
        │
        ▼
[레이어 3] 마케팅 대시보드 (SiteAnalysisPage 확장)
  국가 탭[한국/태국] → 페이지 4카드 + 이벤트 카드 + 전환율
```

### 레이어 1 — 정적 사이트 태깅 & 이벤트

**(1a) gtag 주입** — `v4/scripts/lib/seo.mjs`
- `gaSnippet()` 헬퍼 추가: `process.env.GA_MEASUREMENT_ID`가 있으면 표준 gtag.js `<script>` 2줄을 반환, 없으면 빈 문자열(**graceful**: 키 없으면 태그 미주입). (Vite의 `VITE_` 접두 변수는 클라이언트 런타임 전용이라 Node 빌드 스크립트 `seo.mjs`에서 못 읽음 → 비접두 이름이 필요.)
- **측정ID 공급 지점**: `package.json`의 `build:i18n` 단계(또는 Railway 빌드 env)에서 `GA_MEASUREMENT_ID`를 `VITE_GA_MEASUREMENT_ID`와 **동일 값**으로 공급해 정적·React 두 ID가 분기하지 않게 한다(단일 속성 보장). 플랜에서 정확한 공급 라인을 확정.
- `buildHead`, `buildBlogPostHead`, `buildBlogIndexHead` 세 함수가 반환하는 head 배열 **맨 앞**에 `gaSnippet()` prepend → 전 페이지(home/clinic/cases/calculator/blog) 커버.
- 정적 페이지는 SPA가 아니므로 gtag `config`의 **자동 page_view로 충분**(각 HTML이 별도 URL).

**(1b) 예상키 측정 완료 이벤트 (신규 `height_calc_complete`)**
- `HeightCalculator`(또는 `HeightCalculatorResult`)에서 측정 성공으로 **결과를 처음 표시하는 시점**에 `window.parent.postMessage({ type: 'height_calc_complete', locale }, '*')` 발신. (iframe이 아닌 일반 React 컨텍스트에서 직접 열린 경우엔 `window.parent === window`이므로 자기 자신이 받음 → 동일 핸들러가 gtag 발사)
- 정적 부모 측 수신기 — `_shell.js`에 `message` 리스너 추가: `type==='height_calc_complete'`면 `gtag('event','height_calc_complete', { locale, page_type })` 발사. `page_type`은 기존 `trackConsultClick`과 **동일하게 `window.__I18N__.page_type`에서** 읽어 일관성 유지. 부모 페이지(`/th/calculator.html`, `/th/index.html` 등)의 **pagePath로 국가·진입 페이지 자동 구분**.
- 측정값(키/나이/예측키)은 **보내지 않는다** — 익명 카운트만.

**(1c) 메신저 클릭 이벤트명 통일**
- React `trackKakaoConsult(source)`(`shared/lib/analytics.ts`)를 `consult_click`(파라미터 `channel`,`source`,`locale`)으로 발사하도록 변경. 기존 정적 `_shell.js`의 `consult_click`과 **단일 이벤트로 합류**.
- `channel`은 호출부 locale에 따라 `kakao`(ko/vi/en) / `line`(th). 단, 국가(ko/th)로도 종류를 유추할 수 있어 대시보드는 channel 디멘션 없이도 동작.
- **호환**: 기존 `/banner-admin/analytics`(`AdminAnalyticsPage`)가 `kakao_consult_click`을 쿼리하면, 과거 데이터 보존을 위해 그쪽은 그대로 두거나 두 이벤트를 OR로 본다(별도 작업, 본 스펙 비목표).
- **데이터 연속성 영향(인지 필요)**: `trackKakaoConsult` 변경은 React SPA 8개 호출부의 이벤트도 `consult_click`으로 바꾸므로, 배포 후 `kakao_consult_click` 시계열은 신규 트래픽이 안 잡혀 평탄화된다. 기존 `fetchOverview`가 `kakao_consult_click`을 EXACT 필터(`ga4.ts`)하므로 신규 데이터를 보려면 두 이벤트 OR 집계가 필요(별도 작업). 단 실제 운영은 정적 사이트라 SPA 이벤트 비중은 작다.

### 레이어 2 — ai-server GA4 프록시 확장

**`services/ga4.ts`에 `fetchSiteBreakdown(days)` 추가**, `routes/analytics.ts`에 `GET /api/analytics/site-breakdown?days=N` 노출.

GA4 `runReport` 호출 (단일 속성 `GA4_PROPERTY_ID`):
- **PV**: `dimensions:[pagePath]`, `metrics:[screenPageViews]`
- **이벤트**: `dimensions:[pagePath, eventName]`, `metrics:[eventCount]`, `dimensionFilter: eventName in (height_calc_complete, consult_click)`
- (옵션) **일자별**: `dimensions:[date, pagePath]`, `metrics:[screenPageViews]`

서버에서 순수 함수로 분류:
```
classifyCountry(pagePath): '/th/'로 시작 → 'th' | '/ko/' 또는 '/' → 'ko' | 그 외(/vi//en/) → 'other'
classifyPage(pagePath):
  /calculator|/calc-embed/ → 'calculator'
  /clinic/ → 'clinic'
  /cases/  → 'cases'
  말단이 '/' 또는 '/index.html' → 'main'
  그 외 → 'other' (blog 등)
```
- `/calc-embed`(iframe 자체 page_view)는 **calculator로 합산**(중복 완화).
- `other` 국가(vi/en)는 응답에 포함하되 대시보드가 ko/th만 렌더.

**응답 형태**
```jsonc
{
  "success": true, "days": 30,
  "byCountry": {
    "ko": {
      "pageViews": { "main": 0, "clinic": 0, "cases": 0, "calculator": 0, "other": 0, "total": 0 },
      "events": { "heightCalc": 0, "messenger": 0 },
      "messengerChannel": "kakao",
      "conversionRate": 0          // messenger / total PV * 100
    },
    "th": { "...": "...", "messengerChannel": "line" }
  }
}
```

무인증 라우터(`/api/analytics/*`)라 prod에서도 동작. GA4 미설정/만료 시 500 + 메시지(대시보드가 안내 표시).

### 레이어 3 — 마케팅 대시보드 (SiteAnalysisPage 확장)

`SiteAnalysisPage`의 좌측 트래픽 영역을 국가 탭 대시보드로 교체(SEO 감사 우측은 유지). 신규 컴포넌트 `CountrySiteBreakdownPanel`:
- 상단 **국가 탭**: `[🇰🇷 한국] [🇹🇭 태국]` (코드는 배열 기반이라 vi/en 추가 가능).
- 선택 국가에 대해:
  - **페이지뷰 4카드**: 메인 / 병원 소개 / 치료 사례 / 예상키 측정 — 각 PV + 전체 대비 비중 막대.
  - **이벤트 카드 2개**: `예상키 측정 완료` 수 · `메신저 클릭` 수(국가별 "카카오톡"/"LINE" 라벨 자동).
  - **전환율**: 메신저 클릭 / 총 PV.
- 기간 토글(7/30/90)은 기존 상단 그대로 두고 `days`를 같이 사용.
- 데이터 소스: `marketingAnalyticsService.fetchSiteBreakdown(days)` (신규, `VITE_AI_SERVER_URL/api/analytics/site-breakdown` 호출).

## 5. 데이터 매핑 규칙 (단일 소스)

| 분류 | 경로 패턴 | 비고 |
|---|---|---|
| 국가 ko | `/ko/*`, `/` | 루트는 ko로 리다이렉트되므로 ko 취급 |
| 국가 th | `/th/*` | |
| 페이지 main | `/{lang}/`, `/{lang}/index.html` | |
| 페이지 clinic | `/{lang}/clinic.html` | 병원 소개 |
| 페이지 cases | `/{lang}/cases.html` | 치료 사례 |
| 페이지 calculator | `/{lang}/calculator.html`, `/calc-embed` | 예상키 측정 (iframe 합산) |
| 메신저 채널 | ko→kakao, th→line | `messenger.yml`/`HeightCalculatorResult`와 일치 |

## 6. 엣지 케이스 & 에러 처리

- **측정ID 미설정**: `gaSnippet()` 빈 문자열 → 태그 미주입(빌드 실패 없음). 프록시는 GA4 OAuth 별도라 영향 없음.
- **GA4 OAuth 만료/미설정**: 프록시 500 → 대시보드가 기존 패턴대로 "트래픽 데이터를 불러오지 못했습니다" 안내.
- **`/calc-embed` 중복 page_view**: 페이지 분류에서 calculator로 합산. 단 calc 모달은 대부분 페이지에서 자동 오픈(`_shell.js`)되므로, calculator PV 버킷은 "계산기 페이지 방문 + 모든 페이지의 모달 오픈"을 합친 값이 된다 — 해석 시 유의(허용). 측정 *완료* 이벤트(`height_calc_complete`)는 부모 경로로 잡히므로 어느 페이지에서 측정했는지는 별도로 구분 가능.
- **postMessage origin**: 수신 측은 `event.data.type`만 신뢰하고 페이로드는 locale 화이트리스트(ko/th/vi/en)로 검증. 측정값은 애초에 전송 안 함.
- **데이터 0**: 태깅 직후엔 GA4 적재 지연(수십 분~24h) → 대시보드는 0을 정상 표기하고, 빈 상태 힌트 노출.
- **vi/en 트래픽**: 프록시는 집계하되 대시보드 미노출(향후 탭만 추가하면 표시).

## 7. 영향 받는 파일

**신규**
- `ai-server/src/services/ga4.ts` → `fetchSiteBreakdown` 추가 (파일 내)
- `v4/src/features/marketing/components/CountrySiteBreakdownPanel.tsx`
- `v4/src/features/marketing/services/marketingAnalyticsService.ts` (또는 기존 서비스에 함수 추가)

**수정**
- `v4/scripts/lib/seo.mjs` — `gaSnippet()` + head prepend
- `v4/public/_shell.js` — `height_calc_complete` postMessage 수신기
- `v4/src/features/website/components/HeightCalculator.tsx` 또는 `HeightCalculatorResult.tsx` — 측정 완료 postMessage 발신
- `v4/src/shared/lib/analytics.ts` — `trackKakaoConsult` → `consult_click` 통일(channel 파라미터)
- `ai-server/src/routes/analytics.ts` — `/site-breakdown` 라우트
- `v4/src/features/marketing/components/SiteAnalysisPage.tsx` — 국가 탭 패널 연결
- `v4/.env.example`, `ai-server/.env.example` — GA 키 문서화

## 8. 테스트 전략

- **단위(순수 함수)**: `classifyCountry`/`classifyPage` 경로 매핑 테이블 테스트 (ko/th/vi/en × main/clinic/cases/calculator/calc-embed/blog).
- **빌드**: `gaSnippet()` 측정ID 유무 분기, 빌드 산출 head에 gtag 포함 여부 grep.
- **타입체크**: `cd v4 && npx tsc --noEmit`, ai-server 빌드.
- **수동 확인(사용자)**: 정적 페이지에서 GA4 DebugView로 `page_view`/`height_calc_complete`/`consult_click` 수신, 대시보드 국가 탭 렌더. GA4 적재 지연(수십 분~24h)이 있으므로 **same-session 검증은 DebugView(실시간) 기준**으로 하고, 완료를 대시보드 숫자 등장에 게이트하지 않는다. (preview 브라우저 자동화는 사용자 선호상 미사용 — 코드/타입 레벨 검증 + 사용자 직접 확인.)

## 9. 미해결 / 향후

- vi/en 탭 활성화 (배열에 추가).
- `channel` 커스텀 디멘션 등록 시 메신저 종류를 국가 무관하게 분해.
- `kakao_consult_click` 과거 데이터와 `consult_click` 통합 집계(banner-admin 대시보드).
- 측정 완료 → 메신저 클릭 퍼널(드롭오프) 시각화.
- 일자별 추세를 국가별로 분리 렌더.
