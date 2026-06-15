# SEO 블로그 하루 1개 자동 발행 — 설계

- 작성일: 2026-06-15
- 상태: Draft (설계 승인됨, 구현 전)
- 범위: `marketing_articles.blog` JSONB(SEO 위저드 블로그)를 `blog_published`로 변환하는 발행 어댑터 + 준비된 토픽을 하루 1개씩(ko+th 동시) 예약하는 스크립트
- 비범위: vi/en 발행(추후), 소셜(IG/FB) 발행, 발행 UI 버튼(추후), 정적 빌드 파이프라인 변경(이미 동작)

## 1. 배경 / 문제

마케팅 스튜디오에서 62개 토픽 × 4언어(ko/en/th/vi) SEO 블로그를 만들어 `marketing_articles.blog` JSONB에 저장해 두었다. 사용자 요청: **만들어 놓은 블로그를 하루 1개씩(한글·태국어만) 발행**. 이미지는 현재 sort_order 22번까지 채워져 있고, 나머지는 계속 채워 넣을 예정.

현재 발행 파이프라인을 조사한 결과 **핵심 갭**이 있다:

- 발행 시 `blog_published`(draft→published)로 전환되는 HTML은 클라이언트의 `buildPublishedBlog(article, lang)`(`v4/src/features/marketing/utils/blogPublish.ts`)가 만든다.
- 그런데 이 함수는 **SEO 블로그(`article.blog[lang]`)를 전혀 보지 않고**, 기본글 본문(`article.body` / `article.translations[lang].body`)만 `html_body`로 쓴다.
- 대부분 토픽은 `translations[lang].body`가 비어 있어 **"본문이 비어 있어 발행할 수 없습니다" 에러**가 나거나, 있어도 **섹션 이미지·FAQ·참고문헌이 빠진** 글이 나간다.
- 즉 메모리 TODO의 *"`blog` JSONB → `blog_published` 변환 어댑터"* 가 미구현 상태다.

좋은 소식: 발행 후 경로는 이미 완성돼 있다.

- 예약 발행 스케줄러(`ai-server/src/services/scheduler.ts`)가 프로덕션에서 매분 동작(`index.ts:101` `startScheduler()`; `SCHEDULER_ENABLED=false`만 비활성).
- `publishExecutor.publishQueueItem`의 `channel==='website'` 분기가 `blog_published` draft→published 전환 + 배치에 website 1건이라도 있으면 `triggerDeploy()`.
- 정적 빌드(`v4/scripts/build-i18n.mjs` + `lib/blog-supabase.mjs`)가 `blog_published`(status='published') 행을 읽어 `/{lang}/blog/{slug}/index.html` 생성. published > ContentFlow 캐시 우선.
- 미리보기 컴포넌트(`BlogPreviewModal`)에 **SEO 블로그를 완성 HTML로 조립하는 로직**(`buildBody` + `buildReferences` + `buildHtml`)이 이미 있다 → 재사용 대상.

## 2. 목표 / 비목표

### 목표
1. 발행 어댑터가 `article.blog[lang]`(sections + 이미지 + FAQ) + `article.blogReferences`(참고문헌)를 **미리보기와 동일한 HTML**로 조립해 `blog_published.html_body`에 넣는다.
2. 미리보기와 발행이 **단일 HTML 조립 소스**를 공유(미리보기에서 본 그대로 발행).
3. 준비된 토픽(ko·th 모두 본문+이미지 완료)을 **하루 1토픽씩(ko+th 같은 시각)** 예약하는 재실행 안전 스크립트.
4. 이미지를 더 채운 뒤 스크립트만 다시 돌리면 새로 준비된 토픽을 **뒤에 이어붙여** 예약.
5. 발행 직후 v4 정적 사이트가 **완전 자동 재배포**되도록 `deployHook`을 Railway API redeploy로 교체(완전 자동 운영).

### 비목표
- vi/en, 소셜 채널 발행. (어댑터는 언어 무관하게 동작하므로 추후 확장만 하면 됨)
- 발행 큐 UI 버튼(이번엔 스크립트로).
- 스케줄러/정적 빌드 로직 변경.

