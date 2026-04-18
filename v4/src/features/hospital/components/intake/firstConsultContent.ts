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

/** 기본 정보 01~05 를 한 슬라이드에 묶는 번들 뷰. */
type SurveyBundleSlide = {
  kind: 'survey-bundle';
  title: string;
  intro: string;
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

/** MPH + PAH 두 가지 성인키 예측 방법을 한 슬라이드에서 나란히 비교. */
type MethodsComparisonSlide = {
  kind: 'methods-comparison';
  title: string;
  intro: string;
  methods: Array<{
    badge: string;
    title: string;
    subtitle: string;
    formula: string;
    formulaNote: string;
    bullets: string[];
  }>;
};

export type ConsultSlide =
  | CoverSlide
  | DirectorSlide
  | HospitalSlide
  | SectionSlide
  | SurveyBundleSlide
  | MethodSlide
  | MethodsComparisonSlide;

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
    kind: 'survey-bundle',
    title: '기본 정보 · 초진 설문',
    intro:
      '환자 정보부터 성장 이력 · 가족력 · 사춘기 평가 · 저신장 원인까지 한 번에 기록합니다. 각 섹션은 아래에서 직접 입력 가능하며, 입력한 값은 자동 저장되어 기본 정보 탭과 실시간 공유됩니다.',
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
    kind: 'methods-comparison',
    title: '예상 성인 키 — 두 가지 방법',
    intro:
      '성인 키 예측은 유전 기반 MPH 와 뼈나이 기반 PAH 두 가지를 병행합니다. MPH 는 목표 설정, PAH 는 치료 효과 추적에 쓰입니다.',
    methods: [
      {
        badge: 'MPH',
        title: '① MPH',
        subtitle: 'Mid-Parental Height · 중간 부모 키',
        formula:
          '남아: (아버지 + 어머니 + 13) ÷ 2 cm\n여아: (아버지 + 어머니 − 13) ÷ 2 cm',
        formulaNote: '95% 신뢰 구간은 ± 8.5 cm',
        bullets: [
          '유전적인 키 잠재력만 반영 — 뼈나이나 현재 성장 속도와 무관.',
          '빠르고 간편하지만 개인의 성장 편차(사춘기 타이밍)를 못 반영.',
          '목표 설정의 출발점으로 사용, 단독 판단 근거로는 부족.',
        ],
      },
      {
        badge: 'PAH',
        title: '② PAH',
        subtitle: 'Predicted Adult Height · 뼈나이 기반',
        formula:
          '뼈나이 시점의 키 백분위를 구하고,\n같은 백분위로 만 18세 표준 키를 역산',
        formulaNote: 'KDCA 2017 한국 표준성장도표 LMS 데이터 사용',
        bullets: [
          '현재 키 + 뼈나이(X-ray) + 성별 3가지로 개별 예측.',
          '사춘기가 빠른 아이(뼈나이 > 역년령)는 MPH 보다 작게 예측됨.',
          '매 진료마다 업데이트 가능 — 치료 효과 추적의 핵심 지표.',
        ],
      },
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
    kind: 'survey-bundle',
    title: 'Basic Info · Intake Survey',
    intro:
      'Patient basics, growth history, family/exercise, pubertal stage, and short-stature causes — all captured in one place. Each section below is editable; values save automatically and stay in sync with the 기본 정보 tab.',
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
    kind: 'methods-comparison',
    title: 'Predicted Adult Height — Two Methods',
    intro:
      'We combine a genetics-based MPH estimate with a bone-age-based PAH projection. MPH anchors the target; PAH tracks treatment progress over time.',
    methods: [
      {
        badge: 'MPH',
        title: '① MPH',
        subtitle: 'Mid-Parental Height',
        formula:
          'Boy: (Father + Mother + 13) ÷ 2 cm\nGirl: (Father + Mother − 13) ÷ 2 cm',
        formulaNote: '95% confidence interval is ± 8.5 cm',
        bullets: [
          'Reflects only genetic potential — independent of bone age or growth velocity.',
          'Fast and easy, but cannot capture individual pubertal timing.',
          'Useful as a goal-setting anchor; not a standalone clinical call.',
        ],
      },
      {
        badge: 'PAH',
        title: '② PAH',
        subtitle: 'Bone-age based projection',
        formula:
          'Compute the height percentile at bone age,\nand back-solve to age 18 at the same percentile.',
        formulaNote: 'Based on the KDCA 2017 Korean growth standard LMS data.',
        bullets: [
          'Individualized from current height + bone age (X-ray) + gender.',
          'Children with advanced bone age (BA > CA) are predicted lower than MPH.',
          'Updates every visit — the key metric for tracking treatment efficacy.',
        ],
      },
    ],
  },
];

export const firstConsultContent: Record<ConsultLang, ConsultSlide[]> = {
  ko,
  en,
};
