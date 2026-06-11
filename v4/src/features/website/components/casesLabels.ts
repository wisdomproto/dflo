// Locale-aware UI labels for the cases slide rendered inside <SectionCarousel>.
// Patient-entered data (name, category text, free-text memos, intake values) stays in
// Korean — only chrome / column headers / section titles get translated.

import { createContext, useContext } from 'react';

export type CasesLang = 'ko' | 'en' | 'th' | 'vi';

type LabelDict = {
  emptyState: string;
  boy: string;
  girl: string;
  initialMemo: string;
  heightChange: string;
  youtubeTitle: string;
  allergyTitle: (n: number) => string;
  allergyDanger: (n: number) => string;
  allergyCaution: (n: number) => string;
  growthChart: string;
  loading: string;
  // Growth chart legend + axis labels (passed into shared GrowthChart)
  chartActualHeight: string;
  chartInitialGrowth: string;
  chartCurrentGrowth: string;
  chartAxisAge: string;
  chartAxisHeight: string;
  tableNum: string;
  tableDate: string;
  tableHeight: string;
  tableWeight: string;
  tableAge: string;
  tableBoneAge: string;
  tablePredicted: string;
  finalMemo: string;
  cta: string;
  barInitial: string;
  barFinal: string;
  treatmentLabel: string;
  treatmentSuffix: string;
  actualHeight: string;
  predictedHeight: string;
  // Treatment-duration unit suffixes — used for "12개월" / "1년 6개월" style strings
  monthSuffix: string;
  yearSuffix: string;
  intakeInfoTitle: string;
  intake: Record<
    | 'gestationalWeeks' | 'birthWeight' | 'birthNote' | 'currentHeight' | 'currentWeight'
    | 'yearlyGrowth' | 'grade' | 'heightRank' | 'desiredHeight' | 'fatherHeight'
    | 'motherHeight' | 'growthPattern' | 'pubertyStage' | 'growthConcerns' | 'pastConditions',
    string
  >;
  // Unit suffixes that follow the numeric value in intake rows
  unitWeeks: string;
  unitRank: string;
  photosTitle: (n: number) => string;
  photoFront: string;
  photoSide: string;
  xrayFront: string;
  xraySide: string;
  // Carousel chrome (slide nav)
  prevSlide: string;
  nextSlide: string;
  slideNumber: (n: number) => string;
};

