-- 040_ad_region.sql
-- 유료광고는 '지역'으로 관리(언어 콘텐츠와 직교). region + 채널(계정) 선택 연결.
-- Supabase Dashboard에서 1회 적용.
alter table marketing_ad_campaigns
  add column if not exists region text not null default '';
alter table marketing_ad_campaigns
  add column if not exists channel_id uuid references marketing_channels(id) on delete set null;
