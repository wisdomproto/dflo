-- ================================================
-- 현재 DB 테이블 & 컬럼 구조 확인
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- 1. 모든 테이블 목록
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. daily_routines 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'daily_routines'
ORDER BY ordinal_position;

-- 3. 루틴 관련 테이블 존재 여부 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('daily_routines', 'meals', 'meal_photos', 'exercises', 'exercise_logs')
ORDER BY table_name;
