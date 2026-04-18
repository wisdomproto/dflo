-- ============================================================
-- 007: children.chart_number — 환자번호 (차트번호)
-- 병원 내부에서 환자에게 발급하는 고유 번호. 모든 환자 관리 UI에서
-- 환자번호로 조회/표시한다.
--
-- 전략 (UNIQUE NOT NULL까지 안전하게 올리기):
--   1) 컬럼 추가 (NULL 허용, UNIQUE)
--   2) 치료 사례 7명 백필 (이름 → 차트번호 매핑)
--   3) 나머지 환자(테스트 데이터 등)는 임시값 'TMP-<row number>' 채움
--   4) NOT NULL 제약 추가
-- ============================================================

-- 1) Column
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS chart_number TEXT;

-- 2) Known patients from cases xlsx
UPDATE children SET chart_number = '3177'   WHERE name = '채유건'   AND chart_number IS NULL;
UPDATE children SET chart_number = '5368'   WHERE name = '송윤우'   AND chart_number IS NULL;
UPDATE children SET chart_number = '22028'  WHERE name = '이재윤'   AND chart_number IS NULL;
UPDATE children SET chart_number = '260464' WHERE name = '박민찬'   AND chart_number IS NULL;
UPDATE children SET chart_number = '27486'  WHERE name = '유지훈'   AND chart_number IS NULL;
UPDATE children SET chart_number = '27485'  WHERE name = '유세희'   AND chart_number IS NULL;
UPDATE children SET chart_number = '260430' WHERE name = '다나카고키' AND chart_number IS NULL;

-- 3) Backfill remaining rows with a placeholder so we can enforce NOT NULL.
--    Format: TMP-<first 8 chars of UUID>. Admin should replace later.
UPDATE children
   SET chart_number = 'TMP-' || substr(id::text, 1, 8)
 WHERE chart_number IS NULL;

-- 4) Enforce NOT NULL + UNIQUE
ALTER TABLE children
  ALTER COLUMN chart_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS children_chart_number_unique
  ON children(chart_number);

SELECT 'children.chart_number populated + unique' AS status;
