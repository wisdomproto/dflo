// 뼈나이(bone_age) 표기 변환 — 저장값은 소수점 년(예: 13.5 = 13년 6개월).
// 진료 내역 측정칸(VisitDetailPanel)과 X-ray 검사 입력칸(XrayPanel)이 BA 값을
// 서로 동기화하므로 두 곳이 반드시 같은 변환을 쓰도록 한 곳에 모은다.

/** 소수점 년(bone_age) → 년/개월 문자열. 예: 13.5 → { y: '13', m: '6' }. */
export function splitBoneAgeYM(value: number | null): { y: string; m: string } {
  if (value == null) return { y: '', m: '' };
  const years = Math.floor(value);
  const months = Math.round((value - years) * 12);
  if (months === 12) return { y: String(years + 1), m: '0' }; // 13.99 → 14년 0개월
  return { y: String(years), m: String(months) };
}

/** 년/개월 문자열 → 소수점 년. 둘 다 비면 null. */
export function parseBoneAgeDec(yStr: string, mStr: string): number | null {
  const yt = yStr.trim();
  const mt = mStr.trim();
  if (yt === '' && mt === '') return null;
  const y = yt === '' ? 0 : Number(yt);
  const mo = mt === '' ? 0 : Number(mt);
  if (Number.isNaN(y) || Number.isNaN(mo)) return null;
  const dec = Math.round((y + mo / 12) * 100) / 100;
  // 0년 0개월(=0)은 뼈나이 미측정으로 간주 → null. ("0년 6개월"=0.5 등은 유지)
  return dec === 0 ? null : dec;
}
