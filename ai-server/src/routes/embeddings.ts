// ================================================
// /api/embeddings/* — 환자 RAG 임베딩
//
// POST /api/embeddings/build/:childId    한 명 임베딩 (재)생성
// POST /api/embeddings/build-all         모든 환자 배치 (skipExisting 옵션)
// ================================================

import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { buildAndStoreEmbedding } from '../services/embedder.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const embeddingsRouter = Router();

embeddingsRouter.post('/build/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId);
  try {
    const result = await buildAndStoreEmbedding(childId);
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[embeddings/build]', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * Bulk batch — 환자 244명 1회 임베딩.
 * Gemini text-embedding-004 quota: per-minute rate limit 가 있어 배치 간격 0.4s.
 * Body: { skipExisting?: boolean (default true) }
 *       skipExisting=true 면 patient_embeddings 에 이미 있는 환자는 건너뜀.
 */
embeddingsRouter.post('/build-all', async (req: Request, res: Response) => {
  const skipExisting = req.body?.skipExisting !== false;

  try {
    // 1) 모든 children id
    const { data: children, error: cErr } = await sb
      .from('children')
      .select('id, chart_number, name')
      .eq('is_active', true);
    if (cErr) throw cErr;
    const all: { id: string; chart_number: string; name: string }[] = (children ?? []) as never;

    // 2) 이미 임베딩된 set
    const existing = new Set<string>();
    if (skipExisting) {
      const { data: rows, error: eErr } = await sb
        .from('patient_embeddings')
        .select('child_id');
      if (eErr) throw eErr;
      for (const r of (rows ?? []) as { child_id: string }[]) existing.add(r.child_id);
    }

    const todo = all.filter((c) => !existing.has(c.id));

    let ok = 0;
    let fail = 0;
    const failures: { chart_number: string; error: string }[] = [];

    // 3) 직렬 + 짧은 sleep (rate limit)
    for (const c of todo) {
      try {
        await buildAndStoreEmbedding(c.id);
        ok += 1;
      } catch (e) {
        fail += 1;
        failures.push({ chart_number: c.chart_number, error: e instanceof Error ? e.message : 'unknown' });
      }
      // 0.4s 간격 — Gemini free tier 안전 마진
      await new Promise((r) => setTimeout(r, 400));
    }

    res.json({
      success: true,
      total: all.length,
      skipped: all.length - todo.length,
      processed: todo.length,
      ok,
      fail,
      failures: failures.slice(0, 20),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[embeddings/build-all]', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
