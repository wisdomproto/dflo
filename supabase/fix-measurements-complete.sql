-- ================================================
-- measurements 테이블 완전 수정 (모든 컬럼 한번에 추가)
-- ================================================

-- bone_age 컬럼 추가
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS bone_age DECIMAL(4,1);

-- actual_age 컬럼 추가
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS actual_age DECIMAL(4,2);

-- pah (예측 최종 키) 컬럼 추가
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS pah DECIMAL(5,2);

-- notes 컬럼 추가
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 최종 확인
SELECT 
    '✅ measurements 테이블 모든 컬럼 추가 완료!' AS result,
    '- bone_age (뼈나이)' AS col1,
    '- actual_age (실제나이)' AS col2,
    '- pah (예측 최종 키)' AS col3,
    '- notes (메모)' AS col4;

-- 테이블 구조 확인
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'measurements'
ORDER BY ordinal_position;
