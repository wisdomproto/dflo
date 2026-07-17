// Locale-aware UI labels for the embedded HeightCalculator (used by /calc-embed iframe).
// CalcEmbedPage parses ?lang= and provides via context; the form/result components
// pick it up with useCalcLang(). Default 'ko' so the standalone modal flow on the
// main site keeps its Korean copy unchanged.

import { createContext, useContext } from 'react';

export type CalcLang = 'ko' | 'en' | 'th' | 'vi' | 'zh-hant' | 'zh-hans';

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
  // Nationality selector (growth standard) — EN calculator only
  fieldNationality: string;
  natKR: string;
  natTH: string;
  natCN: string;

  natUS: string;
  natID: string;
  // Per-standard chart source footer (EN only, keyed by GrowthStandard)
  natFooter?: Partial<Record<'KR' | 'TH' | 'CN' | 'US' | 'ID', string>>;
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
  // 결과 직후 상담 유도 맥락 — 백분위로 분기(하위 50% 미만=걱정 / 이상=최적화). 둘 다 "숫자만으론 부족→상담" 갈증 유발.
  ctaContextConcern: string;
  ctaContextOptimize: string;
  reportSecondary: string; // ko 전용 보조 CTA — 상담이 부담되는 사람에게 리포트를 부드러운 대안으로
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
    fieldNationality: '국적',
    natKR: '🇰🇷 한국', natTH: '🇹🇭 태국', natCN: '🇨🇳 중국', natUS: '🇺🇸 미국·호주',
    natID: '🇮🇩 인도네시아',
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
    kakaoCta: '💬 1:1 상담 받아보기',
    ctaContextConcern: '지금 또래보다 작은 편이에요. 성장판이 열려 있는 지금 살펴보는 게 좋아요 — 숫자만으로는 알 수 없는 부분을 1:1 상담에서 확인하세요.',
    ctaContextOptimize: '지금은 또래 평균 이상이에요. 잠재력을 끝까지 끌어올리려면, 숫자만으로는 알 수 없는 부분을 1:1 상담에서 확인해보세요.',
    reportSecondary: '📋 아직 상담이 부담되면 · 성장 리포트 먼저 받기',
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
    fieldNationality: 'Nationality',
    natKR: '🇰🇷 Korea', natTH: '🇹🇭 Thailand', natCN: '🇨🇳 China', natUS: '🇺🇸 US · AU',
    natID: '🇮🇩 Indonesia',
    natFooter: {
      KR: 'Korean pediatric growth standard (KDCA 2017) · 5th / 50th / 95th percentile',
      TH: 'Thai pediatric growth standard (TSPE 2022) · 5th / 50th / 95th percentile',
      CN: 'Chinese pediatric growth reference (approx.) · 5th / 50th / 95th percentile',
      ID: 'Indonesian national growth reference (INGRC) · 5th / 50th / 95th percentile',
      US: 'US CDC 2000 growth charts · also the national reference for Australia (ages 2-18) · 5th / 50th / 95th percentile',
    },
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
    kakaoCta: '💬 Get a 1:1 consultation',
    ctaContextConcern: 'Your child is currently shorter than peers. While the growth plates are still open, a closer look is worthwhile — a 1:1 consultation shows what the number alone can\'t.',
    ctaContextOptimize: 'Your child is currently above peer average. To make the most of that potential, a 1:1 consultation shows what the number alone can\'t.',
    reportSecondary: '📋 Not ready to talk yet? Get a detailed report first',
    casesLink: 'See real treatment cases →',
    reset: 'Measure again',
  },
  // 중국어 계산기는 국적 선택을 띄우지 않고 CN 성장 표준 고정(HeightCalculator 삼항 분기).
  // nat* 라벨은 타입 만족용(미표시)이고, 출처는 chartFooter 가 CN 을 가리킨다.
  'zh-hant': {
    pageTitle: '免費身高檢測',
    badge: '生長檢查',
    title: '預測孩子的成人身高',
    subtitle: '輸入幾項資訊，30 秒即可看到預測的成人身高',
    helpButtonAria: '說明',
    fieldGender: '性別',
    genderMale: '👦 男孩', genderFemale: '👧 女孩',
    fieldNationality: '國籍',
    natKR: '🇰🇷 韓國', natTH: '🇹🇭 泰國', natCN: '🇨🇳 中國', natUS: '🇺🇸 美國·澳洲',
    natID: '🇮🇩 印尼',
    fieldBirth: '出生日期',
    fieldBirthYear: '年', fieldBirthMonth: '月', fieldBirthDay: '日',
    fieldHeight: '目前身高（公分）',
    fieldWeight: '目前體重（公斤）',
    submit: '計算預測身高',
    submitHint: '只要輸入性別、出生日期與身高即可看到結果',
    helpTitle: '預測原理',
    helpPrincipleH: '📊 方法',
    helpPrincipleP: '本預測以<strong>國家標準生長數據</strong>為基礎，分析孩子在同齡同性別中的位置。',
    helpAdultH: '🎯 預測成人身高',
    helpAdultP: '假設孩子維持相同的百分位，我們以相同百分位回推 18 歲時的身高，來估算成人身高。',
    helpNoteH: '⚠️ 注意事項',
    helpNote1: '此為統計估算，未反映骨齡、生長激素或營養狀態。',
    helpNote2: '準確診斷需要骨齡檢查與專科諮詢。',
    helpNote3: '性早熟或慢性疾病的情況下結果可能不同。',
    resultTitle: '預測身高結果',
    resultLabel: '預測成人身高',
    resultGenderMale: '男孩', resultGenderFemale: '女孩',
    pillAge: (y, m) => `${y}歲 ${m}個月`,
    pillCurrent: (h, p) => `目前 ${h}cm · 第 ${p.toFixed(1)} 百分位`,
    chartFooter: '中國兒童生長參考 · 第 5 / 50 / 95 百分位',
    chartXAxis: '年齡（歲）', chartYAxis: '身高（公分）',
    chartPathLegend: '預測生長曲線',
    interpretH: '📋 判讀',
    interpretHigh: '目前高於同齡平均。持續的生長照護有助孩子發揮完整潛力。',
    interpretMid: '目前約在同齡平均。透過適當的營養、運動與睡眠，可進一步支持生長。',
    interpretLow: '略低於同齡平均。專科諮詢可釐清生長潛力。',
    interpretCritical: '比同齡矮——趁生長板仍開放，正是生長照護的黃金時期。',
    noteBoxPrincipleLabel: '📊 方法：',
    noteBoxPrincipleBody: '以國家標準生長數據為基礎，分析孩子在同齡中的位置。',
    noteBoxPredictedLabel: '🎯 預測身高：',
    noteBoxPredictedBody: '假設維持相同百分位，以相同百分位回推 18 歲時的身高。',
    noteBoxCautionLabel: '⚠️ 注意：',
    noteBoxCautionBody: '此為統計估算，未反映骨齡、生長激素或營養。準確診斷需專科諮詢。',
    kakaoCta: '💬 進行 1 對 1 諮詢',
    ctaContextConcern: '您的孩子目前比同齡矮。趁生長板仍開放，值得進一步了解——1 對 1 諮詢能看出單憑數字看不到的部分。',
    ctaContextOptimize: '您的孩子目前高於同齡平均。為了充分發揮這份潛力，1 對 1 諮詢能看出單憑數字看不到的部分。',
    reportSecondary: '📋 還沒準備好諮詢？先取得詳細報告',
    casesLink: '查看真實治療案例 →',
    reset: '重新測量',
  },
  'zh-hans': {
    pageTitle: '免费身高检测',
    badge: '生长检查',
    title: '预测孩子的成人身高',
    subtitle: '输入几项信息，30 秒即可看到预测的成人身高',
    helpButtonAria: '说明',
    fieldGender: '性别',
    genderMale: '👦 男孩', genderFemale: '👧 女孩',
    fieldNationality: '国籍',
    natKR: '🇰🇷 韩国', natTH: '🇹🇭 泰国', natCN: '🇨🇳 中国', natUS: '🇺🇸 美国·澳洲',
    natID: '🇮🇩 印尼',
    fieldBirth: '出生日期',
    fieldBirthYear: '年', fieldBirthMonth: '月', fieldBirthDay: '日',
    fieldHeight: '目前身高（厘米）',
    fieldWeight: '目前体重（公斤）',
    submit: '计算预测身高',
    submitHint: '只要输入性别、出生日期与身高即可看到结果',
    helpTitle: '预测原理',
    helpPrincipleH: '📊 方法',
    helpPrincipleP: '本预测以<strong>国家标准生长数据</strong>为基础，分析孩子在同龄同性别中的位置。',
    helpAdultH: '🎯 预测成人身高',
    helpAdultP: '假设孩子维持相同的百分位，我们以相同百分位回推 18 岁时的身高，来估算成人身高。',
    helpNoteH: '⚠️ 注意事项',
    helpNote1: '此为统计估算，未反映骨龄、生长激素或营养状态。',
    helpNote2: '准确诊断需要骨龄检查与专科咨询。',
    helpNote3: '性早熟或慢性疾病的情况下结果可能不同。',
    resultTitle: '预测身高结果',
    resultLabel: '预测成人身高',
    resultGenderMale: '男孩', resultGenderFemale: '女孩',
    pillAge: (y, m) => `${y}岁 ${m}个月`,
    pillCurrent: (h, p) => `目前 ${h}cm · 第 ${p.toFixed(1)} 百分位`,
    chartFooter: '中国儿童生长参考 · 第 5 / 50 / 95 百分位',
    chartXAxis: '年龄（岁）', chartYAxis: '身高（厘米）',
    chartPathLegend: '预测生长曲线',
    interpretH: '📋 判读',
    interpretHigh: '目前高于同龄平均。持续的生长护理有助孩子发挥完整潜力。',
    interpretMid: '目前约在同龄平均。通过适当的营养、运动与睡眠，可进一步支持生长。',
    interpretLow: '略低于同龄平均。专科咨询可厘清生长潜力。',
    interpretCritical: '比同龄矮——趁生长板仍开放，正是生长护理的黄金时期。',
    noteBoxPrincipleLabel: '📊 方法：',
    noteBoxPrincipleBody: '以国家标准生长数据为基础，分析孩子在同龄中的位置。',
    noteBoxPredictedLabel: '🎯 预测身高：',
    noteBoxPredictedBody: '假设维持相同百分位，以相同百分位回推 18 岁时的身高。',
    noteBoxCautionLabel: '⚠️ 注意：',
    noteBoxCautionBody: '此为统计估算，未反映骨龄、生长激素或营养。准确诊断需专科咨询。',
    kakaoCta: '💬 进行 1 对 1 咨询',
    ctaContextConcern: '您的孩子目前比同龄矮。趁生长板仍开放，值得进一步了解——1 对 1 咨询能看出单凭数字看不到的部分。',
    ctaContextOptimize: '您的孩子目前高于同龄平均。为了充分发挥这份潜力，1 对 1 咨询能看出单凭数字看不到的部分。',
    reportSecondary: '📋 还没准备好咨询？先获取详细报告',
    casesLink: '查看真实治疗案例 →',
    reset: '重新测量',
  },
  th: {
    pageTitle: 'วัดส่วนสูงฟรี',
    badge: 'ตรวจการเจริญเติบโต',
    title: 'คาดการณ์ส่วนสูงผู้ใหญ่ของลูก',
    subtitle: 'กรอกข้อมูลสั้น ๆ แล้วดูส่วนสูงผู้ใหญ่ที่คาดการณ์ได้ใน 30 วินาที',
    helpButtonAria: 'ช่วยเหลือ',
    fieldGender: 'เพศ',
    genderMale: '👦 เด็กชาย', genderFemale: '👧 เด็กหญิง',
    fieldNationality: 'สัญชาติ',
    natKR: '🇰🇷 เกาหลี', natTH: '🇹🇭 ไทย', natCN: '🇨🇳 จีน', natUS: '🇺🇸 สหรัฐฯ · ออสเตรเลีย',
    natID: '🇮🇩 อินโดนีเซีย',
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
    kakaoCta: '💬 ปรึกษาแบบ 1:1',
    ctaContextConcern: 'ตอนนี้ลูกตัวเล็กกว่าเพื่อนวัยเดียวกัน ขณะที่แผ่นกระดูกยังเปิดอยู่ ควรตรวจดูให้ละเอียด — ปรึกษา 1:1 เพื่อดูสิ่งที่ตัวเลขบอกไม่ได้',
    ctaContextOptimize: 'ตอนนี้ลูกสูงกว่าค่าเฉลี่ยของวัยเดียวกัน หากต้องการใช้ศักยภาพให้เต็มที่ ปรึกษา 1:1 เพื่อดูสิ่งที่ตัวเลขบอกไม่ได้',
    reportSecondary: '📋 ยังไม่พร้อมปรึกษา? รับรายงานโดยละเอียดก่อน',
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
    fieldNationality: 'Quốc tịch',
    natKR: '🇰🇷 Hàn Quốc', natTH: '🇹🇭 Thái Lan', natCN: '🇨🇳 Trung Quốc', natUS: '🇺🇸 Mỹ · Úc',
    natID: '🇮🇩 Indonesia',
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
    kakaoCta: '💬 Nhận tư vấn 1:1',
    ctaContextConcern: 'Con hiện thấp hơn bạn cùng tuổi. Khi sụn tăng trưởng còn mở, nên xem xét kỹ hơn — tư vấn 1:1 cho thấy điều mà con số không nói lên được.',
    ctaContextOptimize: 'Con hiện cao hơn mức trung bình. Để phát huy tối đa tiềm năng, tư vấn 1:1 cho thấy điều mà con số không nói lên được.',
    reportSecondary: '📋 Chưa sẵn sàng tư vấn? Nhận báo cáo chi tiết trước',
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
