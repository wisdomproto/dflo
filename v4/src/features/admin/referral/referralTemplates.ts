// Referral note (소견서) templates for overseas patients getting X-ray / labs locally.
// Prose is localized; the medical test list + signatory stay in English (international standard).
// ⚠️ Non-English prose is a professional draft — director/clinician review recommended.

export type ReferralLang = 'en' | 'ko' | 'th' | 'vi' | 'zh-hans' | 'zh-hant' | 'ja';
export type DocKind = 'xray' | 'lab';

export const REFERRAL_LANGS: { lang: ReferralLang; flag: string; label: string }[] = [
  { lang: 'en', flag: '🇺🇸', label: 'English' },
  { lang: 'ko', flag: '🇰🇷', label: '한국어' },
  { lang: 'th', flag: '🇹🇭', label: 'ไทย' },
  { lang: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { lang: 'zh-hans', flag: '🇨🇳', label: '简体中文' },
  { lang: 'zh-hant', flag: '🇹🇼', label: '繁體中文' },
  { lang: 'ja', flag: '🇯🇵', label: '日本語' },
];

// Clinic signatory — fixed (official English name/address of the Korean clinic).
export const SIGNATORY = {
  name: 'YONGHYUN CHAE, M.D., M.S.',
  title: 'Director, YONSEI SAEBOM MEDICAL CLINIC (187 Growth Clinic)',
  address: 'Address: 2F & 3F, 328, Dosan-daero, Gangnam-gu, Seoul, Republic of Korea',
  phone: 'Phone: 82-2-3395-0999',
};

// Requested X-ray views — English (universal for radiology).
export const XRAY_ITEMS: string[] = [
  'Hand / Wrist, AP, Left (for Bone Age Assessment)',
  'Elbow, Lateral, Left',
  'Knee, AP, Both (Standing)',
  'Knee, Lateral, Left',
  "Pelvis, AP (for Risser's Grade Assessment)",
  'Full Spine (Whole Spine), AP & Lateral (Standing) - Only if possible',
];

export interface LabGroup {
  title: string;
  items: string[];
}

// Requested lab tests — English. Sex-hormone item depends on patient gender.
export function labGroups(gender: 'male' | 'female'): LabGroup[] {
  const sexHormone = gender === 'female' ? 'Estradiol (E2)' : 'Testosterone';
  return [
    {
      title: '1. Hematology',
      items: [
        'Complete Blood Count (CBC)',
        'Hematocrit',
        'Hemoglobin',
        'Red Blood Cell Count',
        'White Blood Cell Count',
        'Platelet Count',
      ],
    },
    {
      title: '2. Liver Function, Bone & General Chemistry',
      items: [
        'Total Protein',
        'Albumin',
        'Total Bilirubin',
        'AST (SGOT)',
        'ALT (SGPT)',
        'Alkaline Phosphatase (ALP)',
        'Bone-specific Alkaline Phosphatase (BsALP)',
        'γ-GTP (GGT)',
      ],
    },
    {
      title: '3. Lipid Profile',
      items: [
        'Total Cholesterol',
        'HDL Cholesterol',
        'LDL Cholesterol (Direct measurement)',
        'Triglycerides',
      ],
    },
    {
      title: '4. Endocrine, Growth & Sex Hormones',
      items: [
        'Thyroid-Stimulating Hormone (TSH)',
        'T3',
        'Free T4',
        'Insulin-like Growth Factor 1 (IGF-1)',
        'Insulin-like Growth Factor-Binding Protein 3 (IGFBP-3)',
        'Follicle-Stimulating Hormone (FSH)',
        'Luteinizing Hormone (LH)',
        sexHormone,
      ],
    },
    {
      title: '5. Metabolic & Vitamins',
      items: ['Fasting Plasma Glucose', 'Hemoglobin A1c (HbA1c)', '25-Hydroxy Vitamin D (Total)'],
    },
  ];
}

export interface ReferralStrings {
  titleXray: string;
  titleLab: string;
  dateLabel: string;
  toXray: string;
  toLab: string;
  subjectXray: string;
  subjectLab: string;
  patientInfo: string;
  lblName: string;
  lblDob: string;
  lblGender: string;
  lblAddress: string;
  male: string;
  female: string;
  greeting: string;
  bodyXray: string;
  bodyLab: string;
  reqXrayHeading: string;
  reqLabHeading: string;
  closingXray: string;
  closingLab: string;
  thanks: string;
  sincerely: string;
  signatureLabel: string;
}

export const REFERRAL_STRINGS: Record<ReferralLang, ReferralStrings> = {
  en: {
    titleXray: 'MEDICAL REQUEST FOR RADIOGRAPHIC IMAGING',
    titleLab: 'MEDICAL REQUEST FOR LABORATORY TESTING',
    dateLabel: 'Date',
    toXray: 'To: Radiology Department / To Whom It May Concern',
    toLab: 'To: Laboratory / Pathology Department / To Whom It May Concern',
    subjectXray: 'Subject: Referral for Radiographic Imaging for Growth Evaluation',
    subjectLab: 'Subject: Referral for Laboratory Testing for Growth Evaluation',
    patientInfo: 'Patient Information',
    lblName: 'Name',
    lblDob: 'Date of Birth',
    lblGender: 'Gender',
    lblAddress: 'Address',
    male: 'Male',
    female: 'Female',
    greeting: 'Dear Colleagues,',
    bodyXray:
      "We need X-ray images for the growth evaluation of the patient below, and kindly ask for your cooperation. The patient is currently being evaluated at Yonsei Saebom Medical Clinic in Seoul, Korea, to determine the necessity of growth treatment through a comprehensive growth and skeletal maturity assessment.\n\nTo accurately assess the patient's bone age, growth potential, and structural alignment, I kindly request the following X-ray views:",
    bodyLab:
      "We need laboratory test results for the growth evaluation of the patient below, and kindly ask for your cooperation. The patient is currently being evaluated at Yonsei Saebom Medical Clinic in Seoul, Korea, to determine the necessity of growth treatment through a comprehensive growth, endocrine, and metabolic assessment.\n\nTo accurately evaluate the patient's overall health and hormonal status, I kindly request the following blood tests. (Please note that an overnight fast is required for accurate glucose and lipid profile measurements.)",
    reqXrayHeading: '[ Requested X-ray List ]',
    reqLabHeading: '[ Requested Laboratory Tests ]',
    closingXray:
      'I would appreciate it if the raw image files (DICOM format) could be provided to the patient on a CD, USB, or via a secure digital link, so that I may perform a detailed clinical analysis.',
    closingLab:
      'I would appreciate it if the official laboratory results could be provided to the patient, either in print or via a secure digital format, so that I may perform a detailed clinical analysis.',
    thanks: 'Thank you for your professional cooperation in the care of this patient.',
    sincerely: 'Sincerely,',
    signatureLabel: '(Signature)',
  },

  ko: {
    titleXray: '영상 검사 의뢰서',
    titleLab: '혈액 검사 의뢰서',
    dateLabel: '작성일',
    toXray: '수신: 영상의학과 / 담당자 귀하',
    toLab: '수신: 진단검사의학과 / 담당자 귀하',
    subjectXray: '제목: 성장 평가를 위한 영상 검사 의뢰',
    subjectLab: '제목: 성장 평가를 위한 혈액 검사 의뢰',
    patientInfo: '환자 정보',
    lblName: '성명',
    lblDob: '생년월일',
    lblGender: '성별',
    lblAddress: '주소',
    male: '남성',
    female: '여성',
    greeting: '담당 선생님께,',
    bodyXray:
      '아래 환자의 성장 평가를 위해 영상 검사가 필요하여 협조를 요청드립니다. 본 환자는 현재 대한민국 서울의 연세새봄의원에서 성장 및 골성숙도 종합 평가를 통해 성장 치료의 필요성을 판단하기 위해 진료를 받고 있습니다.\n\n환자의 뼈나이, 성장 잠재력 및 골격 정렬을 정확히 평가하기 위해 아래 영상 촬영을 요청드립니다:',
    bodyLab:
      '아래 환자의 성장 평가를 위해 혈액 검사 결과가 필요하여 협조를 요청드립니다. 본 환자는 현재 대한민국 서울의 연세새봄의원에서 성장·내분비·대사 종합 평가를 통해 성장 치료의 필요성을 판단하기 위해 진료를 받고 있습니다.\n\n환자의 전반적인 건강 상태와 호르몬 상태를 정확히 평가하기 위해 아래 혈액 검사를 요청드립니다. (정확한 혈당 및 지질 검사를 위해 전날 밤부터 공복이 필요합니다.)',
    reqXrayHeading: '[ 요청 영상 목록 ]',
    reqLabHeading: '[ 요청 검사 항목 ]',
    closingXray:
      '상세한 임상 분석을 위하여, 원본 영상 파일(DICOM 형식)을 CD, USB 또는 안전한 디지털 링크를 통해 환자에게 제공해 주시면 감사하겠습니다.',
    closingLab:
      '상세한 임상 분석을 위하여, 공식 검사 결과지를 인쇄물 또는 안전한 디지털 형식으로 환자에게 제공해 주시면 감사하겠습니다.',
    thanks: '환자 진료에 대한 협조에 진심으로 감사드립니다.',
    sincerely: '감사합니다,',
    signatureLabel: '(서명)',
  },

  th: {
    titleXray: 'ใบส่งตรวจทางรังสีวิทยา (เอกซเรย์)',
    titleLab: 'ใบส่งตรวจทางห้องปฏิบัติการ',
    dateLabel: 'วันที่',
    toXray: 'เรียน: แผนกรังสีวิทยา / ผู้ที่เกี่ยวข้อง',
    toLab: 'เรียน: ห้องปฏิบัติการ / แผนกพยาธิวิทยา / ผู้ที่เกี่ยวข้อง',
    subjectXray: 'เรื่อง: ส่งตรวจเอกซเรย์เพื่อประเมินการเจริญเติบโต',
    subjectLab: 'เรื่อง: ส่งตรวจทางห้องปฏิบัติการเพื่อประเมินการเจริญเติบโต',
    patientInfo: 'ข้อมูลผู้ป่วย',
    lblName: 'ชื่อ-นามสกุล',
    lblDob: 'วันเกิด',
    lblGender: 'เพศ',
    lblAddress: 'ที่อยู่',
    male: 'ชาย',
    female: 'หญิง',
    greeting: 'เรียน ท่านผู้เกี่ยวข้อง',
    bodyXray:
      'ผมขอความอนุเคราะห์ในการตรวจเอกซเรย์เพื่อประเมินการเจริญเติบโตของผู้ป่วยตามรายละเอียดด้านล่าง ปัจจุบันผู้ป่วยอยู่ระหว่างการประเมินที่ Yonsei Saebom Medical Clinic กรุงโซล ประเทศเกาหลี เพื่อพิจารณาความจำเป็นในการรักษาการเจริญเติบโต ผ่านการประเมินการเจริญเติบโตและความสมบูรณ์ของกระดูกอย่างครอบคลุม\n\nเพื่อประเมินอายุกระดูก ศักยภาพการเจริญเติบโต และการเรียงตัวของโครงสร้างร่างกายอย่างแม่นยำ ผมขอส่งตรวจเอกซเรย์รายการต่อไปนี้:',
    bodyLab:
      'ผมขอความอนุเคราะห์ผลตรวจทางห้องปฏิบัติการเพื่อประเมินการเจริญเติบโตของผู้ป่วยตามรายละเอียดด้านล่าง ปัจจุบันผู้ป่วยอยู่ระหว่างการประเมินที่ Yonsei Saebom Medical Clinic กรุงโซล ประเทศเกาหลี เพื่อพิจารณาความจำเป็นในการรักษาการเจริญเติบโต ผ่านการประเมินด้านการเจริญเติบโต ต่อมไร้ท่อ และเมแทบอลิซึมอย่างครอบคลุม\n\nเพื่อประเมินสุขภาพโดยรวมและระดับฮอร์โมนของผู้ป่วยอย่างแม่นยำ ผมขอส่งตรวจเลือดรายการต่อไปนี้ (กรุณางดอาหารข้ามคืนเพื่อความแม่นยำของผลน้ำตาลและไขมันในเลือด)',
    reqXrayHeading: '[ รายการเอกซเรย์ที่ขอตรวจ ]',
    reqLabHeading: '[ รายการตรวจทางห้องปฏิบัติการที่ขอตรวจ ]',
    closingXray:
      'เพื่อการวิเคราะห์ทางคลินิกอย่างละเอียด ผมขอความอนุเคราะห์ไฟล์ภาพต้นฉบับ (รูปแบบ DICOM) แก่ผู้ป่วยผ่านทาง CD, USB หรือลิงก์ดิจิทัลที่ปลอดภัย',
    closingLab:
      'เพื่อการวิเคราะห์ทางคลินิกอย่างละเอียด ผมขอความอนุเคราะห์ผลตรวจอย่างเป็นทางการแก่ผู้ป่วย ทั้งในรูปแบบเอกสารหรือไฟล์ดิจิทัลที่ปลอดภัย',
    thanks: 'ขอขอบพระคุณในความร่วมมือในการดูแลผู้ป่วยรายนี้',
    sincerely: 'ด้วยความเคารพ',
    signatureLabel: '(ลายเซ็น)',
  },

  vi: {
    titleXray: 'PHIẾU YÊU CẦU CHỤP X-QUANG',
    titleLab: 'PHIẾU YÊU CẦU XÉT NGHIỆM',
    dateLabel: 'Ngày',
    toXray: 'Kính gửi: Khoa Chẩn đoán hình ảnh / Người phụ trách',
    toLab: 'Kính gửi: Khoa Xét nghiệm / Giải phẫu bệnh / Người phụ trách',
    subjectXray: 'Về việc: Giới thiệu chụp X-quang để đánh giá tăng trưởng',
    subjectLab: 'Về việc: Giới thiệu xét nghiệm để đánh giá tăng trưởng',
    patientInfo: 'Thông tin bệnh nhân',
    lblName: 'Họ và tên',
    lblDob: 'Ngày sinh',
    lblGender: 'Giới tính',
    lblAddress: 'Địa chỉ',
    male: 'Nam',
    female: 'Nữ',
    greeting: 'Kính gửi Quý đồng nghiệp,',
    bodyXray:
      'Chúng tôi cần hình ảnh X-quang để đánh giá tăng trưởng cho bệnh nhân dưới đây và kính mong Quý vị hỗ trợ. Bệnh nhân hiện đang được đánh giá tại Yonsei Saebom Medical Clinic, Seoul, Hàn Quốc, nhằm xác định sự cần thiết của điều trị tăng trưởng thông qua đánh giá toàn diện về tăng trưởng và độ trưởng thành của xương.\n\nĐể đánh giá chính xác tuổi xương, tiềm năng tăng trưởng và sự cân đối của cấu trúc, tôi kính đề nghị chụp các tư thế X-quang sau:',
    bodyLab:
      'Chúng tôi cần kết quả xét nghiệm để đánh giá tăng trưởng cho bệnh nhân dưới đây và kính mong Quý vị hỗ trợ. Bệnh nhân hiện đang được đánh giá tại Yonsei Saebom Medical Clinic, Seoul, Hàn Quốc, nhằm xác định sự cần thiết của điều trị tăng trưởng thông qua đánh giá toàn diện về tăng trưởng, nội tiết và chuyển hóa.\n\nĐể đánh giá chính xác sức khỏe tổng thể và tình trạng nội tiết tố của bệnh nhân, tôi kính đề nghị các xét nghiệm máu sau. (Xin lưu ý cần nhịn ăn qua đêm để đo chính xác đường huyết và mỡ máu.)',
    reqXrayHeading: '[ Danh sách X-quang yêu cầu ]',
    reqLabHeading: '[ Danh sách xét nghiệm yêu cầu ]',
    closingXray:
      'Để phục vụ phân tích lâm sàng chi tiết, tôi rất mong các tệp ảnh gốc (định dạng DICOM) được cung cấp cho bệnh nhân qua CD, USB hoặc liên kết kỹ thuật số an toàn.',
    closingLab:
      'Để phục vụ phân tích lâm sàng chi tiết, tôi rất mong kết quả xét nghiệm chính thức được cung cấp cho bệnh nhân dưới dạng bản in hoặc tệp kỹ thuật số an toàn.',
    thanks: 'Xin chân thành cảm ơn sự hợp tác của Quý vị trong việc chăm sóc bệnh nhân này.',
    sincerely: 'Trân trọng,',
    signatureLabel: '(Chữ ký)',
  },

  'zh-hans': {
    titleXray: '影像学检查申请单（X光）',
    titleLab: '实验室检查申请单',
    dateLabel: '日期',
    toXray: '致：放射科 / 相关负责人',
    toLab: '致：检验科 / 病理科 / 相关负责人',
    subjectXray: '事由：为生长评估申请影像学检查',
    subjectLab: '事由：为生长评估申请实验室检查',
    patientInfo: '患者信息',
    lblName: '姓名',
    lblDob: '出生日期',
    lblGender: '性别',
    lblAddress: '住址',
    male: '男',
    female: '女',
    greeting: '尊敬的各位同仁：',
    bodyXray:
      '为对以下患者进行生长评估，我们需要X光影像，恳请贵科协助。该患者目前正在韩国首尔延世saebom医院接受评估，通过全面的生长与骨骼成熟度评估以判断是否需要生长治疗。\n\n为准确评估患者的骨龄、生长潜力及骨骼排列，特申请以下X光拍摄：',
    bodyLab:
      '为对以下患者进行生长评估，我们需要实验室检查结果，恳请贵科协助。该患者目前正在韩国首尔延世saebom医院接受评估，通过全面的生长、内分泌及代谢评估以判断是否需要生长治疗。\n\n为准确评估患者的整体健康与激素水平，特申请以下血液检查。（为确保血糖及血脂检测准确，请隔夜空腹。）',
    reqXrayHeading: '[ 申请影像检查项目 ]',
    reqLabHeading: '[ 申请实验室检查项目 ]',
    closingXray:
      '为便于进行详细的临床分析，恳请将原始影像文件（DICOM格式）通过CD、U盘或安全的数字链接提供给患者。',
    closingLab:
      '为便于进行详细的临床分析，恳请将正式检查报告以纸质或安全的数字格式提供给患者。',
    thanks: '衷心感谢贵科在本患者诊疗中的专业协助。',
    sincerely: '此致敬礼',
    signatureLabel: '（签名）',
  },

  'zh-hant': {
    titleXray: '影像學檢查申請單（X光）',
    titleLab: '實驗室檢查申請單',
    dateLabel: '日期',
    toXray: '致：放射科 / 相關負責人',
    toLab: '致：檢驗科 / 病理科 / 相關負責人',
    subjectXray: '事由：為生長評估申請影像學檢查',
    subjectLab: '事由：為生長評估申請實驗室檢查',
    patientInfo: '病患資訊',
    lblName: '姓名',
    lblDob: '出生日期',
    lblGender: '性別',
    lblAddress: '住址',
    male: '男',
    female: '女',
    greeting: '敬啟者：',
    bodyXray:
      '為對以下病患進行生長評估，我們需要X光影像，懇請貴科協助。該病患目前正在韓國首爾延世saebom醫院接受評估，透過全面的生長與骨骼成熟度評估以判斷是否需要生長治療。\n\n為準確評估病患的骨齡、生長潛力及骨骼排列，特申請以下X光拍攝：',
    bodyLab:
      '為對以下病患進行生長評估，我們需要實驗室檢查結果，懇請貴科協助。該病患目前正在韓國首爾延世saebom醫院接受評估，透過全面的生長、內分泌及代謝評估以判斷是否需要生長治療。\n\n為準確評估病患的整體健康與荷爾蒙狀態，特申請以下血液檢查。（為確保血糖及血脂檢測準確，請隔夜空腹。）',
    reqXrayHeading: '[ 申請影像檢查項目 ]',
    reqLabHeading: '[ 申請實驗室檢查項目 ]',
    closingXray:
      '為便於進行詳細的臨床分析，懇請將原始影像檔案（DICOM格式）透過CD、隨身碟或安全的數位連結提供給病患。',
    closingLab:
      '為便於進行詳細的臨床分析，懇請將正式檢查報告以紙本或安全的數位格式提供給病患。',
    thanks: '衷心感謝貴科在本病患診療中的專業協助。',
    sincerely: '敬上',
    signatureLabel: '（簽名）',
  },

  ja: {
    titleXray: '画像検査（X線）依頼書',
    titleLab: '臨床検査依頼書',
    dateLabel: '作成日',
    toXray: '宛先：放射線科 / ご担当者様',
    toLab: '宛先：臨床検査科 / 病理部 / ご担当者様',
    subjectXray: '件名：成長評価のための画像検査のご依頼',
    subjectLab: '件名：成長評価のための臨床検査のご依頼',
    patientInfo: '患者情報',
    lblName: '氏名',
    lblDob: '生年月日',
    lblGender: '性別',
    lblAddress: '住所',
    male: '男性',
    female: '女性',
    greeting: 'ご担当の先生方へ',
    bodyXray:
      '下記患者の成長評価のためにX線画像が必要であり、ご協力をお願い申し上げます。本患者は現在、韓国ソウルの延世セボム医院にて、成長および骨成熟度の総合評価を通じ、成長治療の要否を判断するため診察を受けております。\n\n患者の骨年齢、成長ポテンシャル、および骨格アライメントを正確に評価するため、以下のX線撮影を依頼いたします：',
    bodyLab:
      '下記患者の成長評価のために臨床検査結果が必要であり、ご協力をお願い申し上げます。本患者は現在、韓国ソウルの延世セボム医院にて、成長・内分泌・代謝の総合評価を通じ、成長治療の要否を判断するため診察を受けております。\n\n患者の全身状態およびホルモン状態を正確に評価するため、以下の血液検査を依頼いたします。（血糖および脂質を正確に測定するため、前夜からの絶食が必要です。）',
    reqXrayHeading: '[ 依頼する画像検査項目 ]',
    reqLabHeading: '[ 依頼する臨床検査項目 ]',
    closingXray:
      '詳細な臨床分析を行うため、元画像ファイル（DICOM形式）をCD、USB、または安全なデジタルリンクにて患者へご提供いただけますと幸いです。',
    closingLab:
      '詳細な臨床分析を行うため、正式な検査結果を印刷物または安全なデジタル形式にて患者へご提供いただけますと幸いです。',
    thanks: '本患者の診療に対するご協力に深く感謝申し上げます。',
    sincerely: '敬具',
    signatureLabel: '（署名）',
  },
};
