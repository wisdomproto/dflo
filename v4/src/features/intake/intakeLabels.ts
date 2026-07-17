// Locale-aware UI labels for the patient self-service intake survey wizard.
// Follows the same pattern as calcLabels.ts in features/website/components.

import type { IntakeLang } from './types';

export const LANG_DEFAULT_COUNTRY: Record<IntakeLang, string> = {
  ko: 'KR',
  th: 'TH',
  vi: 'VN',
  en: 'US',
};

export interface IntakeLabelSet {
  pageTitle: string;
  stepOf: (n: number, total: number) => string;
  next: string;
  prev: string;
  submit: string;
  submitting: string;
  doneTitle: string;
  doneBody: string;
  retry: string;
  required: string;
  // step titles
  s1Title: string;
  s2Title: string;
  s3Title: string;
  s4Title: string;
  s5Title: string;
  s6Title: string;
  // step1 basic info
  name: string;
  nameEn: string;
  gender: string;
  male: string;
  female: string;
  birth: string;
  year: string;
  month: string;
  day: string;
  country: string;
  fatherH: string;
  motherH: string;
  desiredH: string;
  currentH: string;
  currentW: string;
  grade: string;
  classRank: string;
  phone: string;
  email: string;
  address: string;
  // step1 birth info
  gestWeeks: string;
  birthWeight: string;
  birthNote: string;
  // step2 growth history
  growthHint: string;
  ageCol: string;
  heightCol: string;
  yearlyGrowth: string;
  flagRapid: string;
  flagSlowed: string;
  flagPuberty: string;
  // step3 family/interest (yes/no questions)
  yes: string;
  no: string;
  pastConsult: string;
  parentsInterested: string;
  sportsAthlete: string;
  sportsEvent: string;
  childInterested: string;
  // lifestyle step
  sLifeTitle: string;
  sleepTime: string;
  wakeTime: string;
  exerciseFreq: string;
  exerciseOpts: { value: string; label: string }[];
  milkDaily: string;
  milkOpts: { value: string; label: string }[];
  mealReg: string;
  mealOpts: { value: string; label: string }[];
  // step4 medical
  chronic: string;
  tanner: string;
  tannerOpts: string[]; // EXACTLY 5 entries, Tanner stage 1..5 lay-friendly descriptions
  currentMeds: string;
  // step4 puberty detail (gender-branched)
  voiceChange: string;
  voiceOpts: { value: string; label: string }[];
  facialHair: string;
  facialOpts: { value: string; label: string }[];
  menarche: string;
  menarcheOpts: { value: string; label: string }[];
  breastDev: string;
  breastOpts: { value: string; label: string }[];
  // step5 short-stature causes
  causes: string;
  causeOpts: { value: string; label: string }[];
  causesOther: string;
  additionalNotes: string;
  // step3 acquisition channel
  acquisitionChannel: string;
  acquisitionChannelOpts: { value: string; label: string }[];
  // step6 uploads
  xrayUpload: string;
  labUpload: string;
  uploadHint: string;
}

