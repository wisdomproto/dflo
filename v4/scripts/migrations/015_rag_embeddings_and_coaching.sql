-- ================================================
-- 015: RAG infra — pgvector + patient_embeddings + coaching_cards
--
-- A. patient_embeddings : 한 환자의 정규화된 텍스트(intake + 측정 + lab + 처방
--    + 메모)를 Gemini text-embedding-004 로 임베딩한 벡터 (768 dim).
--    cosine similarity 로 비슷한 케이스 검색 — 의사 보조 RAG.
--
-- B. coaching_cards : 환자별 "오늘의 코칭" 캐시. Gemini 가 생성한 식단/잠/운동
--    가이드 JSON 을 1일 1회 보관. content_date 별로 1행.
-- ================================================

-- ── pgvector ──
CREATE EXTENSION IF NOT EXISTS vector;

-- ── A. patient_embeddings ──
CREATE TABLE IF NOT EXISTS patient_embeddings (
  child_id        uuid PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
  embedding       vector(768) NOT NULL,
  source_text     text NOT NULL,
  -- 임베딩 만들 때 사용된 데이터 시점 ID — visits/lab 변경 시 재생성 판단용
  source_hash     text,
  model           text NOT NULL DEFAULT 'gemini-text-embedding-004',
  generated_at    timestamptz NOT NULL DEFAULT now()
);

-- IVFFlat 인덱스 (cosine). 환자 244명 규모라 lists=10 정도면 충분.
-- 데이터가 1만+ 늘면 lists 재조정 필요.
CREATE INDEX IF NOT EXISTS idx_patient_embeddings_cosine
  ON patient_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- ── B. coaching_cards ──
CREATE TABLE IF NOT EXISTS coaching_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  -- 어떤 날짜 기준의 코칭인지 (보통 요청일 기준 today)
  content_date    date NOT NULL DEFAULT CURRENT_DATE,
  -- {"meal": "...", "sleep": "...", "exercise": "...", "summary": "..."}
  content         jsonb NOT NULL,
  model           text NOT NULL DEFAULT 'gemini-2.5-flash',
  generated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, content_date)
);

CREATE INDEX IF NOT EXISTS idx_coaching_cards_child_date
  ON coaching_cards (child_id, content_date DESC);

-- ── RPC: top-k cosine similarity ──
-- 자기 자신 제외 + 가장 비슷한 환자 N명 반환.
-- similarity = 1 - cosine_distance (`<=>`). 높을수록 비슷.
CREATE OR REPLACE FUNCTION match_patient_embeddings(
  query_child_id uuid,
  match_count int DEFAULT 5
) RETURNS TABLE (
  child_id uuid,
  similarity float,
  source_text text
) LANGUAGE sql STABLE AS $$
  WITH q AS (
    SELECT embedding FROM patient_embeddings WHERE child_id = query_child_id
  )
  SELECT
    pe.child_id,
    1 - (pe.embedding <=> (SELECT embedding FROM q)) AS similarity,
    pe.source_text
  FROM patient_embeddings pe, q
  WHERE pe.child_id <> query_child_id
  ORDER BY pe.embedding <=> (SELECT embedding FROM q)
  LIMIT match_count;
$$;
