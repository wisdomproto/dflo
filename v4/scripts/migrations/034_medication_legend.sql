-- 034_medication_legend.sql — 병원 내부 약물 코드 → 실제 약물/계열/적응증 사전.
-- Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
create table if not exists medication_legend (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  code          text,                 -- medications.code 사본 (조인 편의)
  display_name  text not null default '',  -- 코드명 (예: 에이큐_G)
  generic_name  text default '',      -- 실제 약물명 (예: somatropin/성장호르몬)
  drug_class    text default '',      -- 계열 (growth_hormone/gnrh_agonist/aromatase_inhibitor/sleep_aid/supplement/topical/other)
  indication    text default '',      -- 적응증 메모
  is_growth_core boolean default false, -- 성장치료 핵심축 여부
  is_non_drug   boolean default false,  -- 비약물(검사오더·행정·사진 등) 여부
  created_at    timestamptz default now()
);
create unique index if not exists idx_medlegend_med on medication_legend(medication_id);
alter table medication_legend enable row level security;
drop policy if exists medlegend_all on medication_legend;
create policy medlegend_all on medication_legend for all to anon, authenticated using (true) with check (true);
