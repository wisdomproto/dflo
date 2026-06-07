-- 044_marketing_cardnews_i18n.sql — 카드뉴스 다국어(5개 언어) 확장
-- Supabase Dashboard SQL Editor에서 1회 수동 적용 (project: txirmofdvuljkrjkpzdg).
-- REST(PostgREST)로는 DDL이 불가하므로 Dashboard 적용 필수.
--
-- 설계: 일러스트는 언어공통(illustration), 텍스트만 언어별(texts JSONB).
--   texts        = {"ko":{"headline":"...","subtext":"..."}, "en":{...}, "th":{...}, "vi":{...}, "ch":{...}}
--   captions     = {"ko":"...", "en":"...", "th":"...", "vi":"...", "ch":"..."}
--   hashtags_i18n= {"ko":"#a #b ...", "en":"...", ...}   (공백 구분 한 줄 문자열)
-- 기존 canvas / image_prompt / caption / hashtags 컬럼은 하위호환 위해 보존(미사용).

-- 슬라이드: 언어공통 일러스트 + 언어별 텍스트 + 역할/CTA 플래그
alter table marketing_cardnews_slides
  add column if not exists illustration text default '',
  add column if not exists texts        jsonb default '{}'::jsonb,
  add column if not exists role         text default '',
  add column if not exists is_cta       boolean default false;

-- 카드뉴스: 언어별 캡션 + 해시태그
alter table marketing_cardnews
  add column if not exists captions      jsonb default '{}'::jsonb,
  add column if not exists hashtags_i18n jsonb default '{}'::jsonb;

-- (선택) 슬라이드 일러스트 검색/정렬 보조 인덱스는 불필요 — sort_order 기존 인덱스 사용.
