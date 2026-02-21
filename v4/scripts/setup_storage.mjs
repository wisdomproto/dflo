// ================================================
// Supabase Storage 버킷 생성 스크립트
// content-images 버킷 + public 접근 정책
// 실행: node scripts/setup_storage.mjs
// ================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 에서 환경변수 읽기
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [key, ...vals] = line.split('=');
  if (key?.trim()) env[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env['service_role key'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or "service_role key" in .env.local');
  process.exit(1);
}

// service_role key로 연결 (RLS 우회 → 버킷 생성 가능)
const supabase = createClient(supabaseUrl, serviceRoleKey);

const BUCKET_NAME = 'content-images';

async function setup() {
  console.log('=== Supabase Storage 버킷 설정 ===\n');

  // 1. 기존 버킷 목록 확인
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('버킷 목록 조회 실패:', listError.message);
    process.exit(1);
  }

  console.log('현재 버킷:', buckets.map((b) => b.name).join(', ') || '(없음)');

  // 2. 버킷 존재 여부 확인
  const exists = buckets.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(`\n"${BUCKET_NAME}" 버킷이 이미 존재합니다.`);
  } else {
    // 3. 새 버킷 생성 (public)
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    if (error) {
      console.error('버킷 생성 실패:', error.message);
      // RLS 권한 문제일 수 있음 → SQL로 직접 생성 안내
      console.log('\n** 서비스 역할 키(service_role key) 필요. Supabase 대시보드에서 직접 생성하세요:');
      console.log('   Storage → New bucket → "content-images" → Public → 5MB 제한');
      console.log('   Allowed MIME: image/jpeg, image/png, image/webp, image/gif\n');
      process.exit(1);
    }

    console.log(`\n"${BUCKET_NAME}" 버킷 생성 완료!`, data);
  }

  // 4. 테스트: 버킷 접근 확인
  const { data: files, error: filesError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 5 });
  if (filesError) {
    console.log('\n버킷 접근 테스트 실패:', filesError.message);
  } else {
    console.log(`\n버킷 접근 OK (파일 ${files.length}개)`);
  }

  // 5. Public URL 형식 안내
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`;
  console.log('\nPublic URL 패턴:', publicUrl + '{폴더}/{파일명}');
  console.log('\n예시:');
  console.log(`  레시피 이미지: ${publicUrl}recipes/recipe-001.jpg`);
  console.log(`  가이드 이미지: ${publicUrl}guides/guide-001.jpg`);

  console.log('\n=== 설정 완료 ===');
}

setup().catch(console.error);
