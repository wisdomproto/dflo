export interface LocaleTexts {
  // Brand
  logo: string;
  // HookScene
  hookBadge: string;
  hookTitle: string;
  hookSubtitle: string;
  hookCta: string;
  // InputScene
  inputLabel: string;
  inputTitle: string;
  inputDesc: string;
  genderLabel: string;
  genderMale: string;
  genderFemale: string;
  birthLabel: string;
  heightLabel: string;
  weightLabel: string;
  calcButton: string;
  // ResultScene
  resultTitle: string;
  resultLabel: string;
  cm: string;
  currentLabel: string;
  // Subtitles
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  // Chart annotations
  annoAvgCurve: string;
  annoPredPath: string;
  annoTop5: string;
  annoBot5: string;
  chartSource: string;
  // Growth standard + chart axes
  growthStandard: "KR" | "TH";
  chartAxisAge: string;
  chartAxisHeight: string;
  chartAgeUnit: string;
  monthUnit: string;
  // CtaScene
  ctaHeading: string;
  ctaButton: string;
  ctaClinic: string;
  // Promo reel v2 (Thai) — clinic/cases/CTA
  bridgeLine: string;
  clinicKoreaBadge: string;
  clinicName: string;
  clinicYears: string;
  clinicChips: string[];
  casesActorsLine: string;
  casesBarsLine: string;
  ctaPromoHeading: string;
  ctaSiteMeasure: string;
  ctaLinePill: string;
  ctaMessengerBg: string;
  ctaMessengerFg: string;
  siteUrl: string;
  // Promo reel v2 — hope/stats scene
  statsHeading: string;
  statsCount1: number;
  statsSuffix1: string;
  statsLabel1: string;
  statsCount2: number;
  statsSuffix2: string;
  statsLabel2: string;
  statsFootnote: string;
}

export const ko: LocaleTexts = {
  logo: "images/logo.jpg",
  hookBadge: "187 성장클리닉",
  hookTitle: "우리 아이,\n얼마나 클까?",
  hookSubtitle: "지금 바로 예상 키를 무료로 측정해보세요",
  hookCta: "예측키 무료 측정하기",
  inputLabel: "성장 진단",
  inputTitle: "우리 아이 예상 키 측정",
  inputDesc: "간단한 정보만 입력하면 예상 성인 키를 바로 확인할 수 있어요",
  genderLabel: "성별",
  genderMale: "👦 남아",
  genderFemale: "👧 여아",
  birthLabel: "생년월일",
  heightLabel: "현재 키 (cm)",
  weightLabel: "현재 체중 (kg)",
  calcButton: "예상키 계산하기",
  resultTitle: "예상키 측정 결과",
  resultLabel: "예상 성인 키",
  cm: "cm",
  currentLabel: "현재",
  sub1: "한국 질병관리청 표준 성장 데이터 기반",
  sub2: "95th = 상위 5% · 50th = 평균 · 5th = 하위 5%",
  sub3: "진한 선이 우리 아이의 예측 성장 경로예요",
  sub4: "18세 예상 성인 키까지 한눈에 확인!",
  annoAvgCurve: "평균 성장 곡선",
  annoPredPath: "우리 아이 예측 경로",
  annoTop5: "상위 5%",
  annoBot5: "하위 5%",
  chartSource: "한국 소아 성장 표준 (2017 질병관리청)",
  growthStandard: "KR",
  chartAxisAge: "나이",
  chartAxisHeight: "신장 (cm)",
  chartAgeUnit: "세",
  monthUnit: "개월",
  ctaHeading: "지금 무료로\n측정해보세요",
  ctaButton: "예측키 무료 측정하기",
  ctaClinic: "187 성장클리닉 · 연세새봄의원",
  bridgeLine: "예측키가 아쉽다면?\n골든타임은 지금입니다.",
  clinicKoreaBadge: "대한민국 강남 · 성장 전문 클리닉",
  clinicName: "187 성장클리닉\n연세새봄의원",
  clinicYears: "한국 강남 · 성장 진료 10년",
  clinicChips: ["뼈나이", "호르몬", "성장곡선"],
  casesActorsLine: "이런 아이들이 다니는 클리닉",
  casesBarsLine: "예측보다 더 자란 아이들",
  ctaPromoHeading: "지금 무료로\n예상키 측정",
  ctaSiteMeasure: "홈페이지에서 직접 측정할 수 있어요",
  ctaLinePill: "카카오톡 상담하기",
  ctaMessengerBg: "#FEE500",
  ctaMessengerFg: "#3C1E1E",
  siteUrl: "www.dr187growup.com",
  statsHeading: "키 성장, 함께라면\n충분히 가능합니다",
  statsCount1: 1000,
  statsSuffix1: "+",
  statsLabel1: "성장 치료 케이스",
  statsCount2: 90,
  statsSuffix2: "%+",
  statsLabel2: "목표 성장 도달률",
  statsFootnote: "실제 사례는 홈페이지에서 확인하세요",
};