## 3. 현재 데이터 흐름 (확인됨)

```
[작성] marketing_articles.blog[lang] = { seoTitle, slug, metaDescription, h1,
        primaryKeyword, secondaryKeywords, sections[{heading,html,imagePrompt,imageUrl}], faq[] }
       marketing_articles.blog_references = BlogReference[]  (아티클 단위·언어 독립)

[발행 준비] upsertPublishedBlog(article, lang, 'draft')
            → buildPublishedBlog(article, lang)  ← ★여기가 갭(기본글만 봄)
            → blog_published upsert (article_id, language) UNIQUE
[큐잉]     marketing_publish_queue insert (article_id, channel='website',
            channel_id=null, language, content_kind='blog', status='draft')
[예약]     큐 행 status='scheduled', scheduled_at=ISO

[자동 발행] scheduler(매분) → selectDue → claim(scheduled→publishing)
            → publishExecutor(website: blog_published draft→published)
            → 배치에 website 있으면 triggerDeploy()  (RAILWAY_DEPLOY_HOOK_URL)

[정적 반영] Railway v4 재배포 → build-i18n → loadPublishedBlogAll(published)
            → /{lang}/blog/{slug}/index.html → dr187growup.com
```

## 4. 설계

### 4.1 공유 HTML 조립 모듈 (단일 소스)

`BlogPreviewModal.tsx`에 박혀 있는 `esc` / `buildBody` / `buildReferences`를 **순수 모듈**로 추출한다.

- 위치: `v4/src/features/marketing/utils/blogHtml.ts` (앱 코드, 프레임워크 비의존 순수 함수)
- export:
  - `buildBlogBodyHtml(article: BlogSeoArticle, lang: string): string` — sections(제목 h2 + 이미지 img + 본문 html) + FAQ section 조립. (현 `buildBody`와 동일 마크업)
  - `buildBlogReferencesHtml(references: BlogReference[], lang: string): string` — 참고문헌 `<section>`. (현 `buildReferences`/`blog.mjs renderReferencesHtml`와 동일 마크업)
  - `buildBlogHtmlBody(article: BlogSeoArticle, references: BlogReference[], lang: string): string` — 위 둘을 합친 **`blog_published.html_body`에 그대로 들어갈 본문 HTML** (페이지 `<html>` 래퍼 제외 — 래퍼는 정적 빌드 `blog-post.html` 템플릿이 담당).
- 이스케이프(`esc`): **정적 빌드 `blog.mjs`와 동일하게 `& < > " '` 전부 이스케이프(작은따옴표 포함)** 를 canonical로 채택 → 미리보기·발행·정적 렌더 마크업 완전 일치. `BlogPreviewModal`의 기존 `esc`(작은따옴표 미이스케이프, `:13`)도 이 공용 함수로 교체(미세 불일치 제거).
- `BlogPreviewModal`은 추출된 함수를 import해 그대로 사용(마크업·CSS·iframe 래핑은 미리보기 전용으로 유지). 회귀 없음 보장.

근거: `html_body`는 **본문 조각**이어야 한다. 정적 템플릿 `blog-post.html`이 `{{post.body_html}}` 자리에 끼워 넣고 `<head>`/CSS/제목/CTA를 감싼다. 미리보기는 추가로 `<html>` 래퍼를 입혀 iframe에 렌더하는 것뿐.

### 4.2 발행 어댑터 교체 (`buildPublishedBlog`)

`v4/src/features/marketing/utils/blogPublish.ts`의 `buildPublishedBlog`를 SEO 블로그 우선으로 교체한다.

