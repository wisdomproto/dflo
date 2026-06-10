-- 047_marketing_ad_workspace.sql
-- 유료광고 워크스페이스: Meta 표준 3계층 (계정 → 캠페인 → 광고세트 → 광고).
-- 기존 028(캠페인 트래커) + 040(region/channel_id) 위에 계층을 얹는다.
-- 워크스페이스 모드: 구성·기획·성과기록. 실제 게재는 Meta 광고관리자에서, 추후
-- ads_management 검수 통과 시 각 레벨이 Meta Campaign/AdSet/Ad 와 1:1 매핑된다.
-- Supabase(txirmof) Dashboard SQL Editor 에서 1회 적용.
create extension if not exists pgcrypto;

-- ── (a) 광고 계정 ─────────────────────────────────────────────────
create table if not exists marketing_ad_accounts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null default 'meta',     -- meta | google | youtube | naver
  name         text not null default '',          -- 표시 이름 "187 한국 광고계정"
  external_id  text default '',                   -- act_1234567890 (Meta 광고계정 ID)
  currency     text default 'KRW',
  market       text default '',                   -- 연결 시장(언어): ko | en | th | vi
  status       text default 'active',             -- active | paused | disabled
  note         text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── (b) 캠페인 확장 (028 + 040 위에) ──────────────────────────────
alter table marketing_ad_campaigns
  add column if not exists account_id uuid references marketing_ad_accounts(id) on delete set null;
alter table marketing_ad_campaigns
  add column if not exists market text not null default '';

-- ── (c) 광고 세트 (타겟 · 예산 · 기간 · 게재위치 · 성과) ───────────
create table if not exists marketing_ad_sets (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references marketing_ad_campaigns(id) on delete cascade,
  name          text not null default '',
  status        text default 'active',            -- active | paused | ended | draft
  targeting     jsonb default '{}'::jsonb,         -- { geos:[], ageMin, ageMax, genders:[], interests:[], locales:[] }
  budget        numeric default 0,
  budget_type   text default 'daily',             -- daily | lifetime
  period_start  date,
  period_end    date,
  placements    text[] default '{}',              -- feed | stories | reels | search | ...
  spend         numeric default 0,
  impressions   int default 0,
  clicks        int default 0,
  conversions   int default 0,
  revenue       numeric default 0,
  sort_order    int default 0,
  note          text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists marketing_ad_sets_campaign_idx on marketing_ad_sets(campaign_id);

-- ── (d) 광고 (소재 · 카피 · 랜딩) ─────────────────────────────────
create table if not exists marketing_ads (
  id            uuid primary key default gen_random_uuid(),
  ad_set_id     uuid references marketing_ad_sets(id) on delete cascade,
  name          text not null default '',
  status        text default 'active',
  creative_kind text default 'cardnews',          -- cardnews | reels | image | custom
  article_id    uuid,                             -- → marketing_articles.id (소재 출처, 느슨한 참조)
  creative_lang text default '',
  thumbnail_url text default '',
  media_url     text default '',
  headline      text default '',
  primary_text  text default '',
  landing_url   text default '',
  sort_order    int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists marketing_ads_ad_set_idx on marketing_ads(ad_set_id);

-- ── RLS (다른 마케팅 테이블과 동일 정책) ──────────────────────────
alter table marketing_ad_accounts enable row level security;
drop policy if exists marketing_ad_accounts_all on marketing_ad_accounts;
create policy marketing_ad_accounts_all on marketing_ad_accounts
  for all to anon, authenticated using (true) with check (true);

alter table marketing_ad_sets enable row level security;
drop policy if exists marketing_ad_sets_all on marketing_ad_sets;
create policy marketing_ad_sets_all on marketing_ad_sets
  for all to anon, authenticated using (true) with check (true);

alter table marketing_ads enable row level security;
drop policy if exists marketing_ads_all on marketing_ads;
create policy marketing_ads_all on marketing_ads
  for all to anon, authenticated using (true) with check (true);