const DICT: Record<CasesLang, LabelDict> = {
  ko: {
    emptyState: '성장 사례를 입력해주세요',
    boy: '남아', girl: '여아',
    initialMemo: '🏥 초진 메모',
    heightChange: '📊 키 변화',
    youtubeTitle: '치료 후기 영상',
    allergyTitle: (n) => `🍽️ 음식 알러지 검사 결과 (${n}개)`,
    allergyDanger: (n) => `🚫 위험 (${n}개)`,
    allergyCaution: (n) => `⚠️ 경계 (${n}개)`,
    growthChart: '📈 성장 표준곡선',
    loading: '로딩...',
    chartActualHeight: '실제 키', chartInitialGrowth: '초진 예상 성장', chartCurrentGrowth: '현재 예상 성장',
    chartAxisAge: '나이(세)', chartAxisHeight: '키(cm)',
    tableNum: '#',
    tableDate: '날짜', tableHeight: '키', tableWeight: '체중',
    tableAge: '나이', tableBoneAge: '뼈나이', tablePredicted: '예상키',
    finalMemo: '🩺 원장 소견',
    cta: '💬 우리 아이도 상담 받아보기',
    barInitial: '초진 예상키', barFinal: '최종 예상키',
    treatmentLabel: '치료', treatmentSuffix: '동안',
    actualHeight: '실제키', predictedHeight: '예상키',
    monthSuffix: '개월', yearSuffix: '년',
    intakeInfoTitle: '📋 초진 정보',
    intake: {
      gestationalWeeks: '임신 주수', birthWeight: '출생 몸무게', birthNote: '출생 특이사항',
      currentHeight: '내원 시 키', currentWeight: '내원 시 몸무게', yearlyGrowth: '연간 성장',
      grade: '학년', heightRank: '학급 키 순위', desiredHeight: '희망 키',
      fatherHeight: '아버지 키', motherHeight: '어머니 키', growthPattern: '성장 양상',
      pubertyStage: '사춘기 평가', growthConcerns: '보호자 의견', pastConditions: '과거 질환',
    },
    unitWeeks: '주', unitRank: '번',
    photosTitle: (n) => `📷 #${n}회 사진`,
    photoFront: '정면', photoSide: '측면', xrayFront: 'X-ray 정면', xraySide: 'X-ray 측면',
    prevSlide: '이전 슬라이드', nextSlide: '다음 슬라이드',
    slideNumber: (n) => `슬라이드 ${n}`,
  },
  en: {
    emptyState: 'Please add a growth case',
    boy: 'Boy', girl: 'Girl',
    initialMemo: '🏥 First-visit notes',
    heightChange: '📊 Height change',
    youtubeTitle: 'Treatment review video',
    allergyTitle: (n) => `🍽️ Food-allergy results (${n})`,
    allergyDanger: (n) => `🚫 Danger (${n})`,
    allergyCaution: (n) => `⚠️ Caution (${n})`,
    growthChart: '📈 Standard growth chart',
    loading: 'Loading…',
    chartActualHeight: 'Actual height', chartInitialGrowth: 'Initial projection', chartCurrentGrowth: 'Current projection',
    chartAxisAge: 'Age (yrs)', chartAxisHeight: 'Height (cm)',
    tableNum: '#',
    tableDate: 'Date', tableHeight: 'Height', tableWeight: 'Weight',
    tableAge: 'Age', tableBoneAge: 'Bone age', tablePredicted: 'Predicted',
    finalMemo: "🩺 Doctor's note",
    cta: '💬 Get a consultation for my child',
    barInitial: 'Initial predicted', barFinal: 'Final predicted',
    treatmentLabel: 'Over', treatmentSuffix: 'of treatment',
    actualHeight: 'Actual', predictedHeight: 'Predicted',
    monthSuffix: 'mo', yearSuffix: 'y',
    intakeInfoTitle: '📋 Intake info',
    intake: {
      gestationalWeeks: 'Gestational weeks', birthWeight: 'Birth weight', birthNote: 'Birth notes',
      currentHeight: 'Height at visit', currentWeight: 'Weight at visit', yearlyGrowth: 'Annual growth',
      grade: 'Grade', heightRank: 'Class height rank', desiredHeight: 'Desired height',
      fatherHeight: "Father's height", motherHeight: "Mother's height", growthPattern: 'Growth pattern',
      pubertyStage: 'Puberty stage', growthConcerns: 'Parent notes', pastConditions: 'Past conditions',
    },
    unitWeeks: 'wks', unitRank: 'th',
    photosTitle: (n) => `📷 Visit #${n} photos`,
    photoFront: 'Front', photoSide: 'Side', xrayFront: 'X-ray front', xraySide: 'X-ray side',
    prevSlide: 'Previous slide', nextSlide: 'Next slide',
    slideNumber: (n) => `Slide ${n}`,
  },
  th: {
    emptyState: 'กรุณาเพิ่มเคสการเจริญเติบโต',
    boy: 'เด็กชาย', girl: 'เด็กหญิง',
    initialMemo: '🏥 บันทึกการตรวจครั้งแรก',
    heightChange: '📊 การเปลี่ยนแปลงส่วนสูง',
    youtubeTitle: 'วิดีโอรีวิวการรักษา',
    allergyTitle: (n) => `🍽️ ผลตรวจภูมิแพ้อาหาร (${n})`,
    allergyDanger: (n) => `🚫 อันตราย (${n})`,
    allergyCaution: (n) => `⚠️ ระวัง (${n})`,
    growthChart: '📈 กราฟการเจริญเติบโตมาตรฐาน',
    loading: 'กำลังโหลด...',
    chartActualHeight: 'ส่วนสูงจริง', chartInitialGrowth: 'คาดการณ์ครั้งแรก', chartCurrentGrowth: 'คาดการณ์ปัจจุบัน',
    chartAxisAge: 'อายุ (ปี)', chartAxisHeight: 'ส่วนสูง (ซม.)',
    tableNum: '#',
    tableDate: 'วันที่', tableHeight: 'ส่วนสูง', tableWeight: 'น้ำหนัก',
    tableAge: 'อายุ', tableBoneAge: 'อายุกระดูก', tablePredicted: 'คาดการณ์',
    finalMemo: '🩺 ความเห็นของแพทย์',
    cta: '💬 ขอรับคำปรึกษาสำหรับลูก',
    barInitial: 'คาดการณ์ครั้งแรก', barFinal: 'คาดการณ์สุดท้าย',
    treatmentLabel: 'ระยะรักษา', treatmentSuffix: '',
    actualHeight: 'ส่วนสูงจริง', predictedHeight: 'คาดการณ์',
    monthSuffix: ' เดือน', yearSuffix: ' ปี',
    intakeInfoTitle: '📋 ข้อมูลครั้งแรก',
    intake: {
      gestationalWeeks: 'อายุครรภ์', birthWeight: 'น้ำหนักแรกเกิด', birthNote: 'ข้อมูลการเกิด',
      currentHeight: 'ส่วนสูงตอนตรวจ', currentWeight: 'น้ำหนักตอนตรวจ', yearlyGrowth: 'การโตต่อปี',
      grade: 'ชั้นเรียน', heightRank: 'อันดับส่วนสูงในชั้น', desiredHeight: 'ส่วนสูงเป้าหมาย',
      fatherHeight: 'ส่วนสูงพ่อ', motherHeight: 'ส่วนสูงแม่', growthPattern: 'รูปแบบการโต',
      pubertyStage: 'ระยะวัยรุ่น', growthConcerns: 'ความเห็นผู้ปกครอง', pastConditions: 'โรคในอดีต',
    },
    unitWeeks: ' สัปดาห์', unitRank: ' (อันดับ)',
    photosTitle: (n) => `📷 รูปครั้งที่ ${n}`,
    photoFront: 'ด้านหน้า', photoSide: 'ด้านข้าง', xrayFront: 'X-ray ด้านหน้า', xraySide: 'X-ray ด้านข้าง',
    prevSlide: 'สไลด์ก่อนหน้า', nextSlide: 'สไลด์ถัดไป',
    slideNumber: (n) => `สไลด์ ${n}`,
  },
  vi: {
    emptyState: 'Vui lòng thêm ca tăng trưởng',
    boy: 'Bé trai', girl: 'Bé gái',
    initialMemo: '🏥 Ghi chú lần khám đầu',
    heightChange: '📊 Thay đổi chiều cao',
    youtubeTitle: 'Video đánh giá điều trị',
    allergyTitle: (n) => `🍽️ Kết quả dị ứng thực phẩm (${n})`,
    allergyDanger: (n) => `🚫 Nguy cơ (${n})`,
    allergyCaution: (n) => `⚠️ Cảnh báo (${n})`,
    growthChart: '📈 Biểu đồ tăng trưởng chuẩn',
    loading: 'Đang tải...',
    chartActualHeight: 'Chiều cao thực', chartInitialGrowth: 'Dự đoán ban đầu', chartCurrentGrowth: 'Dự đoán hiện tại',
    chartAxisAge: 'Tuổi (năm)', chartAxisHeight: 'Chiều cao (cm)',
    tableNum: '#',
    tableDate: 'Ngày', tableHeight: 'Chiều cao', tableWeight: 'Cân nặng',
    tableAge: 'Tuổi', tableBoneAge: 'Tuổi xương', tablePredicted: 'Dự đoán',
    finalMemo: '🩺 Nhận xét của bác sĩ',
    cta: '💬 Nhận tư vấn cho con tôi',
    barInitial: 'Dự đoán ban đầu', barFinal: 'Dự đoán cuối cùng',
    treatmentLabel: 'Trong', treatmentSuffix: 'điều trị',
    actualHeight: 'Thực tế', predictedHeight: 'Dự đoán',
    monthSuffix: ' tháng', yearSuffix: ' năm',
    intakeInfoTitle: '📋 Thông tin lần đầu',
    intake: {
      gestationalWeeks: 'Tuần thai', birthWeight: 'Cân nặng khi sinh', birthNote: 'Ghi chú khi sinh',
      currentHeight: 'Chiều cao khi khám', currentWeight: 'Cân nặng khi khám', yearlyGrowth: 'Tăng trưởng/năm',
      grade: 'Lớp', heightRank: 'Xếp hạng chiều cao lớp', desiredHeight: 'Chiều cao mong muốn',
      fatherHeight: 'Chiều cao bố', motherHeight: 'Chiều cao mẹ', growthPattern: 'Kiểu tăng trưởng',
      pubertyStage: 'Giai đoạn dậy thì', growthConcerns: 'Ý kiến phụ huynh', pastConditions: 'Bệnh đã mắc',
    },
    unitWeeks: ' tuần', unitRank: ' (hạng)',
    photosTitle: (n) => `📷 Ảnh lần khám #${n}`,
    photoFront: 'Trước', photoSide: 'Bên', xrayFront: 'X-ray trước', xraySide: 'X-ray bên',
    prevSlide: 'Slide trước', nextSlide: 'Slide sau',
    slideNumber: (n) => `Slide ${n}`,
  },
};

