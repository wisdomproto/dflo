# 마케팅 GA4 국가별 사이트 분석 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

> **상태(2026-06-10):** ✅ 8 태스크 구현 완료 + 2차 강화(풀 대시보드: 요약카드 증감·일자별 추세·유입채널·디바이스 / SEO `/marketing/seo-audit` 분리), origin/main push. ⏳ Railway 재배포만 남음. 상세 memory `marketing_ga4_site_analytics.md`.

**Goal:** 정적 사이트(ko/th)에 GA4 추적을 심어 페이지뷰·예상키 측정·메신저 클릭이 실제로 쌓이게 하고, 마케팅 "사이트 분석"에 국가별 탭 대시보드를 붙인다.

**Architecture:** 3 레이어 — (1) `build-i18n`이 정적 `<head>`에 gtag 주입 + 예상키 측정 완료 이벤트(iframe→부모 postMessage) + 메신저 이벤트명 통일(`consult_click`), (2) ai-server `/api/analytics/site-breakdown`이 경로 prefix로 국가×페이지×이벤트 집계, (3) `SiteAnalysisPage`에 국가 탭 패널. 단일 GA4 속성, 경로 분리.

**Tech Stack:** Node 빌트인 test runner(`node --test`), tsx, React 19 + TS, Express + googleapis(GA4 Data API), Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-10-marketing-ga4-site-analytics-design.md`

---

## 작업 전 메모

- **브랜치**: main 작업 전 `git switch -c feat/marketing-ga4-site-analytics` 권장(실행 시작 시 1회).
- **측정ID 공급**: `gaSnippet()`은 `process.env.GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID`를 읽는다. Railway/로컬 빌드 env에 이미 `VITE_GA_MEASUREMENT_ID`가 있으면 정적·React가 **자동으로 같은 ID** → 분기 위험 없음. 별도 dotenv 도입 안 함.
- **검증 정책**: preview 브라우저 자동화 미사용(사용자 선호). 순수 함수는 `node --test`, TS는 `tsc --noEmit`/`tsc -b`, 사이드이펙트(gtag/postMessage)는 코드 리뷰 + 사용자 GA4 DebugView 수동 확인. GA4 적재 지연으로 대시보드 숫자 등장에 완료를 게이트하지 않는다.

## File Structure

**신규**
- `ai-server/src/services/ga4SiteBreakdown.ts` — 순수 함수(`classifyCountry`/`classifyPage`/`aggregateSiteBreakdown`) + 타입. GA4 무관, 테스트 대상.
- `ai-server/__tests__/siteBreakdown.test.mjs` — 위 순수 함수 테스트(`dist` import).
- `v4/src/features/marketing/services/marketingAnalyticsService.ts` — `fetchSiteBreakdown(days)` 클라(프록시 호출).
- `v4/src/features/marketing/components/CountrySiteBreakdownPanel.tsx` — 국가 탭 + 페이지/이벤트 카드 UI.

**수정**
- `v4/scripts/lib/seo.mjs` — `gaSnippet()` + `buildHead`/`buildBlogPostHead`/`buildBlogIndexHead` prepend.
- `v4/scripts/test/seo.test.mjs` — `gaSnippet`/`buildHead` 테스트.
- `v4/src/shared/lib/analytics.ts` — `trackKakaoConsult` → `consult_click` 통일(channel 파라미터) + `height_calc_complete` 헬퍼.
- `v4/src/features/website/components/HeightCalculator.tsx` — 측정 완료 시 postMessage(embedded) / trackEvent(SPA).
- `v4/public/_shell.js` — `height_calc_complete` postMessage 수신 → gtag 발사.
- `ai-server/src/services/ga4.ts` — `fetchSiteBreakdown(days)` (runReport 2회 + aggregate).
- `ai-server/src/routes/analytics.ts` — `GET /site-breakdown`.
- `v4/src/features/marketing/components/SiteAnalysisPage.tsx` — 좌측을 `CountrySiteBreakdownPanel`로 교체.
- `v4/.env.example`, `ai-server/.env.example` — GA 키 문서화.

---

## Chunk 1: 태깅 · 이벤트 · 서버 · 대시보드

### Task 1: 정적 사이트 gtag 주입 (`gaSnippet`)

**Files:**
- Modify: `v4/scripts/lib/seo.mjs`
- Test: `v4/scripts/test/seo.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성** — `v4/scripts/test/seo.test.mjs` 상단 import에 `gaSnippet` 추가하고 테스트 추가:

