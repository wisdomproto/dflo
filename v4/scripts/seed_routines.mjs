/**
 * 기존 환자들에 대한 데일리 루틴 시드 데이터 생성
 *
 * - 각 자녀의 첫 측정일부터 오늘까지
 * - 환자별 랜덤 커버리지 (30%~90%)
 * - 식단, 운동, 영양제, 수면, 수분, 기분 등 다양하게
 *
 * 사용법: node scripts/seed_routines.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Helpers ──────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function chance(pct) {
  return Math.random() * 100 < pct;
}
function padTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ── Data pools ───────────────────────────────────────

const EXERCISES = [
  '목 스트레칭', '등 스트레칭', '복부 스트레칭', '옆구리 스트레칭',
  '등 근육운동', '허벅지 뒤 스트레칭', '엉덩이 스트레칭',
  '허벅지 앞 스트레칭', '엉덩이 근육 운동',
];

const BASIC_SUPPLEMENTS = ['비타민D', '칼슘', '아연', '유산균', '오메가3'];

const MOODS = ['happy', 'normal', 'sad', 'tired', 'sick'];
const MOOD_WEIGHTS = [30, 40, 10, 15, 5]; // weighted distribution

const SLEEP_QUALITIES = ['good', 'bad'];
const SLEEP_WEIGHTS = [70, 30];

const BREAKFAST_MENUS = [
  '계란후라이 + 밥 + 김치',
  '토스트 + 우유',
  '시리얼 + 바나나 + 우유',
  '죽 + 계란',
  '김밥 1줄',
  '빵 + 치즈 + 주스',
  '오트밀 + 블루베리',
  '떡국',
  '샌드위치 + 요거트',
  '밥 + 된장국 + 멸치볶음',
];

const LUNCH_MENUS = [
  '급식 (밥 + 국 + 반찬 3가지)',
  '급식 (카레라이스 + 샐러드)',
  '급식 (비빔밥 + 미역국)',
  '급식 (돈까스 + 밥 + 국)',
  '급식 (잡채밥 + 계란국)',
  '도시락 (밥 + 불고기 + 야채)',
  '급식 (짜장밥 + 단무지)',
  '급식 (볶음밥 + 계란국)',
  '급식 (생선구이 + 밥 + 된장국)',
  '급식 (치킨너겟 + 밥 + 국)',
];

const DINNER_MENUS = [
  '밥 + 된장찌개 + 제육볶음',
  '밥 + 김치찌개 + 계란말이',
  '밥 + 미역국 + 생선구이',
  '삼겹살 + 쌈 + 밥',
  '치킨 + 밥',
  '파스타 + 샐러드',
  '밥 + 순두부찌개 + 나물',
  '불고기 + 밥 + 국',
  '밥 + 부대찌개',
  '밥 + 갈비탕',
  '피자 1조각 + 샐러드',
  '밥 + 콩나물국 + 볶음',
  '수제버거 + 감자튀김',
  '밥 + 닭볶음탕',
  '우동 + 주먹밥',
];

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Generators ───────────────────────────────────────

function genSleepTime() {
  // 수면: 20:30~23:00
  const h = rand(20, 22);
  const m = pick([0, 15, 30, 45]);
  if (h === 22 && m > 30) return padTime(22, 30);
  return padTime(h, m);
}

function genWakeTime() {
  // 기상: 06:00~08:00
  const h = rand(6, 7);
  const m = pick([0, 15, 30, 45]);
  return padTime(h, m);
}

function genMealTime(type) {
  switch (type) {
    case 'breakfast': return padTime(rand(7, 8), pick([0, 15, 30, 45]));
    case 'lunch':    return padTime(rand(12, 13), pick([0, 15, 30]));
    case 'dinner':   return padTime(rand(18, 19), pick([0, 15, 30, 45]));
    default:         return padTime(rand(15, 16), pick([0, 30]));
  }
}

function genMealDescription(type) {
  switch (type) {
    case 'breakfast': return pick(BREAKFAST_MENUS);
    case 'lunch':    return pick(LUNCH_MENUS);
    case 'dinner':   return pick(DINNER_MENUS);
    default:         return '과일 + 우유';
  }
}

function genRoutine(childId, date, coverageProfile) {
  const routine = {
    child_id: childId,
    routine_date: date,
    growth_injection: false,
  };

  // 수면 (80% 확률)
  if (chance(80)) {
    routine.sleep_time = genSleepTime();
    routine.wake_time = genWakeTime();
    routine.sleep_quality = weightedPick(SLEEP_QUALITIES, SLEEP_WEIGHTS);
  }

  // 수분 섭취 (60% 확률)
  if (chance(60)) {
    routine.water_intake_ml = rand(3, 10) * 100; // 300~1000ml
  }

  // 기분 (50% 확률)
  if (chance(50)) {
    routine.mood = weightedPick(MOODS, MOOD_WEIGHTS);
  }

  // 영양제 (70% 확률)
  if (chance(70)) {
    const count = rand(1, 5);
    routine.basic_supplements = pickN(BASIC_SUPPLEMENTS, count);
  }

  // 성장 주사 (일부 환자만, 커버리지 높을수록 주사 확률도 높음)
  if (coverageProfile > 70 && chance(15)) {
    routine.growth_injection = true;
    routine.injection_time = padTime(rand(20, 22), pick([0, 30]));
  }

  // 일일 메모 (10%)
  if (chance(10)) {
    routine.daily_notes = pick([
      '컨디션 좋음', '조금 피곤해 보임', '학교 체육 수업 있었음',
      '감기 기운 있음', '잘 먹음', '밥을 잘 안 먹음',
      '친구들이랑 많이 뛰어놀았다고 함', '키가 큰 것 같다고 기뻐함',
    ]);
  }

  return routine;
}

function genMeals(routineId, date) {
  const meals = [];
  const types = ['breakfast', 'lunch', 'dinner'];

  for (const type of types) {
    // 각 끼니 독립적으로 70% 확률
    if (!chance(70)) continue;

    meals.push({
      daily_routine_id: routineId,
      meal_type: type,
      meal_time: genMealTime(type),
      description: genMealDescription(type),
      is_healthy: chance(65),
      portion_size: pick(['small', 'medium', 'large']),
    });
  }

  return meals;
}

function genExerciseLogs(routineId) {
  // 50% 확률로 운동 기록
  if (!chance(50)) return [];

  const count = rand(2, 5);
  const exercises = pickN(EXERCISES, count);

  return exercises.map((name) => ({
    daily_routine_id: routineId,
    exercise_name: name,
    duration_minutes: pick([5, 10, 15, 20]),
    completed: chance(85),
  }));
}

// ── Main ─────────────────────────────────────────────

async function main() {
  console.log('\n=== 데일리 루틴 시드 데이터 생성 ===\n');

  // 1. 전체 자녀 + 첫 측정일 조회
  const { data: children, error: childErr } = await supabase
    .from('children')
    .select('id, name, gender, birth_date, parent_id')
    .order('created_at');

  if (childErr) {
    console.error('자녀 조회 실패:', childErr.message);
    process.exit(1);
  }
  console.log(`자녀 수: ${children.length}명\n`);

  // 2. 기존 루틴 데이터 확인 & 삭제
  const { count: existingCount } = await supabase
    .from('daily_routines')
    .select('id', { count: 'exact', head: true });

  if (existingCount > 0) {
    console.log(`기존 루틴 ${existingCount}건 삭제 중...`);

    // exercise_logs, meals 먼저 삭제 (FK)
    const { data: routineIds } = await supabase
      .from('daily_routines')
      .select('id');

    if (routineIds?.length) {
      // batch delete exercise_logs
      for (let i = 0; i < routineIds.length; i += 100) {
        const ids = routineIds.slice(i, i + 100).map((r) => r.id);
        await supabase.from('exercise_logs').delete().in('daily_routine_id', ids);
        await supabase.from('meals').delete().in('daily_routine_id', ids);
      }
      // delete routines
      for (let i = 0; i < routineIds.length; i += 100) {
        const ids = routineIds.slice(i, i + 100).map((r) => r.id);
        await supabase.from('daily_routines').delete().in('id', ids);
      }
    }
    console.log('기존 데이터 삭제 완료\n');
  }

  // 3. 각 자녀별 측정 데이터 조회 (첫 측정일)
  const today = new Date().toISOString().split('T')[0];
  let totalRoutines = 0;
  let totalMeals = 0;
  let totalExercises = 0;

  for (const child of children) {
    const { data: measurements } = await supabase
      .from('measurements')
      .select('measured_date')
      .eq('child_id', child.id)
      .order('measured_date', { ascending: true })
      .limit(1);

    const firstDate = measurements?.[0]?.measured_date;
    if (!firstDate) {
      console.log(`  ⏭ ${child.name} - 측정 데이터 없음, 건너뜀`);
      continue;
    }

    const totalDays = daysBetween(firstDate, today);
    if (totalDays <= 0) {
      console.log(`  ⏭ ${child.name} - 날짜 범위 없음`);
      continue;
    }

    // 커버리지 30~90%
    const coverage = rand(30, 90);
    const daysToGenerate = Math.round((totalDays * coverage) / 100);

    console.log(
      `  👶 ${child.name} | ${firstDate} ~ ${today} (${totalDays}일) | 커버리지 ${coverage}% → ${daysToGenerate}일`
    );

    // 랜덤하게 날짜 선택
    const allDays = [];
    for (let d = 0; d < totalDays; d++) {
      allDays.push(addDays(firstDate, d));
    }
    const selectedDays = pickN(allDays, daysToGenerate).sort();

    // batch insert routines (50개씩)
    for (let i = 0; i < selectedDays.length; i += 50) {
      const batch = selectedDays.slice(i, i + 50);
      const routines = batch.map((date) => genRoutine(child.id, date, coverage));

      const { data: inserted, error: insertErr } = await supabase
        .from('daily_routines')
        .insert(routines)
        .select('id, routine_date');

      if (insertErr) {
        console.error(`    루틴 삽입 실패:`, insertErr.message);
        continue;
      }

      totalRoutines += inserted.length;

      // 각 루틴에 대해 식사 + 운동 생성
      const allMeals = [];
      const allExercises = [];

      for (const routine of inserted) {
        const meals = genMeals(routine.id, routine.routine_date);
        allMeals.push(...meals);

        const exercises = genExerciseLogs(routine.id);
        allExercises.push(...exercises);
      }

      // batch insert meals
      if (allMeals.length > 0) {
        for (let j = 0; j < allMeals.length; j += 50) {
          const mealBatch = allMeals.slice(j, j + 50);
          const { error: mealErr } = await supabase.from('meals').insert(mealBatch);
          if (mealErr) console.error('    식사 삽입 실패:', mealErr.message);
          else totalMeals += mealBatch.length;
        }
      }

      // batch insert exercises
      if (allExercises.length > 0) {
        for (let j = 0; j < allExercises.length; j += 50) {
          const exBatch = allExercises.slice(j, j + 50);
          const { error: exErr } = await supabase.from('exercise_logs').insert(exBatch);
          if (exErr) console.error('    운동 삽입 실패:', exErr.message);
          else totalExercises += exBatch.length;
        }
      }
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`루틴: ${totalRoutines}건`);
  console.log(`식사: ${totalMeals}건`);
  console.log(`운동: ${totalExercises}건`);

  // 검증
  const { count: rCount } = await supabase
    .from('daily_routines')
    .select('id', { count: 'exact', head: true });
  const { count: mCount } = await supabase
    .from('meals')
    .select('id', { count: 'exact', head: true });
  const { count: eCount } = await supabase
    .from('exercise_logs')
    .select('id', { count: 'exact', head: true });

  console.log(`\n검증 - DB 총 레코드:`);
  console.log(`  daily_routines: ${rCount}`);
  console.log(`  meals: ${mCount}`);
  console.log(`  exercise_logs: ${eCount}`);
}

main().catch(console.error);
