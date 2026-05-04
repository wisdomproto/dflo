// Website section types
// Each slide has its own template - a section is a collection of mixed slides

export type SlideTemplate = 'banner' | 'video' | 'cases' | 'iframe' | 'faq';

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
  titleAlign?: 'left' | 'center' | 'right' | 'justify';
  subtitleSize?: number;
  subtitleColor?: string;
  subtitleAlign?: 'left' | 'center' | 'right' | 'justify';
  textPositionY?: number; // bottom % (default 12)
  titleShadow?: boolean; // default true
  subtitleShadow?: boolean; // default true
  ctaSize?: 'sm' | 'md' | 'lg';
  ctaSizePx?: number;                    // 커스텀 버튼 크기 (px, 설정 시 ctaSize보다 우선)
  ctaAlign?: 'left' | 'center' | 'right'; // 버튼 정렬
  ctaBgColor?: string;                   // 버튼 배경색 (default: #0F6E56)
  ctaTextColor?: string;                 // 버튼 글자색 (default: #ffffff)
  modalRatio?: '4:5' | '9:16'; // modal 배너 외각 비율 (default: 9:16)
  iframeZoom?: number;          // iframe 콘텐츠 zoom % (default: 100)
  iframeFlexHeight?: boolean;   // iframe 슬라이드의 종횡비 강제 해제 (info-stack 용, default: false)
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

// info-stack 섹션을 정적 HTML 파일로 운영하기 위한 슬라이드 타입.
// 화교 시장 리디자인(Hero·병원소개·FAQ·CTA)에서 mockup HTML을 그대로 임베드한다.
export interface IframeSlide {
  template: 'iframe';
  id: string;
  src: string;              // /mockups/clinic-intro.html 같은 경로 또는 외부 URL
  height?: number;          // px 고정 높이 (미지정 시 콘텐츠 자연 높이)
  showFrame?: boolean;      // 외곽 보더/헤더 표시 (default false → 섹션에 매끄럽게 녹아듦)
  zoom?: number;            // 콘텐츠 zoom % (default 100)
  bgColor?: string;         // 외곽 배경색 (default white)
  order: number;
}

// FAQ 아코디언 슬라이드 — info-stack 섹션 용. 어드민에서 Q&A 추가/삭제/순서 변경 가능.
// KO 가 기본 언어, ZH 는 옵션 (화교 시장 다국어 대응).
export interface FaqItem {
  id: string;
  question: string;        // KO 질문
  answer: string;          // KO 답변 (multi-line, plain text. \n 줄바꿈)
  questionZh?: string;     // 中文 질문
  answerZh?: string;       // 中文 답변
}

export interface FaqSlide {
  template: 'faq';
  id: string;
  badge?: string;          // 상단 작은 배지 ("자주 묻는 질문")
  badgeZh?: string;
  title: string;           // 큰 제목 (multi-line)
  titleZh?: string;
  subtitle?: string;       // 부제
  subtitleZh?: string;
  items: FaqItem[];
  ctaHeadline?: string;    // 하단 CTA 카드 헤드라인 ("더 궁금한 점이 있으신가요?")
  ctaHeadlineZh?: string;
  ctaTitle?: string;       // 하단 CTA 큰 글씨 ("의사에게 직접 물어보세요")
  ctaTitleZh?: string;
  ctaButtonText?: string;  // CTA 버튼 텍스트
  ctaButtonTextZh?: string;
  ctaButtonUrl?: string;   // CTA 클릭 시 이동 URL (카톡 등)
  showLanguageToggle?: boolean; // KO/ZH 토글 표시 (default: ZH 데이터 있으면 자동 노출)
  order: number;
}

export type Slide = BannerSlide | VideoSlide | CasesSlide | LinkBannerSlide | IframeSlide | FaqSlide;

export function isBannerSlide(slide: Slide): slide is BannerSlide {
  return slide.template === 'banner';
}

export function isVideoSlide(slide: Slide): slide is VideoSlide {
  return slide.template === 'video';
}

export function isCasesSlide(slide: Slide): slide is CasesSlide {
  return slide.template === 'cases';
}

export function isIframeSlide(slide: Slide): slide is IframeSlide {
  return slide.template === 'iframe';
}

export function isFaqSlide(slide: Slide): slide is FaqSlide {
  return slide.template === 'faq';
}

export interface WebsiteSection {
  id: string;
  order_index: number;
  title?: string;
  slides: Slide[];
  showNav?: boolean; // 캐러셀 하단 도트 + 좌우 화살표 표시 (default: true)
  fullBleed?: boolean; // 카드 프레임 제거 + viewport 가득 (info-stack iframe 섹션 용, default: false)
  /** 어드민에서 토글하는 노출 여부. undefined 면 노출(default: true).
   *  false 일 때만 환자 화면에서 숨겨지고, 어드민 미리보기에는 흐리게 표시. */
  visible?: boolean;
  created_at?: string;
  updated_at?: string;
}
