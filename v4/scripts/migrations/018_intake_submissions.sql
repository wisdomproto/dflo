-- ============================================================
-- 018: intake_submissions (환자 셀프 설문 대기함) + 국가별 채번 함수
-- 공개 폼(/intake/:lang) 제출 → 대기함 → 어드민 승인 시 children 생성.
-- spec: docs/superpowers/specs/2026-06-04-patient-intake-survey-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS intake_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text UNIQUE NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  lang              text NOT NULL,
  country           text,
  status            text NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  name              text,
  name_en           text,
  gender            text,
  birth_date        date,
  father_height     numeric,
  mother_height     numeric,
  desired_height    numeric,
  grade             text,
  class_height_rank text,
  phone             text,
  email             text,
  address           text,
  intake_survey     jsonb,
  uploads           jsonb NOT NULL DEFAULT '[]'::jsonb,
  child_id          uuid REFERENCES children(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  reject_reason     text
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_status
  ON intake_submissions (status, created_at DESC);

-- permissive RLS (기존 임상 테이블과 동일 포스처)
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS intake_submissions_all ON intake_submissions;
CREATE POLICY intake_submissions_all ON intake_submissions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 국가별 채번: chart_number ~ '^{cc}[0-9]+$' 중 최대 + 1, 4자리 zero-pad.
CREATE OR REPLACE FUNCTION next_country_chart_number(cc text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text := lower(cc);
  maxnum int;
BEGIN
  SELECT COALESCE(MAX( (substring(chart_number from '^' || prefix || '([0-9]+)$'))::int ), 0)
    INTO maxnum
    FROM children
   WHERE chart_number ~ ('^' || prefix || '[0-9]+$');
  RETURN prefix || lpad((maxnum + 1)::text, 4, '0');
END;
$$;

-- ============================================================
-- Storage: intake-uploads (비공개) — 공개 폼 익명 업로드용.
-- Dashboard SQL editor 또는 service-role로 실행.
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('intake-uploads', 'intake-uploads', false)
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS intake_uploads_insert ON storage.objects;
CREATE POLICY intake_uploads_insert ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'intake-uploads');
DROP POLICY IF EXISTS intake_uploads_read ON storage.objects;
CREATE POLICY intake_uploads_read ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'intake-uploads');

SELECT 'intake_submissions + next_country_chart_number + intake-uploads created' AS status;
