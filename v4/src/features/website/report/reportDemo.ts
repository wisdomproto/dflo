// 리포트 데모/감수용 대표 데이터 — `/report?demo=1` 에서 사용.
// 실데이터 없이 동적 리포트 전체(MPH 카드 + 신호블록 6종 스프레드)를 보여주기 위한 샘플.
// 원장 감수 링크 공유용. 실제 퍼널(계산기→설문)은 이 파일을 쓰지 않음.
import type { ReportMeasurement, ReportSurvey } from './types';

const DEMO_MEASUREMENT: ReportMeasurement = {
  gender: 'female',
  age: 12.58, // 만 12세 7개월
  currentHeight: 156,
  predicted: 162.1,
  percentile: 61,
  standard: 'KR',
  fatherHeight: 172,
  motherHeight: 160,
};

const DEMO_SURVEY: ReportSurvey = {
  childName: '서연',
  birthDate: '2013-12-05',
  gestationalWeeks: '38',
  birthWeight: '3.2',
  birthNote: '',
  currentWeight: '42',
  yearlyGrowth: '4',
  grade: '초6',
  heightRank: '10번째',
  fatherHeight: '172',
  motherHeight: '160',
  desiredHeight: '168',
  sleepTime: '23:30', // 늦은 취침 → 수면
  wakeTime: '07:00',
  exerciseFrequency: '주 1~2회', // 운동
  milkDaily: '거의 안 먹음', // 영양
  mealRegularity: '대체로 규칙적',
  voiceChange: '',
  facialHair: '',
  menarche: '아직 없음',
  breastDevelopment: '봉우리 시작',
  pubertyStage: '초기 (막 시작)',
  growthPattern: '성장 속도가 느려짐', // 성장속도 저하
  pastConditions: '알레르기성 비염', // 염증
  pastClinicExperience: false,
  currentMedications: '',
  growthConcerns: '요즘 키가 잘 안 크는 것 같아요',
  additionalNotes: '',
};

export const DEMO_REPORT = { measurement: DEMO_MEASUREMENT, survey: DEMO_SURVEY };
