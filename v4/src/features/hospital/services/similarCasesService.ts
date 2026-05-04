// ai-server `/api/similar-cases/:childId` 호출
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const API_KEY = import.meta.env.VITE_AI_API_KEY ?? '';

export interface SimilarMatch {
  child_id: string;
  similarity: number;
  chart_number: string | null;
  name: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  first_visit_date: string | null;
  last_visit_date: string | null;
  first_height: number | null;
  last_height: number | null;
  first_pah: number | null;
  last_pah: number | null;
  pah_delta: number | null;
  visits: number;
  top_medications: { name: string; count: number }[];
}

export async function fetchSimilarCases(
  childId: string,
  k = 5,
): Promise<SimilarMatch[]> {
  const res = await fetch(`${BASE}/api/similar-cases/${childId}?k=${k}`, {
    headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? '유사 케이스 검색 실패');
  }
  const json = (await res.json()) as { matches: SimilarMatch[] };
  return json.matches ?? [];
}

export async function buildEmbedding(childId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/embeddings/build/${childId}`, {
    method: 'POST',
    headers: API_KEY ? { 'x-api-key': API_KEY } : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? '임베딩 생성 실패');
  }
}
