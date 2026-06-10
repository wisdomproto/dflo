// ai-server/src/services/pubmed.ts
export interface PubmedArticle {
  pmid: string; title: string; abstract: string; year: number | null; journal: string; affiliation: string;
  doi: string; publicationTypes: string[];
}
const between = (s: string, tagOpen: RegExp, tagClose: string): string | null => {
  const m = s.match(tagOpen); if (!m) return null;
  const start = m.index! + m[0].length; const end = s.indexOf(tagClose, start);
  return end === -1 ? null : s.slice(start, end);
};
const strip = (s: string) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/\s+/g, ' ').trim();

export function parsePubmedXml(xml: string): PubmedArticle[] {
  const out: PubmedArticle[] = [];
  const blocks = xml.split('<PubmedArticle>').slice(1);
  for (const b of blocks) {
    const pmid = strip(between(b, /<PMID[^>]*>/, '</PMID>') ?? '');
    const title = strip(between(b, /<ArticleTitle[^>]*>/, '</ArticleTitle>') ?? '');
    const absParts = [...b.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => strip(m[1]));
    const abstract = absParts.join(' ');
    const yearStr = strip(between(b, /<Year>/, '</Year>') ?? '');
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const journal = strip(between(b, /<Title>/, '</Title>') ?? '');
    const affiliation = strip(between(b, /<Affiliation>/, '</Affiliation>') ?? '');
    const doiM = b.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/i)
              || b.match(/<ELocationID[^>]*EIdType="doi"[^>]*>([\s\S]*?)<\/ELocationID>/i);
    const doi = doiM ? strip(doiM[1]) : '';
    const publicationTypes = [...b.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) => strip(m[1]));
    if (pmid) out.push({ pmid, title, abstract, year: Number.isNaN(year) ? null : year, journal, affiliation, doi, publicationTypes });
  }
  return out;
}

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
export async function searchPmids(query: string, retmax = 10, sort = ''): Promise<string[]> {
  // sort='' → PubMed 기본(최신순). sort='relevance' → 관련도순(피인용·랜드마크 논문 후보화).
  const sortParam = sort ? `&sort=${encodeURIComponent(sort)}` : '';
  const url = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${retmax}${sortParam}&term=${encodeURIComponent(query)}`;
  const r = await fetch(url); const j = (await r.json()) as any;
  return j?.esearchresult?.idlist ?? [];
}
export async function fetchAbstracts(pmids: string[]): Promise<PubmedArticle[]> {
  if (!pmids.length) return [];
  const url = `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${pmids.join(',')}`;
  const r = await fetch(url); const xml = await r.text();
  return parsePubmedXml(xml);
}
