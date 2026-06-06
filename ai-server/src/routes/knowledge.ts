import { Router, type Request, type Response } from 'express';
import { searchKnowledge } from '../services/knowledgeRetrieval.js';
import { buildRxPrompt } from '../services/rxRecommend.js';
import { annotateMedName } from '../services/medLegend.js';
import { generateText } from '../services/gemini.js';
import { createClient } from '@supabase/supabase-js';

const sbK = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '', { auth: { persistSession: false } });

export const knowledgeRouter = Router();

// POST /api/knowledge/search { query, kPapers?, kInsights? } → { papers, insights }
knowledgeRouter.post('/search', async (req: Request, res: Response) => {
  const query = String(req.body?.query ?? '').trim();
  if (!query) return res.status(400).json({ success: false, error: 'query required' });
  try {
    const result = await searchKnowledge(query, { kPapers: req.body?.kPapers, kInsights: req.body?.kInsights });
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] search failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// POST /api/knowledge/rx-recommend { childId?, labText?, profileText? }
knowledgeRouter.post('/rx-recommend', async (req: Request, res: Response) => {
  const { childId, labText: manualLab, profileText: manualProfile } = req.body ?? {};
  if (!childId && !manualLab) return res.status(400).json({ success: false, error: 'childId 또는 labText 필요' });
  try {
    let profile = String(manualProfile ?? '').trim();
    let labText = String(manualLab ?? '').trim();
    // childId 주어지면 DB에서 보강
    if (childId) {
      const { data: child } = await sbK.from('children').select('gender,birth_date,father_height,mother_height,intake_survey').eq('id', childId).maybeSingle();
      const { data: ms } = await sbK.from('hospital_measurements').select('height,weight,bone_age,pah,measured_date').eq('child_id', childId).order('measured_date', { ascending: false }).limit(1);
      const m0: any = ms?.[0] || {};
      if (!profile && child) {
        const age = child.birth_date ? ((Date.now() - new Date(child.birth_date).getTime()) / 3.15576e10).toFixed(1) : '?';
        profile = `${age}세 ${child.gender}, 키 ${m0.height ?? '?'}cm, 체중 ${m0.weight ?? '?'}kg, 뼈나이 ${m0.bone_age ?? '?'}, PAH ${m0.pah ?? '?'}cm, 부 ${child.father_height ?? '?'}/모 ${child.mother_height ?? '?'}`;
      }
      if (!labText) {
        const { data: labs } = await sbK.from('lab_tests').select('test_type,result_data').eq('child_id', childId);
        labText = (labs ?? []).map((l: any) => `[${l.test_type}] ${JSON.stringify(l.result_data).slice(0, 900)}`).join('\n');
      }
    }
    // cohort top meds (전체 처방 빈도 상위) + legend 주석
    const { data: legend } = await sbK.from('medication_legend').select('display_name,generic_name,drug_class,is_growth_core,is_non_drug');
    const { data: meds } = await sbK.from('medications').select('id,name');
    const nameById: Record<string, string> = Object.fromEntries((meds ?? []).map((m: any) => [m.id, m.name]));
    const freq: Record<string, number> = {};
    for (let f = 0; ; f += 1000) {
      const { data } = await sbK.from('prescriptions').select('medication_id').range(f, f + 999);
      if (!data?.length) break;
      data.forEach((r: any) => { if (r.medication_id) freq[r.medication_id] = (freq[r.medication_id] || 0) + 1; });
      if (data.length < 1000) break;
    }
    const cohortMeds = Object.entries(freq).sort((a, b) => b[1] - a[1])
      .map(([id]) => nameById[id]).filter(Boolean)
      .filter((n) => !annotateMedName(n, legend ?? []).includes('non_drug'))
      .slice(0, 15).map((n) => annotateMedName(n, legend ?? []));
    // 근거 논문 검색
    const { papers } = await searchKnowledge(`${profile} ${labText}`.slice(0, 1500), { kPapers: 5, kInsights: 0 });
    const prompt = buildRxPrompt({ profile, labText, cohortMeds, papers });
    const recommendation = (await generateText(prompt)).trim();
    res.json({ success: true, recommendation, references: papers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] rx-recommend failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
