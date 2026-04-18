/**
 * 첫 상담(First Consultation) 프레젠테이션 덱 컨텐츠.
 *
 * 한글/영어 두 가지 언어를 같은 슬라이드 시퀀스로 지원한다. 각 슬라이드는
 * 렌더 타입(`kind`)과 그 타입 전용 필드를 가진다. 실제 렌더링은
 * `FirstConsultPanel` 안의 스위치에서 처리한다.
 */

export type ConsultLang = 'ko' | 'en';

type CoverSlide = {
  kind: 'cover';
  lineTop: string;
  title: string;
  footer1: string;
  footer2: string;
  website: string;
};

type DirectorSlide = {
  kind: 'director';
  title: string;
  quote: string;
  timeline: Array<{ year: string; items: string[] }>;
  extras: string[];
  footerName: string;
};

type HospitalSlide = {
  kind: 'hospital';
  title: string;
  lead: string;
  bullets: string[];
};

type SectionSlide = {
  kind: 'section';
  badge: string; // e.g. "01"
  title: string;
  intro: string;
  bullets: string[];
};

type MethodSlide = {
  kind: 'method';
  badge: string; // e.g. "MPH" or "PAH"
  title: string;
  subtitle: string;
  formula: string;
  formulaNote: string;
  bullets: string[];
};

export type ConsultSlide =
  | CoverSlide
  | DirectorSlide
  | HospitalSlide
  | SectionSlide
  | MethodSlide;

// ------------------------------ KOREAN --------------------------------

