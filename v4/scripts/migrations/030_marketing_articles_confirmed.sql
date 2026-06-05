-- 030_marketing_articles_confirmed.sql
-- 기본글 컨펌(원장님 확인) 플래그 + sort_order. Dashboard SQL Editor에서 1회 적용.
alter table marketing_articles add column if not exists confirmed boolean default false;
alter table marketing_articles add column if not exists sort_order integer default 0;
