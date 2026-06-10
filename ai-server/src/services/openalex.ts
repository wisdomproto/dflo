export interface OpenAlexWork {
  openalexId: string; doi: string; year: number | null; citedByCount: number;
  type: string; sourceId: string; issn: string; journalName: string;
}
export interface OpenAlexSourceStats { ifProxy: number | null; hIndex: number | null; }

const strip = (url: string | null | undefined, prefix: string) => (url ?? '').replace(prefix, '');

export function parseOpenAlexWork(j: any): OpenAlexWork {
  const src = j?.primary_location?.source ?? {};
  const issn = src.issn_l || (Array.isArray(src.issn) ? src.issn[0] : '') || '';
  return {
    openalexId: strip(j?.id, 'https://openalex.org/'),
    doi: strip(j?.doi, 'https://doi.org/'),
    year: typeof j?.publication_year === 'number' ? j.publication_year : null,
    citedByCount: Number(j?.cited_by_count ?? 0),
    type: String(j?.type ?? ''),
    sourceId: strip(src.id, 'https://openalex.org/'),
    issn,
    journalName: String(src.display_name ?? ''),
  };
}

export function parseOpenAlexSource(j: any): OpenAlexSourceStats {
  const s = j?.summary_stats ?? {};
  const ifp = s['2yr_mean_citedness'];
  return {
    ifProxy: typeof ifp === 'number' ? ifp : null,
    hIndex: typeof s.h_index === 'number' ? s.h_index : null,
  };
}

const OA = 'https://api.openalex.org';
const sourceCache = new Map<string, OpenAlexSourceStats>();

/** PMID → OpenAlex work 메트릭 + 저널 if_proxy(소스 캐시). 못 찾으면 null. */
export async function fetchOpenAlexByPmid(
  pmid: string, mailto = '',
): Promise<(OpenAlexWork & OpenAlexSourceStats) | null> {
  const m = mailto ? `&mailto=${encodeURIComponent(mailto)}` : '';
  const r = await fetch(`${OA}/works/pmid:${pmid}?select=id,doi,publication_year,cited_by_count,type,primary_location${m}`);
  if (!r.ok) return null;
  const work = parseOpenAlexWork(await r.json());
  let stats: OpenAlexSourceStats = { ifProxy: null, hIndex: null };
  if (work.sourceId) {
    const cached = sourceCache.get(work.sourceId);
    if (cached) stats = cached;
    else {
      const sr = await fetch(`${OA}/sources/${work.sourceId}?select=summary_stats${m}`);
      if (sr.ok) { stats = parseOpenAlexSource(await sr.json()); sourceCache.set(work.sourceId, stats); }
    }
  }
  return { ...work, ...stats };
}
