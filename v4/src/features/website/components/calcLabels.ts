// Locale-aware UI labels for the embedded HeightCalculator (used by /calc-embed iframe).
// CalcEmbedPage parses ?lang= and provides via context; the form/result components
// pick it up with useCalcLang(). Default 'ko' so the standalone modal flow on the
// main site keeps its Korean copy unchanged.

import { createContext, useContext } from 'react';

export type CalcLang = 'ko' | 'en' | 'th' | 'vi';

type Dict = {
  // Form
  pageTitle: string;
  badge: string;
  title: string;
  subtitle: string;
  helpButtonAria: string;
  fieldGender: string;
  genderMale: string;
  genderFemale: string;
  fieldBirth: string;
  fieldBirthYear: string;
  fieldBirthMonth: string;
  fieldBirthDay: string;
  fieldHeight: string;
  fieldWeight: string;
  submit: string;
  submitHint: string; // 비활성 버튼 안내 — 생년월일·키 입력 유도
  // Help modal
  helpTitle: string;
  helpPrincipleH: string;  helpPrincipleP: string;
  helpAdultH: string;      helpAdultP: string;
  helpNoteH: string;
  helpNote1: string;
  helpNote2: string;
  helpNote3: string;
  // Result
  resultTitle: string;
  resultLabel: string;
  resultGenderMale: string;
  resultGenderFemale: string;
  // pillAgeFormat: function so '{years}세 {months}개월' adapts per locale
  pillAge: (years: number, months: number) => string;
  pillCurrent: (h: number, p: number) => string;
  chartFooter: string;
  chartXAxis: string;
  chartYAxis: string;
  chartPathLegend: string;
  interpretH: string;
  interpretHigh: string;
  interpretMid: string;
  interpretLow: string;
  interpretCritical: string;
  noteBoxPrincipleLabel: string;
  noteBoxPrincipleBody: string;
  noteBoxPredictedLabel: string;
  noteBoxPredictedBody: string;
  noteBoxCautionLabel: string;
  noteBoxCautionBody: string;
  kakaoCta: string;
  ctaContext: string; // 결과 직후 상담 유도 맥락 문구 (비슷한 사례는 상담에서 보내주는 약속)
  casesLink: string; // 공개 치료사례 페이지 링크 (유사성 주장 없이 담백하게)
  reset: string;
};

