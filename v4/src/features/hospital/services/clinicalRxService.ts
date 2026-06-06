const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export interface RxReference {
  pmid?: string;
  title: string;
  journal?: string;
  year?: number | null;
  url?: string;
  pop_group?: string;
  pop_confidence?: string;
  similarity?: number;
}

export interface RxRecommendation {
  recommendation: string;
  references: RxReference[];
}

export async function recommendRx(p: {
  childId?: string;
  labText?: string;
  profileText?: string;
}): Promise<RxRecommendation> {
  const res = await fetch(`${BASE}/api/knowledge/rx-recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `추천 실패: ${res.status}`);
  return {
    recommendation: b.recommendation as string,
    references: (b.references ?? []) as RxReference[],
  };
}
