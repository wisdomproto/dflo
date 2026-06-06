-- 037_marketing_channel_active.sql
-- 채널을 언어(시장) 단위로 운영. locale는 이미 024에 존재 → UI 노출만.
-- 비활성 계정 숨김용 is_active 추가. Supabase Dashboard SQL Editor에서 1회 적용.
alter table marketing_channels
  add column if not exists is_active boolean not null default true;
