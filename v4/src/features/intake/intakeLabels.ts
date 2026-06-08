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
  // step2 growth history
  growthHint: string;
  ageCol: string;
  heightCol: string;
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
  // step4 medical
  chronic: string;
  tanner: string;
  tannerOpts: string[]; // EXACTLY 5 entries, Tanner stage 1..5 lay-friendly descriptions
  // step5 short-stature causes
  causes: string;
  causeOpts: { value: string; label: string }[];
  causesOther: string;
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
    growthHint: '생활기록부 또는 소아과 기록을 참고해 입력해 주세요.',
    ageCol: '나이 (학년)',
    heightCol: '키 (cm)',
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
      { value: 'other', label: '기타' },
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
    doneTitle: 'ขอบคุณค่ะ',
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
    growthHint: 'กรุณากรอกข้อมูลจากสมุดพัฒนาการหรือเวชระเบียนกุมารแพทย์',
    ageCol: 'อายุ (ชั้นเรียน)',
    heightCol: 'ส่วนสูง (ซม.)',
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
      { value: 'other', label: 'อื่นๆ' },
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
    growthHint: 'Vui lòng điền dựa trên học bạ hoặc hồ sơ y tế nhi khoa.',
    ageCol: 'Tuổi (lớp)',
    heightCol: 'Chiều cao (cm)',
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
      { value: 'other', label: 'Khác' },
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
    growthHint: 'Please fill in from school health records or pediatric medical records.',
    ageCol: 'Age (grade)',
    heightCol: 'Height (cm)',
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
      { value: 'other', label: 'Other' },
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
  other: '기타',
};

export function getLabels(lang: IntakeLang): IntakeLabelSet {
  return INTAKE_LABELS[lang];
}