```
buildPublishedBlog(article, language):
  seo = article.blog?.[language]
  if seo and (seo.sections?.length or seo.h1):           # SEO 블로그 있음 → 우선
    return {
      slug:            seo.slug || fallbackSlug(seo.seoTitle||seo.h1, article.id),
      seoTitle:        seo.seoTitle || seo.h1 || '',
      metaDescription: seo.metaDescription || htmlToText(buildBlogBodyHtml(seo,language)).slice(0,155),
      htmlBody:        buildBlogHtmlBody(seo, article.blogReferences ?? [], language),
    }
  # 폴백: 기존 기본글(translations.body) 경로 (하위호환)
  ... 현재 로직 ...
```

- **slug**: SEO 위저드가 정한 `seo.slug`를 사용(SEO 의도 보존, sitemap·미리보기 URL과 일치). 비어 있으면 기존 `slugify(title)-id8` 폴백.
- **references**: `article.blogReferences`(아티클 단위·언어 독립)를 본문 끝에 합쳐 `html_body`에 포함. → 정적 빌드가 `html_body`만 읽어도 참고문헌이 나간다. (`blog-post.html`의 `{{post.references_html}}` 슬롯은 `loadPublishedBlogAll`이 references를 안 넘기므로 빈 문자열 → 중복 없음.)
- **`htmlToText`**: metaDescription 폴백용 헬퍼는 `blogPublish.ts` 모듈 내에 유지(공용 `blogHtml.ts`로 옮기지 않음 — blogHtml은 HTML 조립만 담당).
- **하위호환**: SEO 블로그가 없는 기존 기본글은 종전대로 발행(아무 회귀 없음).

`upsertPublishedBlog`(`blogPublishService.ts`)·`publishExecutor`(website 분기)는 **변경 없음** — 이미 `buildPublishedBlog` 결과를 그대로 저장/전환하므로 어댑터만 고치면 전 경로가 올바른 HTML을 흘려보낸다.

### 4.3 하루 1개 예약 스크립트

`v4/scripts/schedule-blog-publish.mjs` (신규, node ESM).

- 환경변수: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`(.env.local), 또는 `SUPABASE_SERVICE_ROLE_KEY`. `process.loadEnvFile`로 로드(build-i18n 패턴).
- 조립 로직 재사용: `buildPublishedBlog`(`blogPublish.ts`, transitively `blogHtml.ts`)를 **`node --import tsx`로 직접 import** — 이 그래프가 react/supabase 의존 없는 순수 함수라 번들 불필요(v4 테스트가 이미 이 방식으로 src `.ts`를 import). 중복 구현 금지.
- 동작:
  1. `marketing_articles` 조회(`kind='regular'`, `sort_order` asc): `id, sort_order, blog, blog_references`.
  2. **준비 완료 토픽 선별**: 대상 언어 전부(ko·th)에 대해 `blog[lang].sections.length > 0` && 모든 `sections[].imageUrl` non-null && **각 섹션 `html` 비어있지 않음**. = `marketingStatusService.blogCell`의 'complete' 기준(이미지 완료)에 **본문-공란 가드를 더한 것**(blogCell는 이미지만 보고 html 공란은 안 봄 → 이미지만 있고 본문이 빈 섹션이 `(본문 비어 있음)`으로 발행되는 것 방지).
  3. 기존 상태 로드: `blog_published`(article_id,language)와 `marketing_publish_queue`(article_id, content_kind='blog', channel='website', language) — **이미 scheduled/publishing/published인 토픽·언어는 skip**(재실행 안전).
  4. 남은 준비 토픽을 sort_order 순으로, 시작일부터 하루 1토픽씩 배정:
     - 각 토픽 × {ko, th}: `blog_published` upsert(status='draft', html_body=`buildBlogHtmlBody(...)`, slug/seoTitle/meta) + `marketing_publish_queue` insert(channel='website', channel_id=null, content_kind='blog', status='scheduled', scheduled_at=해당 날짜 09:00 KST).
     - ko·th는 **같은 scheduled_at**(같은 날 같은 시각).
  5. 요약 출력: 예약된 토픽/날짜 표, skip 사유, 미준비 토픽(이미지 미완) 목록.
- CLI 플래그: `--start <YYYY-MM-DD>`(기본 내일), `--time <HH:mm>`(기본 09:00, KST), `--langs ko,th`(기본 ko,th), `--limit N`, `--dry-run`(쓰기 없이 계획만), `--only <sortOrders>`.
- **idempotency 핵심**: "이미 큐에 scheduled/publishing/published 행이 있는 (article,lang,website)"를 진실의 기준으로 skip. draft만 있는 큐 행은 덮어쓰지 않고 그 위에 scheduled로 갱신(또는 새로 안전 처리). published된 토픽은 절대 재예약 안 함.

### 4.4 재배포 트리거 — Railway API redeploy (`deployHook.ts` 교체)

배포 구조(확인됨): Railway에 **v4 서비스**(정적 사이트, `npm run build`=tsc→build:i18n→vite build → `vite preview` 서빙)와 **ai-server 서비스**(`npm start`, `/health`, 스케줄러 상주)가 분리. 발행을 사이트에 반영 = **v4 서비스 재배포**(build:i18n 재실행). Railway는 "POST 하면 재배포"되는 내장 webhook URL을 **제공하지 않음** → GraphQL API 또는 git push로만 트리거.

선택: **완전 자동 (Railway API redeploy)**. `deployHook.triggerDeploy`를 Railway GraphQL 재배포 호출로 교체.

- Endpoint: `https://backboard.railway.com/graphql/v2`, `Authorization: Bearer <RAILWAY_API_TOKEN>`, POST JSON.
- Mutation: `serviceInstanceRedeploy(serviceId, environmentId)` — v4 서비스의 최신 배포를 재실행. (구현 시 정확한 시그니처/반환 재확인 — 변형 가능성 대비)
- 환경변수(ai-server):
  - `RAILWAY_API_TOKEN` — Railway 계정/프로젝트 토큰
  - `RAILWAY_V4_SERVICE_ID` — 재배포 대상(v4) 서비스 id
  - `RAILWAY_V4_ENVIRONMENT_ID` — 환경 id (production)
