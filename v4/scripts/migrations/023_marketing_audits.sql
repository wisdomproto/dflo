-- 023_marketing_audits.sql
-- 마케팅 사이트 분석: 규칙 기반 SEO 감사 결과를 1행씩 영속해 URL별 점수 추이 비교. Supabase Dashboard 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_audits (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  google_score int default 0,
  naver_score  int default 0,
  geo_score    int default 0,
  tech_score   int default 0,
  issue_count  int default 0,
  audit_data   jsonb not null,
  created_at   timestamptz default now()
);
create index if not exists marketing_audits_url_created_idx
  on marketing_audits (url, created_at desc);
alter table marketing_audits enable row level security;
drop policy if exists marketing_audits_all on marketing_audits;
create policy marketing_audits_all on marketing_audits
  for all to anon, authenticated using (true) with check (true);
