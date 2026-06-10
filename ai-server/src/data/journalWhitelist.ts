// 소아내분비·성장 분야 top SCI 저널 ISSN 화이트리스트. 원장 큐레이션으로 보강.
// ISSN 은 OpenAlex issn_l(linking ISSN) 기준, 하이픈 형식("0021-972X").
// ⚠️ ISSN 오타는 해당 저널을 화이트리스트에서 누락시키지만, isSci()가 if_proxy 폴백으로
//    고IF 저널을 살리므로 치명적이지 않음. Task 6 dry-run 에서 후보 저널의 실제 ISSN과 대조 권장.
export interface WhitelistEntry { issn: string; name: string; }
export const JOURNAL_WHITELIST: WhitelistEntry[] = [
  { issn: '0021-972X', name: 'J Clin Endocrinol Metab' },
  { issn: '1663-2818', name: 'Horm Res Paediatr' },
  { issn: '0804-4643', name: 'Eur J Endocrinol' },
  { issn: '0022-3476', name: 'J Pediatr' },
  { issn: '0031-4005', name: 'Pediatrics' },
  { issn: '2168-6203', name: 'JAMA Pediatr' },
  { issn: '0300-0664', name: 'Clin Endocrinol (Oxf)' },
  { issn: '0334-018X', name: 'J Pediatr Endocrinol Metab' },
  { issn: '0018-5043', name: 'Horm Metab Res' },
  { issn: '8756-3282', name: 'Bone' },
  { issn: '1096-6374', name: 'Growth Horm IGF Res' },
  { issn: '1687-9856', name: 'Int J Pediatr Endocrinol' },
  { issn: '0163-769X', name: 'Endocr Rev' },
  { issn: '0140-6736', name: 'Lancet' },
  { issn: '2213-8587', name: 'Lancet Diabetes Endocrinol' },
  { issn: '2352-4642', name: 'Lancet Child Adolesc Health' },
  { issn: '0028-4793', name: 'N Engl J Med' },
  { issn: '1061-4036', name: 'Nat Genet' },
  { issn: '0002-9165', name: 'Am J Clin Nutr' },
  { issn: '0161-8105', name: 'Sleep' },
  { issn: '2047-6302', name: 'Pediatr Obes' },
  { issn: '0307-0565', name: 'Int J Obes' },
  { issn: '0003-9888', name: 'Arch Dis Child' },
  { issn: '0340-6199', name: 'Eur J Pediatr' },
  { issn: '0884-0431', name: 'J Bone Miner Res' },
  { issn: '1521-690X', name: 'Best Pract Res Clin Endocrinol Metab' },
  { issn: '0803-5253', name: 'Acta Paediatr' },
];
export const WHITELIST_ISSNS: Set<string> = new Set(JOURNAL_WHITELIST.map((e) => e.issn));
