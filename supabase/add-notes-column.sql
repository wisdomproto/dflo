-- ================================================
-- measurements 테이블에 notes 컬럼 추가 (긴급)
-- ================================================

-- notes 컬럼 추가
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 확인
SELECT '✅ notes 컬럼 추가 완료!' AS result;
