// Website section types
// Each slide has its own template - a section is a collection of mixed slides

export type SlideTemplate = 'banner' | 'video' | 'cases';

export interface BannerSlide {
  template: 'banner';
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaAction: 'scroll' | 'link' | 'fulllink' | 'modal' | 'iframe';
  ctaTarget: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  childImageUrl?: string;
  bgGradient?: string;
  order: number;
  titleSize?: number;
  titleColor?: string;
  subtitleSize?: number;
  subtitleColor?: string;
  textPositionY?: number; // bottom % (default 12)
  titleShadow?: boolean; // default true
  subtitleShadow?: boolean; // default true
  ctaSize?: 'sm' | 'md' | 'lg';
  modalRatio?: '4:5' | '9:16'; // modal 배너 외각 비율 (default: 9:16)
  iframeZoom?: number;          // iframe 콘텐츠 zoom % (default: 100)
}

export interface VideoSlide {
  template: 'video';
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  titleColor?: string;
  descriptionColor?: string;
  order: number;
}

export interface CaseMeasurementEntry {
  date: string;            // 날짜 (YYYY-MM-DD)
  height: number;          // 실제키 (cm)
  weight: number;          // 몸무게 (kg)
  // 실제나이는 birthDate + date로 자동 계산
  boneAge?: number;        // 뼈나이 (세, 예: 9.5)
  predictedHeight: number; // 예상키 - 뼈나이 기준 (cm)
  memo: string;            // 회차 메모
  photoFront?: string;     // 정면 사진 URL
  photoSide?: string;      // 측면 사진 URL
  xrayFront?: string;      // 정면 X-ray URL
  xraySide?: string;       // 측면 X-ray URL
}

// 초진 정보 (문진표 기반)
export interface CaseIntakeInfo {
  // 출생 정보
  gestationalWeeks?: number;   // 임신 주수
  birthWeight?: number;        // 출생 몸무게 (kg)
  birthNote?: string;          // 출생 시 특이사항
  // 현재 상태
  currentHeight?: number;      // 현재 키 (cm)
  currentWeight?: number;      // 현재 몸무게 (kg)
  yearlyGrowth?: string;       // 작년 한 해 성장 (cm)
  grade?: string;              // 학년
  heightRank?: string;         // 학급 내 키 번호
  // 희망/가족
  desiredHeight?: string;      // 희망 키
  fatherHeight?: number;       // 아버지 키 (cm)
  motherHeight?: number;       // 어머니 키 (cm)
  // 상태 체크
  sportsSpecialist?: boolean;  // 체육 특기생
  parentsInterested?: boolean; // 부모님 관심
  childInterested?: boolean;   // 아이 관심
  pastClinicExperience?: boolean; // 과거 클리닉 경험
  pastConditions?: string;     // 과거 질환
  growthPattern?: string;      // 최근 성장 양상
  pubertyStage?: string;       // 사춘기 평가
  growthConcerns?: string;     // 키 크지 못하는 원인
}

export interface CasesSlide {
  template: 'cases';
  id: string;
  patientName: string;     // 가명 (웹사이트 표시용)
  realName?: string;       // 실명 (관리자 전용, 웹사이트 미표시)
  chartNumber?: string;    // 차트번호 (관리자 전용, 웹사이트 미표시)
  gender: 'male' | 'female';
  category?: string;       // 사례 카테고리 (부모키작음, 면역, 성조숙증 등)
  birthDate?: string;      // 생년월일
  intakeInfo?: CaseIntakeInfo; // 초진 정보 (문진표)
  youtubeUrl?: string;     // 유튜브 치료후기 영상 URL
  allergyData?: {            // 음식 알러지 검사 결과 (구조화 데이터)
    danger: string[];          // 위험 (≥30) 음식 목록
    caution: string[];         // 경계 (24~29) 음식 목록
  };
  initialMemo: string;     // 처음 왔을 때 메모
  finalMemo: string;       // 마무리 메모
  measurements: CaseMeasurementEntry[];
  showCta?: boolean;       // 하단 상담 CTA (default: true)
  fontScale?: number;      // 전체 폰트 배율 % (default: 100)
  order: number;
}

export interface LinkBannerSlide {
  template: 'link-banner';
  id: string;
  title: string;
  subtitle: string;
  linkUrl: string;          // 클릭 시 이동할 URL
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  order: number;
  titleSize?: number;
  titleColor?: string;
  subtitleSize?: number;
  subtitleColor?: string;
  textPositionY?: number;
  titleShadow?: boolean;
  subtitleShadow?: boolean;
}

export type Slide = BannerSlide | VideoSlide | CasesSlide | LinkBannerSlide;

export function isBannerSlide(slide: Slide): slide is BannerSlide {
  return slide.template === 'banner';
}

export function isVideoSlide(slide: Slide): slide is VideoSlide {
  return slide.template === 'video';
}

export function isCasesSlide(slide: Slide): slide is CasesSlide {
  return slide.template === 'cases';
}

export interface WebsiteSection {
  id: string;
  order_index: number;
  title?: string;
  slides: Slide[];
  created_at?: string;
  updated_at?: string;
}