const DICT: Record<CalcLang, Dict> = {
  ko: {
    pageTitle: '예상키 측정',
    badge: '성장 진단',
    title: '우리 아이 예상 키 측정',
    subtitle: '간단한 정보만 입력하면 예상 성인 키를 바로 확인할 수 있어요',
    helpButtonAria: '도움말',
    fieldGender: '성별',
    genderMale: '👦 남아', genderFemale: '👧 여아',
    fieldBirth: '생년월일',
    fieldBirthYear: '연도', fieldBirthMonth: '월', fieldBirthDay: '일',
    fieldHeight: '현재 키 (cm)',
    fieldWeight: '현재 체중 (kg)',
    submit: '예상키 계산하기',
    submitHint: '성별·생년월일·키만 입력하면 바로 결과가 나와요',
    helpTitle: '예상키 측정 방법 안내',
    helpPrincipleH: '📊 측정 원리',
    helpPrincipleP: '본 예상키 계산은 <strong>국가 표준 성장 데이터</strong>를 기반으로, 같은 나이·성별 아이들 사이에서 우리 아이의 키가 어디쯤 위치하는지를 분석합니다.',
    helpAdultH: '🎯 예상 성인 키 계산',
    helpAdultP: '현재 키의 백분위를 유지한다는 가정 하에, 18세 시점의 동일 백분위 키를 역산하여 예상 성인 키를 산출합니다.',
    helpNoteH: '⚠️ 참고사항',
    helpNote1: '골연령, 성장호르몬 수치, 영양 상태 등은 반영되지 않은 통계적 추정치입니다.',
    helpNote2: '정확한 진단은 성장판 검사와 전문의 상담이 필요합니다.',
    helpNote3: '성조숙증이나 만성 질환이 있는 경우 결과가 달라질 수 있습니다.',
    resultTitle: '예상키 측정 결과',
    resultLabel: '예상 성인 키',
    resultGenderMale: '남아', resultGenderFemale: '여아',
    pillAge: (y, m) => `${y}세 ${m}개월`,
    pillCurrent: (h, p) => `현재 ${h}cm · 백분위 ${p.toFixed(1)}%`,
    chartFooter: '한국 소아 성장 표준 (2017 질병관리청) · 5th / 50th / 95th 백분위',
    chartXAxis: '나이(세)', chartYAxis: '키(cm)',
    chartPathLegend: '예상 성장 경로',
    interpretH: '📋 해석 가이드',
    interpretHigh: '현재 또래 대비 큰 편입니다. 꾸준한 성장 관리로 잠재력을 최대한 발휘할 수 있습니다.',
    interpretMid: '현재 또래 평균 수준입니다. 적절한 영양, 운동, 수면 관리로 더 클 수 있습니다.',
    interpretLow: '또래 평균보다 약간 작은 편입니다. 전문 상담을 통해 성장 가능성을 확인해보세요.',
    interpretCritical: '또래 대비 작은 편이므로, 성장판이 열려있는 지금이 성장 치료의 골든타임입니다.',
    noteBoxPrincipleLabel: '📊 측정 원리:',
    noteBoxPrincipleBody: '국가 표준 성장 데이터를 기반으로 또래 사이 위치를 분석',
    noteBoxPredictedLabel: '🎯 예상 키:',
    noteBoxPredictedBody: '현재 키의 백분위를 유지한다는 가정 하에 18세 시점의 동일 백분위 키를 역산',
    noteBoxCautionLabel: '⚠️ 참고:',
    noteBoxCautionBody: '골연령, 성장호르몬, 영양 상태 등은 반영되지 않은 통계적 추정치입니다. 정확한 진단은 전문의 상담이 필요합니다.',
    kakaoCta: '💬 전문 상담 받아보세요',
    ctaContext: '이 결과가 걱정되시나요? 1:1 상담으로 정밀 분석과 우리 아이와 비슷한 실제 치료 사례를 받아보실 수 있어요.',
    casesLink: '실제 치료 사례 보기 →',
    reset: '다시 측정하기',
  },
  en: {
    pageTitle: 'Free Height Check',
    badge: 'Growth check',
    title: "Predict your child's adult height",
    subtitle: 'Enter a few details and see the predicted adult height in 30 seconds',
    helpButtonAria: 'Help',
    fieldGender: 'Gender',
    genderMale: '👦 Boy', genderFemale: '👧 Girl',
    fieldBirth: 'Date of birth',
    fieldBirthYear: 'Year', fieldBirthMonth: 'Month', fieldBirthDay: 'Day',
    fieldHeight: 'Current height (cm)',
    fieldWeight: 'Current weight (kg)',
    submit: 'Calculate predicted height',
    submitHint: 'Just enter sex, date of birth and height to see the result',
    helpTitle: 'How the prediction works',
    helpPrincipleH: '📊 Method',
    helpPrincipleP: 'This prediction is based on <strong>national standard growth data</strong>, analyzing where your child stands among peers of the same age and sex.',
    helpAdultH: '🎯 Predicted adult height',
    helpAdultP: 'Assuming the child stays on the same percentile, we back-calculate the height at age 18 on the same percentile to estimate the adult height.',
    helpNoteH: '⚠️ Notes',
    helpNote1: 'A statistical estimate that does not reflect bone age, growth-hormone levels, or nutrition status.',
    helpNote2: 'Accurate diagnosis requires bone-age testing and a specialist consultation.',
    helpNote3: 'Results may differ in cases of precocious puberty or chronic conditions.',
    resultTitle: 'Predicted height result',
    resultLabel: 'Predicted adult height',
    resultGenderMale: 'Boy', resultGenderFemale: 'Girl',
    pillAge: (y, m) => `${y}y ${m}mo`,
    pillCurrent: (h, p) => `Now ${h}cm · ${p.toFixed(1)}th percentile`,
    chartFooter: 'Korean pediatric growth standard (KDCA 2017) · 5th / 50th / 95th percentile',
    chartXAxis: 'Age (years)', chartYAxis: 'Height (cm)',
    chartPathLegend: 'Predicted growth path',
    interpretH: '📋 Interpretation',
    interpretHigh: 'Currently above peer average. Steady growth care can help your child reach their full potential.',
    interpretMid: 'Currently around peer average. With proper nutrition, exercise, and sleep, growth can be further supported.',
    interpretLow: 'Slightly shorter than peer average. A specialist consultation can clarify growth potential.',
    interpretCritical: 'Shorter than peers — while the growth plates are still open, this is the golden window for growth care.',
    noteBoxPrincipleLabel: '📊 Method:',
    noteBoxPrincipleBody: 'Based on national standard growth data, analyzing your child\'s position among peers.',
    noteBoxPredictedLabel: '🎯 Predicted height:',
    noteBoxPredictedBody: 'Assuming the same percentile is maintained, the height at age 18 is back-calculated on the same percentile.',
    noteBoxCautionLabel: '⚠️ Note:',
    noteBoxCautionBody: 'A statistical estimate not reflecting bone age, growth-hormone levels, or nutrition. Accurate diagnosis requires a specialist consultation.',
    kakaoCta: '💬 Get a specialist consultation',
    ctaContext: 'Worried about this result? A 1:1 consultation gets you a detailed analysis plus real treatment cases similar to your child.',
    casesLink: 'See real treatment cases →',
    reset: 'Measure again',
  },
  th: {
    pageTitle: 'วัดส่วนสูงฟรี',
    badge: 'ตรวจการเจริญเติบโต',
    title: 'คาดการณ์ส่วนสูงผู้ใหญ่ของลูก',
    subtitle: 'กรอกข้อมูลสั้น ๆ แล้วดูส่วนสูงผู้ใหญ่ที่คาดการณ์ได้ใน 30 วินาที',
    helpButtonAria: 'ช่วยเหลือ',
    fieldGender: 'เพศ',
    genderMale: '👦 เด็กชาย', genderFemale: '👧 เด็กหญิง',
    fieldBirth: 'วันเกิด',
    fieldBirthYear: 'ปี', fieldBirthMonth: 'เดือน', fieldBirthDay: 'วัน',
    fieldHeight: 'ส่วนสูงปัจจุบัน (ซม.)',
    fieldWeight: 'น้ำหนักปัจจุบัน (กก.)',
    submit: 'คำนวณส่วนสูงที่คาดการณ์',
    submitHint: 'แค่กรอกเพศ วันเกิด และส่วนสูง ก็เห็นผลได้ทันที',
    helpTitle: 'วิธีคำนวณส่วนสูงที่คาดการณ์',
    helpPrincipleH: '📊 หลักการคำนวณ',
    helpPrincipleP: 'การคำนวณนี้อ้างอิงจาก <strong>ข้อมูลมาตรฐานการเจริญเติบโตของเด็กไทย</strong> โดยวิเคราะห์ว่าส่วนสูงของลูกอยู่ตรงไหนเมื่อเทียบกับเด็กวัยและเพศเดียวกัน',
    helpAdultH: '🎯 การคำนวณส่วนสูงผู้ใหญ่',
    helpAdultP: 'สมมุติว่าเด็กอยู่ในเปอร์เซ็นไทล์เดียวกันต่อไป จะคำนวณย้อนกลับหาส่วนสูงที่อายุ 18 ปีในเปอร์เซ็นไทล์เดียวกันเพื่อประมาณส่วนสูงผู้ใหญ่',
    helpNoteH: '⚠️ ข้อควรทราบ',
    helpNote1: 'เป็นการประมาณทางสถิติที่ไม่ได้รวมอายุกระดูก ระดับโกรทฮอร์โมน หรือภาวะโภชนาการ',
    helpNote2: 'การวินิจฉัยที่แม่นยำต้องตรวจอายุกระดูกและปรึกษาแพทย์ผู้เชี่ยวชาญ',
    helpNote3: 'ผลอาจแตกต่างในกรณีวัยรุ่นก่อนกำหนดหรือโรคเรื้อรัง',
    resultTitle: 'ผลคาดการณ์ส่วนสูง',
    resultLabel: 'ส่วนสูงผู้ใหญ่ที่คาดการณ์',
    resultGenderMale: 'เด็กชาย', resultGenderFemale: 'เด็กหญิง',
    pillAge: (y, m) => `${y} ปี ${m} เดือน`,
    pillCurrent: (h, p) => `ปัจจุบัน ${h}ซม. · เปอร์เซ็นไทล์ที่ ${p.toFixed(1)}`,
    chartFooter: 'มาตรฐานการเจริญเติบโตเด็กไทย (TSPE 2022) · เปอร์เซ็นไทล์ที่ 5 / 50 / 95',
    chartXAxis: 'อายุ (ปี)', chartYAxis: 'ส่วนสูง (ซม.)',
    chartPathLegend: 'เส้นทางการเติบโตคาดการณ์',
    interpretH: '📋 การตีความ',
    interpretHigh: 'ขณะนี้อยู่สูงกว่าค่าเฉลี่ยของวัยเดียวกัน การดูแลการเติบโตอย่างต่อเนื่องจะช่วยให้ศักยภาพเต็มที่',
    interpretMid: 'ขณะนี้อยู่ในระดับค่าเฉลี่ย ด้วยโภชนาการ การออกกำลังกาย และการนอนที่ดีจะช่วยให้เติบโตต่อได้',
    interpretLow: 'ต่ำกว่าค่าเฉลี่ยเล็กน้อย การปรึกษาผู้เชี่ยวชาญจะช่วยตรวจศักยภาพการเติบโต',
    interpretCritical: 'ตัวเล็กกว่าวัยเดียวกัน ขณะแผ่นกระดูกอ่อนยังเปิดอยู่คือช่วงเวลาทองสำหรับการดูแล',
    noteBoxPrincipleLabel: '📊 หลักการ:',
    noteBoxPrincipleBody: 'อ้างอิงข้อมูลมาตรฐานการเจริญเติบโตของเด็กไทย วิเคราะห์ตำแหน่งเทียบกับเด็กวัยเดียวกัน',
    noteBoxPredictedLabel: '🎯 ส่วนสูงคาดการณ์:',
    noteBoxPredictedBody: 'สมมุติเปอร์เซ็นไทล์คงที่ คำนวณย้อนหาส่วนสูงที่อายุ 18 ปีในเปอร์เซ็นไทล์เดียวกัน',
    noteBoxCautionLabel: '⚠️ หมายเหตุ:',
    noteBoxCautionBody: 'เป็นการประมาณทางสถิติที่ไม่ได้รวมอายุกระดูก โกรทฮอร์โมน หรือโภชนาการ การวินิจฉัยที่แม่นยำต้องปรึกษาแพทย์',
    kakaoCta: '💬 ปรึกษาผู้เชี่ยวชาญ',
    ctaContext: 'กังวลกับผลลัพธ์นี้ไหม? ปรึกษา 1:1 เพื่อรับการวิเคราะห์เชิงลึก พร้อมเคสรักษาจริงที่ใกล้เคียงกับลูกของคุณ',
    casesLink: 'ดูเคสรักษาจริง →',
    reset: 'วัดอีกครั้ง',
  },
  vi: {
    pageTitle: 'Đo chiều cao miễn phí',
    badge: 'Kiểm tra tăng trưởng',
    title: 'Dự đoán chiều cao trưởng thành của con',
    subtitle: 'Nhập vài thông tin để xem chiều cao trưởng thành dự đoán trong 30 giây',
    helpButtonAria: 'Trợ giúp',
    fieldGender: 'Giới tính',
    genderMale: '👦 Bé trai', genderFemale: '👧 Bé gái',
    fieldBirth: 'Ngày sinh',
    fieldBirthYear: 'Năm', fieldBirthMonth: 'Tháng', fieldBirthDay: 'Ngày',
    fieldHeight: 'Chiều cao hiện tại (cm)',
    fieldWeight: 'Cân nặng hiện tại (kg)',
    submit: 'Tính chiều cao dự đoán',
    submitHint: 'Chỉ cần nhập giới tính, ngày sinh và chiều cao là có kết quả',
    helpTitle: 'Cách tính chiều cao dự đoán',
    helpPrincipleH: '📊 Nguyên lý',
    helpPrincipleP: 'Tính toán này dựa trên <strong>dữ liệu chuẩn tăng trưởng quốc gia</strong>, phân tích vị trí chiều cao của trẻ so với bạn cùng tuổi và giới tính.',
    helpAdultH: '🎯 Tính chiều cao trưởng thành',
    helpAdultP: 'Giả định trẻ duy trì cùng phân vị, chúng tôi tính ngược chiều cao ở tuổi 18 trên cùng phân vị để ước tính chiều cao trưởng thành.',
    helpNoteH: '⚠️ Lưu ý',
    helpNote1: 'Đây là ước tính thống kê, chưa tính đến tuổi xương, mức hormone tăng trưởng hay tình trạng dinh dưỡng.',
    helpNote2: 'Chẩn đoán chính xác cần kiểm tra tuổi xương và tư vấn của bác sĩ chuyên khoa.',
    helpNote3: 'Kết quả có thể khác trong trường hợp dậy thì sớm hoặc bệnh mãn tính.',
    resultTitle: 'Kết quả dự đoán chiều cao',
    resultLabel: 'Chiều cao trưởng thành dự đoán',
    resultGenderMale: 'Bé trai', resultGenderFemale: 'Bé gái',
    pillAge: (y, m) => `${y} tuổi ${m} tháng`,
    pillCurrent: (h, p) => `Hiện tại ${h}cm · phân vị ${p.toFixed(1)}%`,
    chartFooter: 'Chuẩn tăng trưởng nhi Hàn Quốc (KDCA 2017) · phân vị 5 / 50 / 95',
    chartXAxis: 'Tuổi (năm)', chartYAxis: 'Chiều cao (cm)',
    chartPathLegend: 'Đường tăng trưởng dự đoán',
    interpretH: '📋 Cách hiểu',
    interpretHigh: 'Hiện cao hơn mức trung bình của bạn cùng tuổi. Chăm sóc đều đặn sẽ phát huy tối đa tiềm năng.',
    interpretMid: 'Đang quanh mức trung bình. Dinh dưỡng, vận động và giấc ngủ tốt sẽ giúp con cao hơn.',
    interpretLow: 'Hơi thấp hơn mức trung bình. Tư vấn chuyên gia sẽ giúp xem xét tiềm năng tăng trưởng.',
    interpretCritical: 'Thấp hơn bạn cùng tuổi — sụn tăng trưởng đang còn mở chính là thời điểm vàng để chăm sóc.',
    noteBoxPrincipleLabel: '📊 Nguyên lý:',
    noteBoxPrincipleBody: 'Dựa trên dữ liệu chuẩn tăng trưởng quốc gia, phân tích vị trí so với bạn cùng tuổi.',
    noteBoxPredictedLabel: '🎯 Chiều cao dự đoán:',
    noteBoxPredictedBody: 'Giả định cùng phân vị, tính ngược chiều cao ở tuổi 18 trên cùng phân vị.',
    noteBoxCautionLabel: '⚠️ Lưu ý:',
    noteBoxCautionBody: 'Là ước tính thống kê chưa tính tuổi xương, hormone tăng trưởng, hay dinh dưỡng. Chẩn đoán chính xác cần tư vấn bác sĩ.',
    kakaoCta: '💬 Nhận tư vấn chuyên gia',
    ctaContext: 'Lo lắng về kết quả này? Tư vấn 1:1 để nhận phân tích chuyên sâu cùng các ca điều trị thực tế giống con bạn.',
    casesLink: 'Xem ca điều trị thực tế →',
    reset: 'Đo lại',
  },
};

export const CalcLangContext = createContext<CalcLang>('ko');

export function useCalcLang(): Dict {
  const lang = useContext(CalcLangContext);
  return DICT[lang] || DICT.ko;
}

export function getCalcLabels(lang: CalcLang): Dict {
  return DICT[lang] || DICT.ko;
}

export function isCalcLang(value: string | null | undefined): value is CalcLang {
  return value === 'ko' || value === 'en' || value === 'th' || value === 'vi';
}
