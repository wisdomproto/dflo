// Apply migration 014 (children.treatment_status) via Supabase REST.
// PostgREST 는 DDL 안 받으니 supabase-js 의 rpc('exec_sql') 가 있을 때만 작동.
// 권한이 없으면 SQL 텍스트만 출력해서 사용자가 Dashboard 에 붙여넣기.

import { readFileSync } from 'node:fs';

const sql = readFileSync('./v4/scripts/migrations/014_children_treatment_status.sql', 'utf8');

const envTxt = readFileSync('./ai-server/.env', 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

console.log('=== Migration 014: children.treatment_status ===\n');
console.log('Supabase JS 클라이언트로는 DDL 직접 실행이 안 됩니다.');
console.log('아래 SQL 을 Supabase Dashboard → SQL Editor 에 붙여 넣고 Run 해주세요:\n');
console.log('-'.repeat(70));
console.log(sql);
console.log('-'.repeat(70));
console.log('\n적용 후 검증 쿼리:');
console.log("  SELECT treatment_status, COUNT(*) FROM children GROUP BY treatment_status;");
