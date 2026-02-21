-- ================================================
-- Supabase RLS 정책 완전 삭제 및 비활성화
-- ================================================

-- 1단계: 모든 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Doctors and admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Parents can view own children" ON children;
DROP POLICY IF EXISTS "Doctors and admins can view all children" ON children;
DROP POLICY IF EXISTS "Parents can manage own children" ON children;
DROP POLICY IF EXISTS "Parents can view own children measurements" ON measurements;
DROP POLICY IF EXISTS "Doctors and admins can view all measurements" ON measurements;
DROP POLICY IF EXISTS "Doctors and admins can insert measurements" ON measurements;
DROP POLICY IF EXISTS "Anyone can view published recipes" ON recipes;
DROP POLICY IF EXISTS "Anyone can view published cases" ON growth_cases;
DROP POLICY IF EXISTS "Anyone can view published guides" ON growth_guides;

-- 2단계: RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_required_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE measurements DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE growth_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE growth_guides DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
DO $$ 
BEGIN 
    RAISE NOTICE '✅ RLS 정책 삭제 및 비활성화 완료!';
    RAISE NOTICE '📋 모든 테이블의 RLS가 비활성화되었습니다.';
    RAISE NOTICE '🔓 개발 환경에서 자유롭게 테스트할 수 있습니다.';
END $$;
