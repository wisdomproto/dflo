// ai-server/src/services/populationTagger.ts
export type PopGroup = 'east_asian' | 'sea' | 'caucasian' | 'mixed' | 'unknown';
export type PopConfidence = 'explicit' | 'inferred' | 'unknown';
export interface PopTag { group: PopGroup; country: string; confidence: PopConfidence; }

const EXPLICIT: { re: RegExp; group: PopGroup; country: string }[] = [
  { re: /\bkorean\b/i, group: 'east_asian', country: 'korean' },
  { re: /\bjapanese\b/i, group: 'east_asian', country: 'japanese' },
  { re: /\bchinese\b|\bhan chinese\b/i, group: 'east_asian', country: 'chinese' },
  { re: /\btaiwanese\b/i, group: 'east_asian', country: 'taiwanese' },
  { re: /\bthai\b/i, group: 'sea', country: 'thai' },
  { re: /\bvietnamese\b/i, group: 'sea', country: 'vietnamese' },
  { re: /\bcaucasian\b|\bwhite european\b/i, group: 'caucasian', country: '' },
  { re: /\beast asian\b/i, group: 'east_asian', country: '' },
];
const AFFIL: { re: RegExp; group: PopGroup; country: string }[] = [
  { re: /\b(korea|seoul|busan)\b/i, group: 'east_asian', country: 'korean' },
  { re: /\b(japan|tokyo|osaka)\b/i, group: 'east_asian', country: 'japanese' },
  { re: /\b(china|beijing|shanghai)\b/i, group: 'east_asian', country: 'chinese' },
  { re: /\b(taiwan|taipei)\b/i, group: 'east_asian', country: 'taiwanese' },
  { re: /\b(thailand|bangkok)\b/i, group: 'sea', country: 'thai' },
  { re: /\b(vietnam|hanoi)\b/i, group: 'sea', country: 'vietnamese' },
];

export function tagPopulation(input: { abstract?: string; affiliation?: string }): PopTag {
  const abs = input.abstract ?? '';
  for (const e of EXPLICIT) if (e.re.test(abs)) return { group: e.group, country: e.country, confidence: 'explicit' };
  const aff = input.affiliation ?? '';
  for (const e of AFFIL) if (e.re.test(aff)) return { group: e.group, country: e.country, confidence: 'inferred' };
  return { group: 'unknown', country: '', confidence: 'unknown' };
}
