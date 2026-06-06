# 마케팅 발행/채널 재구조화 — 설계 (Design)

> 작성일 2026-06-06. 대상: dflo v4 `/marketing` (PIN 8054) + ai-server + v4 i18n 정적 빌드.

## 배경 / 문제

현재 마케팅 콘텐츠 스튜디오는 "콘텐츠 1개 = 마스터(ko) + translations JSONB"로 다국어를
지원한다(구현 완료). 그러나 **발행·채널·광고 레이어가 이 다국어 모델과 어긋나 있다.** 코드
근거:

1. **채널에 언어 축이 UI에 없음.** `MarketingChannel.locale` 컬럼은 있으나 `ChannelRegistryTab`
   입력폼(`EMPTY`, `ChannelFormRow`)에 locale 칸이 없어 모든 채널이 조용히 `locale:'ko'`로 저장됨.
   "태국 IG / 영어 IG"를 구분할 수 없는 평면 리스트.
2. **발행이 콘텐츠와 분리 + 대상이 '계정'이 아니라 '플랫폼 종류'.** `AddToQueueModal`은 글을
   드롭다운으로 다시 고르고, 체크박스는 `marketing_channels`(실제 계정)가 아니라 `CHANNELS`
   상수(instagram/facebook… 플랫폼 종류)를 쓴다. "태국 인스타 계정에 발행"이 불가.
3. **번역본이 발행될 수 없음.** `enqueue(...)`가 언어를 `selectedArticle.language ?? 'ko'`(항상
   마스터 한국어)로 박는다. 발행 시 어느 언어 버전인지 고르는 UI가 없다.
4. **콘텐츠별 발행 버튼 없음.** `ContentTabs`에 발행 동선이 0.
5. **블로그가 네이버 중심.** `BlogChannel = 'naver_blog' | 'wordpress'` — 자체 사이트 임베드 타겟 없음.
6. **카드뉴스에 업로드 없음.** `CardNewsPanel`은 AI 생성 + 캔버스 편집만.
7. **광고에 지역이 없음.** `AdCampaign`은 `language`만 있고 region/geo 필드가 없다.
8. **채널 레지스트리가 '분석' 탭 밑에 숨음.** 설정 성격인데 IA가 꼬임.

## 핵심 결정 (확정됨)

- **1차 조직 축 = 언어(시장).** 채널·콘텐츠·사이트는 전부 언어(ko/en/th/vi) 단위.
  **지역(region)은 오직 유료광고 타겟팅에서만 등장.** 근거: ko=한국, th=태국, vi=베트남은 1:1이지만
  영어만 다국가(미국+동남아 영어권+교민) → 언어로 묶어야 계정·콘텐츠 1:1 번역 모델과 일치하고,
  Meta 계정은 언어 1개로 운영 + 광고로 여러 지역 노출하는 실제 운영 방식과 맞는다.
- **블로그 자체 사이트 임베드 = 동적 미리보기 + 정적 정식 둘 다.** 동적은 즉시 확인(noindex),
  정적은 기존 i18n 빌드로 승격(인덱싱 대상은 정적만).
- **카드뉴스 = 업로드 주력 + 기존 AI/캔버스 유지.**
- **이번 범위 = 전부** (발행 재설계 + 채널 언어축 + 블로그 임베드 + 카드뉴스 업로드 + 광고 지역).

## 타겟 모델

```
콘텐츠 (1개)
 └─ 마스터(ko) + translations{ en, th, vi }          ← 구현됨
      ├─ [기본글]   → (선택) 소셜 텍스트 포스트
      ├─ [N블로그]  → 자체 사이트 /{lang}/blog/{slug}   (구글 SEO)
      └─ [카드뉴스] → IG/FB/Threads (언어 일치 등록 계정)

채널(계정) = 플랫폼 + 언어 1개            예: "TH 인스타", "EN 페북"
사이트       = /ko /th /vi /en (기존 i18n)
유료광고     = 채널 참조 + 지역(region) 타겟팅   ← '지역'은 여기서만
```

## 데이터 모델 변경

새 마이그레이션 번호는 현 최신(036) 다음부터: **037~039**.

### 037_marketing_channel_locale_active.sql
`marketing_channels`:
- `locale`는 이미 존재(024) → 스키마 변경 없음. **UI 노출만.**
- `is_active boolean default true` 추가 (비활성 계정 숨김용).

