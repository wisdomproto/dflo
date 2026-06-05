-- 022_marketing_keywords.sql
-- 마케팅 R1-키워드: 라이브 분석에서 보관함에 추가한 키워드 영속. Supabase Dashboard 적용.
create table if not exists marketing_keywords (
  keyword       text primary key,
  pc_search     int default 0,
  mobile_search int default 0,
  total_search  int default 0,
  competition   text,
  cpc           numeric default 0,
  source        text default 'manual',
  created_at    timestamptz default now()
);
alter table marketing_keywords enable row level security;
drop policy if exists marketing_keywords_all on marketing_keywords;
create policy marketing_keywords_all on marketing_keywords
  for all to anon, authenticated using (true) with check (true);
