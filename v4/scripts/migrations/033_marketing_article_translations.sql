-- 033_marketing_article_translations.sql
-- 기본글 언어 모델: 콘텐츠 1행 = 한국어 master, 비한국어는 translations JSONB 에 보관.
-- 형태: { "th": { "title": "...", "body": "...", "status": "completed" }, "vi": {...} }
-- Supabase Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
alter table marketing_articles add column if not exists translations jsonb default '{}'::jsonb;
