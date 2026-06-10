// ai-server/src/services/evidenceMatch.ts
// 블로그 근거 논문 매칭의 순수 로직 — 임베딩·DB 를 모른다(정렬·필터·슬라이스·필드 리네임만).

export interface ScoredPaper {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;
  sim: number;
}

export interface BlogReference {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;
  similarity: number;
}

/** 코사인 유사도. 빈 배열·길이 불일치는 0. */
export function cosineSim(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** sim 내림차순 → threshold 이상 → 상위 topN → BlogReference 매핑(sim→similarity). */
export function selectReferences(
  scored: ScoredPaper[],
  opts: { threshold: number; topN: number },
): BlogReference[] {
  const { threshold, topN } = opts;
  return [...scored]
    .filter((s) => s.sim >= threshold)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topN)
    .map((s) => ({
      pmid: s.pmid, title: s.title, journal: s.journal, year: s.year,
      doi: s.doi, url: s.url, similarity: Number(s.sim.toFixed(4)),
    }));
}
