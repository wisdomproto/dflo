-- ================================================
-- 187 성장케어 - Supabase RLS 정책 수정 (무한 재귀 해결)
-- ================================================
-- 생성일: 2026-01-31
-- 설명: users 테이블의 무한 재귀 문제를 해결한 RLS 정책
-- ================================================

-- ================================================
-- 기존 정책 삭제
-- ================================================
DROP POLICY IF EXISTS "Doctors and admins can view all users" ON users;
DROP POLICY IF EXISTS "Doctors and admins can view all children" ON children;
DROP POLICY IF EXISTS "Doctors and admins can view all measurements" ON measurements;
DROP POLICY IF EXISTS "Doctors and admins can insert measurements" ON measurements;

-- ================================================
-- 수정된 RLS 정책: users
-- ================================================
-- 의사/관리자는 모든 사용자 조회 가능 (auth.jwt() 사용)
CREATE POLICY "Doctors and admins can view all users"
    ON users FOR SELECT
    USING (
        (auth.jwt() ->> 'role') IN ('doctor', 'admin')
        OR auth.uid() = id
    );

-- ================================================
-- 수정된 RLS 정책: children
-- ================================================
-- 의사/관리자는 모든 아이 조회 가능
CREATE POLICY "Doctors and admins can view all children"
    ON children FOR SELECT
    USING (
        (auth.jwt() ->> 'role') IN ('doctor', 'admin')
        OR parent_id = auth.uid()
    );

-- ================================================
-- 수정된 RLS 정책: measurements
-- ================================================
-- 의사/관리자는 모든 측정 기록 조회 가능
CREATE POLICY "Doctors and admins can view all measurements"
    ON measurements FOR SELECT
    USING (
        (auth.jwt() ->> 'role') IN ('doctor', 'admin')
        OR EXISTS (
            SELECT 1 FROM children
            WHERE children.id = measurements.child_id
            AND children.parent_id = auth.uid()
        )
    );

-- 의사/관리자만 측정 기록 추가 가능
CREATE POLICY "Doctors and admins can insert measurements"
    ON measurements FOR INSERT
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('doctor', 'admin')
    );

-- ================================================
-- 완료 메시지
-- ================================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ RLS 정책 수정 완료 - 무한 재귀 문제 해결됨';
END $$;