const ko: ConsultSlide[] = [
  {
    kind: 'cover',
    lineTop: '연세새봄의원',
    title: '187 성장클리닉',
    footer1: '연세새봄의원 대표원장',
    footer2: '채용현',
    website: 'www.yssaebomq.com',
  },
  {
    kind: 'director',
    title: '채용현 대표원장',
    quote: '고객의 건강과 웰빙을 위해 헌신합니다.',
    timeline: [
      {
        year: '2002',
        items: [
          '연세대학교 의과대학 졸업',
          '연세대학교 의학 대학원 졸업',
          '강남 세브란스병원 인턴 · 레지던트 수료',
          '2008년 대한의학회 우수논문상 수상',
        ],
      },
      {
        year: '2010',
        items: [
          '용인시 IFBB 프로 홍보 전문의',
          'USPTA 레벨 II 퍼스널 트레이너',
          'SSG 랜더스 · 넥센 히어로즈 야구팀 전담의 · 전 팀닥터',
          'NABBA/WFF 전 의료자문',
          '연세새봄의원 대표원장 · 한국 본원 설립',
        ],
      },
      {
        year: '2023',
        items: ['연세새봄의원 태국 지점 설립'],
      },
      {
        year: '2025',
        items: ['연세새봄의원 현 대표원장 · 호르몬 치료 전문'],
      },
    ],
    extras: [
      '골프 매거진(Golf for Woman), InStyle, Vogue, 중앙일보 칼럼 다수 연재',
      '하나은행 강남지점 프라이빗 뱅킹 초청 강연 — 호르몬과 노화',
      '성동구 복지관 초청 강연 — 호르몬과 건강한 노화',
      '인천 송림초 100세 건강 강연 · 서울 방배초 야구부 성장 클리닉',
      '방송 출연: 알토란, 황금알, 만물상, 생방송 오늘 아침, 모닝와이드 등',
      'YouTube — @187growup, @yonseisaebom',
    ],
    footerName: '채용현 대표원장',
  },
  {
    kind: 'hospital',
    title: '187 성장클리닉',
    lead:
      '체계적인 측정 · 뼈나이 판독 · 생활 습관 관리로 아이의 최종 성인키 잠재력을 끌어올리는 성장 클리닉입니다.',
    bullets: [
      '초진 설문 · 신체 측정 · X-ray 뼈나이 판독 · 혈액/유기산 검사 통합',
      'KDCA 2017 표준 성장도표 기반 BA/CA 이중 예측 곡선',
      '수면 · 영양 · 운동 · 성장주사 등 5대 카테고리 일상 관리',
      '체형 평가, 자세 교정, 근력/유연성 트레이닝 병행',
    ],
  },
  {
    kind: 'section',
    badge: '01',
    title: '기본 정보 · 부모님 키',
    intro:
      '환자 정보와 부모님 성인 키(부·모)를 기록합니다. 부모님 키는 MPH 계산과 유전적 성장 잠재력 평가의 기초가 됩니다.',
    bullets: [
      '생년월일로 역년령(CA)과 학년을 산출합니다.',
      '부모님 키로 중간부모키(MPH)를 계산합니다.',
      '희망 성인 키를 함께 기록해 목표 설정에 활용합니다.',
    ],
  },
  {
    kind: 'section',
    badge: '02',
    title: '성장 이력',
    intro:
      '만 8세부터 16세까지 해마다 측정한 키를 시계열로 확인합니다. 연간 성장 속도(Growth Velocity)가 가장 중요한 지표입니다.',
    bullets: [
      '정상 범위: 사춘기 전 4~6cm/년, 사춘기 피크 8~12cm/년.',
      '2년 연속 연 4cm 미만이면 성장 저하를 의심합니다.',
      '엑셀 데이터 붙여넣기 지원(학교 건강검진 표 그대로 사용 가능).',
    ],
  },
  {
    kind: 'section',
    badge: '03',
    title: '가족력 · 운동',
    intro:
      '형제자매의 성장 패턴, 부모의 사춘기 시기, 현재 참여 중인 운동을 파악합니다. 가족 내 조숙/만숙 경향이 유전됩니다.',
    bullets: [
      '부모의 초경·변성기 시기로 사춘기 타이밍을 예측합니다.',
      '형제 중 저신장·성조숙증 사례 여부 확인.',
      '현재 운동 종목 · 주당 시간 · 근력/유연성 균형 평가.',
    ],
  },
  {
    kind: 'section',
    badge: '04',
    title: '사춘기 단계 (Tanner) · 만성 질환',
    intro:
      '사춘기 진행 정도(Tanner 1~5)를 평가하고, 치료에 영향을 주는 만성 질환·복용 약물을 기록합니다.',
    bullets: [
      'Tanner 단계에 따라 남은 성장 기간이 결정됩니다.',
      '아토피 · 알레르기 · 비염 등 면역 관련 질환 여부.',
      '복용 약물(스테로이드 등)이 성장에 미치는 영향 체크.',
    ],
  },
  {
    kind: 'section',
    badge: '05',
    title: '저신장 원인 평가',
    intro:
      '저신장의 가능한 원인을 체크리스트로 분류합니다. 원인이 다르면 치료 방향도 달라집니다.',
    bullets: [
      '가족성 저신장 · 체질성 성장지연 · 성조숙증 · 내분비 질환 등.',
      '수면 부족 · 편식 · 운동 부족 같은 생활 요인 별도 구분.',
      '원인별로 맞춤 치료 플랜(성장주사·생활개선·호르몬 치료) 수립.',
    ],
  },
  {
    kind: 'section',
    badge: '06',
    title: '기본 신체 측정',
    intro:
      '표준 측정 프로토콜로 키 · 몸무게 · 체성분 · 자세를 기록합니다. 한 번의 측정이 아니라 추세가 중요합니다.',
    bullets: [
      '아침 · 같은 시간대 · 같은 신발 벗고 측정 권장.',
      '체성분(골격근량 · 체지방률)로 성장 저해 요인 파악.',
      '자세 · 척추 측만 평가로 실제 키 손실분 확인.',
    ],
  },
  {
    kind: 'method',
    badge: 'MPH',
    title: '예상 성인 키 — 방법 ① MPH',
    subtitle: 'Mid-Parental Height · 중간 부모 키 공식',
    formula:
      '남아: (아버지 + 어머니 + 13) ÷ 2 cm\n여아: (아버지 + 어머니 − 13) ÷ 2 cm',
    formulaNote: '95% 신뢰 구간은 ± 8.5 cm',
    bullets: [
      '유전적인 키 잠재력만 반영 — 뼈나이나 현재 성장 속도와 무관.',
      '빠르고 간편하지만 개인의 성장 편차(사춘기 타이밍)를 못 반영.',
      '목표 설정의 출발점으로 사용하되, 단독 판단 근거로는 부족.',
    ],
  },
  {
    kind: 'method',
    badge: 'PAH',
    title: '예상 성인 키 — 방법 ② PAH (Bone-age based)',
    subtitle: 'Predicted Adult Height · 뼈나이 기반 예측',
    formula:
      '뼈나이 시점의 키 백분위를 구하고,\n같은 백분위로 만 18세 표준 키를 역산',
    formulaNote: 'KDCA 2017 한국 표준성장도표 LMS 데이터 사용',
    bullets: [
      '현재 키 + 뼈나이(X-ray) + 성별 3가지로 개별 예측.',
      '사춘기가 빠른 아이(뼈나이 > 역년령)는 MPH 보다 작게 예측됨.',
      '매 진료마다 업데이트 가능 — 치료 효과 추적의 핵심 지표.',
    ],
  },
];

