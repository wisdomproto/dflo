-- 056_knowledge_documents.sql — 지식 문서(원장 저서 등) 청크 + pgvector. Dashboard(txirmof) 수동 적용.
create extension if not exists vector;
create table if not exists knowledge_documents (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default '',   -- '우리 아이 키 성장 바이블'
  author      text default '',            -- '채용현 (원장)'
  chapter     text default '',            -- 'N장｜제목'
  chunk_index int default 0,
  content     text not null default '',
  embedding   vector(768),
  created_at  timestamptz default now()
);
create index if not exists idx_knowdoc_source on knowledge_documents(source);
alter table knowledge_documents enable row level security;
drop policy if exists knowdoc_all on knowledge_documents;
create policy knowdoc_all on knowledge_documents for all to anon, authenticated using (true) with check (true);

-- 반환 타입 변경(컬럼 추가) 시 create-or-replace 불가 → 먼저 drop (재적용 안전)
drop function if exists match_knowledge_documents(vector, int);
create or replace function match_knowledge_documents(query_embedding vector(768), k int default 4)
returns table (id uuid, source text, author text, chapter text, chunk_index int, content text, similarity float)
language sql stable as $$
  select d.id, d.source, d.author, d.chapter, d.chunk_index, d.content,
         1 - (d.embedding <=> query_embedding) as similarity
  from knowledge_documents d where d.embedding is not null
  order by d.embedding <=> query_embedding limit k;
$$;