### 038_publish_queue_channel_ref.sql
`marketing_publish_queue`:
- `channel_id uuid references marketing_channels(id) on delete set null` 추가 — 발행 대상이
  *실제 등록 계정*. nullable(블로그/사이트 발행은 null + `channel='website'`).
- `content_kind text default 'post'` 추가 — `'blog' | 'cardnews' | 'post'` (어떤 산출물인지 명시).
- 기존 `channel`(플랫폼 enum), `language`, `scheduled_at`, `status`, `published_url` 유지.
- `PublishChannel`에 `'website'` 추가.

### 039_blog_published_and_ad_region.sql
- 신규 `blog_published`:
  ```sql
  create table blog_published (
    id uuid primary key default gen_random_uuid(),
    article_id uuid references marketing_articles(id) on delete cascade,
    language text not null,                 -- ko|en|th|vi
    slug text not null,
    seo_title text not null default '',
    meta_description text not null default '',
    html_body text not null default '',     -- 렌더된 블로그 본문 HTML
    status text not null default 'draft',   -- draft|published
    published_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (article_id, language)
  );
  -- RLS permissive (anon full, 다른 marketing 테이블과 동일 패턴)
  ```
- `marketing_ad_campaigns`:
  - `region text default ''` 추가 (예: `kr|th|vi|sea_en|global`).
  - `channel_id uuid references marketing_channels(id) on delete set null` 추가(선택 연결).

> 모든 테이블 RLS는 기존 마케팅 테이블과 동일하게 anon full (dev 키 패턴). prod auth는 별도
> 미해결 과제(기존 회귀 아님, CLAUDE.md 참고).

## 컴포넌트 / 동작 설계

### 페이즈 A — 채널 언어축
- `ChannelRegistryTab`: 폼에 **언어 select**(ko/en/th/vi) + `is_active` 토글 추가.
  - `EMPTY`/`Draft`에 `locale` 포함, row 표시에 언어 플래그 노출, 언어별 그룹/필터.
- IA: 사이드바에서 채널 레지스트리를 **"채널 관리" 상위 항목**으로 승격(현재 분석>채널분석 탭에서 분리).
  - `MarketingSidebar` GROUPS 재구성: 콘텐츠 / **채널 관리** / 유료 마케팅 / 분석 / 전략.
  - 라우트 `/marketing/channels` 신설(채널 레지스트리). 분석의 채널분석은 트래픽 전용으로 유지.

### 페이즈 B — 발행 재설계
- `ContentTabs` 헤더에 **발행 버튼** 신설 — 활성 탭(base/blog/cardnews) + 현재 언어에 맥락적.
- 신규 **`PublishDialog`** (`components/content/PublishDialog.tsx`):
  - props: `article`, `contentKind`('blog'|'cardnews'|'post'), `language`.
  - **언어 버전 선택**(현재 언어 기본; 마스터 + 보유 번역만 선택지).
  - `contentKind==='blog'` → 타겟 = 자체 사이트(언어 자동). 액션: [미리보기 발행(동적)] /
    [정식 발행(정적 승격 대기)] / 예약. → `blog_published` upsert + 큐 행(`channel='website'`).
  - `contentKind!=='blog'` → **선택 언어와 `locale`이 일치하는 등록 계정**만 나열(IG/FB/Threads).
    복수 선택 → 계정당 큐 행(`channel_id` 채움, `channel`=플랫폼, `content_kind` 세팅).
  - 예약 시각(옵션).
- `marketingPublishService`:
  - `enqueue`가 `channelIds`(+ language + contentKind)를 받도록 시그니처 확장. `channel`은
    `channel_id`의 플랫폼에서 도출. `language`는 호출자가 명시(번역 언어).
  - `PublishQueueItem`에 `channelId`, `channelName`(조인), `contentKind` 추가. 큐 조인에
    `marketing_channels(name, platform, locale)` 추가.
- `PublishQueueList`/`PublishCalendar`: 항목에 **계정명 + 언어 플래그** 표시(추상 플랫폼 대신).
- `AddToQueueModal`은 유지하되 동일한 "등록 계정 + 언어" 모델로 정렬(중복 로직은 PublishDialog와 공유).

### 페이즈 C — 블로그 자체 사이트 임베드 (동적 + 정적)
- **본문 렌더**: 발행 시 `BlogContent.cards`(또는 기본글 본문)를 정적 HTML로 직렬화해
  `blog_published.html_body`에 저장(서버/클라 공용 순수 함수 `renderBlogHtml`).
