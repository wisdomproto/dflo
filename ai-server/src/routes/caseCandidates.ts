// 치료사례 후보 전체 상세(PHI) — prod admin 페이지(/admin/cases)에서 동적 조회.
// 데이터: case_candidates_doc 테이블(RLS 전면 차단, service_role 만 접근). 로컬 gen_case_profiles.mjs 가 적재.
// 인증: admin 로그인 정보(users 테이블 email+password, role admin/doctor)를 헤더로 받아 서버에서 재검증.
//   ⚠️ service_role 키 필요 — SUPABASE_SERVICE_ROLE_KEY 가 진짜 service_role 이어야 RLS 차단 테이블 + users 조회 가능.
import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const caseCandidatesRouter = Router();

// lazy — import-time createClient 가 env 없는 환경(테스트)에서 throw 하지 않도록.
let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) _sb = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } });
  return _sb;
}

async function isAdmin(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const { data, error } = await sb()
    .from('users')
    .select('role')
    .eq('email', email)
    .eq('password', password)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'admin' || data.role === 'doctor';
}

// GET /api/case-candidates — admin 인증 후 전체 상세 HTML 반환.
caseCandidatesRouter.get('/', async (req, res) => {
  const email = String(req.headers['x-admin-email'] || '');
  const password = String(req.headers['x-admin-password'] || '');
  if (!(await isAdmin(email, password))) return res.status(401).json({ error: 'unauthorized' });

  const { data, error } = await sb()
    .from('case_candidates_doc')
    .select('html, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.html) return res.status(404).json({ error: 'not_generated', message: '로컬에서 node cases/gen_case_profiles.mjs 실행 후 DB 적재 필요' });
  res.json({ html: data.html, updatedAt: data.updated_at });
});