export const th: LocaleTexts = {
  logo: "images/logo_en.png",
  hookBadge: "187 Growth Clinic",
  hookTitle: "ลูกของเรา\nจะสูงเท่าไหร่?",
  hookSubtitle: "ทำนายส่วนสูงของลูกฟรี ตอนนี้เลย",
  hookCta: "วัดส่วนสูงฟรี",
  inputLabel: "วินิจฉัยการเจริญเติบโต",
  inputTitle: "วัดส่วนสูงที่คาดการณ์",
  inputDesc: "เพียงกรอกข้อมูลง่ายๆ ก็ดูส่วนสูงตอนโตได้ทันที",
  genderLabel: "เพศ",
  genderMale: "👦 ชาย",
  genderFemale: "👧 หญิง",
  birthLabel: "วันเกิด",
  heightLabel: "ส่วนสูง (cm)",
  weightLabel: "น้ำหนัก (kg)",
  calcButton: "คำนวณส่วนสูง",
  resultTitle: "ผลการวัดส่วนสูง",
  resultLabel: "ส่วนสูงเมื่อโตเต็มที่",
  cm: "cm",
  currentLabel: "ปัจจุบัน",
  sub1: "อ้างอิงข้อมูลมาตรฐานการเจริญเติบโตของไทย",
  sub2: "95th = สูงกว่า 95% · 50th = เฉลี่ย · 5th = สูงกว่าแค่ 5%",
  sub3: "เส้นเข้มคือเส้นทางการเจริญเติบโตของลูกคุณ",
  sub4: "ดูส่วนสูงที่คาดการณ์เมื่ออายุ 18 ปี!",
  annoAvgCurve: "เส้นเฉลี่ย",
  annoPredPath: "เส้นทางลูกของคุณ",
  annoTop5: "สูงสุด 5%",
  annoBot5: "ต่ำสุด 5%",
  chartSource: "เกณฑ์การเจริญเติบโตของไทย (TSPE 2022)",
  growthStandard: "TH",
  chartAxisAge: "อายุ",
  chartAxisHeight: "ส่วนสูง (cm)",
  chartAgeUnit: "ปี",
  monthUnit: "เดือน",
  ctaHeading: "วัดส่วนสูง\nฟรี ตอนนี้เลย",
  ctaButton: "วัดส่วนสูงฟรี",
  ctaClinic: "187 Growth Clinic · Yonsei Saebom",
  bridgeLine: "อยากให้ลูกสูงกว่านี้?\nช่วงเวลาทองคือตอนนี้",
  clinicKoreaBadge: "คลินิกเฉพาะทางด้านความสูง · กังนัม เกาหลี",
  clinicName: "187 Growth Clinic\nYonsei Saebom",
  clinicYears: "คลินิกเพิ่มความสูง · กังนัม เกาหลี · 10 ปี",
  clinicChips: ["อายุกระดูก", "ฮอร์โมน", "กราฟการเจริญเติบโต"],
  casesActorsLine: "เด็กๆ เหล่านี้ก็มาที่คลินิกของเรา",
  casesBarsLine: "เด็กที่สูงเกินกว่าที่คาดการณ์",
  ctaPromoHeading: "วัดส่วนสูงฟรี\nตอนนี้เลย",
  ctaSiteMeasure: "วัดด้วยตัวเองได้ที่เว็บไซต์",
  ctaLinePill: "ปรึกษาผ่าน LINE @894qhqtu",
  ctaMessengerBg: "#06C755",
  ctaMessengerFg: "#FFFFFF",
  siteUrl: "www.dr187growup.com/th",
  statsHeading: "ให้ลูกสูงขึ้น\nเราทำได้จริง",
  statsCount1: 1000,
  statsSuffix1: "+",
  statsLabel1: "เคสดูแลการเจริญเติบโต",
  statsCount2: 90,
  statsSuffix2: "%+",
  statsLabel2: "อัตราความสำเร็จ",
  statsFootnote: "ดูเคสจริงทั้งหมดได้ที่เว็บไซต์",
};

// Module-level locale state
let _current: LocaleTexts = ko;

export function setLocale(locale: "ko" | "th") {
  _current = locale === "th" ? th : ko;
}

export function t(): LocaleTexts {
  return _current;
}
