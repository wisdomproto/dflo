-- ================================================
-- measurements 테이블에 필요한 컬럼 추가
-- ================================================

-- bone_age 컬럼이 없으면 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'measurements' AND column_name = 'bone_age'
    ) THEN
        ALTER TABLE measurements ADD COLUMN bone_age DECIMAL(4,1);
        RAISE NOTICE '✅ bone_age 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'ℹ️ bone_age 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- actual_age 컬럼 추가 (선택)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'measurements' AND column_name = 'actual_age'
    ) THEN
        ALTER TABLE measurements ADD COLUMN actual_age DECIMAL(4,2);
        RAISE NOTICE '✅ actual_age 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'ℹ️ actual_age 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- pah (예측 최종 키) 컬럼 추가 (선택)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'measurements' AND column_name = 'pah'
    ) THEN
        ALTER TABLE measurements ADD COLUMN pah DECIMAL(5,2);
        RAISE NOTICE '✅ pah 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'ℹ️ pah 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- 최종 확인
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'measurements'
ORDER BY ordinal_position;
