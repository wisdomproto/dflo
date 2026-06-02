-- 016: X-ray 뷰 상태(줌/패닝/그리기 마킹) 저장
-- 환자 X-ray 이미지를 확대/이동하거나 빨간 펜으로 마킹한 뷰 상태를 회차별로
-- 보존해 다음에 열 때 그대로 복원한다. 좌표는 컨테이너 크기와 무관하도록
-- 0~1 로 정규화해 저장한다(화면/모달 크기가 달라도 위치가 맞음).
--   { zoom: number,
--     offset: { x: number, y: number },        -- 0~1 정규화
--     normalStrokes: [{ color, size, points:[{x,y}] }],  -- 기본 뷰 획(0~1)
--     zoomedStrokes: [{ color, size, points:[{x,y}] }] } -- 확대 뷰 획(0~1)
alter table public.xray_readings
  add column if not exists view_state jsonb;