// ------------------------------ ENGLISH -------------------------------

const en: ConsultSlide[] = [
  {
    kind: 'cover',
    lineTop: 'Yonsei Saebom Clinic',
    title: '187 Growth Clinic',
    footer1: 'Director of Yonsei Saebom Clinic',
    footer2: 'Yong-Hyun Chae',
    website: 'www.yssaebomq.com',
  },
  {
    kind: 'director',
    title: 'Dr. Yong-Hyun Chae',
    quote:
      'I am committed to the health and well-being of our customers.',
    timeline: [
      {
        year: '2002',
        items: [
          'Graduated, Yonsei University College of Medicine',
          'Graduated, Yonsei University Medicine Graduate School',
          'Internship & Residency, Gangnam Severance Hospital',
          'Awarded Outstanding Paper by a Society (2008)',
        ],
      },
      {
        year: '2010',
        items: [
          'Public Relations Doctor, Yongin City IFBB Pro',
          'USPTA Level II Personal Trainer',
          'Team Doctor, SSG Landers & Nexen Heroes baseball teams',
          'Former Medical Advisor, NABBA/WFF',
          'Founded Yonsei Saebom Medical Clinic (Korea)',
        ],
      },
      {
        year: '2023',
        items: ['Founded Yonsei Saebom Thailand branch'],
      },
      {
        year: '2025',
        items: [
          'Current Director, Yonsei Saebom Medical Clinic',
          'Specialized in hormone treatment',
        ],
      },
    ],
    extras: [
      'Columns in Golf Magazine, InStyle, Vogue, JoongAng Daily',
      'Invited speaker, Hana Bank Gangnam Private Banking — Hormones & Aging',
      'Invited speaker, Seongdong Welfare Center — Hormones & Healthy Aging',
      'Athlete Growth Clinic lectures — Songlim & Bangbae Elementary baseball teams',
      'TV: Altoran, Golden Egg, Manmul Sang, Morning Wide, Live Today Morning',
      'YouTube — @187growup, @yonseisaebom',
    ],
    footerName: 'Dr. Yong-Hyun Chae',
  },
  {
    kind: 'hospital',
    title: '187 Growth Clinic',
    lead:
      'A growth clinic that unlocks your child’s final adult height potential through systematic measurement, bone-age reading, and lifestyle coaching.',
    bullets: [
      'Integrated intake survey, physical measurements, X-ray bone-age reading, blood & organic-acid tests.',
      'Dual BA/CA projection curves built on the KDCA 2017 Korean growth standard.',
      'Five daily-care categories: sleep, nutrition, exercise, supplements, growth injections.',
      'Combined with posture assessment, alignment correction, strength & flexibility training.',
    ],
  },
  {
    kind: 'section',
    badge: '01',
    title: 'Basic Information · Parental Heights',
    intro:
      'Patient info and adult heights of both parents. Parental heights are the foundation of MPH calculation and genetic height potential estimation.',
    bullets: [
      'Birth date yields chronological age (CA) and grade level.',
      'Parental heights feed the Mid-Parental Height (MPH) formula.',
      'Desired adult height is also recorded to anchor treatment goals.',
    ],
  },
  {
    kind: 'section',
    badge: '02',
    title: 'Growth History',
    intro:
      'Yearly heights from age 8 to 16 as a time series. The most important metric is annual growth velocity.',
    bullets: [
      'Normal range: 4–6 cm/yr before puberty, 8–12 cm/yr at peak pubertal velocity.',
      'Growth below 4 cm/yr for two consecutive years is a red flag.',
      'Excel paste supported — school checkup tables can be pasted directly.',
    ],
  },
  {
    kind: 'section',
    badge: '03',
    title: 'Family History · Exercise',
    intro:
      'Sibling growth patterns, parental pubertal timing, and current sports participation. Early/late puberty tends to run in families.',
    bullets: [
      'Maternal menarche / paternal voice-change age predicts pubertal timing.',
      'History of short stature or precocious puberty among siblings.',
      'Current sport · hours per week · strength vs flexibility balance.',
    ],
  },
  {
    kind: 'section',
    badge: '04',
    title: 'Pubertal Stage (Tanner) · Chronic Conditions',
    intro:
      'Tanner stage (1–5) plus any chronic disease or medication that impacts growth and treatment planning.',
    bullets: [
      'Tanner stage determines the remaining growth window.',
      'Immune conditions: atopic dermatitis, allergic rhinitis, asthma.',
      'Medication effects — especially chronic steroid use — on growth.',
    ],
  },
  {
    kind: 'section',
    badge: '05',
    title: 'Short-Stature Cause Assessment',
    intro:
      'Checklist of possible underlying causes. Different causes require different treatment directions.',
    bullets: [
      'Familial · constitutional delay · precocious puberty · endocrine disorders.',
      'Lifestyle factors — sleep deficit, picky eating, inactivity — are classified separately.',
      'Treatment plan (injections · lifestyle · hormone therapy) is matched to the cause.',
    ],
  },
  {
    kind: 'section',
    badge: '06',
    title: 'Baseline Physical Measurements',
    intro:
      'Standardized measurement protocol for height, weight, body composition, and posture. Trend matters more than any single data point.',
    bullets: [
      'Measure in the morning, same time of day, shoes off.',
      'Body composition (skeletal muscle mass, body fat) uncovers growth inhibitors.',
      'Posture & scoliosis assessment reveals "lost" height.',
    ],
  },
  {
    kind: 'method',
    badge: 'MPH',
    title: 'Predicted Adult Height — Method ① MPH',
    subtitle: 'Mid-Parental Height',
    formula:
      'Boy: (Father + Mother + 13) ÷ 2 cm\nGirl: (Father + Mother − 13) ÷ 2 cm',
    formulaNote: '95% confidence interval is ± 8.5 cm',
    bullets: [
      'Reflects only genetic potential — independent of bone age or growth velocity.',
      'Fast and easy, but cannot capture individual variation in pubertal timing.',
      'Useful as a goal-setting anchor; should not stand alone clinically.',
    ],
  },
  {
    kind: 'method',
    badge: 'PAH',
    title: 'Predicted Adult Height — Method ② PAH (Bone-Age Based)',
    subtitle: 'Projection anchored to the bone-age percentile',
    formula:
      'Compute the height percentile at bone age,\nand back-solve to age 18 at the same percentile.',
    formulaNote: 'Based on the KDCA 2017 Korean growth standard LMS data.',
    bullets: [
      'Individualized from current height + bone age (X-ray) + gender.',
      'Children with advanced bone age (BA > CA) are predicted lower than MPH.',
      'Updates every visit — the key metric for tracking treatment efficacy.',
    ],
  },
];

export const firstConsultContent: Record<ConsultLang, ConsultSlide[]> = {
  ko,
  en,
};
