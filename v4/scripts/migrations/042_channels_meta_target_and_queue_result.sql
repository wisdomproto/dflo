-- 042_channels_meta_target_and_queue_result.sql
-- 채널을 Meta 타겟에 매핑 + 발행 결과 컬럼. Supabase Dashboard에서 1회 적용.
alter table marketing_channels add column if not exists meta_page_id text;
alter table marketing_channels add column if not exists meta_ig_id text;
alter table marketing_channels add column if not exists meta_threads_id text;
alter table marketing_publish_queue add column if not exists platform_post_id text;
alter table marketing_publish_queue add column if not exists error_message text;
