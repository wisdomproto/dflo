// 성장 리포트 퍼널 공용 타입 — 계산기 결과(측정) + 설문(IntakeForm) → growth_reports 저장 + 리포트 페이지에서 사용.

// 초진 설문 (IntakeDiagnosisPage 에서 입력). 필드는 그대로 유지.
export interface IntakeForm {
  // 기본 정보 (calculator에서 전달)
  childName: string;
  birthDate: string;

  // 출생 정보
  gestationalWeeks: string;
  birthWeight: string;
  birthNote: string;

  // 현재 상태
  currentWeight: string;
  yearlyGrowth: string;
  grade: string;
  heightRank: string;
  /** 과거 성장 기록 — 나이(8~16) → 키(cm) 문자열. 아는 나이만. (구버전 저장분엔 없음) */
  growthHistory?: Record<string, string>;

  // 가족 정보
  fatherHeight: string;
  motherHeight: string;
  desiredHeight: string;
  /** 양측 부모 모두 성장 클리닉에 관심 — '예'|'아니오'|'' (구버전 저장분엔 없음) */
  parentsInterested?: string;
  /** 아이 본인도 키에 관심 — '예'|'아니오'|'' */
  childInterested?: string;
  /** 체육 특기생 여부 — '예'|'아니오'|'' */
  sportsAthlete?: string;
  /** 체육 특기생 종목 */
  sportsEvent?: string;

  // 생활 습관
  sleepTime: string;
  wakeTime: string;
  exerciseFrequency: string;
  milkDaily: string;
  mealRegularity: string;

  // 사춘기 (남)
  voiceChange: string;
  facialHair: string;

  // 사춘기 (여)
  menarche: string;
  breastDevelopment: string;

  // 공통 사춘기
  pubertyStage: string;
  growthPattern: string;

  // 의료 이력
  pastConditions: string;
  pastClinicExperience: boolean;
  currentMedications: string;

  // 보호자 의견
  /** 키 작은 원인 다중선택 (한국어 라벨 그대로, 구버전 저장분엔 없음) */
  shortStatureCauses?: string[];
  growthConcerns: string;
  additionalNotes: string;

  /** 유입 경로 ("어디서 보고 오셨나요?", 한국어 라벨 그대로 저장. 구버전 저장분엔 없음) */
  acquisitionChannel?: string;
}

export interface ReportMeasurement {
  gender: 'male' | 'female';
  age: number;            // 소수 나이
  currentHeight: number;  // cm
  predicted: number;      // cm (계산기 전달)
  percentile: number;     // 0-100
  standard: 'KR' | 'TH';
  fatherHeight?: number;  // cm (설문)
  motherHeight?: number;  // cm (설문)
}

export type ReportSurvey = IntakeForm;

export type BlockId =
  | 'sleep' | 'inflammation' | 'nutrition' | 'exercise' | 'puberty'
  | 'genetics' | 'obesity' | 'growthVelocity' | 'sga' | 'stress';
