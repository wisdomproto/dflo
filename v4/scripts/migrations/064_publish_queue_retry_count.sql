-- 064: 발행 큐 자동 재시도 — 실패 시 백오프 재예약(최대 3회).
-- publishExecutor.fail() 이 미발행(published_url/platform_post_id 없음) + retry_count<3 이면
--   status='scheduled' + retry_count+1 + scheduled_at = now + 백오프(15분 → 1시간 → 3시간) 로 되돌림.
--   3회 소진하면 최종 'failed'. 이미 발행된 건(URL/post_id 있음)은 재시도 안 함(중복 방지).
-- 스케줄러는 status='scheduled' 만 집으므로 **기존 'failed' 행은 영향 없음**(미래 실패만 재시도).
-- 컬럼 없어도 코드가 graceful 폴백(하드 실패 = 현행 동작) → 적용 전에도 무해.
-- ⚠️ MCP/CLI DDL 불가(txirmof) → Supabase 대시보드 SQL 에디터에서 1회 실행.

ALTER TABLE marketing_publish_queue ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
