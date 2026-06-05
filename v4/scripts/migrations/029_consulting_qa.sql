-- 029_consulting_qa.sql
-- 태국 환자 상담 매뉴얼 Q&A (단일 행 JSONB). /consulting.html 편집기가 읽고 씀.
-- Supabase Dashboard SQL Editor 에서 1회 적용.
create table if not exists consulting_qa (
  id          int primary key default 1,
  categories  jsonb default '[]'::jsonb,   -- [{id,title,questions:[{id,q,a,isPublic}]}]
  updated_at  timestamptz default now(),
  constraint consulting_qa_singleton check (id = 1)
);

-- dflo 관례(marketing_config 020 과 동일): RLS on + anon/authenticated 전체 허용.
alter table consulting_qa enable row level security;
drop policy if exists consulting_qa_all on consulting_qa;
create policy consulting_qa_all on consulting_qa
  for all to anon, authenticated using (true) with check (true);

-- 빈 단일 행 보장 (시드 질문 세트는 클라이언트(JS)가 최초 로드 시 채움).
insert into consulting_qa (id, categories) values (1, '[]'::jsonb)
on conflict (id) do nothing;
