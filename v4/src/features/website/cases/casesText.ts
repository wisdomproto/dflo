// 환자용 치료사례 페이지 문구 — 한국어/영어. 기본은 영어(해외 문의 유입이 주 타깃).
// 스토리 본문은 DB snapshot(story.en) 에서 오고, 여기엔 UI 문구·태그·가명 로마자만 둔다.
export type CaseLang = 'en' | 'ko';

export const CASE_LANGS: { id: CaseLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ko', label: '한국어' },
];

export const TEXT = {
  ko: {
    docTitle: '치료 사례 · 187 성장클리닉',
    gateTitle: '치료 사례 보기',
    gateDesc: ['실제 환자분들의 치료 기록입니다.', '안내받으신 비밀번호를 입력해 주세요.'],
    gatePlaceholder: '비밀번호',
    gateSubmit: '입력',
    gateChecking: '확인 중…',
    gateWrong: '비밀번호가 올바르지 않습니다',
    gateFail: '불러오지 못했습니다',
    kicker: '187 GROWUP',
    heroTitle: '우리 아이와 비슷한 아이들의 치료 기록',
    heroDesc: (n: number) =>
      `실제 진료 데이터를 기반으로 한 ${n}명의 치료 경과입니다. 이름은 가명이며, 개인을 알아볼 수 있는 정보는 모두 제외했습니다.`,
    all: '전체',
    boy: '남아',
    girl: '여아',
    duration: '치료 기간',
    afterFollowup: '이후는 추적 관찰',
    actualHeight: '실제 키',
    predictedHeight: '예상 성인키',
    father: '아버지',
    mother: '어머니',
    mph: '유전 기대키',
    desired: '희망키',
    doctorNote: '🩺 원장 노트',
    openDetail: '📈 성장 그래프 · 뼈나이 회차 기록 보기 ▾',
    closeDetail: '접기 ▴',
    tabGrowth: '성장 곡선',
    tabTrend: '예측키 추세',
    growthCaption:
      '◆ 뼈나이를 촬영한 회차의 실제 키입니다. 점선은 마지막 회차 뼈나이 기준 성인키 예측치이며, 보라색 점은 치료 종료 후 추적 회차입니다.',
    trendCaption: '회차마다 뼈나이로 다시 계산한 예상 성인키입니다. 보라색 칸은 치료 종료 후 추적 회차입니다.',
    axisAge: '실제 나이',
    axisBone: '뼈나이',
    axisGap: '차이',
    tableTitle: '🦴 뼈나이 회차별 기록',
    tableCount: (n: number) => `(${n}회 촬영)`,
    colHeight: '키',
    followup: '추적',
    disclaimer: [
      '· 치료 경과는 개인의 성장 단계·생활 습관·검사 결과에 따라 다르게 나타날 수 있으며, 특정 결과를 보장하지 않습니다.',
      '· 예상 성인키는 뼈나이와 국가 표준 성장 데이터를 근거로 계산한 참고 수치입니다.',
      '· 본 자료는 상담을 받으신 분께만 제공되는 참고 자료로, 외부 공유를 삼가 주세요.',
    ],
    chart: {
      pahLine: '최종 예상키',
      desiredLine: '희망키',
      trendY: '예측키 (cm)',
      noBoneAge: '뼈나이가 측정된 회차가 없어 예측키 추세를 표시할 수 없습니다.',
      tooltip: (h: number, age: number) => `실측 ${h}cm @ 만 ${age.toFixed(1)}세`,
    },
  },
  en: {
    docTitle: 'Treatment Cases · 187 Growth Clinic',
    gateTitle: 'Treatment Cases',
    gateDesc: ['Real treatment records from our patients.', 'Please enter the access code you were given.'],
    gatePlaceholder: 'Access code',
    gateSubmit: 'Enter',
    gateChecking: 'Checking…',
    gateWrong: 'That access code is not correct',
    gateFail: 'Could not load the cases',
    kicker: '187 GROWUP',
    heroTitle: 'Treatment records of children like yours',
    heroDesc: (n: number) =>
      `${n} treatment courses drawn from real clinical records. Names are pseudonyms and every identifying detail has been removed.`,
    all: 'All',
    boy: 'Boy',
    girl: 'Girl',
    duration: 'Treatment period',
    afterFollowup: 'follow-up visits after that',
    actualHeight: 'Actual height',
    predictedHeight: 'Predicted adult height',
    father: 'Father',
    mother: 'Mother',
    mph: 'Genetic potential',
    desired: 'Target',
    doctorNote: "🩺 Doctor's note",
    openDetail: '📈 View growth chart · bone-age records ▾',
    closeDetail: 'Close ▴',
    tabGrowth: 'Growth curve',
    tabTrend: 'Predicted height',
    growthCaption:
      '◆ Actual height at each visit where a bone-age X-ray was taken. The dotted line projects adult height from the last bone age; purple points are follow-up visits after treatment ended.',
    trendCaption:
      'Predicted adult height, recalculated from the bone age at each visit. Purple columns are follow-up visits after treatment ended.',
    axisAge: 'Age',
    axisBone: 'Bone age',
    axisGap: 'Gap',
    tableTitle: '🦴 Bone-age records',
    tableCount: (n: number) => `(${n} X-rays)`,
    colHeight: 'Height',
    followup: 'F/U',
    disclaimer: [
      '· Results vary with each child’s growth stage, lifestyle and test findings. No specific outcome is guaranteed.',
      '· Predicted adult height is a reference figure calculated from bone age and national growth-standard data.',
      '· This page is shared only with families who have consulted us. Please do not redistribute it.',
    ],
    chart: {
      pahLine: 'Predicted',
      desiredLine: 'Target',
      trendY: 'Predicted adult height (cm)',
      noBoneAge: 'No visit with a bone-age reading, so the prediction trend cannot be shown.',
      tooltip: (h: number, age: number) => `${h}cm at age ${age.toFixed(1)}`,
    },
  },
} as const;

