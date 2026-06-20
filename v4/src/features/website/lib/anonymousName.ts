// 익명 예측 프로필용 로케일별 아이 이름 풀 + 국적 맵 (순수 함수, IO 없음).
// 이름은 가짜(식별 아님) — 익명 데이터가 리스트에서 사람처럼 보이게 하는 용도.

export type PredLocale = 'ko' | 'th' | 'vi' | 'en';

// 로케일별 아이 given-name 풀(현지 표기). surname 없이 이름만으로 충분(익명).
const NAMES: Record<PredLocale, string[]> = {
  ko: ['서연', '지우', '하준', '도윤', '시우', '주원', '지호', '예준', '서윤', '하은',
    '지아', '수아', '지유', '민준', '은우', '유준', '이서', '다은', '채원', '지안',
    '서준', '건우', '우진', '선우', '연우', '서아', '하린', '윤서', '시윤', '정우'],
  th: ['พลอย', 'ฟ้า', 'มายด์', 'เฟิร์น', 'บีม', 'ปอนด์', 'มุก', 'แพรว', 'ข้าวฟ่าง', 'น้ำตาล',
    'กันต์', 'ภูมิ', 'แจน', 'นาน', 'ไอซ์', 'มิ้นต์', 'เพชร', 'ดาว', 'ตาล', 'บีน',
    'จูน', 'แก้ม', 'ปลา', 'ออม', 'นัท', 'แทน', 'พีช', 'มะปราง', 'เก้า', 'ปุ๊ก'],
  vi: ['An', 'Bảo', 'Khang', 'Minh', 'Ngọc', 'Linh', 'Hà', 'Quân', 'Nam', 'Trang',
    'Phúc', 'Anh', 'Hân', 'Như', 'Vy', 'Thảo', 'Duy', 'Long', 'Hương', 'Mai',
    'Tú', 'Hùng', 'Lan', 'Hoa', 'Đức', 'Trung', 'Nhi', 'Châu', 'Khoa', 'Thư'],
  en: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'James',
    'Isabella', 'Mason', 'Amelia', 'Logan', 'Harper', 'Oliver', 'Ella', 'Aiden', 'Chloe', 'Jack',
    'Grace', 'Henry', 'Lily', 'Leo', 'Zoe', 'Daniel', 'Nora', 'Ryan', 'Hannah', 'Ben'],
};

const COUNTRY: Record<PredLocale, string> = { ko: 'KR', th: 'TH', vi: 'VN', en: 'EN' };

function asLocale(locale: string): PredLocale {
  return (['ko', 'th', 'vi', 'en'] as const).includes(locale as PredLocale) ? (locale as PredLocale) : 'en';
}

/** 로케일에 맞는 랜덤 아이 이름. 미지원 로케일은 영어 풀로 폴백. */
export function randomLocaleName(locale: string): string {
  const pool = NAMES[asLocale(locale)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 로케일 → 국적 코드 (ko→KR, th→TH, vi→VN, en→EN(영어권/기타)). */
export function localeToCountry(locale: string): string {
  return COUNTRY[asLocale(locale)];
}
