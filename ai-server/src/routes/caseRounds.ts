// routes/caseRounds.ts — 치료사례 카드에서 지운 뼈나이 회차(측정일)를 treatment_cases.excluded_dates 에 저장.
//   admin/cases 카드(케이스후보) 의 ✕ 버튼이 호출. case-story 와 동일하게 dev(localhost) 내부 도구 + PIN 게이트.
//   treatment_cases 는 PHI(chart·측정일)라 anon 정책 없음(070) → service_role 로만 접근.
//   excluded_dates 만 write(snapshot 은 gen 소유) — 재시드 시 관리자 편집이 보존되도록 소유 분리.
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const PIN = process.env.WEBSITE_ADMIN_PIN || '8054';

export const caseRoundsRouter = Router();

// 저장 — chart 단위로 제외 회차 목록 전체 교체(카드가 union 을 보내므로 덮어쓰기가 맞다).
caseRoundsRouter.post('/', async (req, res) => {
  if ((req.headers['x-admin-pin'] || '') !== PIN) return res.status(401).json({ error: 'unauthorized' });
  const { chart, excludedDates } = (req.body ?? {}) as { chart?: string; excludedDates?: unknown[] };
  if (!chart) return res.status(400).json({ error: 'chart required' });
  const dates = Array.isArray(excludedDates) ? excludedDates.map(String) : [];
  // upsert: chart_number 충돌 시 excluded_dates/updated_at 만 갱신 → snapshot 은 건드리지 않는다.
  const { error } = await sb
    .from('treatment_cases')
    .upsert({ chart_number: String(chart), excluded_dates: dates, updated_at: new Date().toISOString() }, { onConflict: 'chart_number' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