```js
// (기존 import 줄에 gaSnippet 추가)
import { buildHead, buildHreflang, gaSnippet } from '../lib/seo.mjs';

test('gaSnippet: 측정ID 없으면 빈 문자열', () => {
  const prev = process.env.GA_MEASUREMENT_ID;
  const prevV = process.env.VITE_GA_MEASUREMENT_ID;
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  assert.equal(gaSnippet(), '');
  if (prev !== undefined) process.env.GA_MEASUREMENT_ID = prev;
  if (prevV !== undefined) process.env.VITE_GA_MEASUREMENT_ID = prevV;
});

test('gaSnippet: 측정ID 있으면 gtag 스니펫', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const s = gaSnippet();
  assert.match(s, /googletagmanager\.com\/gtag\/js\?id=G-TEST123/);
  assert.match(s, /gtag\('config', ?'G-TEST123'\)/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 있으면 head 에 gtag 포함', () => {
  process.env.GA_MEASUREMENT_ID = 'G-TEST123';
  const head = buildHead('ko', { path: '/' });
  assert.match(head, /gtag\/js\?id=G-TEST123/);
  delete process.env.GA_MEASUREMENT_ID;
});

test('buildHead: 측정ID 없으면 gtag 미포함(회귀 안전)', () => {
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.VITE_GA_MEASUREMENT_ID;
  const head = buildHead('ko', { path: '/' });
  assert.doesNotMatch(head, /googletagmanager/);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd v4 && node --test scripts/test/seo.test.mjs`
Expected: FAIL — `gaSnippet is not a function` / export 없음.

- [ ] **Step 3: `gaSnippet` 구현 + head prepend** — `v4/scripts/lib/seo.mjs`:

`buildHead` 위(예: `escapeAttr` 근처)에 추가:

```js
// gtag.js 스니펫 — 빌드 env 의 측정ID(없으면 빈 문자열, graceful).
// 정적 사이트는 React 와 같은 VITE_GA_MEASUREMENT_ID 를 재사용해 단일 GA4 속성에 모인다.
export function gaSnippet() {
  const id = process.env.GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID;
  if (!id) return '';
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${id}');</script>`,
  ].join('\n  ');
}
```

`buildHead` 의 `return head.join('\n  ');` 를 gtag prepend(빈 문자열이면 제외)로 교체:

```js
  const ga = gaSnippet();
  return (ga ? [ga, ...head] : head).join('\n  ');
