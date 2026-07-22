// 익명 예측 프로필용 로케일별 아이 이름 풀 + 국적 맵 (순수 함수, IO 없음).
// 이름은 가짜(식별 아님) — 익명 데이터가 리스트에서 사람처럼 보이게 하는 용도.

export type PredLocale = 'ko' | 'th' | 'vi' | 'en' | 'zh-hant' | 'zh-hans' | 'ar' | 'ja' | 'es';

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
  // 글자체를 지킨다 — 번체 詩涵 ↔ 간체 诗涵.
  'zh-hant': ['詩涵', '子睿', '宇軒', '欣妍', '佳穎', '冠廷', '品妍', '承恩', '語彤', '家豪',
    '沛璇', '柏睿', '若曦', '詠晴', '宥辰', '思妤', '冠宇', '心妍', '睿哲', '雨潔',
    '芷晴', '昱丞', '語柔', '宸瑜', '靖恩', '妍希', '皓宇', '恩晴', '又睿', '沛恩'],
  'zh-hans': ['诗涵', '子睿', '宇轩', '欣妍', '佳颖', '冠廷', '品妍', '承恩', '语彤', '家豪',
    '沛璇', '柏睿', '若曦', '咏晴', '宥辰', '思妤', '冠宇', '心妍', '睿哲', '雨洁',
    '芷晴', '昱丞', '语柔', '宸瑜', '靖恩', '妍希', '皓宇', '恩晴', '又睿', '沛恩'],
  ar: ['أحمد', 'محمد', 'يوسف', 'عمر', 'خالد', 'علي', 'حمزة', 'إبراهيم', 'عبد الله', 'زياد',
    'كريم', 'آدم', 'سيف', 'ياسين', 'فارس', 'مريم', 'سارة', 'ليلى', 'نور', 'فاطمة',
    'جنى', 'رنا', 'لينا', 'هنا', 'ملك', 'جود', 'رهف', 'سلمى', 'ياسمين', 'ريم'],
  ja: ['はると', 'ゆうと', 'そうた', 'ひなた', 'あおい', 'いつき', 'りく', 'みなと', 'ゆうき', 'そら',
    'ゆい', 'めい', 'さくら', 'ひまり', 'つむぎ', 'あかり', 'ことは', 'ひなの', 'りん', 'はな',
    'かえで', 'ゆあ', 'あおと', 'はるき', 'こはる', 'ももか', 'ゆづき', 'あさひ', 'なぎ', 'いおり'],
  es: ['Mateo', 'Sofía', 'Santiago', 'Valentina', 'Sebastián', 'Isabella', 'Martín', 'Camila', 'Diego', 'Luciana',
    'Nicolás', 'Emma', 'Samuel', 'Valeria', 'Benjamín', 'Mía', 'Tomás', 'Antonella', 'Gael', 'Regina',
    'Alejandro', 'Julieta', 'Emiliano', 'Renata', 'Daniel', 'Victoria', 'Lucas', 'Ximena', 'Adrián', 'Salomé'],
};

// 번체=TW(대만 단일 시장), 간체=ZH(중국어권/기타 — 간체 타겟이 본토가 아니라 동남아·미국
// 화교라 CN 은 사실과 다르다). 이 코드는 ISO 국가코드가 아니라 en='EN'(영어권/기타) 관행을 잇는
// 언어권 버킷이다.
const COUNTRY: Record<PredLocale, string> = {
  ko: 'KR', th: 'TH', vi: 'VN', en: 'EN', 'zh-hant': 'TW', 'zh-hans': 'ZH', ar: 'AR', ja: 'JP', es: 'ES',
};

function asLocale(locale: string): PredLocale {
  return (['ko', 'th', 'vi', 'en', 'zh-hant', 'zh-hans', 'ar', 'ja', 'es'] as const).includes(locale as PredLocale)
    ? (locale as PredLocale) : 'en';
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
