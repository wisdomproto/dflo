-- 054_marketing_ad_creatives.sql
-- 광고 전용 "다크 포스트" 소재 라이브러리 — 직접 업로드한 이미지/영상을 영구 보관해
-- 캠페인마다 재사용. 콘텐츠 스튜디오/발행 큐와 무관(피드 미노출 광고 전용 소재).
-- 비파괴적(신규 테이블). 미적용 시 adCreativeLibraryService 는 graceful(빈 목록/에러).

create table if not exists marketing_ad_creatives (
  id uuid primary key default gen_random_uuid(),
  market text not null default 'ko',           -- 시장(언어): ko | en | th | vi
  name text not null default '',
  kind text not null default 'image',           -- 'image' | 'reels'(영상)
  media_url text not null,
  thumbnail_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_ad_creatives_market
  on marketing_ad_creatives (market, created_at desc);
