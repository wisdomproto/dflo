/**
 * growth_cases_import.json을 Supabase growth_cases 테이블에 업로드
 *
 * 사용법: node scripts/upload_growth_cases.mjs
 *
 * - 기존 데이터를 모두 삭제 (is_published = false 로) 후 새로 삽입
 * - 또는 --replace 옵션으로 기존 데이터 완전 삭제 후 삽입
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const jsonPath = join(__dirname, 'growth_cases_import.json');
  const cases = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  console.log(`\n=== 업로드 시작: ${cases.length}건 ===\n`);

  // 1. 기존 데이터 확인
  const { data: existing, error: fetchErr } = await supabase
    .from('growth_cases')
    .select('id, patient_name')
    .order('order_index');

  if (fetchErr) {
    console.error('기존 데이터 조회 실패:', fetchErr.message);
    process.exit(1);
  }
  console.log(`기존 데이터: ${existing.length}건`);

  // 2. 기존 데이터 삭제 (hard delete)
  if (existing.length > 0) {
    const ids = existing.map(e => e.id);
    console.log(`기존 ${ids.length}건 삭제 중...`);

    // Supabase anon key 로는 한번에 많이 삭제 못할 수 있으니 batch
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const { error: delErr } = await supabase
        .from('growth_cases')
        .delete()
        .in('id', batch);

      if (delErr) {
        console.error(`삭제 실패 (batch ${i}):`, delErr.message);
        // RLS 때문에 삭제 안될 수 있음 - 우선 계속 진행
        console.log('삭제 실패 - 기존 데이터를 비활성화합니다.');
        for (const id of batch) {
          await supabase
            .from('growth_cases')
            .update({ is_published: false })
            .eq('id', id);
        }
      }
    }
    console.log('기존 데이터 처리 완료');
  }

  // 3. 새 데이터 삽입 (batch insert - 10개씩)
  let success = 0;
  let failed = 0;

  for (let i = 0; i < cases.length; i += 10) {
    const batch = cases.slice(i, i + 10);

    const rows = batch.map(c => ({
      patient_name: c.patient_name,
      gender: c.gender,
      birth_date: c.birth_date,
      father_height: c.father_height,
      mother_height: c.mother_height,
      target_height: c.target_height,
      special_notes: c.special_notes,
      measurements: c.measurements,
      is_published: true,
      order_index: c.order_index,
    }));

    const { data, error } = await supabase
      .from('growth_cases')
      .insert(rows)
      .select('id, patient_name');

    if (error) {
      console.error(`삽입 실패 (batch ${i + 1}~${i + batch.length}):`, error.message);
      failed += batch.length;
    } else {
      success += data.length;
      for (const d of data) {
        console.log(`  ✓ ${d.patient_name}`);
      }
    }
  }

  console.log(`\n=== 업로드 완료 ===`);
  console.log(`성공: ${success}건, 실패: ${failed}건`);

  // 4. 검증
  const { data: verify, error: verifyErr } = await supabase
    .from('growth_cases')
    .select('id, patient_name, gender, measurements')
    .eq('is_published', true)
    .order('order_index');

  if (verifyErr) {
    console.error('검증 실패:', verifyErr.message);
  } else {
    console.log(`\n검증: 활성 데이터 ${verify.length}건`);
    const totalMeas = verify.reduce((sum, c) => sum + (c.measurements?.length || 0), 0);
    console.log(`총 측정 데이터: ${totalMeas}건`);
  }
}

main().catch(console.error);
