# 홈페이지 중국어(번체·간체) 추가 — 설계

- 날짜: 2026-07-17
- 상태: 설계 확정 (구현 계획 대기)
- 범위: i18n 정적 사이트에 `zh-hant`(번체)·`zh-hans`(간체) 2개 언어를 en 과 동급으로 추가

## 배경

블로그 240편 전량 발행(2026-07-11) 이후 구글 색인이 붙으면서 **20일간 0명이던 해외 상담이 이틀 만에
호주·말레이시아·인도네시아·영국 각 1명**씩 들어왔다(전부 구글 오가닉). 유입이 블로그 색인에서 온다는 게
실측으로 확인된 상태에서, **중국어 블로그 120편(간체 60 + 번체 60)이 이미 DB 에 만들어져 있는데 발행이
안 돼 있다.** 즉 중국어는 콘텐츠 원가가 이미 지불된 시장이다.

중화권 시장 전략은 이미 결정돼 있다([[marketing_chinese_market_strategy]], 2026-06-10):

- **본토 = 제외**. Meta·구글로 닿지 못한다(웨이보·小红书·더우인은 별도 채널이라 이번 범위 밖).
- **번체 → 대만**(만다린 네이티브 + 인터넷 자유 → 중화권 1순위). 홍콩·마카오는 패시브 도달.
- **간체 → 동남아 화교(싱가포르·말레이시아) + 미국 화교 1세대**.
- 광둥어·대만어 축은 스킵(텍스트가 번체/간체 2개면 충분).

이 설계는 그 전략을 사이트에 반영한다. **간체의 타겟이 본토가 아니라는 점**이 URL·hreflang 선택을 지배한다.

## 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 범위 | 홈 4p + 상담페이지 + 블로그 120편 (en 동급) | 블로그가 홈으로 링크하는데 홈이 없으면 색인·전환이 반쪽 |
| 코드·URL | `/zh-hant/` · `/zh-hans/`, hreflang `zh-Hant`/`zh-Hans` | 글자체 기준 = 지역 중립. 간체 타겟이 본토가 아니라 `/zh-cn/` 은 사실과 다름 |
| 상담 채널 | 둘 다 **WhatsApp 대표 + LINE**. 카카오 제외 | 대만·화교에게 카카오는 쓸 이유 없음. 태국 LINE OA 로 대만 유저를 보내는 어색함 회피 |
| 인포그래픽 | `en/` 9종을 복사 재사용 | 한글 노출 0 · 코드 변경 0 · 비용 0. 중국어판 18장 제작은 과투자 |
| 계산기 | **CN 고정**(국적 버튼 없음) | 아래 §대만 성장도표 참조 |
| 대만 성장도표(TW) | **보류** | 아래 |

### 대만 성장도표를 넣지 않는 이유

대만 공식 곡선(衛福部)은 **0~7세 = WHO 2006 / 7~18세 = 대만 초·중·고생 실측**(陳偉德·張美惠, *Pediatr
Neonatol* 2010;51(2):69-79, PMID 20417456)이다. 우리 타겟 연령(초진 9~13세)이 실측 구간이라 명분은 있었다.

그런데 **CN 과 차이가 거의 없다**:

| | CN(현재) | TW(대만 공식) | 차이 |
|---|---|---|---|
| 남 18세 P50 | 172.7 | 172.0 | −0.7cm |
| 여 18세 P50 | 160.6 | 159.5 | −1.1cm |
| 남 7세 P50 | 124.0 | 121.2 | −2.8cm |

계산기의 간판 출력인 **예측 성인키가 1cm 안쪽 차이**다. 중간 연령대는 2~3cm 벌어지는데(CN 이 9개 대도시
기반이라 키가 큰 편) 백분위 표시에는 영향이 있을 수 있다. 다만 **공식 LMS 를 구하지 못했다** — 원논문이
ScienceDirect·학회지 양쪽에서 CAPTCHA/403 이고, HPA 공개 파일은 0~7세용이다. 공개된 7~18세 백분위표
(2차 출처)로 TH 와 같은 방식(P3/P50/P97 → L=1)을 쓸 수는 있으나, **1cm 를 위해 지금 할 일은 아니다.**
대만 문의가 실제로 늘면 그때 추가한다.

