// ================================================
// 어드민 계정 생성 스크립트
// users 테이블에 admin role 계정 insert
// 실행: node scripts/create_admin.mjs
// ================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [key, ...vals] = line.split('=');
  if (key?.trim()) env[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env['service_role key'];
const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADMIN = {
  email: 'admin@187growth.com',
  password: 'admin187!',
  name: '관리자',
  role: 'admin',
  is_active: true,
};

async function main() {
  console.log('=== 어드민 계정 생성 ===\n');

  // 1. 이미 존재하는지 확인
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', ADMIN.email)
    .maybeSingle();

  if (existing) {
    console.log('이미 존재하는 계정:', existing.email, `(role: ${existing.role})`);
    console.log('\n비밀번호를 재설정합니다...');
    const { error } = await supabase
      .from('users')
      .update({ password: ADMIN.password, role: 'admin' })
      .eq('id', existing.id);
    if (error) { console.error('업데이트 실패:', error.message); return; }
    console.log('비밀번호 재설정 완료!');
  } else {
    // 2. 새 계정 생성
    const { error } = await supabase.from('users').insert({
      email: ADMIN.email,
      password: ADMIN.password,
      name: ADMIN.name,
      role: ADMIN.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('계정 생성 실패:', error.message);
      return;
    }
    console.log('어드민 계정 생성 완료!');
  }

  console.log('\n-----------------------------');
  console.log(`이메일:   ${ADMIN.email}`);
  console.log(`비밀번호: ${ADMIN.password}`);
  console.log('-----------------------------\n');
}

main().catch(console.error);
