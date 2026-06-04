// 환자 국적(범용) 목록 — children.country (migration 017).
// 성장곡선 표준 선택(nationality KR/CN)과는 별개의 일반 국적 속성.
// 진료 권역(한국 + 동남아 글로벌 진출) + 실제 내원 국적을 우선 배치.

export interface Country {
  code: string; // ISO 3166-1 alpha-2 ('OTHER' 는 기타)
  flag: string; // emoji
  ko: string; // 한국어 국가명
}

export const COUNTRIES: Country[] = [
  { code: 'KR', flag: '🇰🇷', ko: '대한민국' },
  { code: 'TH', flag: '🇹🇭', ko: '태국' },
  { code: 'VN', flag: '🇻🇳', ko: '베트남' },
  { code: 'CN', flag: '🇨🇳', ko: '중국' },
  { code: 'US', flag: '🇺🇸', ko: '미국' },
  { code: 'JP', flag: '🇯🇵', ko: '일본' },
  { code: 'PH', flag: '🇵🇭', ko: '필리핀' },
  { code: 'ID', flag: '🇮🇩', ko: '인도네시아' },
  { code: 'MY', flag: '🇲🇾', ko: '말레이시아' },
  { code: 'SG', flag: '🇸🇬', ko: '싱가포르' },
  { code: 'TW', flag: '🇹🇼', ko: '대만' },
  { code: 'HK', flag: '🇭🇰', ko: '홍콩' },
  { code: 'MN', flag: '🇲🇳', ko: '몽골' },
  { code: 'KZ', flag: '🇰🇿', ko: '카자흐스탄' },
  { code: 'RU', flag: '🇷🇺', ko: '러시아' },
  { code: 'IN', flag: '🇮🇳', ko: '인도' },
  { code: 'AU', flag: '🇦🇺', ko: '호주' },
  { code: 'CA', flag: '🇨🇦', ko: '캐나다' },
  { code: 'GB', flag: '🇬🇧', ko: '영국' },
  { code: 'OTHER', flag: '🌐', ko: '기타' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code?: string | null): Country | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/** 국기 이모지만 (없으면 빈 문자열). */
export function countryFlag(code?: string | null): string {
  return getCountry(code)?.flag ?? '';
}

/** "🇰🇷 대한민국" 형태 라벨 (없으면 빈 문자열). */
export function countryLabel(code?: string | null): string {
  const c = getCountry(code);
  return c ? `${c.flag} ${c.ko}` : '';
}