```

`buildBlogPostHead` 와 `buildBlogIndexHead` 도 동일하게 — 각 함수의 배열 변수 앞에 `gaSnippet()` 을 prepend. 예) `buildBlogIndexHead`:

```js
export function buildBlogIndexHead(lang) {
  const path = '/blog/';
  const ga = gaSnippet();
  const head = [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}${PATH_PREFIX}/${lang}${path}">`,
    buildHreflang(path),
  ];
  return (ga ? [ga, ...head] : head).join('\n  ');
}
```

`buildBlogPostHead` 도 동일하게 — `return [ ... ].join('\n  ')` 를 `const head` 로 hoist 후 prepend (after 형태):

```js
export function buildBlogPostHead({ post, lang }) {
  const path = `/blog/${post.slug}/`;
  const description = post.meta_description || '';
  const ga = gaSnippet();
  const head = [
    `<title>${post.title}</title>`,
    // ... (기존 줄 그대로 유지)
    renderJsonLd(blogPostingJsonLd({ post, lang })),
  ];
  return (ga ? [ga, ...head] : head).join('\n  ');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd v4 && node --test scripts/test/seo.test.mjs`
Expected: PASS (전체).

- [ ] **Step 5: 전체 i18n 테스트 회귀 확인**

Run: `cd v4 && npm run test:i18n`
Expected: PASS (기존 테스트 깨짐 없음).

- [ ] **Step 6: 빌드 산출물에 gtag 들어가는지 수동 확인**

Run (PowerShell, v4 디렉토리): `$env:GA_MEASUREMENT_ID='G-TEST123'; npm run build:i18n; Remove-Item Env:\GA_MEASUREMENT_ID`
그 후 `public/ko/index.html` 에 `gtag/js?id=G-TEST123` 포함 확인(Grep). 확인 후 빌드 산출물은 .gitignore 이므로 커밋 대상 아님.

- [ ] **Step 7: Commit**

```bash
git add v4/scripts/lib/seo.mjs v4/scripts/test/seo.test.mjs
git commit -m "feat(i18n): inject GA4 gtag into static page heads"
```

---

### Task 2: 메신저 클릭 이벤트명 통일 (`consult_click`)

**Files:**
- Modify: `v4/src/shared/lib/analytics.ts`

정적 사이트(`_shell.js`)는 `consult_click`, React 는 `kakao_consult_click` 으로 갈려 있다. React 쪽을 `consult_click`(channel 포함)으로 통일해 단일 집계. 호출부 8곳은 `trackKakaoConsult` 이름을 유지해 무수정.

- [ ] **Step 1: `analytics.ts` 수정** — `trackKakaoConsult` 를 `consult_click` 발사로 변경 + `channelForLocale` 헬퍼 + `trackHeightCalcComplete` 추가. 파일 하단의 기존 `trackKakaoConsult` 정의를 교체:

```ts
/** locale → 메신저 채널. 태국은 LINE, 그 외는 KakaoTalk. */
function channelForLocale(locale: Locale): 'kakao' | 'line' {
  return locale === 'th' ? 'line' : 'kakao';
}

/**
 * 핵심 전환 이벤트 — 메신저 상담 버튼 클릭.
 * 정적 사이트(_shell.js)의 consult_click 과 단일 이벤트로 통일한다.
 * 함수명은 기존 호출부 호환을 위해 유지(내부는 channel=kakao/line 자동 분기).
 * source 로 위치 구분(header_drawer, height_calc_result, case_slider 등).
 */
export function trackKakaoConsult(source: string): void {
  const locale = getLocale(window.location.pathname);
  trackEvent('consult_click', { source, channel: channelForLocale(locale) });
}

/** 예상키 측정 완료 — React(SPA) 컨텍스트에서 직접 발사(정적은 _shell.js 가 처리). */
export function trackHeightCalcComplete(source = 'calc_modal'): void {
  trackEvent('height_calc_complete', { source });
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음 (호출부 8곳은 시그니처 동일 → 무수정).

- [ ] **Step 3: 회귀 — 호출부가 그대로 빌드되는지 grep 확인**

Run: `cd v4 && rg "trackKakaoConsult" src` 로 8개 호출부가 여전히 동일 시그니처로 호출하는지 눈으로 확인(인자 변화 없음).

- [ ] **Step 4: Commit**

```bash
git add v4/src/shared/lib/analytics.ts
git commit -m "feat(analytics): unify messenger click as consult_click with channel"
```

---

### Task 3: 예상키 측정 완료 이벤트 (postMessage 브리지)

**Files:**
- Modify: `v4/src/features/website/components/HeightCalculator.tsx`
- Modify: `v4/public/_shell.js`

`/calc-embed`(iframe)는 어느 국가서 띄워도 경로가 같다 → 측정 완료를 부모로 postMessage 하고, 부모(정적 `_shell.js`)가 부모 경로 컨텍스트에서 gtag 발사 → pagePath 로 국가 자동 구분.

- [ ] **Step 1: `HeightCalculator.tsx` — 측정 성공 경로에 발신 추가**

먼저 `calculate()` 의 성공(결과 표시) 지점을 확인(Read `v4/src/features/website/components/HeightCalculator.tsx`, 대략 38~46행). 결과를 set 하는 직후에 추가. `lang` 과 `embedded` prop 을 사용:

```ts
// 측정 완료 알림 — iframe(embedded)이면 부모로 postMessage(부모 _shell.js 가 GA4 발사),
// SPA 모달이면 직접 발사. 측정값(키/나이)은 보내지 않는다(익명 카운트).
try {
  if (embedded && window.parent !== window) {
    window.parent.postMessage({ type: 'height_calc_complete', locale: lang }, '*');
  } else {
    import('@/shared/lib/analytics').then((m) => m.trackHeightCalcComplete('calc_modal'));
  }
} catch { /* tracking must never break UX */ }
```

(주의: `embedded`·`lang` 이 이 컴포넌트 scope 에 있는지 확인. props 로 들어옴 — `HeightCalculator.tsx:15` 의 embedded, calcLabels 의 lang. 없으면 분기만 `window.parent !== window` 로.)

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: `_shell.js` — 수신기 추가** — `// ============== GA4 Consult Tracking ==============` 블록 끝(`trackConsultClick` 정의 + DOMContentLoaded 리스너) 다음에 추가:

```js
// 예상키 측정 완료 — iframe(/calc-embed) 자식이 보낸 postMessage 를 받아 GA4 발사.
// 부모 페이지 경로(/th/calculator.html 등)에서 발사되므로 pagePath 로 국가·진입 페이지 자동 구분.
window.addEventListener('message', function (e) {
  var d = e && e.data;
  if (!d || d.type !== 'height_calc_complete') return;
  if (typeof gtag === 'undefined') return;
  var i18n = window.__I18N__ || {};
  var allowed = ['ko', 'th', 'vi', 'en'];
  var loc = allowed.indexOf(d.locale) >= 0 ? d.locale : (i18n.locale || 'unknown');
  gtag('event', 'height_calc_complete', {
    locale: loc,
    page_type: i18n.page_type || 'home',
  });
});
```

- [ ] **Step 4: 빌드 회귀 확인** (정적 셸 변경이 빌드를 깨지 않는지)

Run: `cd v4 && npm run test:i18n`
Expected: PASS. (`_shell.js` 는 public 정적 자산이라 빌드 변환 없음 — 테스트는 회귀 가드용.)

- [ ] **Step 5: 코드 리뷰 체크** — origin 검증은 `event.data.type` + locale 화이트리스트로 처리, 측정값 미전송 확인. (사용자 GA4 DebugView 수동 확인은 배포 후.)

- [ ] **Step 6: Commit**

```bash
git add v4/src/features/website/components/HeightCalculator.tsx v4/public/_shell.js
git commit -m "feat(analytics): fire height_calc_complete via iframe->parent postMessage"
```

---

### Task 4: 분류·집계 순수 함수 (`ga4SiteBreakdown.ts`)

**Files:**
- Create: `ai-server/src/services/ga4SiteBreakdown.ts`
- Test: `ai-server/__tests__/siteBreakdown.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성** — `ai-server/__tests__/siteBreakdown.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCountry, classifyPage, aggregateSiteBreakdown } from '../dist/services/ga4SiteBreakdown.js';

test('classifyCountry: 경로 prefix 로 국가', () => {
  assert.equal(classifyCountry('/th/clinic.html'), 'th');
  assert.equal(classifyCountry('/ko/index.html'), 'ko');
  assert.equal(classifyCountry('/'), 'ko');
  assert.equal(classifyCountry('/vi/cases.html'), 'other');
  assert.equal(classifyCountry('/en/'), 'other');
});

test('classifyPage: 경로 → 4분류', () => {
  assert.equal(classifyPage('/th/calculator.html'), 'calculator');
  assert.equal(classifyPage('/calc-embed'), 'calculator');
  assert.equal(classifyPage('/ko/clinic.html'), 'clinic');
  assert.equal(classifyPage('/ko/cases.html'), 'cases');
  assert.equal(classifyPage('/ko/'), 'main');
  assert.equal(classifyPage('/ko/index.html'), 'main');
  assert.equal(classifyPage('/ko/blog/foo/'), 'other');
});

test('aggregateSiteBreakdown: 국가별 PV·이벤트 집계 + 전환율', () => {
  const pv = [
    { pagePath: '/ko/index.html', views: 100 },
    { pagePath: '/ko/clinic.html', views: 20 },
    { pagePath: '/th/calculator.html', views: 30 },
    { pagePath: '/vi/index.html', views: 999 }, // other → 무시
  ];
  const ev = [
    { pagePath: '/ko/index.html', eventName: 'consult_click', count: 5 },
    { pagePath: '/th/calculator.html', eventName: 'height_calc_complete', count: 8 },
    { pagePath: '/th/index.html', eventName: 'consult_click', count: 2 },
  ];
  const r = aggregateSiteBreakdown(pv, ev);
  assert.equal(r.byCountry.ko.pageViews.main, 100);
  assert.equal(r.byCountry.ko.pageViews.clinic, 20);
  assert.equal(r.byCountry.ko.pageViews.total, 120);
  assert.equal(r.byCountry.ko.events.messenger, 5);
  assert.equal(r.byCountry.ko.events.heightCalc, 0);
  assert.equal(r.byCountry.ko.messengerChannel, 'kakao');
  assert.equal(r.byCountry.ko.conversionRate, +(5 / 120 * 100).toFixed(2));
  assert.equal(r.byCountry.th.pageViews.calculator, 30);
  assert.equal(r.byCountry.th.events.heightCalc, 8);
  assert.equal(r.byCountry.th.events.messenger, 2);
  assert.equal(r.byCountry.th.messengerChannel, 'line');
});
```

- [ ] **Step 2: 테스트 실패 확인** (모듈 없음)

Run: `cd ai-server && npm run build && node --test __tests__/siteBreakdown.test.mjs`
Expected: FAIL — `dist/services/ga4SiteBreakdown.js` 없음(빌드 시 소스 없어 컴파일 안 됨).

- [ ] **Step 3: 순수 함수 구현** — `ai-server/src/services/ga4SiteBreakdown.ts`:

```ts
// GA4 site-breakdown 순수 분류·집계 (googleapis 무관 → 단위 테스트 대상).
// 국가/페이지 구분 규칙의 단일 소스. pagePath 는 GA4 의 page path(쿼리 제외).

export type Country = 'ko' | 'th' | 'other';
export type PageBucket = 'main' | 'clinic' | 'cases' | 'calculator' | 'other';

export function classifyCountry(pagePath: string): Country {
  if (pagePath.startsWith('/th/') || pagePath === '/th') return 'th';
  if (pagePath.startsWith('/vi/') || pagePath === '/vi') return 'other';
  if (pagePath.startsWith('/en/') || pagePath === '/en') return 'other';
  // /ko/*, 루트 '/', 그 외(/calc-embed 등) → ko (루트는 ko 리다이렉트)
  return 'ko';
}

export function classifyPage(pagePath: string): PageBucket {
  if (/\/calculator\.html|\/calc-embed/.test(pagePath)) return 'calculator';
  if (/\/clinic\.html/.test(pagePath)) return 'clinic';
  if (/\/cases\.html/.test(pagePath)) return 'cases';
  if (pagePath === '/' || /^\/[a-z]{2}\/?(index\.html)?$/.test(pagePath)) return 'main';
  return 'other';
}

export interface CountryStats {
  pageViews: { main: number; clinic: number; cases: number; calculator: number; other: number; total: number };
  events: { heightCalc: number; messenger: number };
  messengerChannel: 'kakao' | 'line';
  conversionRate: number;
}
export interface SiteBreakdown {
  byCountry: Record<'ko' | 'th', CountryStats>;
}

export interface PvRow { pagePath: string; views: number }
export interface EventRow { pagePath: string; eventName: string; count: number }

function emptyStats(channel: 'kakao' | 'line'): CountryStats {
  return {
    pageViews: { main: 0, clinic: 0, cases: 0, calculator: 0, other: 0, total: 0 },
    events: { heightCalc: 0, messenger: 0 },
    messengerChannel: channel,
    conversionRate: 0,
  };
}

export function aggregateSiteBreakdown(pvRows: PvRow[], eventRows: EventRow[]): SiteBreakdown {
  const ko = emptyStats('kakao');
  const th = emptyStats('line');
  const pick = (c: Country) => (c === 'th' ? th : c === 'ko' ? ko : null);

  for (const r of pvRows) {
    const t = pick(classifyCountry(r.pagePath));
    if (!t) continue;
    const bucket = classifyPage(r.pagePath);
    t.pageViews[bucket] += r.views;
    t.pageViews.total += r.views;
  }
  for (const r of eventRows) {
    const t = pick(classifyCountry(r.pagePath));
    if (!t) continue;
    if (r.eventName === 'height_calc_complete') t.events.heightCalc += r.count;
    else if (r.eventName === 'consult_click') t.events.messenger += r.count;
  }
  for (const t of [ko, th]) {
    t.conversionRate = t.pageViews.total > 0
      ? +((t.events.messenger / t.pageViews.total) * 100).toFixed(2)
      : 0;
  }
  return { byCountry: { ko, th } };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-server && npm run build && node --test __tests__/siteBreakdown.test.mjs`
Expected: PASS (전체).

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/ga4SiteBreakdown.ts ai-server/__tests__/siteBreakdown.test.mjs
git commit -m "feat(ai-server): pure country/page classify + site-breakdown aggregator"
```

---

### Task 5: GA4 fetchSiteBreakdown + 라우트

**Files:**
- Modify: `ai-server/src/services/ga4.ts`
- Modify: `ai-server/src/routes/analytics.ts`

- [ ] **Step 1: `ga4.ts` — `fetchSiteBreakdown` 추가** — 파일 상단 import 에 추가:

```ts
import { aggregateSiteBreakdown, type SiteBreakdown } from './ga4SiteBreakdown.js';
```

`fetchChannels` 아래에 추가(내부 `runReport` 재사용):

```ts
// ── 사이트 분석 (국가×페이지×이벤트) ─────────────────────────────────
// pagePath / eventName 표준 측정기준 → 커스텀 디멘션 등록 불필요.
export async function fetchSiteBreakdown(days: number): Promise<SiteBreakdown> {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  const pvResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: '1000',
  });
  const pvRows = (pvResp.rows ?? []).map((r) => ({
    pagePath: r.dimensionValues?.[0]?.value ?? '',
    views: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const evResp = await runReport({
    dateRanges,
    dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['height_calc_complete', 'consult_click'] },
      },
    },
    limit: '1000',
  });
  const evRows = (evResp.rows ?? []).map((r) => ({
    pagePath: r.dimensionValues?.[0]?.value ?? '',
    eventName: r.dimensionValues?.[1]?.value ?? '',
    count: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  return aggregateSiteBreakdown(pvRows, evRows);
}
```

- [ ] **Step 2: `analytics.ts` — 라우트 추가** — import 에 `fetchSiteBreakdown` 추가하고 라우트 추가:

```ts
import { fetchOverview, fetchChannels, fetchSiteBreakdown } from '../services/ga4.js';

// /api/analytics/site-breakdown?days=N → 국가(ko/th)×페이지(메인/병원/사례/예상키)×이벤트
analyticsRouter.get('/site-breakdown', async (req, res) => {
  const daysRaw = Number(req.query.days ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.round(daysRaw))) : 30;
  try {
    const data = await fetchSiteBreakdown(days);
    res.json({ success: true, days, data });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[analytics] /site-breakdown failed:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 3: 빌드/타입체크**

Run: `cd ai-server && npm run build`
Expected: 에러 없음(`tsc`).

- [ ] **Step 4: 전체 ai-server 테스트 회귀**

Run: `cd ai-server && npm test`
Expected: PASS (siteBreakdown 포함, 기존 깨짐 없음).

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/ga4.ts ai-server/src/routes/analytics.ts
git commit -m "feat(ai-server): add /api/analytics/site-breakdown proxy"
```

---

### Task 6: 클라 서비스 (`marketingAnalyticsService`)

**Files:**
- Create: `v4/src/features/marketing/services/marketingAnalyticsService.ts`

`marketingChannelService.fetchChannelBreakdown` 패턴 복제.

- [ ] **Step 1: 서비스 작성**:

```ts
// src/features/marketing/services/marketingAnalyticsService.ts
// 사이트 분석(국가별) — ai-server GA4 프록시 호출. 키 없이 동작(프록시가 OAuth 보유).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface CountryStats {
  pageViews: { main: number; clinic: number; cases: number; calculator: number; other: number; total: number };
  events: { heightCalc: number; messenger: number };
  messengerChannel: 'kakao' | 'line';
  conversionRate: number;
}
export interface SiteBreakdown {
  byCountry: Record<'ko' | 'th', CountryStats>;
}

export async function fetchSiteBreakdown(days: number): Promise<SiteBreakdown> {
  const res = await fetch(`${BASE}/api/analytics/site-breakdown?days=${days}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `사이트 분석 실패: ${res.status}`);
  return body.data as SiteBreakdown;
}
```

> 참고: `BASE` 기본값 `http://localhost:4000` 은 기존 마케팅 서비스 전부(`marketingChannelService` 등)와 동일하다. 로컬 ai-server 포트가 다르면(`.env.example` 은 `PORT=3001`) `.env.local` 의 `VITE_AI_SERVER_URL` 로 맞춘다 — 이 파일만의 신규 이슈 아님(기존 패턴 상속).

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/services/marketingAnalyticsService.ts
git commit -m "feat(marketing): site-breakdown client service"
```

---

### Task 7: 국가 탭 대시보드 (`CountrySiteBreakdownPanel`) + 연결

**Files:**
- Create: `v4/src/features/marketing/components/CountrySiteBreakdownPanel.tsx`
- Modify: `v4/src/features/marketing/components/SiteAnalysisPage.tsx`

- [ ] **Step 1: 패널 컴포넌트 작성** — `CountrySiteBreakdownPanel.tsx`:

```tsx
// src/features/marketing/components/CountrySiteBreakdownPanel.tsx
// 국가 탭[한국/태국] → 페이지 4카드 + 이벤트 카드 + 전환율. days 는 부모에서 주입.
import { useEffect, useState } from 'react';
import { fetchSiteBreakdown, type SiteBreakdown, type CountryStats } from '../services/marketingAnalyticsService';

