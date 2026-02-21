-- Supabase에서 실행: children 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'children'
ORDER BY ordinal_position;
