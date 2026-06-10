import { WHITELIST_ISSNS } from '../data/journalWhitelist.js';

export const IF_THRESHOLD = 3;          // OpenAlex 2yr mean citedness 하한 (whitelist 미스 폴백)
export const WEIGHTS = { rcr: 0.40, ifProxy: 0.25, logCite: 0.20, recency: 0.10, studyGrade: 0.05 };

const STUDY_GRADE: Record<string, number> = {
  meta_analysis: 1.0, systematic_review: 0.9, rct: 0.8, cohort: 0.6,
  case_control: 0.5, cross_sectional: 0.4, review: 0.3, other: 0.2,
};

export function studyTypeFromPubTypes(types: string[]): string {
  const t = types.map((s) => s.toLowerCase());
  const has = (x: string) => t.some((s) => s.includes(x));
  if (has('meta-analysis')) return 'meta_analysis';
  if (has('systematic review')) return 'systematic_review';
  if (has('randomized controlled trial')) return 'rct';
  if (has('cohort')) return 'cohort';
  if (has('case-control')) return 'case_control';
  if (has('cross-sectional') || has('observational study')) return 'cross_sectional';
  if (has('review')) return 'review';
  return 'other';
}

export function studyGrade(studyType: string): number {
  return STUDY_GRADE[studyType] ?? 0.2;
}

export function isSci(opts: { issn?: string; ifProxy?: number | null }): boolean {
  if (opts.issn && WHITELIST_ISSNS.has(opts.issn)) return true;
  if (typeof opts.ifProxy === 'number' && opts.ifProxy >= IF_THRESHOLD) return true;
  return false;
}

export function normalize(v: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  const x = (v - min) / (max - min);
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export interface PaperMetrics {
  rcr: number | null; ifProxy: number | null; citationCount: number; year: number | null; studyType: string;
}
export interface BatchStats {
  rcrMin: number; rcrMax: number; ifMin: number; ifMax: number; logCiteMin: number; logCiteMax: number;
}

export function computeBatchStats(papers: PaperMetrics[]): BatchStats {
  if (!papers.length) return { rcrMin: 0, rcrMax: 0, ifMin: 0, ifMax: 0, logCiteMin: 0, logCiteMax: 0 };
  const rcrs = papers.map((p) => p.rcr ?? 0);
  const ifs = papers.map((p) => p.ifProxy ?? 0);
  const lc = papers.map((p) => Math.log((p.citationCount ?? 0) + 1));
  return {
    rcrMin: Math.min(...rcrs), rcrMax: Math.max(...rcrs),
    ifMin: Math.min(...ifs), ifMax: Math.max(...ifs),
    logCiteMin: Math.min(...lc), logCiteMax: Math.max(...lc),
  };
}

export function qualityScore(p: PaperMetrics, b: BatchStats, currentYear: number): number {
  const rcrN = normalize(p.rcr ?? 0, b.rcrMin, b.rcrMax);
  const ifN = normalize(p.ifProxy ?? 0, b.ifMin, b.ifMax);
  const logCiteN = normalize(Math.log((p.citationCount ?? 0) + 1), b.logCiteMin, b.logCiteMax);
  const recency = p.year ? normalize(p.year, currentYear - 10, currentYear) : 0;
  const gradeN = studyGrade(p.studyType);
  const s = WEIGHTS.rcr * rcrN + WEIGHTS.ifProxy * ifN + WEIGHTS.logCite * logCiteN
          + WEIGHTS.recency * recency + WEIGHTS.studyGrade * gradeN;
  return Math.round(s * 1000) / 10; // 0..100, 소수 1자리
}