⚠️ 조사 중 확인: **Grokipedia 는 데이터 출처로 쓸 수 없다.** 표의 값이 `~120`, `~129` 처럼 물결표 근사치다
(AI 생성). 인용된 1차 출처 목록만 유용했다.

## 설계

### 1. 언어 코드 — ★"단일 스위치"가 아니다 (스펙 리뷰에서 정정)

- 사이트 코드 `zh-hant` / `zh-hans` — 파일 `i18n/locales/{code}.yml`, 출력 `public/{code}/…`
- 낡은 **`zh-tw.yml` stub 은 삭제**한다(301줄·2026-05-14, 값이 전부 `[NEEDS TRANSLATION]`).
  삭제해도 깨지는 곳 없음(검증: `loadLocale` 은 `ACTIVE_LANGS` 루프 안에서만 호출되고,
  `ALL_LANGS` 멤버가 locale/seo/messenger 를 가져야 한다는 단언이 **아무 데도 없다** —
  이미 `ja`/`id`/`zh-tw` 가 `seo.yml` 없이 존재). `messenger.yml` 의 `zh-tw`(TBD) 항목도 같이 제거.

🚨 **`ACTIVE_LANGS` 하나만 고치면 `hreflang="undefined"` 가 전 페이지에 박힌다.** 언어 목록이
**최소 7곳에 중복**돼 있고 대부분 조용히 실패한다. 아래는 전수 목록이며, **이 표가 이 설계의 핵심 산출물**이다.

| 파일:줄 | 역할 | 안 고치면 |
|---|---|---|
| `v4/scripts/lib/seo.mjs:15` `ACTIVE_LANGS` | 빌드 스위치 | 언어가 안 생김(시끄러움) |
| `v4/scripts/lib/seo.mjs:16` `ALL_LANGS` | 테스트 코퍼스 | 누수 검사 약해짐 |
| **`v4/scripts/lib/seo.mjs:17` `HREFLANG_MAP`** | hreflang 값 | **전 언어 전 페이지 `hreflang="undefined"`** |
| **`v4/scripts/lib/seo.mjs:18` `OG_LOCALE_MAP`** | og:locale | **`og:locale="undefined"`** |
| **`v4/scripts/lib/sitemap.mjs:3` `HREFLANG_MAP`** (seo.mjs 와 **독립 복제본**) | sitemap alternate | **~390개 alternate 전부 `hreflang="undefined"`** |
| `v4/src/app/router.tsx:142` `I18N_LANGS` | HardRedirect | 정적 경로로 리다이렉트 안 됨 |
| `v4/vite.config.ts:46` `/^\/(ko\|th\|vi\|en)$/` | 슬래시 없는 경로 301 | `/zh-hant` → 한국어 SPA 셸 |
| `v4/public/_shell.js:145` `__LANGS`, `:153` `__PATH_LANG_RE` | 언어 스위처 | 스위처 누락·현재언어 오판 |
| `v4/public/_shell.js:55` `allowed` (GA4 게이트) | calc 이벤트 locale | 아래 §9 |
| `ai-server/.../ga4SiteBreakdown.ts:12` `classifyCountry` | 분석 언어 귀속 | 아래 §9 |
| `ai-server/.../searchConsole.ts:41` · `routes/analytics.ts:10` | GSC 언어 필터 | 아래 §9 |
| `v4/.../marketingAnalyticsService.ts:34` `CountryKey` · `CountrySiteBreakdownPanel.tsx:15` · `SearchQueryPanel.tsx:10` · `PredictionsLogPage.tsx:14,133` | 마케팅 탭 | 탭 없음 |
| `v4/.../anonymousName.ts:4,22,24` | **DB 기록** | 아래 §9 |
| `v4/src/shared/lib/analytics.ts:32,50,122` | **Meta 픽셀** | 아래 §9 |

