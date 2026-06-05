-- 020_marketing_config.sql
-- 마케팅 SP1: 연세새봄 브랜드 보이스 설정 (단일 행). Supabase Dashboard SQL Editor에서 1회 적용.
create table if not exists marketing_config (
  id            int primary key default 1,
  brand_name        text,
  brand_description text,
  target_audience   text,
  usp               text,
  brand_tone        text,
  banned_keywords   text[] default '{}',
  marketer_name      text,
  marketer_expertise text,
  marketer_style     text,
  marketer_phrases   text[] default '{}',
  blog_rules        text,
  blog_categories   jsonb default '[]'::jsonb,
  blog_image_style  text,
  target_languages  text[] default '{ko,th,vi,en}',
  ai_model          text default 'gemini-2.5-flash',
  updated_at        timestamptz default now(),
  constraint marketing_config_singleton check (id = 1)
);

-- dflo 관례(013과 동일): RLS on + anon/authenticated 전체 허용 정책.
alter table marketing_config enable row level security;
drop policy if exists marketing_config_all on marketing_config;
create policy marketing_config_all on marketing_config
  for all to anon, authenticated using (true) with check (true);

-- 연세새봄 시드 (출발점; 이후 /marketing/settings 에서 편집).
insert into marketing_config (
  id, brand_name, brand_description, target_audience, usp, brand_tone, banned_keywords,
  marketer_name, marketer_expertise, marketer_style, marketer_phrases,
  blog_rules, blog_categories, blog_image_style, target_languages, ai_model
) values (
  1,
  '187 성장클리닉',
  '소아 성장·성조숙증 전문 클리닉(연세새봄의원, 강남 압구정). 뼈나이 분석·성장호르몬 치료·생활습관 코칭. 국내외(의료관광) 진료.',
  '키 성장이 고민인 아이의 부모(주 결정자: 어머니)',
  '1,000+ 치료사례, 호르몬 통합 관점의 성장 진료, 원장 직접 진료',
  '부모 눈높이의 쉬운 설명 + 의학적 근거, 과장 없는 신뢰형 톤',
  '{과장,확정적 효과 보장}',
  '채용현 원장',
  '소아 성장·성조숙증 전문의, 뼈나이/성장호르몬',
  '쌍둥이 아빠 의사 — 전문성과 부모 공감을 함께 가진 화자',
  '{우리 아이 키}',
  E'1. 순수 텍스트만 출력 (HTML 태그·마크다운·코드블록 금지)\n2. 첫 줄에 검색에 잘 걸리는 매력적인 제목\n3. 소제목은 ■ 기호 사용 (예: ■ 성장호르몬이란?)\n4. 단락 구분은 빈 줄\n5. 1500~2500자\n6. 부모 눈높이에 맞는 쉬운 설명\n7. 의학적 근거 + 실제 임상 경험 기반\n8. 과장 금지, 의료 광고법 준수\n9. 마지막에 "※ 본 글은 의학적 정보 제공을 목적으로 하며, 개인마다 차이가 있을 수 있습니다."\n10. 네이버 SEO를 위해 핵심 키워드를 자연스럽게 3~5회 반복',
  '[
    {"code":"A","name":"성장과학","context":"성장 의학/과학 지식을 쉽게 풀어 설명하는 정보형 콘텐츠입니다. 의학적 근거를 바탕으로 부모님이 이해하기 쉽게 작성합니다."},
    {"code":"B","name":"부모공감","context":"부모님의 걱정과 고민에 공감하면서 전문의 시각으로 답변하는 콘텐츠입니다. Q&A 형식이나 고민 해결형으로 작성합니다."},
    {"code":"D","name":"생활습관","context":"키 성장에 도움이 되는 실질적인 생활 습관 가이드입니다. 수면, 식단, 운동, 자세 등 실천 가능한 팁 위주로 작성합니다."},
    {"code":"E","name":"기타/트렌드","context":"시즌별 이슈, 통계, 트렌드 등 시의성 있는 콘텐츠입니다. 최신 데이터와 흥미로운 관점으로 작성합니다."}
  ]'::jsonb,
  '깔끔한 의료/건강 정보 일러스트, 밝고 신뢰감 있는 톤, 텍스트 최소',
  '{ko,th,vi,en}',
  'gemini-2.5-flash'
)
on conflict (id) do nothing;
