-- 028_marketing_ad_campaigns.sql
-- 마케팅 유료광고: 캠페인 수동 트래커. 노출/클릭/전환/지출/매출을 직접 입력하면
-- CTR·CPC·CPA·ROAS·전환율은 클라이언트에서 파생 계산. Supabase Dashboard SQL Editor에서 1회 적용.
-- (Meta/Google Ads API 자동 동기화는 deferred — external_id 컬럼 미포함.)
create extension if not exists pgcrypto;
create table if not exists marketing_ad_campaigns (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null default 'meta',
  name          text not null default '',
  status        text default 'active',
  objective     text default '',
  language      text default 'ko',
  budget        numeric default 0,
  budget_type   text default 'daily',
  period_start  date,
  period_end    date,
  spend         numeric default 0,
  impressions   int default 0,
  clicks        int default 0,
  conversions   int default 0,
  revenue       numeric default 0,
  note          text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table marketing_ad_campaigns enable row level security;
drop policy if exists marketing_ad_campaigns_all on marketing_ad_campaigns;
create policy marketing_ad_campaigns_all on marketing_ad_campaigns
  for all to anon, authenticated using (true) with check (true);