★**`sitemap.mjs` 의 `HREFLANG_MAP` 이 `seo.mjs` 것과 별개 복제본**이라는 게 이 작업의 최대 지뢰다.
둘을 대조하는 장치가 없다. **구현 시 `seo.mjs` 에서 import 하도록 합치는 것을 포함한다**(중복 제거).

- **마케팅 DB 코드(`ch`=번체 / `cn`=간체) ↔ 사이트 코드 매핑은 블로그를 읽는 지점 한 곳에만.**
  DB 코드는 건드리지 않는다(굳어 있고, 바꾸면 blog/cardnews/reels 전 테이블 마이그레이션).
  ⚠️ 리플렛만 `tw`/`cn` 이라는 **제3의 표기**를 쓴다(`LeafletViewer.tsx:11-12`) — 이번 범위 밖이나
  매핑 함수는 **입력이 `ch`/`cn`(마케팅 DB)임을 명시**한다.

### 2. 카피 번역

- ★**원본은 `en.yml`(567줄)이다. `ko.yml`(536줄)이 아니다.** ko 에는 **`consult:` 블록이 아예 없고**
  (ko 는 상담 페이지가 없어 카톡 직행) `clinic.remote_consult: []` 로 비어 있다. 중국어는 상담 페이지가
  생기므로(§3) ko 기반으로 만들면 **`render.mjs` 가 `missing key: consult.h1` 로 빌드를 죽인다**
  (미니 렌더러는 키 누락 시 throw). 원격 상담 카피도 vi/en 판이 맞다(§3) → en.yml 이 이중으로 옳은 원본.
- `en.yml` → `zh-hant.yml` / `zh-hans.yml` 신규 작성. `seo.yml` 에 2언어 title/description/FAQ.
  ★`seo.yml` 누락 시 `buildSeo` 가 `no seo config for lang` 으로 throw — 선택이 아니라 빌드 게이트.
  `og_image` 도 필수(`buildHead`).
- **표기 분리**: 번체 = 대만 만다린(`公分`), 간체 = 동남아·미국 화교(`厘米`). 릴스 스토리보드 때 쓴 규칙 재사용.
- **화자 = 남성 한국인 의사, 격식체.** 중국어는 성별 입자가 없어 태국어만큼 까다롭진 않으나 격식은 유지
  ([[feedback_i18n_speaker_register]]).
- 방식: 블로그 cn/ch 를 만들 때와 같은 에이전트 병렬 번역.

### 3. 상담 채널

`i18n/messenger.yml` 에 2언어 추가. 대표 = `whatsapp`, `consult_channels: [*whatsapp, *line]`.

- `consult_channels.length > 1` 이면 **`consult.html` 이 자동 생성**된다(`SUBPAGES` 의 `langs` 술어) →
  빌드 코드 변경 없음.
- `buildHead(lang, {altPaths})` 가 상담 페이지 hreflang 을 **그 언어들만** 내보낸다(ko 는 상담 페이지가
  없으므로 넣으면 soft-404).
- 원격 상담 안내 카피는 vi/en 판(온라인 상담 중심 + 면책)을 기준으로 삼는다. 방콕 같은 현지 인프라가
  없는 시장이라 th 판(사무소 4단계)이 아니라 vi/en 판이 맞다. **원장 감수 대상.**

### 4. 블로그 120편 발행

- `marketing_articles.blog.cn` → `blog_published(language='zh-hans')`, `.ch` → `'zh-hant'`.
- 기존 240편 전량 발행 때 쓴 패턴대로 스크립트 1개.
- **검증 완료(2026-07-17)**: `blog_published.slug` 에 **전역 유니크 제약 없음** — 같은 slug + 다른 언어
  insert 성공(테스트 행 삭제 완료). 경로도 `/zh-hans/…` vs `/ko/…` 로 갈려 파일 충돌 없음.
