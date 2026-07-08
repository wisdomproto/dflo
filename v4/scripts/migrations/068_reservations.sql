-- 068_reservations.sql
-- 예약(콜백) 신청 — 한글 홈페이지 하단 바 "예약하기" 폼에서 남긴 이름·전화번호 리드.
-- 부모가 카톡 채팅을 여는 마찰 없이 "번호 남기면 병원이 연락"하는 콜백 모델.
--
-- ⚠️ PII 보호: 이 테이블은 실명 + 실전화번호를 담는다.
--    anonymous_predictions / growth_reports 와 달리 anon SELECT/INSERT/DELETE 정책을 만들지 않는다.
--    → anon 키로는 이 테이블을 전혀 읽거나 쓸 수 없다.
--    insert/select/delete 는 전부 ai-server(service_role, RLS 우회) 경유로만 이뤄진다.
--      - 접수:   POST   /api/reservations         (공개 폼)
--      - 조회:   GET    /api/reservations         (x-admin-pin 게이트, 마케팅 예약 로그)
--      - 삭제:   DELETE /api/reservations/:id      (x-admin-pin 게이트)

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  contact_method text not null default 'phone',  -- phone(전화상담) | text(문자상담)
  message text,                                  -- 선택 상담 내용
  locale text not null default 'ko',
  status text not null default 'new',  -- new | contacted | done
  consent boolean not null default false,
  referrer text,
  utm jsonb
);

comment on table reservations is '예약(콜백) 신청 리드 — 이름·전화. PII라 anon 정책 없음(service_role 전용 접근).';

create index if not exists reservations_created_at_idx on reservations (created_at desc);

-- RLS 켜되 정책은 만들지 않는다 → anon/authenticated 모두 접근 불가. service_role 만 통과(RLS 우회).
alter table reservations enable row level security;