const COUNTRY_TABS: { code: 'ko' | 'th'; label: string; flag: string }[] = [
  { code: 'ko', label: '한국', flag: '🇰🇷' },
  { code: 'th', label: '태국', flag: '🇹🇭' },
];

const PAGE_CARDS: { key: keyof CountryStats['pageViews']; label: string }[] = [
  { key: 'main', label: '메인 페이지' },
  { key: 'clinic', label: '병원 소개' },
  { key: 'cases', label: '치료 사례' },
  { key: 'calculator', label: '예상키 측정' },
];

function PageCard({ label, views, total }: { label: string; views: number; total: number }) {
  const pct = total > 0 ? Math.round((views / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-gray-800">{views.toLocaleString()}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded bg-[#4A2D6B]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-400">{pct}%</div>
    </div>
  );
}

export function CountrySiteBreakdownPanel({ days }: { days: number }) {
  const [country, setCountry] = useState<'ko' | 'th'>('ko');
  const [data, setData] = useState<SiteBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchSiteBreakdown(days);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '사이트 분석 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="space-y-4">
      {/* 국가 탭 */}
      <div className="flex gap-1">
        {COUNTRY_TABS.map((t) => (
          <button
            key={t.code}
            type="button"
            onClick={() => setCountry(t.code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              country === t.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.flag} {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-12 text-center text-sm text-gray-400">불러오는 중…</p>}
      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-amber-700">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-amber-600">{err}</p>
          <p className="mt-2 text-xs text-amber-500">GA4 OAuth 설정(ai-server)을 확인해주세요.</p>
        </div>
      )}

      {!loading && !err && data && (() => {
        const s = data.byCountry[country];
        const messengerLabel = s.messengerChannel === 'line' ? 'LINE' : '카카오톡';
        return (
          <div className="space-y-5">
            {/* 페이지뷰 4카드 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">페이지별 조회수</h4>
              <div className="grid grid-cols-2 gap-2">
                {PAGE_CARDS.map((p) => (
                  <PageCard key={p.key} label={p.label} views={s.pageViews[p.key]} total={s.pageViews.total} />
                ))}
              </div>
            </div>

            {/* 이벤트 카드 */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-500">핵심 이벤트</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">예상키 측정</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.heightCalc.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">{messengerLabel} 클릭</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-[#4A2D6B]">{s.events.messenger.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-400">전환율</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-gray-800">{s.conversionRate.toFixed(2)}%</div>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">전환율 = {messengerLabel} 클릭 / 총 페이지뷰</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 2: `SiteAnalysisPage.tsx` — 좌측 패널 교체** — import 교체 및 좌측 `<section>` 본문 교체:

```tsx
import { CountrySiteBreakdownPanel } from './CountrySiteBreakdownPanel';
// (TrafficSummaryPanel import 제거)
```

좌측 section 을:

```tsx
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-600">📊 국가별 사이트 분석 (GA4)</h3>
          <CountrySiteBreakdownPanel days={days} />
        </section>
```

(우측 SEO 감사 section, 상단 기간 토글은 그대로.)

- [ ] **Step 3: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음. (TrafficSummaryPanel 이 더 이상 import 안 되면 미사용 — 파일은 보존, 다른 곳 미참조면 OK.)

- [ ] **Step 4: 미사용 import 확인**

Run: `cd v4 && rg "TrafficSummaryPanel" src` 로 SiteAnalysisPage 외 참조 없으면 그대로 두거나(보존), lint 경고 시 SiteAnalysisPage 에서 import 제거 확인.

- [ ] **Step 5: lint**

Run: `cd v4 && npm run lint`
Expected: 신규 파일 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add v4/src/features/marketing/components/CountrySiteBreakdownPanel.tsx v4/src/features/marketing/components/SiteAnalysisPage.tsx
git commit -m "feat(marketing): country-tab site analytics dashboard"
```

---

### Task 8: 환경변수 문서화 + 마무리

**Files:**
- Modify: `v4/.env.example`
- Modify: `ai-server/.env.example`

- [ ] **Step 1: `v4/.env.example` 에 GA 키 추가**:

```
# Google Analytics 4 (GA4) — 측정ID. 정적 빌드(build:i18n)와 React 가 같은 값을 공유.
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

- [ ] **Step 2: `ai-server/.env.example` 에 GA4 프록시 키 추가**:

```
# GA4 Data API (사이트 분석 프록시) — setup-ga4-oauth 로 refresh token 발급
GA4_PROPERTY_ID=your_ga4_property_id
GA4_OAUTH_CLIENT_ID=your_oauth_client_id
GA4_OAUTH_CLIENT_SECRET=your_oauth_client_secret
GA4_OAUTH_REFRESH_TOKEN=your_oauth_refresh_token
```

- [ ] **Step 3: 전체 검증 (양쪽 타입/테스트)**

Run:
```
cd v4 && npx tsc --noEmit && npm run test:i18n
cd ai-server && npm run build && npm test
```
Expected: 전부 PASS.

- [ ] **Step 4: Commit**

```bash
git add v4/.env.example ai-server/.env.example
git commit -m "docs(env): document GA4 measurement id + Data API proxy keys"
```

---

## 완료 후 (사용자 액션 — 코드 외)

1. **빌드 env 공급 확인**: Railway(v4 서비스)·로컬에 `VITE_GA_MEASUREMENT_ID` 가 설정돼 있는지 확인 → 없으면 추가(정적 태깅의 전제). ai-server 에 `GA4_*` OAuth 키 확인.
2. **재배포**: v4 정적 재빌드(`npm run build`) 후 배포 → 정적 페이지에 gtag 적재 시작.
3. **수동 검증(GA4 DebugView)**: `/ko/`·`/th/calculator.html` 등에서 `page_view`/`height_calc_complete`/`consult_click` 실시간 수신 확인.
4. **대시보드 확인**: `/marketing` → 사이트 분석 → 국가 탭 전환. (GA4 적재 지연으로 수치는 수십 분~24h 후 안정화.)
5. **(선택) 메모리/CLAUDE.md 업데이트**: "업데이트 하자" 워크플로우로 반영.
