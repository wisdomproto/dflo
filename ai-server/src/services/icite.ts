export interface ICiteMetric { rcr: number | null; citationCount: number; isResearchArticle: boolean; }

export function parseICite(j: any): Map<string, ICiteMetric> {
  const out = new Map<string, ICiteMetric>();
  const data = Array.isArray(j?.data) ? j.data : [];
  for (const d of data) {
    const pmid = String(d?.pmid ?? '');
    if (!pmid) continue;
    const rcrRaw = d?.relative_citation_ratio;
    const ira = d?.is_research_article;
    out.set(pmid, {
      rcr: typeof rcrRaw === 'number' ? rcrRaw : null,
      citationCount: Number(d?.citation_count ?? 0),
      isResearchArticle: ira === true || ira === 'Yes' || ira === 'yes',
    });
  }
  return out;
}

const ICITE = 'https://icite.od.nih.gov/api/pubs';

/** PMID 배열 → RCR/피인용 맵. 400개씩 배치. 실패 배치는 skip. */
export async function fetchICite(pmids: string[]): Promise<Map<string, ICiteMetric>> {
  const merged = new Map<string, ICiteMetric>();
  const BATCH = 400;
  for (let i = 0; i < pmids.length; i += BATCH) {
    const slice = pmids.slice(i, i + BATCH);
    if (!slice.length) continue;
    try {
      const r = await fetch(`${ICITE}?pmids=${slice.join(',')}`);
      if (!r.ok) continue;
      const part = parseICite(await r.json());
      for (const [k, v] of part) merged.set(k, v);
    } catch { /* skip batch */ }
  }
  return merged;
}