- **순수 함수 분리**: 요청 본문(GraphQL query+variables) 빌더 `buildRedeployRequest(serviceId, environmentId)`를 순수 함수로 → 단위 테스트. fetch I/O는 얇은 래퍼.
- **graceful / 하위호환**: 세 변수가 모두 있으면 redeploy 호출; 없으면 기존처럼 no-op(경고 로그) — 로컬·미설정 환경 안전. (선택: `RAILWAY_DEPLOY_HOOK_URL`이 설정돼 있으면 그 URL 단순 POST도 폴백 지원 → 방법 2 호환·기존 변수 보존.)
- 실패해도 **발행 자체는 성공 처리**(재배포는 다음 발행/수동으로 복구). 현재 `triggerDeploy`의 catch-and-warn 유지.
- 호출 지점 불변: `scheduler.runDueOnce`가 배치에 website 발행이 있으면 1회 `triggerDeploy()`. **executor·스케줄러 로직 무변경.**

### 4.5 인프라 전제 / 검증 (자동 발행)

구현 직후 검증 단계에서 점검하고, 미충족 시 사용자에게 Railway 설정 요청:

1. **ai-server Railway 상시 가동** — `/health`로 확인(스케줄러는 in-process node-cron).
2. **ai-server 환경변수**: `RAILWAY_API_TOKEN`/`RAILWAY_V4_SERVICE_ID`/`RAILWAY_V4_ENVIRONMENT_ID`(4.4) + `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`(스케줄러 발행 쓰기) + `SCHEDULER_ENABLED` 미설정(=활성). 소셜 발행이 이미 라이브면 SUPABASE 계열은 충족돼 있을 것.
3. **v4 Railway 환경변수**: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — `loadPublishedBlogAll`이 published 행을 읽으려면 필요(없으면 graceful skip → 블로그 0건). `.env.production`엔 없으므로 Railway 대시보드 변수에 있어야 함(앱이 동작 중이면 있음 — 확인).

## 5. 에지 케이스 / 에러 처리

