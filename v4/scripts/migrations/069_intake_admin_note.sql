-- 069_intake_admin_note.sql
-- 어드민 검토 화면(/admin/intake)에서 원장·스태프가 접수 건에 남기는 내부 메모.
-- 환자 제출 원문(intake_survey.additional_notes)과 별개. anon 노출 불필요(어드민만).

ALTER TABLE intake_submissions ADD COLUMN IF NOT EXISTS admin_note text;