export const CasesLangContext = createContext<CasesLang>('ko');
export function useCasesLang(): LabelDict {
  const lang = useContext(CasesLangContext);
  return DICT[lang] || DICT.ko;
}
export function useCasesLangCode(): CasesLang {
  return useContext(CasesLangContext);
}

// Direct accessor for the SectionCarousel root (which can't useContext on itself)
export function getCasesLabels(lang: CasesLang): LabelDict {
  return DICT[lang] || DICT.ko;
}

export function isCasesLang(value: string | null | undefined): value is CasesLang {
  return value === 'ko' || value === 'en' || value === 'th' || value === 'vi';
}

// ── 환자 이름 음역 ───────────────────────────────────────────────────────────
// 케이스 환자 데이터(website.json)의 이름은 한국어 원본 — 뷰어 언어로 소리나는 대로 표기.
// 등록된 이름만 매핑(현재 공개 케이스 7명), 미등록 이름은 원본 그대로(graceful).
const NAME_TRANSLIT: Record<string, Partial<Record<Exclude<CasesLang, 'ko'>, string>>> = {
  도훈: { en: 'Dohun', th: 'โดฮุน', vi: 'Do-hun' },
  민준: { en: 'Minjun', th: 'มินจุน', vi: 'Min-jun' },
  성재: { en: 'Seongjae', th: 'ซองแจ', vi: 'Seong-jae' },
  은우: { en: 'Eunwoo', th: 'อึนอู', vi: 'Eun-woo' },
  민수: { en: 'Minsu', th: 'มินซู', vi: 'Min-su' },
  민희: { en: 'Minhee', th: 'มินฮี', vi: 'Min-hee' },
  제임스: { en: 'James', th: 'เจมส์', vi: 'James' },
};

export function transliterateName(name: string | undefined, lang: CasesLang): string {
  const n = (name ?? '').trim();
  if (!n || lang === 'ko') return n;
  return NAME_TRANSLIT[n]?.[lang] ?? n;
}
