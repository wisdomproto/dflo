-- 036_clinical_insights.sql — 비식별 임상 인사이트 (집계통계 + 합성케이스, pgvector). Dashboard 적용.
create extension if not exists vector;
create table if not exists clinical_insights (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,            -- patientCategories 코드
  cohort_n      integer not null default 0, -- 대표 환자 수 (k-익명성)
  stats         jsonb default '{}'::jsonb,  -- 집계 통계
  composite_case text default '',           -- 합성(전형) 사례 (실존 X)
  summary       text default '',            -- 임베딩/표시용 한 줄 요약
  embedding     vector(768),
  created_at    timestamptz default now()
);
create index if not exists idx_insights_category on clinical_insights(category);
alter table clinical_insights enable row level security;
drop policy if exists insights_all on clinical_insights;
create policy insights_all on clinical_insights for all to anon, authenticated using (true) with check (true);

create or replace function match_clinical_insights(query_embedding vector(768), k int default 3)
returns table (id uuid, category text, cohort_n int, stats jsonb, composite_case text, summary text, similarity float)
language sql stable as $$
  select c.id, c.category, c.cohort_n, c.stats, c.composite_case, c.summary,
         1 - (c.embedding <=> query_embedding) as similarity
  from clinical_insights c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit k;
$$;
