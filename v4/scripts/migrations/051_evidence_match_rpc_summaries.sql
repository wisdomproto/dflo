-- 051_evidence_match_rpc_summaries.sql — match_evidence_papers 가 korean_summary/key_finding 도 반환. Dashboard(txirmof) 수동 적용.
-- 반환 시그니처(OUT 컬럼) 변경 → create or replace 불가 → drop 후 재생성.
drop function if exists match_evidence_papers(vector, int);
create or replace function match_evidence_papers(query_embedding vector(768), k int default 5)
returns table (id uuid, pmid text, title text, abstract text, journal text, year int, url text,
               pop_group text, pop_confidence text, korean_summary text, key_finding text, similarity float)
language sql stable as $$
  select e.id, e.pmid, e.title, e.abstract, e.journal, e.year, e.url, e.pop_group, e.pop_confidence,
         e.korean_summary, e.key_finding, 1 - (e.embedding <=> query_embedding) as similarity
  from evidence_papers e where e.embedding is not null
  order by e.embedding <=> query_embedding limit k;
$$;
