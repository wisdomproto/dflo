// routes/treatmentCases.ts — 치료사례 환자용 공개 목록 + 원장 승인 토글.
//   GET  /            환자용 목록: published + 비식별 snapshot 만 반환. PIN(설문 후 안내) 서버측 게이트. chart_number 미반환.
//   POST /publish     원장 승인 토글(공개/비공개). x-admin-pin 게이트.
//   treatment_cases 는 PHI라 anon 정책 없음(070) → service_role 로만 접근. published 는 admin 소유(gen 재시드가 안 건드림).
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const ADMIN_PIN = process.env.WEBSITE_ADMIN_PIN || '8054';
const SHOWCASE_PIN = process.env.CASE_SHOWCASE_PIN || '8054';

export const treatmentCasesRouter = Router();

// 환자용 목록 — 승인된 케이스의 비식별 snapshot 만. PIN 틀리면 아무것도 안 준다(미승인 케이스는 애초에 제외).
treatmentCasesRouter.get('/', async (req, res) => {
  const pin = (req.query.pin as string) || (req.headers['x-showcase-pin'] as string) || '';
  if (String(pin) !== SHOWCASE_PIN) return res.status(401).json({ error: 'unauthorized' });
  const { data, error } = await sb.from('treatment_cases').select('snapshot').eq('published', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cases: (data ?? []).map((r) => r.snapshot).filter(Boolean) });
});

// 편집 상태 전체 조회 — admin/cases 가 새로고침 시 DB 편집을 반영(hydrate)하는 용도. x-admin-pin.
treatmentCasesRouter.get('/edits', async (req, res) => {
  const pin = (req.query.pin as string) || (req.headers['x-admin-pin'] as string) || '';
  if (String(pin) !== ADMIN_PIN) return res.status(401).json({ error: 'unauthorized' });
  const { data, error } = await sb.from('treatment_cases').select('chart_number, excluded_dates, overrides, published');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ edits: data ?? [] });
});

// 데이터 보정(부모 키 등) — overrides jsonb 에 read-merge-write. children(진료기록)은 안 건드림.
//   body: { chart, overrides: { father?, mother? } }  — null/빈값은 해당 키 삭제(원본으로 복귀).
treatmentCasesRouter.post('/override', async (req, res) => {
  if ((req.headers['x-admin-pin'] || '') !== ADMIN_PIN) return res.status(401).json({ error: 'unauthorized' });
  const { chart, overrides } = (req.body ?? {}) as { chart?: string; overrides?: Record<string, unknown> };
  if (!chart) return res.status(400).json({ error: 'chart required' });
  const patch = overrides && typeof overrides === 'object' ? overrides : {};
  const { data } = await sb.from('treatment_cases').select('overrides').eq('chart_number', String(chart)).maybeSingle();
  const existing = (data?.overrides as Record<string, unknown>) || {};
  const merged: Record<string, unknown> = { ...existing, ...patch };
  // boneAges 는 회차별 맵이라 한 회차 수정이 나머지를 덮지 않게 깊은 병합(값 null = 그 회차 교정 취소).
  if (patch.boneAges && typeof patch.boneAges === 'object') {
    const ba: Record<string, unknown> = { ...((existing.boneAges as Record<string, unknown>) || {}), ...(patch.boneAges as Record<string, unknown>) };
    for (const d of Object.keys(ba)) if (ba[d] === null || ba[d] === '') delete ba[d];
    merged.boneAges = ba;
  }
  for (const k of Object.keys(merged)) if (merged[k] === null || merged[k] === '') delete merged[k];
  const { error } = await sb
    .from('treatment_cases')
    .upsert({ chart_number: String(chart), overrides: merged, updated_at: new Date().toISOString() }, { onConflict: 'chart_number' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, overrides: merged });
});

// 원장 승인 토글 — published 만 write(snapshot·excluded_dates 는 안 건드림).
treatmentCasesRouter.post('/publish', async (req, res) => {
  if ((req.headers['x-admin-pin'] || '') !== ADMIN_PIN) return res.status(401).json({ error: 'unauthorized' });
  const { chart, published } = (req.body ?? {}) as { chart?: string; published?: boolean };
  if (!chart) return res.status(400).json({ error: 'chart required' });
  const { error } = await sb
    .from('treatment_cases')
    .upsert({ chart_number: String(chart), published: !!published, updated_at: new Date().toISOString() }, { onConflict: 'chart_number' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, published: !!published });
});
