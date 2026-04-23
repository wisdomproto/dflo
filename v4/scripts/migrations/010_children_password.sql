-- ============================================================
-- 010: children.password — 환자(자녀) 단위 로그인 비밀번호
-- 환자(보호자)는 chart_number + password 로 로그인한다.
-- 기본값은 '1234' 평문. 추후 카카오 등 SSO 연동 후
-- 본인이 변경할 수 있도록 한다.
--
-- 한 부모가 여러 자녀일 경우 chart_number 가 자녀별로 다르므로
-- 자녀 단위 로그인이 자연스럽다.
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '1234';

-- 기존 row 도 명시적으로 '1234' 로 채움 (DEFAULT 가 적용되긴 하지만 명시)
UPDATE children SET password = '1234' WHERE password IS NULL OR password = '';

SELECT 'children.password populated (default 1234)' AS status;
