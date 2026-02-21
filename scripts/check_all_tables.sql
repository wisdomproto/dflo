-- 테이블 구조 확인 쿼리
-- 1. children 테이블
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'children'
ORDER BY ordinal_position;

-- 2. measurements 테이블
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'measurements'
ORDER BY ordinal_position;

-- 3. daily_routines 테이블
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'daily_routines'
ORDER BY ordinal_position;

-- 4. daily_routines 체크 제약조건 확인
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'daily_routines'::regclass
AND contype = 'c';