- `article_id` 클러스터가 hreflang 을 만들므로 **중국어가 자동 편입**되고, 덤으로 기존 240편의 hreflang 도
  6언어로 넓어진다.

⚠️ **알려진 트레이드오프**: 중국어 slug 가 **한국어 slug 그대로**다(cn 60/60, ch 60/60 이 ko 와 동일,
cn↔ch 도 서로 동일). 동작·색인엔 문제없지만 URL 에 중국어 키워드가 없다. 1차는 그대로 가고, 효과가
보이면 slug transcreation 을 별건으로 한다.

### 5. 자산

- 프로그램 이미지: `public/programs/images/en/{slug}/` 9종 → `zh-hant/{slug}/`, `zh-hans/{slug}/` 복사.
  리졸버가 `{lang}/` → `_common/` 1단계 폴백이라 **복사만으로 한글 원본을 덮는다**(코드 변경 0).
- 로고: 비한국어는 `logo_en.png` — 기존 분기가 `!== 'ko'` 인지 확인 필요(하드코딩된 언어 목록이면 추가).
- OG 이미지 2종 추가(`public/og/`).

### 6. 계산기

- `CalcLang` 에 `zh-hant`/`zh-hans` 추가, `calcLabels.ts` 에 2 로케일.
- **성장표준 CN 고정** — `standard` 분기에 추가(국적 버튼은 en 전용 유지).
- 결과 CTA 메신저 = WhatsApp(`HeightCalculatorResult` 의 `MESSENGER` 맵).
- `casesLabels.NAME_TRANSLIT` 에 환자 이름 중국어 음역 추가(미등록은 원본 폴백이라 graceful).

### 7. 셸·라우팅

- `_shell.js` 언어 스위처 4 → 6칸. 라벨은 **자국어 표기**(`繁體中文` / `简体中文`) — 기존 규칙.
  `__langHref` 의 경로 판정 정규식 `/^\/(ko|th|vi|en)\//` 에 2개 추가.
- `router.tsx` 의 `I18N_LANGS` 배열에 2개 추가 → HardRedirect 16 → 24 routes 자동.
- `vite.config.ts` `seoRedirects` 의 `/{lang}` → `/{lang}/` 301 목록에 추가.

### 9. 분석·픽셀 결합 (스펙 리뷰에서 발견 — 조용히 틀리는 것들)

언어를 추가하면 **분석이 조용히 오염된다.** 빠짐없이 같이 고친다.

1. 🔴 **`classifyCountry`(`ga4SiteBreakdown.ts:12`)가 미분류를 전부 `ko` 로 떨군다**(`return 'ko'`, `other`
   반환 경로 없음 = 데드코드). 중국어 세션의 사용자·PV·참여·유입이 **한국어 탭에 합산**된다 —
   중국어 누락이 아니라 **한국어 수치 오염**이다. 같은 파일 `:25` 의 메인페이지 정규식
   `/^\/[a-z]{2}\/?(index\.html)?$/` 도 하이픈 7글자 `zh-hant` 를 못 잡아 메인 카드가 과소집계된다.
2. 🔴 **Meta 픽셀 — `analytics.ts:122` `getLocale` 의 `/^\/([a-z]{2})(?:\/|$)/`** 가 `zh-hant` 를 못 읽어
   **`ko` 로 판정** → `VITE_META_PIXEL_ID_KO`(**한국 광고 전용 픽셀**)가 중국어 SPA 페이지에서 발사된다.
   "기본 픽셀 폴백이라 무해"는 **사실이 아니다**(정적 `/zh-hant/*.html` 은 `seo.mjs:79` 가 하이픈을
   처리해 괜찮지만, `/report`·`/diagnosis` 등 SPA 라우트가 문제). GA4 `locale` 디멘션도 `ko` 로 오표기.
3. 🔴 **익명 예측 적재 — `anonymousName.ts:24` `asLocale('zh-hant')` → `'en'`** → 국적 `EN` 으로 저장되고
   이름도 영어 풀에서 뽑힌다("Emma"). **insert 시점에 굳어 영구 오염**(원본 `locale` 컬럼은 남아 백필 가능).
