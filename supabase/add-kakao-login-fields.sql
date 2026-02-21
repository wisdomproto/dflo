-- ================================================
-- 카카오 로그인을 위한 users 테이블 스키마 업데이트
-- ================================================

-- 1. kakao_id 컬럼 추가 (BIGINT, UNIQUE)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kakao_id BIGINT UNIQUE;

-- 2. profile_image 컬럼 추가 (TEXT)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 3. login_type 컬럼 추가 (VARCHAR, DEFAULT 'email')
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS login_type VARCHAR(20) DEFAULT 'email';

-- 4. password 컬럼을 NULL 허용으로 변경 (카카오 로그인은 비밀번호 불필요)
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

-- 5. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_login_type ON users(login_type);

-- ================================================
-- 확인 쿼리
-- ================================================

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 카카오 로그인 사용자 수 확인
SELECT 
    login_type,
    COUNT(*) as user_count
FROM users
GROUP BY login_type;

-- ================================================
-- 롤백 (필요한 경우)
-- ================================================

-- ALTER TABLE users DROP COLUMN IF EXISTS kakao_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS profile_image;
-- ALTER TABLE users DROP COLUMN IF EXISTS login_type;
-- DROP INDEX IF EXISTS idx_users_kakao_id;
-- DROP INDEX IF EXISTS idx_users_login_type;

-- ================================================
-- 완료
-- ================================================

-- 이 SQL을 Supabase SQL Editor에서 실행하세요.
-- 1. Supabase 대시보드 접속
-- 2. SQL Editor 메뉴 클릭
-- 3. 위 SQL 복사 & 실행
-- 4. "Success. No rows returned" 메시지 확인
