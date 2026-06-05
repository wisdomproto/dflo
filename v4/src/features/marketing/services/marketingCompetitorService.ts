// src/features/marketing/services/marketingCompetitorService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// 경쟁사 도구 전용 타입 (types.ts 미수정 — 여기 co-locate).
export type CompetitorKind = 'direct' | 'indirect';

export interface GapItem {
  topic: string;
  monthlySearch: number;
  competitors: string[];
  difficulty: string;
  priority: string;
}

export interface StrengthItem {
  topic: string;
  monthlySearch: number;
  note: string;
}

export interface CompetitorAnalysis {
  gaps: GapItem[];
  strengths: StrengthItem[];
  analyzedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  url: string;
  kind: CompetitorKind;
  memo: string;
  analysis: CompetitorAnalysis | null;
  createdAt: string;
}

// Keep field lists in sync: 025 migration columns ↔ competitorToRow ↔ rowToCompetitor ↔ Competitor.
type Row = Record<string, unknown>;

function normKind(k: unknown): CompetitorKind {
  return k === 'indirect' ? 'indirect' : 'direct';
}

function normAnalysis(a: unknown): CompetitorAnalysis | null {
  if (!a || typeof a !== 'object') return null;
  const o = a as Record<string, unknown>;
  return {
    gaps: Array.isArray(o.gaps) ? (o.gaps as GapItem[]) : [],
    strengths: Array.isArray(o.strengths) ? (o.strengths as StrengthItem[]) : [],
    analyzedAt: (o.analyzedAt as string) ?? '',
  };
}

function rowToCompetitor(r: Row): Competitor {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    url: (r.url as string) ?? '',
    kind: normKind(r.kind),
    memo: (r.memo as string) ?? '',
    analysis: normAnalysis(r.analysis),
    createdAt: (r.created_at as string) ?? '',
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
// 제공된 키만 emit — 부분 patch(update)가 미지정 컬럼을 기본값으로 덮어쓰지 않도록.
function competitorToRow(c: Partial<Competitor>): Row {
  const row: Row = { updated_at: new Date().toISOString() };
  if (c.name !== undefined) row.name = c.name;
  if (c.url !== undefined) row.url = c.url ?? null;
  if (c.kind !== undefined) row.kind = c.kind;
  if (c.memo !== undefined) row.memo = c.memo ?? null;
  return row;
}

export async function fetchCompetitors(): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('marketing_competitors')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    logger.warn('[marketing] fetchCompetitors failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToCompetitor(r as Row));
}

export async function addCompetitor(
  input: { name: string; url?: string; kind?: CompetitorKind; memo?: string },
): Promise<Competitor> {
  const row = competitorToRow({
    name: input.name,
    url: input.url ?? '',
    kind: input.kind ?? 'direct',
    memo: input.memo ?? '',
  });
  const { data, error } = await supabase
    .from('marketing_competitors')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCompetitor(data as Row);
}

export async function updateCompetitor(
  id: string,
  patch: Partial<Pick<Competitor, 'name' | 'url' | 'kind' | 'memo'>>,
): Promise<Competitor> {
  const row = competitorToRow(patch);
  const { data, error } = await supabase
    .from('marketing_competitors')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCompetitor(data as Row);
}

export async function deleteCompetitor(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_competitors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// 갭/강점 분석 결과를 해당 경쟁사 행에 jsonb 스냅샷으로 저장 (리로드 후에도 표시).
export async function saveAnalysis(
  id: string,
  analysis: { gaps: GapItem[]; strengths: StrengthItem[]; analyzedAt: string },
): Promise<void> {
  const { error } = await supabase
    .from('marketing_competitors')
    .update({ analysis, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// Gemini 게이트 — ai-server가 marketing_config(id=1)를 grounding으로 읽어 갭/강점 JSON 반환.
export async function runGapAnalysis(
  competitors: Array<{ name: string; url?: string; kind?: CompetitorKind }>,
): Promise<{ gaps: GapItem[]; strengths: StrengthItem[] }> {
  const res = await fetch(`${BASE}/api/marketing/competitor-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ competitors }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `분석 실패: ${res.status}`);
  return {
    gaps: Array.isArray(body.gaps) ? (body.gaps as GapItem[]) : [],
    strengths: Array.isArray(body.strengths) ? (body.strengths as StrengthItem[]) : [],
  };
}