- **이미지 일부 누락 토픽**: 준비 미완 → 예약 대상에서 자동 제외(스크립트가 skip + 로그). 22번 이후가 여기 해당.
- **ko는 완료, th 미완(또는 반대)**: 토픽 단위(ko+th 동시 발행) 정책상 **한 언어라도 미완이면 그 토픽 보류**(둘 다 준비될 때 함께 예약). — 기본 정책. (대안: 준비된 언어만 먼저 — 5장 오픈 이슈)
- **slug 중복**: `blog_published`는 (article_id, language) UNIQUE. slug 자체 유니크 제약은 없음 — 서로 다른 토픽이 같은 slug면 정적 빌드 `bySlug` dedup에서 충돌 가능. SEO 위저드 slug는 토픽별로 달라야 함 → 스크립트가 **대상 토픽 간 slug 충돌 검사** 후 경고/중단.
- **참고문헌 없음**: `blogReferences` 빈 배열 → `buildBlogReferencesHtml`이 '' 반환(inert). 정상.
- **스케줄러 미가동(로컬만)**: 예약은 걸리지만 발행 안 됨 → 인프라 검증(4.4)에서 차단.
- **재실행**: 이미 published/scheduled 토픽 skip → 중복 발행·중복 예약 없음.

## 6. 테스트

- `blogHtml.ts` 순수 함수 단위 테스트(vitest):
  - sections → h2 + img(loading=lazy) + html 순서·이스케이프.
  - imageUrl null이면 img 태그 생략.
  - FAQ 있을 때/없을 때.
  - references 있을 때/빈 배열일 때(inert).
- `buildPublishedBlog` 단위 테스트:
  - `blog[lang]` 있으면 SEO 경로(slug=seo.slug, html_body에 섹션·FAQ·references 포함).
  - `blog[lang]` 없으면 기본글 폴백(기존 동작 유지).
  - ko(master)·th 분기.
- 예약 스크립트는 순수 선별/스케줄 배정 로직을 분리해 단위 테스트(준비 판정, 날짜 배정, skip 규칙). DB I/O는 `--dry-run`으로 수동 검증.
- `deployHook.buildRedeployRequest(serviceId, environmentId)` 순수 함수 테스트(GraphQL endpoint·헤더·query·variables 형태). fetch I/O는 검증 단계에서 실제 호출.

## 7. 수동 검증 (구현 후)

1. `--dry-run`으로 예약 계획 확인(준비 토픽 수 = 22 전후, 날짜 배정, skip 목록).
2. txirmof 실제 데이터로 "22번까지 이미지 완료" 사용자 진술 교차 검증.
3. 1개 토픽을 가까운 시각에 예약 → 스케줄러 발행 → `blog_published.status='published'` 확인 → (deploy hook 설정 시) 정적 빌드 후 `/{lang}/blog/{slug}/` 노출 확인. 미리보기 HTML과 실제 발행 HTML 일치 확인.
4. tsc/lint: `cd v4 && npx tsc -b --noEmit` (solution tsconfig — plain `tsc --noEmit`는 no-op).

## 8. 영향 / 리스크

- **공개 사이트·SEO 영향**: 발행은 dr187growup.com에 공개된다. slug·메타·hreflang이 어긋나면 SEO 손상 → slug 충돌 검사 + 미리보기 일치로 방어.
- **버전 일관성**: `buildPublishedBlog` 변경이 기존 기본글 발행 경로를 깨지 않도록 폴백 유지 + 테스트.
- **되돌리기**: 잘못 발행 시 `blog_published.status`를 draft로 되돌리고 재배포하면 정적에서 사라짐(큐 행은 published 유지). 스크립트에 unschedule(`--cancel`)은 추후.

## 9. 오픈 이슈

- ko/th 한쪽만 준비된 토픽: 보류 vs 준비된 언어만 선발행 — 기본은 **보류**. 사용자 확정 필요 시 조정.
- 발행 시각/시작일 기본값(09:00 KST / 내일) 확정.
- deploy hook 미설정 시 운영 방법(자동 재배포 vs 발행일 수동 트리거).
