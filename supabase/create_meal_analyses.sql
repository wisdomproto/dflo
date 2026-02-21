-- ================================================
-- meal_analyses 테이블 생성
-- AI 식사 분석 결과 저장
-- Supabase SQL Editor에서 실행
-- ================================================

CREATE TABLE IF NOT EXISTS meal_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  menu_name TEXT NOT NULL DEFAULT '',
  ingredients TEXT[] DEFAULT '{}',
  calories INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  protein INTEGER DEFAULT 0,
  fat INTEGER DEFAULT 0,
  growth_score INTEGER DEFAULT 1 CHECK (growth_score BETWEEN 1 AND 10),
  advice TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스: meal_id로 빠른 조회
CREATE INDEX IF NOT EXISTS idx_meal_analyses_meal_id ON meal_analyses(meal_id);

-- RLS 비활성화 (custom auth 사용)
ALTER TABLE meal_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access meal_analyses" ON meal_analyses
  FOR ALL USING (true) WITH CHECK (true);
