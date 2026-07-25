// 국가 목록 — 환자 거주국(children.country, migration 017) + 성장 기준 국가 선택.
//
// 두 갈래로 쓴다:
//  1) 어드민 화면 — 한국 직원이 보므로 한국어 이름 고정. COUNTRIES / countryLabel / countryFlag.
//  2) 공개 설문(/intake) — 방문자 언어로 보여야 한다. getCountries(lang).
//
// ★설문용 국가명은 데이터로 들고 있지 않고 브라우저 내장 `Intl.DisplayNames` 로 얻는다.
//   199개국 × 8언어를 손으로 번역·유지할 필요가 없고 번들도 늘지 않는다.
//   (예전엔 한국어 이름만 있어서 영어·태국어 설문에도 국가명이 한국어로 떴다.)
// ★국기 이모지도 ISO 코드에서 regional-indicator 로 만든다.

export interface Country {
  code: string; // ISO 3166-1 alpha-2 ('OTHER' 는 기타)
  flag: string; // emoji
  ko: string; // 한국어 국가명 (어드민 표시용)
}

/** 어드민에서 쓰는 축약 목록 — 진료 권역 + 실제 내원 국적. */
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

/** ISO alpha-2 → 국기 이모지 (regional indicator symbols). */
export function flagOf(code: string): string {
  if (!code || code === 'OTHER') return '🌐';
  if (!/^[A-Za-z]{2}$/.test(code)) return '🌐';
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** 국기 이모지만 (축약 목록에 없으면 코드로 생성). */
export function countryFlag(code?: string | null): string {
  if (!code) return '';
  return getCountry(code)?.flag ?? flagOf(code);
}

/** "🇰🇷 대한민국" — 어드민 표시용(한국어 고정). 축약 목록 밖이면 영어 이름으로 폴백. */
export function countryLabel(code?: string | null): string {
  if (!code) return '';
  const c = getCountry(code);
  if (c) return `${c.flag} ${c.ko}`;
  let name = code;
  try {
    name = new Intl.DisplayNames(['ko'], { type: 'region' }).of(code) ?? code;
  } catch {
    /* 구형 환경 — 코드 그대로 */
  }
  return `${flagOf(code)} ${name}`;
}

// ---------------------------------------------------------------------------
// 공개 설문용 — 전 세계 목록, 방문자 언어로
// ---------------------------------------------------------------------------

/** UN 회원국 193 + 대만·홍콩·마카오·팔레스타인·코소보·바티칸. */
export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ',
  'BN','BO','BR','BS','BT','BW','BY','BZ','CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU',
  'CV','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET','FI','FJ','FM','FR','GA',
  'GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW','GY','HK','HN','HR','HT','HU','ID','IE','IL','IN',
  'IQ','IR','IS','IT','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MG','MH','MK','ML','MM','MN','MO','MR',
  'MT','MU','MV','MW','MX','MY','MZ','NA','NE','NG','NI','NL','NO','NP','NR','NZ','OM','PA','PE','PG',
  'PH','PK','PL','PS','PT','PW','PY','QA','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SI','SK',
  'SL','SM','SN','SO','SR','SS','ST','SV','SY','SZ','TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT',
  'TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VN','VU','WS','XK','YE','ZA','ZM','ZW',
];

/** 진료 권역·문의가 많은 곳을 목록 맨 위로. */
const PINNED = ['KR', 'TH', 'VN', 'CN', 'TW', 'HK', 'US', 'JP', 'ID', 'PH', 'SG', 'MY'];

// 우리 언어 코드 → Intl 로케일 표기(zh-hant → zh-Hant).
const INTL_LOCALE: Record<string, string> = { 'zh-hant': 'zh-Hant', 'zh-hans': 'zh-Hans' };

export interface LocalizedCountry {
  code: string;
  flag: string;
  label: string; // 화면 언어로 된 국가명
}

/**
 * 화면 언어로 된 전 세계 국가 목록. 주요 시장이 위, 나머지는 그 언어 이름순.
 * Intl.DisplayNames 를 못 쓰는 환경에선 코드를 라벨로 쓴다(목록이 비지 않게).
 */
export function getCountries(lang: string): LocalizedCountry[] {
  const locale = INTL_LOCALE[lang] ?? lang;
  let name: (c: string) => string;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    name = (c) => dn.of(c) ?? c;
  } catch {
    name = (c) => c;
  }

  const all = COUNTRY_CODES.map((code) => ({ code, flag: flagOf(code), label: name(code) }));
  const pinned = PINNED.map((c) => all.find((x) => x.code === c)).filter(Boolean) as LocalizedCountry[];
  const rest = all
    .filter((c) => !PINNED.includes(c.code))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return [...pinned, ...rest];
}

/**
 * 거주국 → 예측키 계산에 쓸 성장 표준.
 * 부모에게 'CDC'·'WHO' 같은 내부 용어를 보이지 않고 나라만 고르게 한 뒤 여기서 옮긴다.
 * 자국 표준이 없는 나라는 WHO(국제 기준)로 떨어진다.
 */
export function growthStandardOf(code?: string | null): 'KR' | 'TH' | 'CN' | 'US' | 'ID' | 'WHO' {
  if (!code) return 'WHO';
  if (code === 'KR') return 'KR';
  if (code === 'TH') return 'TH';
  if (code === 'ID') return 'ID';
  if (['CN', 'TW', 'HK', 'MO', 'SG'].includes(code)) return 'CN';
  if (['US', 'AU', 'CA', 'NZ'].includes(code)) return 'US';
  return 'WHO';
}
