-- ============================================================
-- 008: lab_tests.test_type — 패널 종류 확장
-- 기존 CHECK 제약은 ('allergy','organic_acid','blood')만 허용했는데,
-- eone 검사지 OCR 파서를 전 패널 커버하도록 확장하면서 다음 타입 추가:
--   - 'attachment'       : raw 이미지만 보관 (비표준 요약 페이지 등)
--   - 'food_intolerance' : IgG4 음식 과민증 패널 (90종)
--   - 'mast_allergy'     : MAST 알레르겐 검사
--   - 'nk_activity'      : NK 세포 활성도
--   - 'hair_mineral'     : 모발 중금속/미네랄
-- 'allergy'는 기존 임시 이름이라 남겨둔다 (하위호환).
-- ============================================================

ALTER TABLE lab_tests DROP CONSTRAINT IF EXISTS lab_tests_test_type_check;

ALTER TABLE lab_tests
  ADD CONSTRAINT lab_tests_test_type_check CHECK (
    test_type IN (
      'allergy',
      'organic_acid',
      'blood',
      'attachment',
      'food_intolerance',
      'mast_allergy',
      'nk_activity',
      'hair_mineral'
    )
  );
