-- ================================================
-- child_required_info 테이블 RLS 비활성화 (긴급)
-- ================================================

-- child_required_info 테이블의 RLS 정책 삭제
DROP POLICY IF EXISTS "Parents can view own children info" ON child_required_info;
DROP POLICY IF EXISTS "Doctors and admins can view all children info" ON child_required_info;
DROP POLICY IF EXISTS "Parents can manage own children info" ON child_required_info;
DROP POLICY IF EXISTS "Doctors and admins can manage children info" ON child_required_info;

-- child_required_info 테이블 RLS 비활성화
ALTER TABLE child_required_info DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT '✅ child_required_info 테이블의 RLS가 비활성화되었습니다!' AS result;
