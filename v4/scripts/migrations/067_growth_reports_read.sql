-- 067: growth_reports 어드민/마케팅 로그 조회 — anon SELECT + DELETE (예측키 로그 061/062와 동일 패턴).
-- 마케팅 "예측키 측정 로그" 페이지의 '설문 완료' 드롭다운이 이 정책으로 growth_reports 를 직접 읽음.
-- ⚠️ survey.childName 등 부모 입력 실명이 포함될 수 있음 → anon 키로 노출됨(내부 PIN 8054 게이트 뷰 전제).
--    민감하면 추후 service_role 경유(ai-server)로 전환 가능.
drop policy if exists growth_reports_anon_select on public.growth_reports;
create policy growth_reports_anon_select
  on public.growth_reports for select to anon using (true);

drop policy if exists growth_reports_anon_delete on public.growth_reports;
create policy growth_reports_anon_delete
  on public.growth_reports for delete to anon using (true);
