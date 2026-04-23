-- Migration 011 — visit_images
--
-- Stores every X-ray / imaging file attached to a visit. A single visit can
-- have many images (full series). The dedicated `xray_readings` row still
-- holds the "primary" hand X-ray used for atlas matching, but the gallery
-- in the X-ray tab is driven by this table.
--
-- image_path  — Supabase Storage key under the `xray-images` bucket
-- series_id   — extracted from filename ({chart}_{name}_{date}_CR_{series}_{i})
-- image_index — extracted from filename (last segment before extension)
-- source_file — original filename for reference

CREATE TABLE IF NOT EXISTS visit_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id     uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  image_path   text NOT NULL,
  source_file  text,
  series_id    text,
  image_index  integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_images_visit ON visit_images(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_images_child ON visit_images(child_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_images_path ON visit_images(image_path);

ALTER TABLE visit_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_read_visit_images"  ON visit_images FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_write_visit_images" ON visit_images FOR ALL    TO authenticated, anon USING (true) WITH CHECK (true);

SELECT 'visit_images created' AS status;
