// Client for the ai-server patient analysis endpoint.

export interface PatientAnalysisData {
  summary: string;
  problem: string;
  intervention: string[];
  outcome: string;
  response_level: 'excellent' | 'good' | 'moderate' | 'poor' | 'insufficient_data';
  treatment_phase: '초기' | '유지' | '마무리' | '종료' | '일회성' | '불명';
  sub_categories: string[];
  risk_flags: string[];
  key_findings: string[];
  growth_metrics?: {
    initial_height_cm?: number | null;
    latest_height_cm?: number | null;
    total_growth_cm?: number | null;
    follow_up_months?: number | null;
    initial_bone_age?: number | null;
    latest_bone_age?: number | null;
    bone_age_progression_years?: number | null;
  };
}

export interface CachedAnalysis {
  data: PatientAnalysisData;
  model: string | null;
  generated_at: string;
}

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export async function fetchAnalysis(childId: string): Promise<CachedAnalysis | null> {
  const res = await fetch(`${BASE}/api/patient-analysis/${childId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchAnalysis failed: ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'fetchAnalysis failed');
  return { data: body.data, model: body.model, generated_at: body.generated_at };
}

export async function generateAnalysis(childId: string): Promise<CachedAnalysis> {
  const res = await fetch(`${BASE}/api/patient-analysis/${childId}`, { method: 'POST' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error || `generate failed: ${res.status}`);
  return { data: body.data, model: body.model, generated_at: body.generated_at };
}
