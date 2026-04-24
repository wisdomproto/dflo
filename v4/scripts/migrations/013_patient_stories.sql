-- Migration 013: patient_stories
--
-- Per-patient narrative "story" (70% fact drawn from clinical data,
-- 30% fictional emotional context). One row per child; cache key is child_id.
-- Generator: Gemini 2.5 Flash (free tier), seeded by cases/generate_patient_stories.mjs.

CREATE TABLE IF NOT EXISTS patient_stories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id    UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  story       TEXT NOT NULL,
  model       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'gemini',  -- 'gemini' | 'claude' | 'manual'
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_stories_child_id ON patient_stories(child_id);

-- Permissive RLS for the admin dashboard (no auth layer yet — matches
-- migration 006 / 007 style). Tighten when admin auth lands.
ALTER TABLE patient_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read patient_stories" ON patient_stories;
CREATE POLICY "anon can read patient_stories"
  ON patient_stories FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon can write patient_stories" ON patient_stories;
CREATE POLICY "anon can write patient_stories"
  ON patient_stories FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
