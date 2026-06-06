-- 035_evidence_papers.sql — 국제 논문 초록 라이브러리 (pgvector). Dashboard 적용.
create extension if not exists vector;
create table if not exists evidence_papers (
  id          uuid primary key default gen_random_uuid(),
  pmid        text unique,
  title       text not null default '',
  abstract    text not null default '',
  journal     text default '',
  year        integer,
  url         text default '',
  topic       text default '',                 -- 수집 주제축 (growth_hormone, bone_age ...)
  pop_group   text default 'unknown',          -- east_asian|sea|caucasian|mixed|unknown
  pop_country text default '',
  pop_confidence text default 'unknown',        -- explicit|inferred|unknown
  embedding   vector(768),
  created_at  timestamptz default now()
);
create index if not exists idx_evidence_topic on evidence_papers(topic);
alter table evidence_papers enable row level security;
drop policy if exists evidence_all on evidence_papers;
create policy evidence_all on evidence_papers for all to anon, authenticated using (true) with check (true);

create or replace function match_evidence_papers(query_embedding vector(768), k int default 5)
returns table (id uuid, pmid text, title text, abstract text, journal text, year int, url text, pop_group text, pop_confidence text, similarity float)
language sql stable as $$
  select e.id, e.pmid, e.title, e.abstract, e.journal, e.year, e.url, e.pop_group, e.pop_confidence,
         1 - (e.embedding <=> query_embedding) as similarity
  from evidence_papers e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit k;
$$;
