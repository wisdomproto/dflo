# 커스텀 콘텐츠 (릴스) — 설계

날짜: 2026-06-11 · 상태: 승인됨

## 목적

`/marketing/content` 콘텐츠 스튜디오는 62개 정규 콘텐츠(토픽 기반, 블로그/카드뉴스/릴스 풀 패키지)
전용이다. 그 체계 밖의 ad-hoc 릴스(예: 사무실 투어, 이벤트 영상)를 올리고 정규 콘텐츠와
동일한 발행 파이프라인(발행 큐 → IG/FB)으로 내보낼 자리가 없다. 좌측 리스트를
**정규 콘텐츠 / 커스텀 콘텐츠** 2개 섹션으로 나누고, 커스텀은 릴스(썸네일+영상 한 단위)
업로드 + 발행만 지원하는 가벼운 편집기를 붙인다.

## 결정 사항

- **저장 모델: `marketing_articles` 재사용 + `kind` 컬럼** (migration 055,
  `'regular'`(기본)|`'custom'` CHECK). 발행 큐(article_id FK)·발행 실행기·현황·언어
  셀렉터가 전부 그대로 동작하므로 별도 테이블/카테고리 마커 방식은 기각.
- **언어 구조: 정규와 동일 6언어**(ko/th/vi/en/ch/cn). 언어별 영상+썸네일+캡션.
- **영상·썸네일·캡션 저장: 기존 `reels` JSONB 확장** —
  `{[lang]: {videoUrl, coverUrl, caption?, hashtags?}}`. DDL 불필요. 정규 콘텐츠는
  caption 필드를 쓰지 않으므로 영향 없음.
- **자동 썸네일**: 영상 업로드 시 coverUrl이 비어 있으면 클라이언트에서
  `<video>`+canvas로 첫 프레임(0.1s)을 JPEG로 추출해 R2 업로드 → coverUrl 자동 세팅.
- **캡션 소스(발행 실행기)**: `reels[lang].caption`이 있으면 그것(+hashtags), 없으면
  기존 카드뉴스 캡션 폴백. 정규 릴스 발행 동작 불변.
- **커스텀 sort_order = 1000번대** (1001부터). 정규 번호(1~62)와 충돌 방지.
  발행 큐 카드·캘린더에서 커스텀은 번호 대신 🎨 배지.

## 구성

- `v4/scripts/migrations/055_marketing_articles_kind.sql` — kind 컬럼.
- `types.ts` — `ArticleKind`, `MarketingArticle.kind`, `ReelsLangData.caption/hashtags`.
- `marketingArticleService` — kind 매핑(graceful: 컬럼 미적용이면 'regular').
  insert 시 kind는 'custom'일 때만 명시(미적용 DB에서 정규 생성이 안 깨지게).
- `ContentListPanel` — 위 "정규 콘텐츠"(드래그 정렬 유지) / 아래 "커스텀 콘텐츠" 섹션
  + "+ 커스텀" 버튼. 커스텀 행은 번호 대신 🎨.
- `CustomReelsPanel`(신규) — 제목 인라인 편집 + 6언어 셀렉터 + 썸네일·영상 한 단위
  카드(자동 첫 프레임) + 캡션·해시태그 직접 입력(디바운스 저장) + 📥 발행 큐에 넣기
  (`PublishDialog` contentKind='reels' 재사용 — 영상 있는 언어만 옵션).
- `MarketingArticlesPage` — kind로 정규/커스텀 분리, 커스텀 선택 시 ContentTabs 대신
  CustomReelsPanel. 현황판(📊)은 정규만 전달.
- `marketingPublishService.fetchQueue` — 조인에 kind 추가(`articleKind`),
  `PublishQueueCard`/`PublishCalendar`는 custom이면 번호 대신 🎨.
- ai-server `publishExecutor` — 릴스 캡션을 reels[lang].caption 우선으로.

## Graceful (migration 미적용 시)

kind 컬럼이 없으면: select는 'regular' 폴백 → 커스텀 섹션 빈 상태. "+ 커스텀" 클릭
시 insert가 실패하며 "migration 055 적용 필요" 에러 안내.
