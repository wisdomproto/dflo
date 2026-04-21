-- ============================================================
-- 009: children 연락처/주소/주민번호 컬럼 추가
-- 병원 환자 리스트(엑셀)의 실제 데이터를 DB 에 반영하면서, 지금은
-- users(parent) 쪽에만 있던 연락처를 환자 단위로도 보관한다.
--   address   : 상세 주소 (예: 강남구 청담동 454 휴먼스타빌 1305호)
--   zipcode   : 우편번호
--   phone     : 연락처 (부모·환자 구분은 엑셀상 모호해서 단일 컬럼)
--   email     : 이메일
--   rrn       : 주민등록번호 (full). 생년월일은 이미 birth_date 컬럼이
--               있지만 원천 데이터를 함께 보관해 추후 재파싱 가능.
-- 모두 선택 컬럼이라 기존 행은 NULL 로 남는다.
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS zipcode TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS rrn TEXT;

CREATE INDEX IF NOT EXISTS idx_children_rrn ON children(rrn) WHERE rrn IS NOT NULL;