4. **GSC 패널 — `routes/analytics.ts:10` 의 `LANGS` 화이트리스트**가 `zh-hant` 를 `'all'` 로 강등하고
   응답에 그 값을 그대로 echo → **전체 사이트 수치가 중국어로 라벨링**된다(200·success:true 라 티가 안 남).
   `searchConsole.ts:89` `langFilter` 는 문자열 보간이라 union 만 넓히면 바로 동작.
5. `_shell.js:55` 의 `allowed = ['ko','th','vi','en']` — calc 이벤트 locale 게이트.

### 8. 검증

- `cd v4 && npm test` (현재 117 통과)
- 🚨 **`npm test` 는 `hreflang="undefined"` 를 못 잡는다.** `seo.test.mjs:16` 이 기대 문자열을
  `hreflang="${HREFLANG_MAP[lang]}"` 로 **조립**하기 때문에, 맵이 비면 기대값도 `hreflang="undefined"` 가
  되어 **그냥 통과**한다. 개수 검사도 통과. → **`HREFLANG_MAP`·`OG_LOCALE_MAP` 이 `ACTIVE_LANGS` 를
  전부 덮는지 단언하는 테스트를 추가**한다(맵 대조, 리터럴 기대값).
- **hreflang 전수 검사 = 필수.** 우리 호스팅은 없는 정적 경로를 404 가 아니라 **200 + 한국어 SPA 셸**로
  응답한다(soft-404) → 없는 URL 을 hreflang 으로 내보내면 클러스터가 통째로 무효가 된다.
  빌드 산출물의 모든 hreflang·sitemap alternate 가 **실제 파일로 존재**하는지 전수 확인([[seo_hreflang_sitemap]]).
  ★**href 존재만 보지 말고 `hreflang` **속성값**도 검사**할 것 — 위 함정이 정확히 여기로 샌다.
- sitemap URL 수: 263 → **393**(정적 4×2 + 블로그 120 + 상담 2). blog-index 는 posts>0 조건부.
- 화자 톤 grep(중국어 격식체).

## 범위 밖

- 본토(웨이보·小红书·더우인) — 전략상 제외
- 대만 성장도표(TW) — 위 참조
- 중국어 **전용** Meta 픽셀 — 만들지 않는다. 시장 구분은 맞춤 전환으로([[english_meta_channel]] 결론과 동일).
  ⚠️ 단 "폴백이라 무해"는 **거짓** — §9-2 참조. `getLocale` 을 고쳐 **기본 픽셀로** 떨어지게 하는 건
  범위 **안**이다(안 고치면 한국 광고 픽셀이 오염된다). 새 픽셀 ID 를 넣는 것만 범위 밖.
  ★`analytics.ts:32` 는 Vite 정적 치환 때문에 **로케일마다 리터럴 한 줄**이 필요하다 — 나중에 중국어
  픽셀을 붙일 땐 env 만으론 안 되고 코드 한 줄이 필요하다.
- 중국어 slug transcreation
- 중국어 Meta 채널(FB/IG) 개설 — 사이트가 먼저
- `contentPrompts.ts:373` 의 SEO 제목 길이 게이트(`ko`/`th` 만 40자, 그 외 60자) — CJK 인 중국어가
  라틴 기준 60자를 받아 SERP 에서 잘릴 수 있다. 블로그는 **이미 생성된 것을 발행만** 하므로 이번 범위 밖.
  향후 중국어 블로그를 재생성한다면 같이 고칠 것.

## 관련

- [[marketing_chinese_market_strategy]] — 중화권 전략 원본(글자축 ⟂ 말축)
- [[seo_hreflang_sitemap]] — hreflang 클러스터·soft-404 함정
- [[calc_growth_standards]] — 성장표준 채택·기각 근거
- [[feedback_i18n_speaker_register]] — 화자 톤 규칙
