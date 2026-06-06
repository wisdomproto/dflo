export const K_MIN = 5; // k-익명성 최소 코호트 크기

export interface CohortRow {
  gender?: string; initialHeight?: number; latestHeight?: number;
  initialBoneAge?: number; topMeds?: string[];
}
export interface CohortStats {
  n: number; avgGrowthCm: number; avgInitialBoneAge: number | null;
  genderSplit: Record<string, number>; commonMeds: string[];
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function aggregateCohort(rows: CohortRow[]): CohortStats {
  const growth = rows
    .filter((r) => typeof r.initialHeight === 'number' && typeof r.latestHeight === 'number')
    .map((r) => (r.latestHeight as number) - (r.initialHeight as number));
  const boneAges = rows.map((r) => r.initialBoneAge).filter((x): x is number => typeof x === 'number');
  const genderSplit: Record<string, number> = {};
  rows.forEach((r) => { const g = r.gender || 'unknown'; genderSplit[g] = (genderSplit[g] || 0) + 1; });
  const medFreq: Record<string, number> = {};
  rows.forEach((r) => (r.topMeds || []).forEach((m) => (medFreq[m] = (medFreq[m] || 0) + 1)));
  const commonMeds = Object.entries(medFreq).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  return {
    n: rows.length,
    avgGrowthCm: Math.round(avg(growth) * 10) / 10,
    avgInitialBoneAge: boneAges.length ? Math.round(avg(boneAges) * 10) / 10 : null,
    genderSplit, commonMeds,
  };
}
export function passesKAnonymity(n: number): boolean { return n >= K_MIN; }
