-- 048_evidence_quality_columns.sql
-- Research Evidence Library Phase 1 — evidence_papers 품질/공개 컬럼 확장 (비파괴).
-- Supabase Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
-- 선행: 035_evidence_papers.sql 가 먼저 적용돼 evidence_papers 가 존재해야 함.
alter table evidence_papers add column if not exists doi            text default '';
alter table evidence_papers add column if not exists openalex_id    text default '';
alter table evidence_papers add column if not exists journal_issn   text default '';
alter table evidence_papers add column if not exists citation_count integer default 0;
alter table evidence_papers add column if not exists rcr            numeric;          -- NIH RCR (분야·연도 보정 피인용)
alter table evidence_papers add column if not exists if_proxy       numeric;          -- OpenAlex 저널 2yr mean citedness ≈ IF
alter table evidence_papers add column if not exists study_type     text default '';  -- meta_analysis|systematic_review|rct|cohort|case_control|cross_sectional|review|other
alter table evidence_papers add column if not exists is_sci         boolean default false;
alter table evidence_papers add column if not exists quality_score  numeric default 0;-- 0~100 합성
alter table evidence_papers add column if not exists korean_summary text default '';  -- 공개용 1줄 근거 (Gemini, Phase 2 백필)
alter table evidence_papers add column if not exists key_finding    text default '';  -- 핵심 결론 (Gemini, Phase 2 백필)
alter table evidence_papers add column if not exists confirmed      boolean default false; -- 공개 인용 승인 게이트
-- (sjr_quartile 은 의도적 생략 — Phase 1 미사용. 화이트리스트 + if_proxy 로 SCI 게이트 충족. 필요 시 후속 추가)
create index if not exists idx_evidence_quality on evidence_papers(quality_score desc);
create index if not exists idx_evidence_sci on evidence_papers(is_sci);
