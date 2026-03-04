import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: children } = await sb.from('children').select('name, name_en, gender, birth_date');
  const { data: cases } = await sb.from('growth_cases').select('id, patient_name, gender, birth_date').eq('is_published', true);

  const childMap = new Map();
  for (const c of children) {
    const key = c.birth_date + '|' + c.gender;
    if (c.name_en) childMap.set(key, c.name_en);
  }

  let updated = 0;
  for (const gc of cases) {
    const key = gc.birth_date + '|' + gc.gender;
    const nameEn = childMap.get(key);
    if (!nameEn) continue;

    const { error } = await sb.from('growth_cases').update({ patient_name: nameEn }).eq('id', gc.id);
    if (error) {
      console.log('ERR:', gc.patient_name, error.message);
    } else {
      console.log(gc.patient_name, '->', nameEn);
      updated++;
    }
  }
  console.log('\nUpdated:', updated);
}

main().catch(console.error);
