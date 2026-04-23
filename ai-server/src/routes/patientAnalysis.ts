// POST /api/patient-analysis/:childId  → generate (or regenerate) analysis
// GET  /api/patient-analysis/:childId  → return cached analysis (404 if none)
//
// Data pipeline (POST):
//   1. Fetch child + intake + visits + measurements + prescriptions + labs
//      (via SERVICE_ROLE_KEY so RLS doesn't block clinical reads).
//   2. Build PatientAnalysisInput.
//   3. Call analyzePatient() → Gemini → structured JSON.
//   4. Upsert into patient_analyses.

import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { analyzePatient, type PatientAnalysisInput } from '../services/patientAnalyzer.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[patientAnalysis] Missing Supabase URL/KEY — routes will fail.');
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const patientAnalysisRouter = Router();

async function pageFiltered<T = Record<string, unknown>>(
  table: string,
  cols: string,
  childId: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from(table)
      .select(cols)
      .eq('child_id', childId)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return rows;
}

interface MedRow { id: string; code: string; name: string }

async function buildInput(childId: string): Promise<PatientAnalysisInput> {
  const { data: child, error: childErr } = await sb
    .from('children')
    .select('id, chart_number, name, gender, birth_date, father_height, mother_height, desired_height, nationality, intake_survey')
    .eq('id', childId)
    .single();
  if (childErr || !child) throw new Error(`child ${childId} not found: ${childErr?.message}`);

  type VRow = { id: string; visit_date: string; notes: string | null; is_intake: boolean };
  const visits = await pageFiltered<VRow>('visits', 'id, visit_date, notes, is_intake', childId);
  const nonIntakeVisits = visits.filter((v) => !v.is_intake).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const visitById = new Map(nonIntakeVisits.map((v) => [v.id, v]));

  type MRow = {
    visit_id: string;
    measured_date: string;
    height: number | null;
    weight: number | null;
    bone_age: number | null;
    pah: number | null;
  };
  const measRows = await pageFiltered<MRow>(
    'hospital_measurements',
    'visit_id, measured_date, height, weight, bone_age, pah',
    childId,
  );
  const measurements = measRows
    .filter((m) => visitById.has(m.visit_id))      // exclude intake-visit rows
    .map((m) => ({
      date: m.measured_date,
      height: m.height,
      weight: m.weight,
      bone_age: m.bone_age,
      pah: m.pah,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  type RxRaw = { medication_id: string; dose: string | null; duration_days: number | null; visit_id: string; created_at: string };
  const rxRows = await pageFiltered<RxRaw>(
    'prescriptions',
    'medication_id, dose, duration_days, visit_id, created_at',
    childId,
  );
  const medIds = Array.from(new Set(rxRows.map((r) => r.medication_id)));
  const meds: MedRow[] = [];
  for (let i = 0; i < medIds.length; i += 100) {
    const { data } = await sb.from('medications').select('id, code, name').in('id', medIds.slice(i, i + 100));
    if (data) meds.push(...(data as MedRow[]));
  }
  const medMap = new Map(meds.map((m) => [m.id, m]));

  // Aggregate prescriptions by medication
  const rxAgg = new Map<string, PatientAnalysisInput['prescriptions'][number]>();
  for (const r of rxRows) {
    const med = medMap.get(r.medication_id);
    if (!med) continue;
    const key = med.code;
    const visitDate = visitById.get(r.visit_id)?.visit_date ?? null;
    const existing = rxAgg.get(key);
    if (!existing) {
      rxAgg.set(key, {
        code: med.code,
        name: med.name,
        dose: r.dose,
        duration_days: r.duration_days,
        count: 1,
        first_date: visitDate,
        last_date: visitDate,
      });
    } else {
      existing.count += 1;
      if (visitDate && (!existing.first_date || visitDate < existing.first_date)) existing.first_date = visitDate;
      if (visitDate && (!existing.last_date || visitDate > existing.last_date)) existing.last_date = visitDate;
    }
  }
  const prescriptions = [...rxAgg.values()].sort((a, b) => b.count - a.count);

  type LabRow = {
    collected_date: string | null;
    test_type: string;
    result_data: Record<string, unknown> | null;
  };
  const labRows = await pageFiltered<LabRow>(
    'lab_tests',
    'collected_date, test_type, result_data',
    childId,
  );
  const labs = labRows
    .map((l) => {
      const pt = (l.result_data as { panel_type?: string } | null)?.panel_type || l.test_type;
      const flagged = (() => {
        const rows = (l.result_data as { rows?: Array<{ flag?: string; name?: string }> } | null)?.rows;
        if (!rows) return [];
        return rows
          .filter((r) => r.flag && r.flag !== 'N' && r.flag !== 'normal' && r.flag !== '')
          .map((r) => r.name || '')
          .filter(Boolean)
          .slice(0, 6);
      })();
      return { date: l.collected_date, panel_type: pt, flagged };
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    child: {
      chart_number: child.chart_number ?? '',
      name: child.name ?? '',
      gender: (child.gender as 'male' | 'female' | null) ?? null,
      birth_date: child.birth_date ?? '',
      father_height: child.father_height ?? null,
      mother_height: child.mother_height ?? null,
      desired_height: child.desired_height ?? null,
      nationality: (child.nationality as 'KR' | 'CN' | null) ?? 'KR',
      intake_survey: (child.intake_survey as Record<string, unknown> | null) ?? null,
    },
    measurements,
    visits: nonIntakeVisits.map((v) => ({ date: v.visit_date, notes: v.notes })),
    prescriptions,
    labs,
  };
}

patientAnalysisRouter.get('/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId ?? '');
  if (!childId) return res.status(400).json({ success: false, error: 'childId required' });
  const { data, error } = await sb
    .from('patient_analyses')
    .select('data, model, generated_at')
    .eq('child_id', childId)
    .maybeSingle();
  if (error) return res.status(500).json({ success: false, error: error.message });
  if (!data) return res.status(404).json({ success: false, error: 'not_found' });
  res.json({ success: true, ...data });
});

patientAnalysisRouter.post('/:childId', async (req: Request, res: Response) => {
  const childId = String(req.params.childId ?? '');
  if (!childId) return res.status(400).json({ success: false, error: 'childId required' });
  try {
    const input = await buildInput(childId);
    const { analysis, model } = await analyzePatient(input);
    const now = new Date().toISOString();
    const { error } = await sb
      .from('patient_analyses')
      .upsert({ child_id: childId, data: analysis, model, generated_at: now }, { onConflict: 'child_id' });
    if (error) throw error;
    res.json({ success: true, data: analysis, model, generated_at: now });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[patientAnalysis] POST failed', e);
    res.status(500).json({ success: false, error: msg });
  }
});