// 고민 태그 — gen 이 만드는 한국어 라벨 → 영어. 미등록 태그는 한국어 그대로 노출(누락이 눈에 보이게).
const TAG_EN: Record<string, string> = {
  성조숙: 'Early puberty',
  '알러지검사': 'Food allergy testing',
  '비만 동반': 'With obesity',
  '유전키 작음': 'Low genetic potential',
  '늦은 시작': 'Late start',
  성장지연: 'Delayed growth',
};
export const tagText = (tag: string, lang: CaseLang) => (lang === 'ko' ? tag : (TAG_EN[tag] ?? tag));

// 가명 로마자 — gen 의 BOY_POOL/GIRL_POOL 과 1:1. 미등록이면 한글 그대로.
const NAME_EN: Record<string, string> = {
  서준: 'Seojun', 도윤: 'Doyoon', 예준: 'Yejun', 시우: 'Siwoo', 하준: 'Hajun', 주원: 'Juwon',
  지호: 'Jiho', 지후: 'Jihu', 준우: 'Junwoo', 건우: 'Geonwoo', 현우: 'Hyunwoo', 우진: 'Woojin',
  선우: 'Sunwoo', 연우: 'Yeonwoo', 유준: 'Yujun', 정우: 'Jeongwoo', 승현: 'Seunghyun', 시윤: 'Siyoon',
  준서: 'Junseo', 은찬: 'Eunchan', 수호: 'Suho', 이안: 'Ian', 태윤: 'Taeyoon', 지안: 'Jian',
  윤우: 'Yoonwoo', 승우: 'Seungwoo', 지환: 'Jihwan', 승민: 'Seungmin', 시현: 'Sihyun', 진우: 'Jinwoo',
  민재: 'Minjae', 현준: 'Hyunjun', 원준: 'Wonjun', 서진: 'Seojin', 민성: 'Minsung', 준혁: 'Junhyuk',
  태민: 'Taemin', 규민: 'Gyumin', 동현: 'Donghyun', 재윤: 'Jaeyoon', 시원: 'Siwon', 지율: 'Jiyul',
  태현: 'Taehyun', 민규: 'Mingyu', 재원: 'Jaewon',
  서연: 'Seoyeon', 지유: 'Jiyu', 하은: 'Haeun', 서현: 'Seohyun', 하윤: 'Hayoon', 지아: 'Jia',
  수아: 'Sua', 예은: 'Yeeun', 소율: 'Soyul', 채원: 'Chaewon', 다은: 'Daeun', 은서: 'Eunseo',
  시은: 'Sieun', 예린: 'Yerin', 윤서: 'Yoonseo', 가은: 'Gaeun', 유나: 'Yuna', 주아: 'Jua',
  아린: 'Arin', 나윤: 'Nayoon', 채은: 'Chaeeun', 수빈: 'Subin',
};
export const nameText = (name: string, lang: CaseLang) => (lang === 'ko' ? name : (NAME_EN[name] ?? name));

// 나이·기간 표기. 영어는 "11y 6m" 처럼 짧게(회차 스트립이 칸당 64px 라 길면 접힌다).
export const fmtAge = (a: number, lang: CaseLang) => {
  const y = Math.floor(a);
  const m = Math.round((a - y) * 12);
  if (m >= 12) return lang === 'ko' ? `만 ${y + 1}세` : `age ${y + 1}`;
  if (lang === 'ko') return m > 0 ? `만 ${y}세 ${m}개월` : `만 ${y}세`;
  return m > 0 ? `age ${y}y ${m}m` : `age ${y}`;
};
export const fmtDur = (mo: number, lang: CaseLang) => {
  const y = Math.floor(mo / 12);
  const m = mo % 12;
  if (lang === 'ko') return y > 0 ? (m > 0 ? `${y}년 ${m}개월` : `${y}년`) : `${m}개월`;
  return y > 0 ? (m > 0 ? `${y}y ${m}m` : `${y} years`) : `${m} months`;
};
export const ymText = (dec: number, lang: CaseLang) => {
  const t = Math.round(dec * 12);
  const y = Math.floor(t / 12);
  const m = t % 12;
  if (lang === 'ko') return m > 0 ? `${y}세 ${m}개월` : `${y}세`;
  return m > 0 ? `${y}y ${m}m` : `${y}y`;
};
export const gapYM = (dec: number, lang: CaseLang) => {
  const t = Math.round(dec * 12);
  const sign = t > 0 ? '+' : t < 0 ? '−' : '';
  const a = Math.abs(t);
  const y = Math.floor(a / 12);
  const m = a % 12;
  const body =
    lang === 'ko'
      ? y > 0 ? (m > 0 ? `${y}년 ${m}개월` : `${y}년`) : `${m}개월`
      : y > 0 ? (m > 0 ? `${y}y ${m}m` : `${y}y`) : `${m}m`;
  return `${sign}${body}`;
};
