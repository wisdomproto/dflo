-- 038_publish_queue_channel_ref.sql
-- 발행 대상을 '플랫폼 종류'가 아니라 '등록 계정(marketing_channels)'으로.
-- 블로그/사이트 발행은 channel_id NULL + channel='website'.
-- content_kind: 산출물 종류(blog|cardnews|post). Supabase Dashboard에서 1회 적용.
alter table marketing_publish_queue
  add column if not exists channel_id uuid references marketing_channels(id) on delete set null;
alter table marketing_publish_queue
  add column if not exists content_kind text not null default 'post';
