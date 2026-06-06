-- 041_marketing_meta_connection.sql
-- Meta 연결(암호화 토큰 묶음). enc_payload는 ai-server에서 AES-256-GCM 암호화한 JSON.
-- 토큰은 서버 전용. Supabase Dashboard에서 1회 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_meta_connection (
  id             uuid primary key default gen_random_uuid(),
  meta_user_id   text unique,
  meta_user_name text default '',
  enc_payload    text not null,
  expires_at     timestamptz,
  connected_at   timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table marketing_meta_connection enable row level security;
drop policy if exists meta_conn_all on marketing_meta_connection;
create policy meta_conn_all on marketing_meta_connection
  for all to anon, authenticated using (true) with check (true);