export const INTAKE_LABELS: Record<IntakeLang, IntakeLabelSet> = {
  ko: {
    pageTitle: '187 성장클리닉 사전 문진',
    stepOf: (n, t) => `${n} / ${t} 단계`,
    next: '다음',
    prev: '이전',
    submit: '제출하기',
    submitting: '제출 중...',
    doneTitle: '감사합니다',
    doneBody: '설문이 접수되었습니다. 곧 연락드리겠습니다.',
    retry: '다시 시도',
    required: '필수 항목입니다',
    s1Title: '기본 정보',
    s2Title: '과거 성장표',
    s3Title: '가족 · 관심도',
    s4Title: '의료 · 발달',
    s5Title: '키가 작은 원인',
    s6Title: '검사 파일 첨부',
    name: '이름',
    nameEn: '영문 이름',
    gender: '성별',
    male: '남아',
    female: '여아',
    birth: '생년월일',
    year: '년',
    month: '월',
    day: '일',
    country: '국적',
    fatherH: '아버지 키 (cm)',
    motherH: '어머니 키 (cm)',
    desiredH: '희망 키 (cm)',
    currentH: '현재 키 (cm)',
    currentW: '현재 몸무게 (kg)',
    grade: '학년',
    classRank: '학급 내 키번호',
    phone: '연락처',
    email: '이메일',
    address: '거주지',
    gestWeeks: '출생 시 임신 주수 (주)',
    birthWeight: '출생 시 몸무게 (kg)',
    birthNote: '출생 시 특이사항',
    growthHint: '생활기록부 또는 소아과 기록을 참고해 입력해 주세요.',
    ageCol: '나이 (학년)',
    heightCol: '키 (cm)',
    yearlyGrowth: '최근 1년간 자란 키 (cm)',
    flagRapid: '최근 키가 부쩍 많이 자란다',
    flagSlowed: '최근 크는 속도가 급격히 줄었다',
    flagPuberty: '성조숙증이 걱정된다',
    yes: '예',
    no: '아니오',
    pastConsult: '과거 성장 클리닉에서 상담해 본 적이 있습니까?',
    parentsInterested: '양측 부모님 모두 성장 클리닉에 관심이 있으십니까?',
    sportsAthlete: '체육 특기생입니까?',
    sportsEvent: '종목',
    childInterested: '아이도 키 크는 것에 관심이 있습니까?',
    acquisitionChannel: '저희를 어떻게 알게 되셨나요?',
    acquisitionChannelOpts: [
      { value: 'google', label: '구글 검색' },
      { value: 'naver', label: '네이버 검색' },
      { value: 'instagram', label: '인스타그램' },
      { value: 'facebook', label: '페이스북' },
      { value: 'youtube', label: '유튜브' },
      { value: 'referral', label: '지인 소개' },
      { value: 'ai', label: 'ChatGPT 등 AI' },
      { value: 'other', label: '기타' },
    ],
    sLifeTitle: '생활 습관',
    sleepTime: '취침 시간',
    wakeTime: '기상 시간',
    exerciseFreq: '운동 빈도',
    exerciseOpts: [
      { value: 'none', label: '거의 안 함' },
      { value: 'week1_2', label: '주 1~2회' },
      { value: 'week3_4', label: '주 3~4회' },
      { value: 'daily', label: '매일' },
    ],
    milkDaily: '우유/유제품 섭취',
    milkOpts: [
      { value: 'none', label: '거의 안 먹음' },
      { value: 'sometimes', label: '가끔 (주 2~3회)' },
      { value: 'daily1', label: '매일 1잔' },
      { value: 'daily2plus', label: '매일 2잔 이상' },
    ],
    mealReg: '식사 규칙성',
    mealOpts: [
      { value: 'irregular', label: '불규칙' },
      { value: 'mostly_regular', label: '대체로 규칙적' },
      { value: 'very_regular', label: '매우 규칙적' },
    ],
    chronic: '과거 또는 현재 치료 중인 질환이 있다면 적어 주세요.',
    tanner: '사춘기 단계 (Tanner 단계)',
    tannerOpts: [
      '1단계 — 아직 사춘기 변화가 없음',
      '2단계 — 사춘기 변화가 막 시작됨',
      '3단계 — 사춘기 변화가 눈에 띄게 진행 중',
      '4단계 — 사춘기가 거의 완성됨',
      '5단계 — 사춘기 완료, 성인 체형',
    ],
    currentMeds: '현재 복용 중인 약/영양제',
    voiceChange: '변성기 (목소리 변화)',
    voiceOpts: [
      { value: 'none', label: '아직 없음' },
      { value: 'started', label: '시작됨' },
      { value: 'done', label: '완료됨' },
    ],
    facialHair: '수염/체모',
    facialOpts: [
      { value: 'none', label: '없음' },
      { value: 'fuzz', label: '솜털 정도' },
      { value: 'clear', label: '뚜렷하게 있음' },
    ],
    menarche: '초경 여부',
    menarcheOpts: [
      { value: 'none', label: '아직 없음' },
      { value: 'recent6m', label: '시작됨 (최근 6개월 내)' },
      { value: 'over1y', label: '1년 이상 됨' },
    ],
    breastDev: '유방 발달',
    breastOpts: [
      { value: 'none', label: '발달 전' },
      { value: 'budding', label: '봉우리 시작' },
      { value: 'clear', label: '뚜렷한 발달' },
    ],
    causes: '키가 작은 원인 (해당하는 것 모두 선택)',
    causeOpts: [
      { value: 'parents_short', label: '부모님의 키가 작다' },
      { value: 'parents_height_gap', label: '부모님의 키 차이가 크다' },
      { value: 'picky_eating', label: '편식 · 식사 부족' },
      { value: 'parents_early_stop', label: '부모님이 어렸을 때 일찍 성장이 멈췄다' },
      { value: 'insufficient_sleep', label: '수면 시간이 부족하다' },
      { value: 'chronic_illness', label: '지속 치료 중인 질환이 있다' },
    ],
    causesOther: '기타 원인',
    additionalNotes: '추가 메모 (궁금한 점, 참고사항)',
    xrayUpload: 'X-ray 파일 첨부',
    labUpload: '검사 결과지 첨부',
    uploadHint: '이미지 또는 PDF 파일을 첨부해 주세요. (선택 사항)',
  },

  th: {
    pageTitle: 'แบบสอบถามก่อนพบแพทย์ 187 Growth Clinic',
    stepOf: (n, t) => `ขั้นตอน ${n} / ${t}`,
    next: 'ถัดไป',
    prev: 'ย้อนกลับ',
    submit: 'ส่งแบบฟอร์ม',
    submitting: 'กำลังส่ง...',
    doneTitle: 'ขอบคุณครับ',
    doneBody: 'ได้รับแบบสอบถามของคุณแล้ว ทางคลินิกจะติดต่อกลับในเร็ว ๆ นี้',
    retry: 'ลองอีกครั้ง',
    required: 'กรุณากรอกข้อมูลนี้',
    s1Title: 'ข้อมูลพื้นฐาน',
    s2Title: 'ประวัติการเจริญเติบโต',
    s3Title: 'ครอบครัว · ความสนใจ',
    s4Title: 'ประวัติสุขภาพ · พัฒนาการ',
    s5Title: 'สาเหตุส่วนสูงน้อย',
    s6Title: 'แนบไฟล์ผลตรวจ',
    name: 'ชื่อ-นามสกุล',
    nameEn: 'ชื่อภาษาอังกฤษ',
    gender: 'เพศ',
    male: 'เด็กชาย',
    female: 'เด็กหญิง',
    birth: 'วันเกิด',
    year: 'ปี',
    month: 'เดือน',
    day: 'วัน',
    country: 'สัญชาติ',
    fatherH: 'ส่วนสูงของพ่อ (ซม.)',
    motherH: 'ส่วนสูงของแม่ (ซม.)',
    desiredH: 'ส่วนสูงที่ต้องการ (ซม.)',
    currentH: 'ส่วนสูงปัจจุบัน (ซม.)',
    currentW: 'น้ำหนักปัจจุบัน (กก.)',
    grade: 'ระดับชั้น',
    classRank: 'ลำดับส่วนสูงในชั้น',
    phone: 'เบอร์โทรศัพท์',
    email: 'อีเมล',
    address: 'ที่อยู่',
    gestWeeks: 'อายุครรภ์ตอนคลอด (สัปดาห์)',
    birthWeight: 'น้ำหนักแรกเกิด (กก.)',
    birthNote: 'ภาวะพิเศษตอนแรกเกิด (ถ้ามี)',
    growthHint: 'กรุณากรอกข้อมูลจากสมุดพัฒนาการหรือเวชระเบียนกุมารแพทย์',
    ageCol: 'อายุ (ชั้นเรียน)',
    heightCol: 'ส่วนสูง (ซม.)',
    yearlyGrowth: 'ส่วนสูงที่เพิ่มขึ้นใน 1 ปีที่ผ่านมา (ซม.)',
    flagRapid: 'ช่วงนี้สูงขึ้นเร็วผิดปกติ',
    flagSlowed: 'การเจริญเติบโตชะลอลงอย่างเห็นได้ชัด',
    flagPuberty: 'กังวลเรื่องวัยรุ่นก่อนกำหนด',
    yes: 'ใช่',
    no: 'ไม่ใช่',
    pastConsult: 'เคยปรึกษาคลินิกด้านการเจริญเติบโตมาก่อนหรือไม่?',
    parentsInterested: 'ผู้ปกครองทั้งสองฝ่ายสนใจเรื่องการดูแลการเจริญเติบโตหรือไม่?',
    sportsAthlete: 'เด็กเป็นนักกีฬาหรือสมาชิกทีมกีฬาหรือไม่?',
    sportsEvent: 'ชนิดกีฬา',
    childInterested: 'เด็กสนใจที่จะสูงขึ้นด้วยตนเองหรือไม่?',
    acquisitionChannel: 'คุณรู้จักเราได้อย่างไร?',
    acquisitionChannelOpts: [
      { value: 'google', label: 'ค้นหา Google' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'referral', label: 'แนะนำจากคนรู้จัก' },
      { value: 'ai', label: 'AI (เช่น ChatGPT)' },
      { value: 'other', label: 'อื่นๆ' },
    ],
    sLifeTitle: 'พฤติกรรมการใช้ชีวิต',
    sleepTime: 'เวลาเข้านอน',
    wakeTime: 'เวลาตื่นนอน',
    exerciseFreq: 'ความถี่ในการออกกำลังกาย',
    exerciseOpts: [
      { value: 'none', label: 'แทบไม่ออกกำลังกาย' },
      { value: 'week1_2', label: '1–2 ครั้ง/สัปดาห์' },
      { value: 'week3_4', label: '3–4 ครั้ง/สัปดาห์' },
      { value: 'daily', label: 'ทุกวัน' },
    ],
    milkDaily: 'การดื่มนม / ผลิตภัณฑ์จากนม',
    milkOpts: [
      { value: 'none', label: 'แทบไม่ดื่ม' },
      { value: 'sometimes', label: 'บางครั้ง (2–3 ครั้ง/สัปดาห์)' },
      { value: 'daily1', label: 'วันละ 1 แก้ว' },
      { value: 'daily2plus', label: 'วันละ 2 แก้วขึ้นไป' },
    ],
    mealReg: 'ความสม่ำเสมอของมื้ออาหาร',
    mealOpts: [
      { value: 'irregular', label: 'ไม่สม่ำเสมอ' },
      { value: 'mostly_regular', label: 'ค่อนข้างสม่ำเสมอ' },
      { value: 'very_regular', label: 'สม่ำเสมอมาก' },
    ],
    chronic: 'กรุณาระบุโรคประจำตัวหรือโรคที่กำลังรักษาอยู่ (ถ้ามี)',
    tanner: 'ระยะวัยรุ่น (Tanner Stage)',
    tannerOpts: [
      'ระยะที่ 1 — ยังไม่มีสัญญาณวัยรุ่น',
      'ระยะที่ 2 — เริ่มมีการเปลี่ยนแปลงในช่วงวัยรุ่น',
      'ระยะที่ 3 — มีการเปลี่ยนแปลงอย่างชัดเจน',
      'ระยะที่ 4 — ใกล้เสร็จสิ้นวัยรุ่นแล้ว',
      'ระยะที่ 5 — วัยรุ่นสมบูรณ์, ร่างกายผู้ใหญ่',
    ],
    currentMeds: 'ยาหรืออาหารเสริมที่รับประทานอยู่',
    voiceChange: 'เสียงแตกหนุ่ม (เสียงเปลี่ยน)',
    voiceOpts: [
      { value: 'none', label: 'ยังไม่มี' },
      { value: 'started', label: 'เริ่มแล้ว' },
      { value: 'done', label: 'เสียงเปลี่ยนสมบูรณ์แล้ว' },
    ],
    facialHair: 'หนวด / ขนตามร่างกาย',
    facialOpts: [
      { value: 'none', label: 'ไม่มี' },
      { value: 'fuzz', label: 'มีขนอ่อนเล็กน้อย' },
      { value: 'clear', label: 'เห็นได้ชัดเจน' },
    ],
    menarche: 'ประจำเดือนครั้งแรก',
    menarcheOpts: [
      { value: 'none', label: 'ยังไม่มี' },
      { value: 'recent6m', label: 'เริ่มแล้ว (ภายใน 6 เดือนที่ผ่านมา)' },
      { value: 'over1y', label: 'มามากกว่า 1 ปีแล้ว' },
    ],
    breastDev: 'พัฒนาการของเต้านม',
    breastOpts: [
      { value: 'none', label: 'ยังไม่เริ่ม' },
      { value: 'budding', label: 'เริ่มเป็นตุ่มเล็ก' },
      { value: 'clear', label: 'พัฒนาชัดเจน' },
    ],
    causes: 'สาเหตุที่ทำให้ส่วนสูงน้อย (เลือกได้หลายข้อ)',
    causeOpts: [
      { value: 'parents_short', label: 'พ่อแม่ตัวเตี้ย' },
      { value: 'parents_height_gap', label: 'ส่วนสูงน้อยกว่าที่คาดจากพ่อแม่' },
      { value: 'picky_eating', label: 'กินอาหารเลือก / ทานน้อย' },
      { value: 'parents_early_stop', label: 'พ่อหรือแม่หยุดสูงเร็วผิดปกติ' },
      { value: 'insufficient_sleep', label: 'นอนหลับไม่เพียงพอ' },
      { value: 'chronic_illness', label: 'มีโรคประจำตัว' },
    ],
    causesOther: 'สาเหตุอื่น ๆ',
    additionalNotes: 'หมายเหตุเพิ่มเติม (ข้อสงสัยหรือข้อมูลอ้างอิง)',
    xrayUpload: 'แนบไฟล์ X-ray',
    labUpload: 'แนบผลตรวจเลือดหรือผลแล็บ',
    uploadHint: 'แนบรูปภาพหรือไฟล์ PDF (ไม่บังคับ)',
  },

  vi: {
    pageTitle: 'Phiếu khảo sát trước khám — 187 Growth Clinic',
    stepOf: (n, t) => `Bước ${n} / ${t}`,
    next: 'Tiếp theo',
    prev: 'Quay lại',
    submit: 'Gửi phiếu',
    submitting: 'Đang gửi...',
    doneTitle: 'Cảm ơn bạn',
    doneBody: 'Phiếu khảo sát đã được tiếp nhận. Chúng tôi sẽ liên hệ sớm.',
    retry: 'Thử lại',
    required: 'Vui lòng điền thông tin này',
    s1Title: 'Thông tin cơ bản',
    s2Title: 'Lịch sử tăng trưởng',
    s3Title: 'Gia đình · Mức độ quan tâm',
    s4Title: 'Sức khỏe · Phát triển',
    s5Title: 'Nguyên nhân thấp còi',
    s6Title: 'Đính kèm file kết quả',
    name: 'Họ và tên',
    nameEn: 'Tên tiếng Anh',
    gender: 'Giới tính',
    male: 'Bé trai',
    female: 'Bé gái',
    birth: 'Ngày sinh',
    year: 'Năm',
    month: 'Tháng',
    day: 'Ngày',
    country: 'Quốc tịch',
    fatherH: 'Chiều cao của bố (cm)',
    motherH: 'Chiều cao của mẹ (cm)',
    desiredH: 'Chiều cao mong muốn (cm)',
    currentH: 'Chiều cao hiện tại (cm)',
    currentW: 'Cân nặng hiện tại (kg)',
    grade: 'Lớp học',
    classRank: 'Thứ hạng chiều cao trong lớp',
    phone: 'Số điện thoại',
    email: 'Email',
    address: 'Địa chỉ',
    gestWeeks: 'Tuần thai khi sinh (tuần)',
    birthWeight: 'Cân nặng khi sinh (kg)',
    birthNote: 'Điểm đặc biệt khi sinh (nếu có)',
    growthHint: 'Vui lòng điền dựa trên học bạ hoặc hồ sơ y tế nhi khoa.',
    ageCol: 'Tuổi (lớp)',
    heightCol: 'Chiều cao (cm)',
    yearlyGrowth: 'Chiều cao tăng trong 1 năm qua (cm)',
    flagRapid: 'Gần đây tăng chiều cao rất nhanh',
    flagSlowed: 'Tốc độ tăng trưởng giảm rõ rệt gần đây',
    flagPuberty: 'Lo lắng về dậy thì sớm',
    yes: 'Có',
    no: 'Không',
    pastConsult: 'Trước đây có từng tư vấn tại phòng khám tăng trưởng chưa?',
    parentsInterested: 'Cả hai phụ huynh có quan tâm đến việc theo dõi tăng trưởng không?',
    sportsAthlete: 'Trẻ có tham gia đội thể thao hoặc là vận động viên không?',
    sportsEvent: 'Môn thể thao',
    childInterested: 'Bản thân trẻ có muốn cao hơn không?',
    acquisitionChannel: 'Bạn biết đến chúng tôi qua đâu?',
    acquisitionChannelOpts: [
      { value: 'google', label: 'Tìm kiếm Google' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'referral', label: 'Người quen giới thiệu' },
      { value: 'ai', label: 'AI (ChatGPT, v.v.)' },
      { value: 'other', label: 'Khác' },
    ],
    sLifeTitle: 'Thói quen sinh hoạt',
    sleepTime: 'Giờ đi ngủ',
    wakeTime: 'Giờ thức dậy',
    exerciseFreq: 'Tần suất vận động',
    exerciseOpts: [
      { value: 'none', label: 'Hầu như không' },
      { value: 'week1_2', label: '1–2 lần/tuần' },
      { value: 'week3_4', label: '3–4 lần/tuần' },
      { value: 'daily', label: 'Hằng ngày' },
    ],
    milkDaily: 'Uống sữa / chế phẩm từ sữa',
    milkOpts: [
      { value: 'none', label: 'Hầu như không' },
      { value: 'sometimes', label: 'Thỉnh thoảng (2–3 lần/tuần)' },
      { value: 'daily1', label: 'Mỗi ngày 1 ly' },
      { value: 'daily2plus', label: 'Mỗi ngày từ 2 ly trở lên' },
    ],
    mealReg: 'Mức độ đều đặn của bữa ăn',
    mealOpts: [
      { value: 'irregular', label: 'Không đều đặn' },
      { value: 'mostly_regular', label: 'Khá đều đặn' },
      { value: 'very_regular', label: 'Rất đều đặn' },
    ],
    chronic: 'Vui lòng ghi lại bệnh lý đang điều trị hoặc bệnh mãn tính (nếu có).',
    tanner: 'Giai đoạn dậy thì (Tanner Stage)',
    tannerOpts: [
      'Giai đoạn 1 — Chưa có dấu hiệu dậy thì',
      'Giai đoạn 2 — Bắt đầu có thay đổi dậy thì',
      'Giai đoạn 3 — Thay đổi rõ ràng đang diễn ra',
      'Giai đoạn 4 — Gần hoàn tất dậy thì',
      'Giai đoạn 5 — Dậy thì hoàn toàn, cơ thể người lớn',
    ],
    currentMeds: 'Thuốc / thực phẩm chức năng đang dùng',
    voiceChange: 'Vỡ giọng (thay đổi giọng nói)',
    voiceOpts: [
      { value: 'none', label: 'Chưa có' },
      { value: 'started', label: 'Đã bắt đầu' },
      { value: 'done', label: 'Đã hoàn tất' },
    ],
    facialHair: 'Râu / lông trên cơ thể',
    facialOpts: [
      { value: 'none', label: 'Không có' },
      { value: 'fuzz', label: 'Lông tơ nhẹ' },
      { value: 'clear', label: 'Rõ rệt' },
    ],
    menarche: 'Kinh nguyệt lần đầu',
    menarcheOpts: [
      { value: 'none', label: 'Chưa có' },
      { value: 'recent6m', label: 'Đã bắt đầu (trong 6 tháng gần đây)' },
      { value: 'over1y', label: 'Đã hơn 1 năm' },
    ],
    breastDev: 'Phát triển ngực',
    breastOpts: [
      { value: 'none', label: 'Chưa phát triển' },
      { value: 'budding', label: 'Bắt đầu nhú' },
      { value: 'clear', label: 'Phát triển rõ' },
    ],
    causes: 'Nguyên nhân thấp còi (có thể chọn nhiều)',
    causeOpts: [
      { value: 'parents_short', label: 'Bố mẹ thấp' },
      { value: 'parents_height_gap', label: 'Thấp hơn kỳ vọng so với chiều cao bố mẹ' },
      { value: 'picky_eating', label: 'Ăn kén / ăn ít' },
      { value: 'parents_early_stop', label: 'Bố hoặc mẹ ngừng phát triển chiều cao sớm' },
      { value: 'insufficient_sleep', label: 'Ngủ không đủ giấc' },
      { value: 'chronic_illness', label: 'Có bệnh mãn tính' },
    ],
    causesOther: 'Nguyên nhân khác',
    additionalNotes: 'Ghi chú thêm (thắc mắc hoặc thông tin tham khảo)',
    xrayUpload: 'Đính kèm file X-quang',
    labUpload: 'Đính kèm kết quả xét nghiệm',
    uploadHint: 'Vui lòng đính kèm ảnh hoặc file PDF (không bắt buộc).',
  },

  en: {
    pageTitle: '187 Growth Clinic — Pre-visit Survey',
    stepOf: (n, t) => `Step ${n} of ${t}`,
    next: 'Next',
    prev: 'Back',
    submit: 'Submit',
    submitting: 'Submitting...',
    doneTitle: 'Thank you',
    doneBody: 'Your survey has been received. We will be in touch shortly.',
    retry: 'Try again',
    required: 'This field is required',
    s1Title: 'Basic Information',
    s2Title: 'Growth History',
    s3Title: 'Family & Interest',
    s4Title: 'Medical & Development',
    s5Title: 'Causes of Short Stature',
    s6Title: 'Attach Test Files',
    name: 'Full name',
    nameEn: 'Name (English)',
    gender: 'Gender',
    male: 'Boy',
    female: 'Girl',
    birth: 'Date of birth',
    year: 'Year',
    month: 'Month',
    day: 'Day',
    country: 'Nationality',
    fatherH: "Father's height (cm)",
    motherH: "Mother's height (cm)",
    desiredH: 'Desired height (cm)',
    currentH: 'Current height (cm)',
    currentW: 'Current weight (kg)',
    grade: 'School grade',
    classRank: 'Height rank in class',
    phone: 'Phone number',
    email: 'Email',
    address: 'Address',
    gestWeeks: 'Gestational age at birth (weeks)',
    birthWeight: 'Birth weight (kg)',
    birthNote: 'Anything notable at birth',
    growthHint: 'Please fill in from school health records or pediatric medical records.',
    ageCol: 'Age (grade)',
    heightCol: 'Height (cm)',
    yearlyGrowth: 'Height gained in the past year (cm)',
    flagRapid: 'Has grown unusually fast recently',
    flagSlowed: 'Growth rate has slowed significantly recently',
    flagPuberty: 'Concerned about early puberty',
    yes: 'Yes',
    no: 'No',
    pastConsult: 'Has the child previously consulted a growth clinic?',
    parentsInterested: 'Are both parents interested in growth management?',
    sportsAthlete: 'Is the child a member of a sports team or competitive athlete?',
    sportsEvent: 'Sport',
    childInterested: 'Is the child personally motivated to grow taller?',
    acquisitionChannel: 'How did you hear about us?',
    acquisitionChannelOpts: [
      { value: 'google', label: 'Google search' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'referral', label: 'Friend/family referral' },
      { value: 'ai', label: 'AI (ChatGPT, etc.)' },
      { value: 'other', label: 'Other' },
    ],
    sLifeTitle: 'Lifestyle',
    sleepTime: 'Bedtime',
    wakeTime: 'Wake-up time',
    exerciseFreq: 'Exercise frequency',
    exerciseOpts: [
      { value: 'none', label: 'Rarely' },
      { value: 'week1_2', label: '1–2 times a week' },
      { value: 'week3_4', label: '3–4 times a week' },
      { value: 'daily', label: 'Every day' },
    ],
    milkDaily: 'Milk / dairy intake',
    milkOpts: [
      { value: 'none', label: 'Rarely' },
      { value: 'sometimes', label: 'Sometimes (2–3 times a week)' },
      { value: 'daily1', label: '1 glass daily' },
      { value: 'daily2plus', label: '2+ glasses daily' },
    ],
    mealReg: 'Meal regularity',
    mealOpts: [
      { value: 'irregular', label: 'Irregular' },
      { value: 'mostly_regular', label: 'Mostly regular' },
      { value: 'very_regular', label: 'Very regular' },
    ],
    chronic: 'Please list any ongoing or past medical conditions being treated.',
    tanner: 'Puberty stage (Tanner Stage)',
    tannerOpts: [
      'Stage 1 — No signs of puberty yet',
      'Stage 2 — Puberty just beginning',
      'Stage 3 — Noticeable changes underway',
      'Stage 4 — Puberty nearly complete',
      'Stage 5 — Puberty complete, adult body',
    ],
    currentMeds: 'Current medications / supplements',
    voiceChange: 'Voice change (voice breaking)',
    voiceOpts: [
      { value: 'none', label: 'Not yet' },
      { value: 'started', label: 'Started' },
      { value: 'done', label: 'Complete' },
    ],
    facialHair: 'Facial / body hair',
    facialOpts: [
      { value: 'none', label: 'None' },
      { value: 'fuzz', label: 'Light fuzz' },
      { value: 'clear', label: 'Clearly visible' },
    ],
    menarche: 'First menstruation',
    menarcheOpts: [
      { value: 'none', label: 'Not yet' },
      { value: 'recent6m', label: 'Started (within the last 6 months)' },
      { value: 'over1y', label: 'More than 1 year ago' },
    ],
    breastDev: 'Breast development',
    breastOpts: [
      { value: 'none', label: 'Not started' },
      { value: 'budding', label: 'Budding' },
      { value: 'clear', label: 'Clearly developed' },
    ],
    causes: 'Possible causes of short stature (select all that apply)',
    causeOpts: [
      { value: 'parents_short', label: 'Parents are short' },
      { value: 'parents_height_gap', label: 'Shorter than expected from parents\' height' },
      { value: 'picky_eating', label: 'Picky eating / insufficient food intake' },
      { value: 'parents_early_stop', label: 'A parent stopped growing early' },
      { value: 'insufficient_sleep', label: 'Insufficient sleep' },
      { value: 'chronic_illness', label: 'Chronic illness' },
    ],
    causesOther: 'Other causes',
    additionalNotes: 'Additional notes (questions or anything else)',
    xrayUpload: 'Attach X-ray file',
    labUpload: 'Attach lab results',
    uploadHint: 'Please attach an image or PDF file (optional).',
  },
};

export const ACQUISITION_KO: Record<string, string> = {
  google: '구글 검색',
  naver: '네이버 검색',
  instagram: '인스타그램',
  facebook: '페이스북',
  youtube: '유튜브',
  referral: '지인 소개',
  ai: 'ChatGPT 등 AI',
  other: '기타',
};

/** 어드민 표시용: 셀렉트 코드값 → 한국어 라벨 (미등록 코드는 원문 그대로) */
export function optLabelKo(
  opts: { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return opts.find((o) => o.value === value)?.label ?? value;
}

export function getLabels(lang: IntakeLang): IntakeLabelSet {
  return INTAKE_LABELS[lang];
}
