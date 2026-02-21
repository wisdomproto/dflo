-- ================================================
-- CRITICAL FIX: password 컬럼 추가 및 모든 부모 계정 비밀번호 설정
-- ================================================

-- 1단계: password 컬럼 추가 (없으면 추가)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- 2단계: 모든 부모 계정의 비밀번호를 '1234'로 강제 설정
UPDATE users 
SET password = '1234' 
WHERE role = 'parent';

-- 3단계: 확인 (반드시 확인하세요!)
SELECT 
    email,
    name,
    password,
    CASE 
        WHEN password = '1234' THEN '✅ OK'
        WHEN password IS NULL THEN '❌ NULL'
        ELSE '⚠️ 다른 값: ' || password
    END as status,
    role
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 4단계: 전체 부모 계정 수 확인
SELECT COUNT(*) as total_parents, 
       COUNT(CASE WHEN password = '1234' THEN 1 END) as with_password_1234,
       COUNT(CASE WHEN password IS NULL THEN 1 END) as with_null_password
FROM users 
WHERE role = 'parent';

-- 완료 메시지
SELECT '✅ 모든 부모 계정의 비밀번호가 1234로 설정되었습니다!' AS result;
