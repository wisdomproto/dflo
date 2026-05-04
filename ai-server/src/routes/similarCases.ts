// ================================================
// /api/similar-cases/:childId  — 비슷한 환자 top-k 검색
// pgvector 의 cosine distance (`<=>`) 활용.
// ================================================

import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const similarCasesRouter = Router();

interface SimilarChildRow {
  child_id: string;
  similarity: number;
  // children fields
  chart_number?: string | null;
  name?: string | null;
  gender?: 'male' | 'female';
  birth_date?: string;
}

similarCasesRouter.get('/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId);
  const k = Math.max(1, Math.min(20, parseInt(String(req.query.k ?? '5'), 10) || 5));

  try {
    // 1) target embedding
    const { data: target, error: tErr } = await sb
      .from('patient_embeddings')
      .select('embedding')
      .eq('child_id', childId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: '이 환자의 임베딩이 없습니다. 먼저 build 하세요.' });
    }

    // 2) cosine top-k via RPC. pgvector 의 `<=>` 는 cosine distance (낮을수록 비슷).
    //    similarity = 1 - distance.
    //    PostgREST 직접으로는 vector 연산 표현이 어려워 RPC 권장.
    //    여기선 supabase-js 의 .rpc('match_patient_embeddings', ...) 를 호출.
    const { data: matches, error: mErr } = await sb.rpc('match_patient_embeddings', {
      query_child_id: childId,
      match_count: k,
    });
    if (mErr) throw mErr;

    const rows = (matches ?? []) as Array<{
      child_id: string;
      similarity: number;
      source_text: string;
    }>;

    if (rows.length === 0) {
      return res.json({ success: true, target_child_id: childId, matches: [] });
    }

    // 3) 매칭된 child 들의 인구학 정보 + visit/measurement 요약 가져오기
    const ids = rows.map((r) => r.child_id);
    const { data: kids, error: kErr } = await sb
      .from('children')
      .select(
        'id, chart_number, name, gender, birth_date, treatment_status',
      )
      .in('id', ids);
    if (kErr) throw kErr;
    interface KidRow {
      id: string;
      chart_number: string | null;
      name: string | null;
      gender: 'male' | 'female';
      birth_date: string;
      treatment_status: string | null;
    }
    const kidList = (kids ?? []) as KidRow[];

    // 첫·마지막 측정 (PAH 변화 outcome)
    const { data: meas, error: meErr } = await sb
      .from('hospital_measurements')
      .select('child_id, measured_date, height, bone_age, pah')
      .in('child_id', ids)
      .order('measured_date', { ascending: true });
    if (meErr) throw meErr;
    const measByChild = new Map<string, Array<{ measured_date: string; height: number | null; bone_age: number | null; pah: number | null }>>();
    for (const m of (meas ?? []) as Array<{ child_id: string; measured_date: string; height: number | null; bone_age: number | null; pah: number | null }>) {
      if (!measByChild.has(m.child_id)) measByChild.set(m.child_id, []);
      measByChild.get(m.child_id)!.push(m);
    }

    // visits count
    const { data: visits, error: vErr } = await sb
      .from('visits')
      .select('child_id, is_intake')
      .in('child_id', ids);
    if (vErr) throw vErr;
    const visitsCount = new Map<string, number>();
    for (const v of (visits ?? []) as { child_id: string; is_intake: boolean | null }[]) {
      if (v.is_intake) continue;
      visitsCount.set(v.child_id, (visitsCount.get(v.child_id) || 0) + 1);
    }

    // prescriptions top
    const { data: pres, error: pErr } = await sb
      .from('prescriptions')
      .select('child_id, medication_id')
      .in('child_id', ids);
    if (pErr) throw pErr;
    const presByChild = new Map<string, Map<string, number>>();
    for (const p of (pres ?? []) as { child_id: string; medication_id: string }[]) {
      if (!presByChild.has(p.child_id)) presByChild.set(p.child_id, new Map());
      const m = presByChild.get(p.child_id)!;
      m.set(p.medication_id, (m.get(p.medication_id) || 0) + 1);
    }
    // medication name lookup
    const allMedIds = [
      ...new Set(
        [...presByChild.values()].flatMap((m) => [...m.keys()]),
      ),
    ];
    const medMap = new Map<string, string>();
    if (allMedIds.length) {
      const { data: meds } = await sb
        .from('medications')
        .select('id, name')
        .in('id', allMedIds);
      for (const m of (meds ?? []) as { id: string; name: string }[]) medMap.set(m.id, m.name);
    }

    // assemble result
    const out = rows.map((r) => {
      const kid = kidList.find((k) => k.id === r.child_id);
      const ms = measByChild.get(r.child_id) ?? [];
      const first = ms[0];
      const last = ms[ms.length - 1];
      // PAH 변화 outcome
      const firstPah = ms.find((m) => m.pah && m.pah > 0)?.pah ?? null;
      const lastPah = [...ms].reverse().find((m) => m.pah && m.pah > 0)?.pah ?? null;
      const presMap = presByChild.get(r.child_id) ?? new Map<string, number>();
      const topMeds = [...presMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, c]) => ({ name: medMap.get(id) ?? id, count: c }));

      return {
        child_id: r.child_id,
        similarity: r.similarity,
        chart_number: kid?.chart_number ?? null,
        name: kid?.name ?? null,
        gender: kid?.gender ?? null,
        birth_date: kid?.birth_date ?? null,
        // outcome metric: PAH 변화
        first_visit_date: first?.measured_date ?? null,
        last_visit_date: last?.measured_date ?? null,
        first_height: first?.height ?? null,
        last_height: last?.height ?? null,
        first_pah: firstPah,
        last_pah: lastPah,
        pah_delta: firstPah != null && lastPah != null
          ? Math.round((lastPah - firstPah) * 10) / 10
          : null,
        visits: visitsCount.get(r.child_id) ?? 0,
        top_medications: topMeds,
      };
    });

    res.json({ success: true, target_child_id: childId, matches: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[similar-cases]', msg);
    res.status(500).json({ success: false, error: msg });
  }
});
