-- 052_marketing_ads_source_post.sql
-- 광고 소재 "기존 게시물(boosting)" 지원: 채널에 이미 발행된 피드 게시물을 광고로 증폭.
-- 추후 Meta API 푸시 시 object_story_id = source_post_id 로 1:1 매핑된다.
-- Supabase(txirmof) Dashboard SQL Editor 에서 1회 적용.
-- 미적용이어도 스튜디오 소재 광고는 동작(클라가 소스 필드를 값 있을 때만 write) —
-- "채널 피드" 탭에서 기존 게시물을 담아 저장할 때만 에러.
alter table marketing_ads add column if not exists source_post_id text default '';
alter table marketing_ads add column if not exists source_channel text default ''; -- facebook | instagram
alter table marketing_ads add column if not exists source_url text default '';     -- 게시물 공개 URL(permalink)