- **동적 미리보기**: 마케팅(PIN) 영역 내 라우트 `/marketing/blog-preview/:articleId?lang=` —
  `blog_published` 런타임 fetch → `html_body` 렌더. `<meta name="robots" content="noindex">`.
- **정적 정식**: `v4/scripts/lib/blog-supabase.mjs`(신규) `loadPublishedBlog(lang)` — supabase-js로
  `blog_published`(status=published) 조회 → **ContentFlow 포스트와 동일 JSON 형태**
  (`{slug,title,meta_description,published_at,content/body}`)로 매핑.
  - `build-i18n.mjs`: 블로그 소스를 ContentFlow fetch → **Supabase published 우선**(있으면)으로
    전환. `loadCachedPosts` → `renderPost`/`renderIndex` 기존 경로 그대로 재사용.
  - 정식 발행 = `status='published'` + `published_at` 세팅. 실제 사이트 반영은 다음 배포(재빌드) 시.
  - 큐 항목 상태: 동적 발행 = `published`(미리보기 URL), 정식 승격 후 배포 = `published`(정적 URL).
- **SEO**: 정적만 sitemap/hreflang 대상(기존 i18n 인프라). 동적 미리보기는 noindex.

### 페이즈 D — 카드뉴스 업로드
- `CardNewsPanel`에 **다중 이미지 업로드** 버튼:
  - 파일 N개 선택 → 각 이미지 1슬라이드(풀블리드 배경, textBlocks 빈 배열 — 텍스트 외부 baked 가정).
  - 슬라이드 수 = 업로드 이미지 수에 맞춰 자동 추가(기존 슬라이드 뒤에 append).
  - 업로드 파이프라인: 압축 → WebP → R2 업로드(`aiImageService`의 R2 경로 재사용,
    `uploadImageToR2(file)` 추출/확장).
  - 순서 변경/삭제 기존 동작 유지. AI 생성·캔버스 편집은 슬라이드별 옵션으로 보존.

### 페이즈 E — 광고 지역 레이어
- `AdCampaign` 타입/매퍼에 `region`, `channelId` 추가.
- `AdCampaignForm`: **region select**(한국/태국/베트남/동남아 영어권/글로벌) + 채널 연결(옵션).
- `AdsManagerPage`: 지역별 그룹/필터(언어 필터와 병행). `language`=크리에이티브 언어 유지.

## 페이즈 의존성 / 순서

```
A(채널 언어축) → B(발행 재설계) → C(블로그 임베드)
                              ↘ D(카드뉴스 업로드)
E(광고 지역)  ── 독립(언제든)
```
B는 A에 의존(언어별 계정 목록 필요). C·D는 B의 발행 동선에 연결. E는 독립적.

## 테스트 전략

- **순수 함수 우선 TDD**(node:test, 기존 마케팅 테스트 패턴):
  - `renderBlogHtml`(cards/본문 → HTML) — 입력별 스냅샷성 단언.
  - `loadPublishedBlog` 매퍼(row → ContentFlow 포스트 shape) — 필드 매핑 단언.
  - `enqueue` 행 생성 로직(channelIds → 행 배열, 플랫폼 도출) — 순수화 후 단언.
- **수동/통합**: 미리보기 그대로 발행 후 모달·큐·사이드바 동작, `npx tsc --noEmit`, i18n 빌드
  (`npm run build:i18n`)가 published 블로그를 `/{lang}/blog/...`로 생성하는지.

## 마이그레이션 적용 메모

037~039는 Supabase Dashboard 수동 적용(현 MCP 권한 패턴). 적용 전에도 graceful: `channel_id`/
`region`/`blog_published` 미존재 시 서비스가 빈 결과/기존 동작으로 폴백.

## 비범위 (YAGNI)

- Meta/IG/Threads **실제 자동 게시 API 연동**(현재는 수동 발행 표시 + URL 기록 패턴 유지).
- 네이버 블로그 발행 경로(위성 정책상 발췌+canonical로 별도, 이번 재설계 대상 아님 — `naver_blog`
  채널 enum은 보존하되 주력에서 제외).
- 광고 플랫폼 자동 동기화(수동 입력 + 파생 지표 유지).
- prod authMiddleware 일괄 처리(기존 미해결 과제, 본 작업과 독립).
```
