/**
 * children 테이블에 name_en 컬럼 추가 + 영어 가명 생성
 *
 * 사용법: node scripts/add_english_names.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MALE_NAMES = [
  'James', 'Oliver', 'Ethan', 'Lucas', 'Noah', 'Liam', 'Mason', 'Logan',
  'Alexander', 'Benjamin', 'Daniel', 'Henry', 'Sebastian', 'Jack', 'Owen',
  'Samuel', 'Ryan', 'Nathan', 'Dylan', 'Leo', 'Caleb', 'Isaac', 'Luke',
  'Aaron', 'Max', 'Evan', 'Tyler', 'Austin', 'Jayden', 'Kevin',
  'Marcus', 'Adrian', 'Colin', 'Derek', 'Felix', 'Grant', 'Hugo',
];

const FEMALE_NAMES = [
  'Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Scarlett', 'Grace',
  'Chloe', 'Victoria', 'Riley', 'Aria', 'Lily', 'Zoey', 'Hannah', 'Nora',
  'Luna', 'Stella', 'Hazel', 'Violet', 'Claire', 'Lucy', 'Sophie',
  'Alice', 'Belle', 'Diana', 'Ellie', 'Fiona', 'Iris', 'Julia',
];

const LAST_NAMES = [
  'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Yoon', 'Jang',
  'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn',
  'Song', 'Jeon', 'Hong', 'Yoo', 'Ko', 'Moon', 'Yang', 'Son',
  'Bae', 'Jo', 'Baek', 'Heo', 'Nam', 'Sim', 'Ryu', 'Ha',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('\n=== 영어 이름 생성 ===\n');

  // 1. 컬럼 추가 시도 (이미 있으면 무시)
  const { error: alterErr } = await supabase.rpc('exec_sql', {
    query: "ALTER TABLE children ADD COLUMN IF NOT EXISTS name_en text;"
  }).maybeSingle();

  if (alterErr) {
    console.log('컬럼 추가 RPC 실패 (이미 있거나 RPC 없음):', alterErr.message);
    console.log('Supabase 대시보드에서 다음 SQL을 실행해 주세요:');
    console.log('  ALTER TABLE children ADD COLUMN IF NOT EXISTS name_en text;');
    console.log('\n컬럼이 이미 있다면 계속 진행합니다...\n');
  } else {
    console.log('name_en 컬럼 추가 완료\n');
  }

  // 2. 전체 자녀 조회
  const { data: children, error: fetchErr } = await supabase
    .from('children')
    .select('id, name, gender, name_en')
    .order('created_at');

  if (fetchErr) {
    console.error('자녀 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  console.log(`자녀 수: ${children.length}명\n`);

  // 3. 사용된 이름 추적 (중복 방지)
  const usedNames = new Set();
  let updated = 0;

  for (const child of children) {
    // 이미 영어 이름이 있으면 스킵
    if (child.name_en) {
      console.log(`  ⏭ ${child.name} → ${child.name_en} (기존)`);
      usedNames.add(child.name_en);
      continue;
    }

    const firstNames = child.gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
    let nameEn;
    let attempts = 0;

    // 중복 없는 이름 생성
    do {
      nameEn = `${pick(firstNames)} ${pick(LAST_NAMES)}`;
      attempts++;
    } while (usedNames.has(nameEn) && attempts < 100);

    usedNames.add(nameEn);

    const { error: updateErr } = await supabase
      .from('children')
      .update({ name_en: nameEn })
      .eq('id', child.id);

    if (updateErr) {
      console.error(`  ✗ ${child.name} 업데이트 실패:`, updateErr.message);
    } else {
      console.log(`  ✓ ${child.name} → ${nameEn}`);
      updated++;
    }
  }

  console.log(`\n=== 완료: ${updated}명 업데이트 ===`);
}

main().catch(console.error);
