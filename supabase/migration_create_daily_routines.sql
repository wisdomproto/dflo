-- ================================================
-- Migration: Create daily_routines table
-- 목적: 데일리 루틴 데이터를 DB에 저장
-- 작성일: 2026-02-04
-- ================================================

-- 1. daily_routines 테이블 생성
CREATE TABLE daily_routines (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    routine_date DATE NOT NULL,
    
    -- 신체 측정 (기본)
    age_at_routine DECIMAL(4,2),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    predicted_height_basic DECIMAL(5,2),
    
    -- 신체 측정 (자세히)
    bone_age DECIMAL(4,2),
    predicted_height_bone_age DECIMAL(5,2),
    measurement_notes TEXT,
    
    -- 수면
    sleep_time TIME,
    wake_time TIME,
    sleep_quality VARCHAR(20) CHECK (sleep_quality IN ('Excellent', 'Good', 'Fair', 'Poor')),
    
    -- 수분 섭취
    water_amount INTEGER, -- ml
    
    -- 식사 기록 (JSON 배열)
    meals JSONB DEFAULT '[]',
    -- 예시: [{"time": "08:00", "type": "아침", "photo": "base64...", "quality": "Excellent"}]
    
    -- 운동 (JSON 배열)
    exercises JSONB DEFAULT '[]',
    -- 예시: [{"id": "jump_rope", "name": "줄넘기", "duration": 30}]
    
    -- 영양제 (JSON 배열)
    supplements JSONB DEFAULT '[]',
    -- 예시: ["비타민D", "칼슘", "오메가3"]
    
    -- 성장 주사
    growth_injection BOOLEAN DEFAULT false,
    injection_time TIME,
    
    -- 기타
    notes TEXT,
    mood VARCHAR(50),
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_daily_routines_child_id ON daily_routines(child_id);
CREATE INDEX idx_daily_routines_date ON daily_routines(routine_date);
CREATE INDEX idx_daily_routines_child_date ON daily_routines(child_id, routine_date);

-- 3. 유니크 제약 조건 (하루에 하나의 루틴만)
CREATE UNIQUE INDEX idx_daily_routines_unique ON daily_routines(child_id, routine_date);

-- 4. 코멘트 추가
COMMENT ON TABLE daily_routines IS '아이들의 일일 루틴 기록 (신체 측정, 식사, 수면, 운동 등)';
COMMENT ON COLUMN daily_routines.meals IS '식사 기록 JSON 배열 [{"time": "08:00", "type": "아침", "photo": "base64", "quality": "Excellent"}]';
COMMENT ON COLUMN daily_routines.exercises IS '운동 기록 JSON 배열 [{"id": "jump_rope", "name": "줄넘기", "duration": 30}]';
COMMENT ON COLUMN daily_routines.supplements IS '영양제 목록 JSON 배열 ["비타민D", "칼슘"]';

-- 5. 확인 쿼리
SELECT 
    COUNT(*) as total_routines,
    COUNT(DISTINCT child_id) as children_with_routines,
    MIN(routine_date) as first_routine,
    MAX(routine_date) as last_routine
FROM daily_routines;

-- ================================================
-- 사용 예시
-- ================================================

-- 루틴 추가
/*
INSERT INTO daily_routines (
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood
) VALUES (
    'child-uuid',
    '2026-02-04',
    15.0,
    177.9,
    87.2,
    182.1,
    '22:00',
    '07:00',
    'Good',
    2000,
    '[{"time": "08:00", "type": "아침", "quality": "Excellent"}]'::jsonb,
    '[{"id": "jump_rope", "name": "줄넘기", "duration": 30}]'::jsonb,
    '["비타민D", "칼슘"]'::jsonb,
    false,
    '오늘 컨디션 좋음',
    '😊'
);
*/

-- 특정 아이의 루틴 조회
/*
SELECT * FROM daily_routines
WHERE child_id = 'child-uuid'
ORDER BY routine_date DESC
LIMIT 30;
*/

-- 최근 7일 루틴 통계
/*
SELECT 
    child_id,
    COUNT(*) as routine_count,
    AVG(water_amount) as avg_water,
    AVG(EXTRACT(EPOCH FROM (wake_time - sleep_time))/3600) as avg_sleep_hours
FROM daily_routines
WHERE routine_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY child_id;
*/
