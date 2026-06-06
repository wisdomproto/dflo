export interface LegendRow {
  display_name: string; generic_name: string; drug_class: string;
  is_growth_core: boolean; is_non_drug: boolean;
}
function find(name: string, legend: LegendRow[]): LegendRow | undefined {
  return legend.find((l) => l.display_name && name.includes(l.display_name));
}
/** "에이큐_G" → "에이큐_G (somatropin(성장호르몬) · growth_hormone)" 형태로 주석. 미지면 원본 그대로. */
export function annotateMedName(name: string, legend: LegendRow[]): string {
  const l = find(name, legend);
  if (!l || (!l.generic_name && !l.drug_class)) return name;
  const parts = [l.generic_name, l.drug_class].filter(Boolean).join(' · ');
  return `${name} (${parts})`;
}
export function isNonDrugName(name: string, legend: LegendRow[]): boolean {
  return !!find(name, legend)?.is_non_drug;
}
