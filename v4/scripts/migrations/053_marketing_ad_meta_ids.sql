-- 053_marketing_ad_meta_ids.sql
-- 워크스페이스 광고 객체 ↔ Meta Marketing API 객체 1:1 매핑용 ID 저장.
-- 푸시(생성) 시 Meta가 돌려준 id를 보관 → 재푸시 시 생성/갱신 구분 + 성과 조회 매칭.
-- 비파괴적(컬럼 추가만). 미적용이어도 metaAds.ts 는 graceful(저장 best-effort).

alter table if exists marketing_ad_campaigns add column if not exists meta_campaign_id text;
alter table if exists marketing_ad_sets      add column if not exists meta_adset_id    text;
alter table if exists marketing_ads          add column if not exists meta_ad_id       text;

-- 마지막 푸시 시각/오류(운영 가시성)
alter table if exists marketing_ad_campaigns add column if not exists meta_pushed_at   timestamptz;
alter table if exists marketing_ad_campaigns add column if not exists meta_push_error  text;
