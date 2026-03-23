export interface Program {
  slug: string;
  title: string;
  shortTitle: string;
  emoji: string;
  description: string;
  features: string[];
  targetChildren: string[];
  color: string;
}

export const PROGRAMS: Program[] = [
  {
    slug: 'hormone-balance',
    title: '성장 호르몬 밸런스',
    shortTitle: '호르몬 밸런스',
    emoji: '💉',
    description: '성장호르몬 분비를 최적화하여 자연스러운 키 성장을 유도하는 프로그램입니다.',
    features: ['성장호르몬 분비 검사', '맞춤형 호르몬 밸런스 치료', '생활습관 개선 코칭', '정기적 성장 모니터링'],
    targetChildren: ['또래보다 키가 작은 아이', '성장호르몬 분비가 부족한 아이', '성장 속도가 갑자기 느려진 아이'],
    color: '#0F6E56',
  },
  {
    slug: 'precocious-puberty',
    title: '성조숙증 관리',
    shortTitle: '성조숙증 관리',
    emoji: '🔬',
    description: '조기에 시작된 사춘기를 관리하여 성장 기간을 최대한 확보하는 프로그램입니다.',
    features: ['골연령 정밀 검사', '사춘기 진행 억제 치료', '영양/운동 병행 프로그램', '심리 상담 지원'],
    targetChildren: ['여아 8세 이전 가슴 발달', '남아 9세 이전 2차 성징', '골연령이 실제 나이보다 빠른 아이'],
    color: '#7C3AED',
  },
  {
    slug: 'body-proportion',
    title: '신체 비율이 예뻐지는',
    shortTitle: '신체 비율 교정',
    emoji: '✨',
    description: '체형 교정과 균형 잡힌 성장을 통해 아름다운 신체 비율을 만들어주는 프로그램입니다.',
    features: ['체형 정밀 분석', '맞춤 교정 운동 프로그램', '자세 교정 치료', '성장 스트레칭 지도'],
    targetChildren: ['다리가 휘어진 아이', '어깨가 말린 아이', '체형 불균형이 있는 아이'],
    color: '#EC4899',
  },
  {
    slug: 'obesity-growth',
    title: '비만 아이 특화 성장',
    shortTitle: '비만 특화 성장',
    emoji: '🏃',
    description: '체중 관리와 키 성장을 동시에 달성하는 비만 아이 맞춤 프로그램입니다.',
    features: ['체성분 분석', '맞춤 식단 설계', '성장 운동 프로그램', '대사 기능 개선'],
    targetChildren: ['소아비만으로 진단받은 아이', '살이 키로 가지 않는 아이', '운동량이 부족한 아이'],
    color: '#F59E0B',
  },
  {
    slug: 'posture-exercise',
    title: '성장 체형 교정운동',
    shortTitle: '체형 교정운동',
    emoji: '🧘',
    description: '바른 자세와 체형 교정 운동으로 숨어있는 키를 찾아주는 프로그램입니다.',
    features: ['체형 분석 및 평가', '1:1 교정 운동 지도', '홈트레이닝 프로그램', '정기적 체형 변화 추적'],
    targetChildren: ['거북목/라운드숄더 아이', '앉는 자세가 안 좋은 아이', '운동을 싫어하는 아이'],
    color: '#14B8A6',
  },
  {
    slug: 'feet-care',
    title: '곧은 발육 케어',
    shortTitle: '발육 케어',
    emoji: '🦶',
    description: '발과 다리의 올바른 성장을 돕는 맞춤형 발육 케어 프로그램입니다.',
    features: ['족부 정밀 검사', '맞춤 인솔 처방', '하지 교정 운동', '보행 패턴 개선'],
    targetChildren: ['평발인 아이', 'O다리/X다리 아이', '걸음걸이가 불편한 아이'],
    color: '#6366F1',
  },
  {
    slug: 'late-growth',
    title: '성장 시기를 놓친 아이를 위한 프로그램',
    shortTitle: '늦은 성장 케어',
    emoji: '⏰',
    description: '성장 골든타임을 놓쳤더라도 남은 성장 잠재력을 최대화하는 프로그램입니다.',
    features: ['잔여 성장판 분석', '집중 성장 치료', '맞춤 영양 보충', '성장 촉진 운동'],
    targetChildren: ['사춘기가 이미 시작된 아이', '성장판이 거의 닫힌 아이', '마지막 성장 기회를 잡고 싶은 아이'],
    color: '#EF4444',
  },
];
