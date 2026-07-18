// ================================================
// 한국 소아 성장 표준 데이터 (2017 질병관리청)
// 출처: 성장도표+데이터+테이블.xls
// ================================================

// ── LMS 행 타입 ──

interface LMSRow {
  age: number;
  L: number;
  M: number;
  S: number;
}

// ── 퍼센타일 데이터 (차트 표시용, LMS에서 자동 계산) ──

interface HeightPercentile {
  age: number;
  p5: number;
  p50: number;
  p95: number;
}

/** LMS에서 특정 Z-score에 해당하는 키 역산 */
function heightFromLMS(lms: LMSRow, z: number): number {
  if (Math.abs(lms.L) < 0.001) {
    return Math.round(lms.M * Math.exp(lms.S * z) * 10) / 10;
  }
  const inside = 1 + lms.L * lms.S * z;
  if (inside <= 0) return 0;
  return Math.round(lms.M * Math.pow(inside, 1 / lms.L) * 10) / 10;
}

/** LMS 테이블에서 p5/p50/p95 표준곡선 생성 */
function buildPercentiles(table: LMSRow[]): HeightPercentile[] {
  return table.map((lms) => ({
    age: lms.age,
    p5: heightFromLMS(lms, -1.645),
    p50: Math.round(lms.M * 10) / 10,
    p95: heightFromLMS(lms, 1.645),
  }));
}

/**
 * 성장 표준 선택자.
 * - 'KR': 한국 2017 질병관리청 (기본값) — ko/vi 계산기
 * - 'TH': 태국 TSPE 2022 차트 (2-5세 WHO 2006 + 5-19세 Thai National Growth Reference 2020)
 *         디지타이즈 → P3/P50/P97 → LMS(L=1) 변환. 태국어(th) 계산기.
 * - 'US': 미국 CDC 2000 (statage.csv 공식 LMS). 미국 + 호주(NHMRC 가 2~18세에 CDC 채택) 커버.
 * - 'ID': 인도네시아 INGRC (National Synthetic Growth Reference, 2013 국가기초보건조사 30만+ 명).
 *         원본이 키를 mean+SD 로 공표 → L=1(정규), S=SD/M. TH 와 동일한 구성.
 * - 'CN': 중국 소아 신장 표준 (근사 LMS — P5/P50/P95 육안추출 → L=0 로그정규 근사, ±1cm).
 *         영어(en) 계산기의 국적 선택(화교 타겟)용. ⚠️ 공식 LMS 아님 — 정밀 필요 시 2005 중국 표준 디지타이즈로 교체.
 *
 * ⚠️ 말레이시아(MyGC)는 넣지 않았다. 국가 차트는 존재하나(NHMS III 2006) MOH 기술보고서라 LMS 미공개이고,
 *    공개된 대체본(Bong & Shariff 2012, 서말레이시아 학생 14,360명)은 중앙값이 단조증가하지 않는다
 *    (남아 8.0세 122.7 → 8.5세 128.7 → 9.0세 129.2cm) → 백분위가 뒤집혀 못 쓴다.
 */
export type GrowthStandard = 'KR' | 'TH' | 'CN' | 'US' | 'ID' | 'WHO';

/** standard + gender 에 맞는 키 LMS 테이블 반환 */
function heightTable(gender: 'male' | 'female', standard: GrowthStandard = 'KR'): LMSRow[] {
  if (standard === 'TH') {
    return gender === 'male' ? MALE_HEIGHT_LMS_TH : FEMALE_HEIGHT_LMS_TH;
  }
  if (standard === 'CN') {
    return gender === 'male' ? MALE_HEIGHT_LMS_CN : FEMALE_HEIGHT_LMS_CN;
  }
  if (standard === 'US') {
    return gender === 'male' ? MALE_HEIGHT_LMS_US : FEMALE_HEIGHT_LMS_US;
  }
  if (standard === 'ID') {
    return gender === 'male' ? MALE_HEIGHT_LMS_ID : FEMALE_HEIGHT_LMS_ID;
  }
  if (standard === 'WHO') {
    return gender === 'male' ? MALE_HEIGHT_LMS_WHO : FEMALE_HEIGHT_LMS_WHO;
  }
  return gender === 'male' ? MALE_HEIGHT_LMS : FEMALE_HEIGHT_LMS;
}

// ── WHO 성장 표준 (계산기 전용, 아랍어 등 국제 기본값) ─────────────────────────
// height-for-age LMS. 2~5세 = WHO 2006 Child Growth Standards(length/height-for-age,
// 만 2세부터 standing-height 세그먼트) + 5.5~18세 = WHO 2007 Growth Reference(5-19y).
// 원본 = WHO CDN 공식 expandable z-score xlsx (lhfa 2006 / hfa 2007, 남녀 각). L=1(height-for-age 규격).
// 검증: M 앵커 남 2y87.1/5y110.0/10y137.8/18y176.1 · 여 2y85.7/5y109.4/10y138.6/18y163.1 (WHO P50 일치) · M 단조증가.
const MALE_HEIGHT_LMS_WHO: LMSRow[] = [
  { age: 2.0, L: 1, M: 87.1303, S: 0.03508 },
  { age: 2.5, L: 1, M: 91.9297, S: 0.03704 },
  { age: 3.0, L: 1, M: 96.0889, S: 0.03858 },
  { age: 3.5, L: 1, M: 99.8441, S: 0.0397 },
  { age: 4.0, L: 1, M: 103.3273, S: 0.04059 },
  { age: 4.5, L: 1, M: 106.6736, S: 0.04139 },
  { age: 5.0, L: 1, M: 109.9593, S: 0.04214 },
  { age: 5.5, L: 1, M: 112.911, S: 0.04203 },
  { age: 6.0, L: 1, M: 115.9509, S: 0.04249 },
  { age: 6.5, L: 1, M: 118.87, S: 0.04295 },
  { age: 7.0, L: 1, M: 121.7338, S: 0.04342 },
  { age: 7.5, L: 1, M: 124.5361, S: 0.0439 },
  { age: 8.0, L: 1, M: 127.2651, S: 0.04438 },
  { age: 8.5, L: 1, M: 129.93, S: 0.04487 },
  { age: 9.0, L: 1, M: 132.5652, S: 0.04535 },
  { age: 9.5, L: 1, M: 135.1829, S: 0.04582 },
  { age: 10.0, L: 1, M: 137.7795, S: 0.04626 },
  { age: 10.5, L: 1, M: 140.3948, S: 0.04667 },
  { age: 11.0, L: 1, M: 143.1126, S: 0.04703 },
  { age: 11.5, L: 1, M: 145.9891, S: 0.04732 },
  { age: 12.0, L: 1, M: 149.0807, S: 0.04753 },
  { age: 12.5, L: 1, M: 152.4425, S: 0.04763 },
  { age: 13.0, L: 1, M: 156.0426, S: 0.0476 },
  { age: 13.5, L: 1, M: 159.6962, S: 0.04744 },
  { age: 14.0, L: 1, M: 163.1816, S: 0.04714 },
  { age: 14.5, L: 1, M: 166.305, S: 0.04671 },
  { age: 15.0, L: 1, M: 168.958, S: 0.04619 },
  { age: 15.5, L: 1, M: 171.1468, S: 0.04559 },
  { age: 16.0, L: 1, M: 172.8967, S: 0.04495 },
  { age: 16.5, L: 1, M: 174.2251, S: 0.04429 },
  { age: 17.0, L: 1, M: 175.1609, S: 0.04364 },
  { age: 17.5, L: 1, M: 175.7672, S: 0.04301 },
  { age: 18.0, L: 1, M: 176.1449, S: 0.04241 },
];
const FEMALE_HEIGHT_LMS_WHO: LMSRow[] = [
  { age: 2.0, L: 1, M: 85.7299, S: 0.03764 },
  { age: 2.5, L: 1, M: 90.6765, S: 0.03893 },
  { age: 3.0, L: 1, M: 95.0572, S: 0.04007 },
  { age: 3.5, L: 1, M: 99.0369, S: 0.04105 },
  { age: 4.0, L: 1, M: 102.7312, S: 0.04193 },
  { age: 4.5, L: 1, M: 106.1817, S: 0.04272 },
  { age: 5.0, L: 1, M: 109.4189, S: 0.04346 },
  { age: 5.5, L: 1, M: 112.1753, S: 0.04399 },
  { age: 6.0, L: 1, M: 115.1244, S: 0.04447 },
  { age: 6.5, L: 1, M: 117.9769, S: 0.04489 },
  { age: 7.0, L: 1, M: 120.8105, S: 0.04525 },
  { age: 7.5, L: 1, M: 123.6646, S: 0.04556 },
  { age: 8.0, L: 1, M: 126.5558, S: 0.04581 },
  { age: 8.5, L: 1, M: 129.4975, S: 0.046 },
  { age: 9.0, L: 1, M: 132.4944, S: 0.04612 },
  { age: 9.5, L: 1, M: 135.541, S: 0.04617 },
  { age: 10.0, L: 1, M: 138.6363, S: 0.04614 },
  { age: 10.5, L: 1, M: 141.7892, S: 0.04603 },
  { age: 11.0, L: 1, M: 144.9929, S: 0.04584 },
  { age: 11.5, L: 1, M: 148.1804, S: 0.04557 },
  { age: 12.0, L: 1, M: 151.2327, S: 0.04523 },
  { age: 12.5, L: 1, M: 154.0041, S: 0.04483 },
  { age: 13.0, L: 1, M: 156.3748, S: 0.04439 },
  { age: 13.5, L: 1, M: 158.2997, S: 0.04392 },
  { age: 14.0, L: 1, M: 159.789, S: 0.04345 },
  { age: 14.5, L: 1, M: 160.8927, S: 0.04299 },
  { age: 15.0, L: 1, M: 161.6692, S: 0.04255 },
  { age: 15.5, L: 1, M: 162.188, S: 0.04214 },
  { age: 16.0, L: 1, M: 162.5156, S: 0.04176 },
  { age: 16.5, L: 1, M: 162.7165, S: 0.04141 },
  { age: 17.0, L: 1, M: 162.8545, S: 0.04109 },
  { age: 17.5, L: 1, M: 162.9649, S: 0.0408 },
  { age: 18.0, L: 1, M: 163.0595, S: 0.04053 },
];

export function getHeightStandard(
  gender: 'male' | 'female',
  standard: GrowthStandard = 'KR',
): HeightPercentile[] {
  return buildPercentiles(heightTable(gender, standard));
}

// ── LMS 데이터 (백분위·Z-score·예측키 계산용) ──
// L: Box-Cox power, M: median, S: coefficient of variation

// 남아 키 LMS (만 2~18세, 6개월 단위)
const MALE_HEIGHT_LMS: LMSRow[] = [
  { age: 2, L: 1, M: 87.1161, S: 0.0351 },
  { age: 2.5, L: 1, M: 91.9327, S: 0.037 },
  { age: 3, L: -1.0915, M: 96.4961, S: 0.0403 },
  { age: 3.5, L: -0.5827, M: 99.793, S: 0.0401 },
  { age: 4, L: -0.1597, M: 103.0749, S: 0.04 },
  { age: 4.5, L: 0.1897, M: 106.344, S: 0.0399 },
  { age: 5, L: 0.4242, M: 109.5896, S: 0.0398 },
  { age: 5.5, L: 0.3787, M: 112.7735, S: 0.04 },
  { age: 6, L: 0.1783, M: 115.9183, S: 0.0403 },
  { age: 6.5, L: 0.0563, M: 119.0136, S: 0.0406 },
  { age: 7, L: 0.0492, M: 122.0537, S: 0.0406 },
  { age: 7.5, L: 0.0397, M: 125.0114, S: 0.0406 },
  { age: 8, L: 0.1205, M: 127.8793, S: 0.0405 },
  { age: 8.5, L: 0.2339, M: 130.6754, S: 0.0404 },
  { age: 9, L: 0.1885, M: 133.4136, S: 0.0405 },
  { age: 9.5, L: 0.021, M: 136.1026, S: 0.041 },
  { age: 10, L: -0.0752, M: 138.8473, S: 0.0417 },
  { age: 10.5, L: -0.0489, M: 141.7059, S: 0.0426 },
  { age: 11, L: 0.0886, M: 144.701, S: 0.0438 },
  { age: 11.5, L: 0.4064, M: 147.9321, S: 0.0453 },
  { age: 12, L: 0.8928, M: 151.4223, S: 0.0465 },
  { age: 12.5, L: 1.458, M: 155.0459, S: 0.0469 },
  { age: 13, L: 2.0111, M: 158.6245, S: 0.0463 },
  { age: 13.5, L: 2.6754, M: 162.0038, S: 0.0445 },
  { age: 14, L: 3.3119, M: 164.965, S: 0.0417 },
  { age: 14.5, L: 3.6315, M: 167.3647, S: 0.0388 },
  { age: 15, L: 3.5208, M: 169.1812, S: 0.0363 },
  { age: 15.5, L: 2.9809, M: 170.4684, S: 0.0345 },
  { age: 16, L: 2.154, M: 171.3949, S: 0.0332 },
  { age: 16.5, L: 1.3966, M: 172.0897, S: 0.0323 },
  { age: 17, L: 0.9751, M: 172.6404, S: 0.0321 },
  { age: 17.5, L: 0.6595, M: 173.1222, S: 0.0321 },
  { age: 18, L: 0.3638, M: 173.6037, S: 0.032 },
];

// 여아 키 LMS (만 2~18세, 6개월 단위)
const FEMALE_HEIGHT_LMS: LMSRow[] = [
  { age: 2, L: 1, M: 85.7153, S: 0.0376 },
  { age: 2.5, L: 1, M: 90.6797, S: 0.0389 },
  { age: 3, L: 0.5472, M: 95.4078, S: 0.0413 },
  { age: 3.5, L: 0.2825, M: 98.6465, S: 0.0407 },
  { age: 4, L: 0.1129, M: 101.8943, S: 0.0401 },
  { age: 4.5, L: -0.0216, M: 105.1425, S: 0.0395 },
  { age: 5, L: -0.1404, M: 108.3714, S: 0.039 },
  { age: 5.5, L: -0.0272, M: 111.5656, S: 0.0388 },
  { age: 6, L: 0.2115, M: 114.7289, S: 0.0388 },
  { age: 6.5, L: 0.2769, M: 117.8257, S: 0.0391 },
  { age: 7, L: 0.0163, M: 120.8229, S: 0.0396 },
  { age: 7.5, L: -0.3571, M: 123.7505, S: 0.0402 },
  { age: 8, L: -0.5993, M: 126.6703, S: 0.041 },
  { age: 8.5, L: -0.779, M: 129.6197, S: 0.0416 },
  { age: 9, L: -0.8812, M: 132.6442, S: 0.0423 },
  { age: 9.5, L: -0.6545, M: 135.8116, S: 0.0432 },
  { age: 10, L: -0.1573, M: 139.1218, S: 0.0438 },
  { age: 10.5, L: 0.4653, M: 142.4689, S: 0.044 },
  { age: 11, L: 1.1242, M: 145.7568, S: 0.0435 },
  { age: 11.5, L: 1.8239, M: 148.8746, S: 0.0421 },
  { age: 12, L: 2.3447, M: 151.6571, S: 0.0402 },
  { age: 12.5, L: 2.5648, M: 154.0138, S: 0.0382 },
  { age: 13, L: 2.5607, M: 155.9198, S: 0.0362 },
  { age: 13.5, L: 2.3149, M: 157.3292, S: 0.0348 },
  { age: 14, L: 2.0549, M: 158.3159, S: 0.0339 },
  { age: 14.5, L: 1.967, M: 159.0139, S: 0.0334 },
  { age: 15, L: 1.79, M: 159.4917, S: 0.033 },
  { age: 15.5, L: 1.3515, M: 159.8149, S: 0.0328 },
  { age: 16, L: 0.8678, M: 160.0286, S: 0.0325 },
  { age: 16.5, L: 0.332, M: 160.1342, S: 0.032 },
  { age: 17, L: -0.164, M: 160.2483, S: 0.0316 },
  { age: 17.5, L: -0.311, M: 160.4524, S: 0.0313 },
  { age: 18, L: -0.4107, M: 160.6484, S: 0.0311 },
];

// ================================================
// 태국 키 LMS 데이터 (TSPE 2022 차트 디지타이즈)
// 출처: WHO Growth Standard 2-5세 (2006) + Thai National Growth Reference 5-19세
//       (2020, Bureau of Nutrition, Dept. of Health, MoPH). TSPE 차트(2022)에서
//       P3/P50/P97 곡선을 정수 나이마다 판독 → M=P50, S=(P97-P3)/(3.7616·M),
//       L=1(정규근사) 로 변환. 태국 계산기(lang='th')에서만 사용.
// 주의: 태국 아동 중앙값은 한국보다 낮음(성인 남 ~171 / 여 ~159cm).
// ================================================

// 태국 남아 키 LMS (만 2~18세)
const MALE_HEIGHT_LMS_TH: LMSRow[] = [
  { age: 2, L: 1, M: 87, S: 0.0336 },
  { age: 3, L: 1, M: 96, S: 0.0388 },
  { age: 4, L: 1, M: 103, S: 0.0387 },
  { age: 5, L: 1, M: 110, S: 0.0387 },
  { age: 6, L: 1, M: 116, S: 0.039 },
  { age: 7, L: 1, M: 121, S: 0.0395 },
  { age: 8, L: 1, M: 127, S: 0.0398 },
  { age: 9, L: 1, M: 132, S: 0.0423 },
  { age: 10, L: 1, M: 137, S: 0.0427 },
  { age: 11, L: 1, M: 143, S: 0.0446 },
  { age: 12, L: 1, M: 149, S: 0.0464 },
  { age: 13, L: 1, M: 155, S: 0.0446 },
  { age: 14, L: 1, M: 161, S: 0.0413 },
  { age: 15, L: 1, M: 166, S: 0.0368 },
  { age: 16, L: 1, M: 169, S: 0.033 },
  { age: 17, L: 1, M: 170, S: 0.0313 },
  { age: 18, L: 1, M: 171, S: 0.0295 },
];

// 태국 여아 키 LMS (만 2~18세)
const FEMALE_HEIGHT_LMS_TH: LMSRow[] = [
  { age: 2, L: 1, M: 86, S: 0.034 },
  { age: 3, L: 1, M: 95, S: 0.0392 },
  { age: 4, L: 1, M: 101, S: 0.0395 },
  { age: 5, L: 1, M: 108, S: 0.0369 },
  { age: 6, L: 1, M: 114, S: 0.0396 },
  { age: 7, L: 1, M: 120, S: 0.0399 },
  { age: 8, L: 1, M: 126, S: 0.0401 },
  { age: 9, L: 1, M: 132, S: 0.0423 },
  { age: 10, L: 1, M: 138, S: 0.0443 },
  { age: 11, L: 1, M: 144, S: 0.0425 },
  { age: 12, L: 1, M: 150, S: 0.039 },
  { age: 13, L: 1, M: 154, S: 0.0345 },
  { age: 14, L: 1, M: 156, S: 0.0324 },
  { age: 15, L: 1, M: 158, S: 0.0303 },
  { age: 16, L: 1, M: 158, S: 0.0303 },
  { age: 17, L: 1, M: 159, S: 0.0284 },
  { age: 18, L: 1, M: 159, S: 0.0301 },
];

// ================================================
// 인도네시아 INGRC — National Synthetic Growth Reference (키)
// 출처: Pulungan AB, Julia M, Batubara JRL, Hermanussen M.
//       "Indonesian National Synthetic Growth Charts", Acta Scientific Paediatrics 1.1 (2018): 20-34.
//       Table 3(남아)·Table 4(여아) Height. 원자료 = 2013 국가기초보건조사(NHBS/Riskesdas,
//       33개 주·가구원 100만+ 중 소아청소년 30만+ 명) — 인도네시아 소아내분비학회가 채택한 국가 기준.
// 변환: 원본이 키를 **mean + SD** 로 공표(키는 정규분포) → L=1, M=mean, S=SD/M. TH 와 동일한 구성.
//       검증: 전 23행에서 원본 P3 == M − 1.8808·SD (오차 <0.15cm) → L=1 확인. 중앙값 역전 0.
// ⚠️ 원본은 0~18세지만 계산기 규격에 맞춰 **만 2~18세**만 싣는다(predictAdultHeightLMS 가
//    마지막 행을 성인 기준으로 쓰므로 18세에서 끊는 것도 다른 표준과 동일).
// 왜 필요한가: 인도네시아인은 WHO/CDC 기준으론 상당수가 '저신장'으로 잡힌다
//    (성인 남성이 WHO 기준보다 ~12cm 작음) → 자국 기준이 없으면 예측·백분위가 과소평가된다.
// ================================================

// 인도네시아 남아 키 LMS (만 2~18세)
const MALE_HEIGHT_LMS_ID: LMSRow[] = [
  { age: 2, L: 1, M: 83.97, S: 0.0429 },
  { age: 3, L: 1, M: 92.03, S: 0.0447 },
  { age: 4, L: 1, M: 98.47, S: 0.0457 },
  { age: 5, L: 1, M: 104.72, S: 0.0453 },
  { age: 6, L: 1, M: 110.56, S: 0.046 },
  { age: 7, L: 1, M: 115.49, S: 0.0464 },
  { age: 8, L: 1, M: 120.29, S: 0.0469 },
  { age: 9, L: 1, M: 125.22, S: 0.0471 },
  { age: 10, L: 1, M: 129.85, S: 0.0477 },
  { age: 11, L: 1, M: 134.71, S: 0.0486 },
  { age: 12, L: 1, M: 139.56, S: 0.0513 },
  { age: 13, L: 1, M: 145.27, S: 0.0552 },
  { age: 14, L: 1, M: 151.41, S: 0.055 },
  { age: 15, L: 1, M: 156.53, S: 0.0502 },
  { age: 16, L: 1, M: 160.36, S: 0.044 },
  { age: 17, L: 1, M: 162.56, S: 0.0408 },
  { age: 18, L: 1, M: 164.03, S: 0.0396 },
];

// 인도네시아 여아 키 LMS (만 2~18세)
const FEMALE_HEIGHT_LMS_ID: LMSRow[] = [
  { age: 2, L: 1, M: 82.12, S: 0.043 },
  { age: 3, L: 1, M: 90.41, S: 0.0442 },
  { age: 4, L: 1, M: 97.35, S: 0.0459 },
  { age: 5, L: 1, M: 103.46, S: 0.0461 },
  { age: 6, L: 1, M: 109.63, S: 0.046 },
  { age: 7, L: 1, M: 114.94, S: 0.0465 },
  { age: 8, L: 1, M: 120.07, S: 0.0474 },
  { age: 9, L: 1, M: 125.01, S: 0.048 },
  { age: 10, L: 1, M: 130.46, S: 0.0498 },
  { age: 11, L: 1, M: 135.76, S: 0.0513 },
  { age: 12, L: 1, M: 140.96, S: 0.0504 },
  { age: 13, L: 1, M: 145.48, S: 0.046 },
  { age: 14, L: 1, M: 149.13, S: 0.0413 },
  { age: 15, L: 1, M: 151.38, S: 0.0393 },
  { age: 16, L: 1, M: 152.75, S: 0.0382 },
  { age: 17, L: 1, M: 153.42, S: 0.0378 },
  { age: 18, L: 1, M: 154.05, S: 0.0375 },
];

// ================================================
// 미국 CDC 2000 소아 신장(키) 표준 LMS — 공식 데이터
// 출처: CDC/NCHS 2000 Growth Charts, statage.csv (Sex/Agemos/L/M/S 원본)
//       https://www.cdc.gov/growthcharts/data/zscore/statage.csv
//       미국 전국 조사(NHANES 등 5개, 1963~1994)의 인구 대표 표본 — 인종별 차트 아님
//       (CDC 는 인종 간 차이가 유전보다 환경 요인이라 보고 통합 차트만 제공).
// 적용 국가: 미국 + **호주**(자국 성장도표 없음 — NHMRC 지침이 2~18세에 CDC 차트 사용,
//            0~2세만 WHO). 영어권 문의 유입(2026-07)에 대응.
// 변환: 원본은 반개월 격자(24, 24.5, 25.5 …)라 정수/반년 지점이 없어 이웃 두 행을 선형 보간해
//       KR 과 동일한 **만 2~18세 · 0.5년 단위 33행** 으로 맞춤(interpolateLMS 가 선형 보간이라 규격 일치가 중요).
// ⚠️ 18세에서 끊는다 — predictAdultHeightLMS 가 **테이블 마지막 행을 성인 기준**으로 쓰므로
//    원본대로 20세까지 넣으면 예측 기준이 20세로 바뀐다(다른 표준과 불일치).
// 검증(원본 대조): 남 18세 M=176.1348·L=1.421·S=0.0407 / 여 12세 M=150.8936(원본 11.96세 행) 일치.
// ================================================

// 미국 남아 키 LMS (만 2~18세, CDC 2000)
const MALE_HEIGHT_LMS_US: LMSRow[] = [
  { age: 2, L: 0.9415, M: 86.4522, S: 0.0403 },
  { age: 2.5, L: 0.2306, M: 90.9808, S: 0.041 },
  { age: 3, L: -0.3474, M: 94.96, S: 0.0406 },
  { age: 3.5, L: 0.2746, M: 98.7008, S: 0.0408 },
  { age: 4, L: 0.7929, M: 102.2239, S: 0.0413 },
  { age: 4.5, L: 1.1145, M: 105.6037, S: 0.0419 },
  { age: 5, L: 1.2607, M: 108.9024, S: 0.0425 },
  { age: 5.5, L: 1.2606, M: 112.1593, S: 0.0431 },
  { age: 6, L: 1.1501, M: 115.3924, S: 0.0436 },
  { age: 6.5, L: 0.9714, M: 118.6008, S: 0.044 },
  { age: 7, L: 0.7697, M: 121.7689, S: 0.0444 },
  { age: 7.5, L: 0.5891, M: 124.871, S: 0.0447 },
  { age: 8, L: 0.4629, M: 127.8779, S: 0.0451 },
  { age: 8.5, L: 0.4066, M: 130.7634, S: 0.0456 },
  { age: 9, L: 0.4131, M: 133.5114, S: 0.0462 },
  { age: 9.5, L: 0.4568, M: 136.122, S: 0.0468 },
  { age: 10, L: 0.5026, M: 138.6188, S: 0.0476 },
  { age: 10.5, L: 0.519, M: 141.0554, S: 0.0482 },
  { age: 11, L: 0.4918, M: 143.5205, S: 0.0489 },
  { age: 11.5, L: 0.4387, M: 146.1381, S: 0.0494 },
  { age: 12, L: 0.4188, M: 149.0503, S: 0.0499 },
  { age: 12.5, L: 0.5169, M: 152.3679, S: 0.0503 },
  { age: 13, L: 0.7868, M: 156.087, S: 0.0503 },
  { age: 13.5, L: 1.1956, M: 160.0212, S: 0.05 },
  { age: 14, L: 1.6358, M: 163.8384, S: 0.049 },
  { age: 14.5, L: 1.9929, M: 167.2085, S: 0.0476 },
  { age: 15, L: 2.1955, M: 169.9399, S: 0.046 },
  { age: 15.5, L: 2.2289, M: 172.0094, S: 0.0445 },
  { age: 16, L: 2.1258, M: 173.5057, S: 0.0432 },
  { age: 16.5, L: 1.9441, M: 174.5582, S: 0.0422 },
  { age: 17, L: 1.7413, M: 175.2904, S: 0.0415 },
  { age: 17.5, L: 1.5572, M: 175.8006, S: 0.041 },
  { age: 18, L: 1.4105, M: 176.1599, S: 0.0407 },
];

// 미국 여아 키 LMS (만 2~18세, CDC 2000)
const FEMALE_HEIGHT_LMS_US: LMSRow[] = [
  { age: 2, L: 1.0724, M: 84.9756, S: 0.0408 },
  { age: 2.5, L: 0.8414, M: 89.9591, S: 0.0417 },
  { age: 3, L: 0.5608, M: 93.9236, S: 0.042 },
  { age: 3.5, L: 0.3906, M: 97.3659, S: 0.0426 },
  { age: 4, L: 0.2384, M: 100.751, S: 0.0432 },
  { age: 4.5, L: 0.0879, M: 104.1754, S: 0.0438 },
  { age: 5, L: -0.0475, M: 107.6636, S: 0.0442 },
  { age: 5.5, L: -0.1521, M: 111.193, S: 0.0446 },
  { age: 6, L: -0.2156, M: 114.7141, S: 0.0449 },
  { age: 6.5, L: -0.235, M: 118.1665, S: 0.0452 },
  { age: 7, L: -0.2135, M: 121.4914, S: 0.0454 },
  { age: 7.5, L: -0.1599, M: 124.6413, S: 0.0457 },
  { age: 8, L: -0.0859, M: 127.5892, S: 0.0459 },
  { age: 8.5, L: -0.0041, M: 130.3361, S: 0.0463 },
  { age: 9, L: 0.0774, M: 132.9199, S: 0.0468 },
  { age: 9.5, L: 0.1621, M: 135.4252, S: 0.0476 },
  { age: 10, L: 0.2733, M: 137.9901, S: 0.0486 },
  { age: 10.5, L: 0.4506, M: 140.7916, S: 0.0497 },
  { age: 11, L: 0.7187, M: 143.978, S: 0.0505 },
  { age: 11.5, L: 1.0368, M: 147.5362, S: 0.0503 },
  { age: 12, L: 1.2885, M: 151.1901, S: 0.0488 },
  { age: 12.5, L: 1.3606, M: 154.5042, S: 0.0464 },
  { age: 13, L: 1.2561, M: 157.1541, S: 0.044 },
  { age: 13.5, L: 1.09, M: 159.0751, S: 0.0422 },
  { age: 14, L: 0.9642, M: 160.3887, S: 0.0411 },
  { age: 14.5, L: 0.905, M: 161.2673, S: 0.0404 },
  { age: 15, L: 0.895, M: 161.8577, S: 0.0401 },
  { age: 15.5, L: 0.9114, M: 162.2628, S: 0.0399 },
  { age: 16, L: 0.9387, M: 162.5488, S: 0.0398 },
  { age: 16.5, L: 0.9686, M: 162.757, S: 0.0398 },
  { age: 17, L: 0.9972, M: 162.9126, S: 0.0397 },
  { age: 17.5, L: 1.0231, M: 163.0315, S: 0.0397 },
  { age: 18, L: 1.0458, M: 163.124, S: 0.0397 },
];

// ================================================
// 중국 소아 신장(키) 표준 LMS — 공식 데이터
// 출처: Zong XN & Li H, PLoS ONE 2013 (PMC3602372) Table 3 — 2005 중국 9개 도시 아동
//       발육조사(首都儿科研究所/Capital Institute of Pediatrics) 기반 도시 아동 표준.
//       height-for-age L/M/S, 만 3~18세 (Box-Cox L, 로그정규 근사 아님).
// 검증: 남4세 M104.1·남15세 M169.8(L1.09,S0.0384)·여10세 M140.1(L0.81) = 공개 앵커 정확 일치.
// 영어(en) 계산기 국적=CN 에서 사용. (bone-age/lib/growthStandardCN.ts 와 동일 값 — co-locate)
// ================================================

// 중국 남아 키 LMS (만 3~18세, Zong&Li 2013)
const MALE_HEIGHT_LMS_CN: LMSRow[] = [
  { age: 3,  L: 0.45, M: 96.8,  S: 0.0397 },
  { age: 4,  L: 0.46, M: 104.1, S: 0.0385 },
  { age: 5,  L: 0.47, M: 111.3, S: 0.0390 },
  { age: 6,  L: 0.50, M: 117.7, S: 0.0396 },
  { age: 7,  L: 0.53, M: 124.0, S: 0.0409 },
  { age: 8,  L: 0.57, M: 130.0, S: 0.0420 },
  { age: 9,  L: 0.62, M: 135.4, S: 0.0431 },
  { age: 10, L: 0.67, M: 140.2, S: 0.0442 },
  { age: 11, L: 0.73, M: 145.3, S: 0.0460 },
  { age: 12, L: 0.83, M: 151.9, S: 0.0488 },
  { age: 13, L: 0.94, M: 159.5, S: 0.0487 },
  { age: 14, L: 1.03, M: 165.9, S: 0.0433 },
  { age: 15, L: 1.09, M: 169.8, S: 0.0384 },
  { age: 16, L: 1.11, M: 171.6, S: 0.0362 },
  { age: 17, L: 1.12, M: 172.3, S: 0.0353 },
  { age: 18, L: 1.13, M: 172.7, S: 0.0349 },
];

// 중국 여아 키 LMS (만 3~18세, Zong&Li 2013)
const FEMALE_HEIGHT_LMS_CN: LMSRow[] = [
  { age: 3,  L: 0.31, M: 95.6,  S: 0.0397 },
  { age: 4,  L: 0.36, M: 103.1, S: 0.0382 },
  { age: 5,  L: 0.42, M: 110.2, S: 0.0387 },
  { age: 6,  L: 0.48, M: 116.6, S: 0.0394 },
  { age: 7,  L: 0.55, M: 122.5, S: 0.0407 },
  { age: 8,  L: 0.63, M: 128.5, S: 0.0418 },
  { age: 9,  L: 0.71, M: 134.1, S: 0.0432 },
  { age: 10, L: 0.81, M: 140.1, S: 0.0450 },
  { age: 11, L: 0.91, M: 146.6, S: 0.0452 },
  { age: 12, L: 1.00, M: 152.4, S: 0.0424 },
  { age: 13, L: 1.06, M: 156.3, S: 0.0385 },
  { age: 14, L: 1.09, M: 158.6, S: 0.0357 },
  { age: 15, L: 1.11, M: 159.8, S: 0.0343 },
  { age: 16, L: 1.11, M: 160.1, S: 0.0340 },
  { age: 17, L: 1.12, M: 160.3, S: 0.0337 },
  { age: 18, L: 1.12, M: 160.6, S: 0.0335 },
];

// ── 체중 LMS 데이터 (표준체중.CSV, 6개월 단위, 0~18세) ──

// 남아 체중 LMS (만 0~18세)
const MALE_WEIGHT_LMS: LMSRow[] = [
  { age: 0, L: 0.3487, M: 3.3464, S: 0.146 },
  { age: 0.25, L: 0.1738, M: 6.3762, S: 0.1173 },
  { age: 0.5, L: 0.1257, M: 7.934, S: 0.1096 },
  { age: 0.75, L: 0.0917, M: 8.9014, S: 0.1088 },
  { age: 1, L: 0.0644, M: 9.6479, S: 0.1093 },
  { age: 1.5, L: 0.0211, M: 10.9385, S: 0.1112 },
  { age: 2, L: -0.0137, M: 12.1515, S: 0.1143 },
  { age: 2.5, L: -0.0431, M: 13.3, S: 0.1178 },
  { age: 3, L: 0.0567, M: 14.7381, S: 0.0969 },
  { age: 3.5, L: -0.299, M: 15.7775, S: 0.1038 },
  { age: 4, L: -0.5361, M: 16.8276, S: 0.1099 },
  { age: 4.5, L: -0.6998, M: 17.8888, S: 0.1153 },
  { age: 5, L: -0.8162, M: 18.9625, S: 0.1202 },
  { age: 5.5, L: -0.9106, M: 20.0814, S: 0.1254 },
  { age: 6, L: -0.9753, M: 21.3417, S: 0.1318 },
  { age: 6.5, L: -0.9576, M: 22.7267, S: 0.1388 },
  { age: 7, L: -0.8993, M: 24.2214, S: 0.146 },
  { age: 7.5, L: -0.8208, M: 25.8155, S: 0.1537 },
  { age: 8, L: -0.7076, M: 27.5321, S: 0.1613 },
  { age: 8.5, L: -0.5621, M: 29.3761, S: 0.1685 },
  { age: 9, L: -0.416, M: 31.3251, S: 0.1756 },
  { age: 9.5, L: -0.2869, M: 33.3742, S: 0.1823 },
  { age: 10, L: -0.17, M: 35.5349, S: 0.1882 },
  { age: 10.5, L: -0.0612, M: 37.8103, S: 0.1929 },
  { age: 11, L: 0.0333, M: 40.2146, S: 0.1966 },
  { age: 11.5, L: 0.1071, M: 42.7515, S: 0.1992 },
  { age: 12, L: 0.1618, M: 45.4253, S: 0.1998 },
  { age: 12.5, L: 0.2081, M: 48.1693, S: 0.198 },
  { age: 13, L: 0.2503, M: 50.9021, S: 0.1942 },
  { age: 13.5, L: 0.2841, M: 53.5329, S: 0.1882 },
  { age: 14, L: 0.3023, M: 55.9927, S: 0.1802 },
  { age: 14.5, L: 0.2993, M: 58.2029, S: 0.1711 },
  { age: 15, L: 0.2818, M: 60.1106, S: 0.162 },
  { age: 15.5, L: 0.2514, M: 61.7129, S: 0.1537 },
  { age: 16, L: 0.1829, M: 63.055, S: 0.1468 },
  { age: 16.5, L: 0.0862, M: 64.1526, S: 0.1418 },
  { age: 17, L: 0.0282, M: 65.0469, S: 0.1387 },
  { age: 17.5, L: -0.0068, M: 65.8907, S: 0.1359 },
  { age: 18, L: -0.0469, M: 66.7186, S: 0.1334 },
];

// 여아 체중 LMS (만 0~18세)
const FEMALE_WEIGHT_LMS: LMSRow[] = [
  { age: 0, L: 0.3809, M: 3.2322, S: 0.1417 },
  { age: 0.25, L: 0.0402, M: 5.8458, S: 0.1262 },
  { age: 0.5, L: -0.0756, M: 7.297, S: 0.122 },
  { age: 0.75, L: -0.1507, M: 8.2254, S: 0.122 },
  { age: 1, L: -0.2024, M: 8.9481, S: 0.1227 },
  { age: 1.5, L: -0.2637, M: 10.2315, S: 0.1231 },
  { age: 2, L: -0.2941, M: 11.4775, S: 0.1239 },
  { age: 2.5, L: -0.3101, M: 12.7055, S: 0.1259 },
  { age: 3, L: 0.5656, M: 14.1998, S: 0.0991 },
  { age: 3.5, L: -0.0428, M: 15.2236, S: 0.1064 },
  { age: 4, L: -0.4372, M: 16.2585, S: 0.1124 },
  { age: 4.5, L: -0.6987, M: 17.3046, S: 0.1175 },
  { age: 5, L: -0.876, M: 18.3616, S: 0.122 },
  { age: 5.5, L: -0.984, M: 19.4555, S: 0.127 },
  { age: 6, L: -0.9954, M: 20.6619, S: 0.134 },
  { age: 6.5, L: -0.9411, M: 21.9702, S: 0.1418 },
  { age: 7, L: -0.8685, M: 23.387, S: 0.1497 },
  { age: 7.5, L: -0.7852, M: 24.9161, S: 0.1574 },
  { age: 8, L: -0.6971, M: 26.5602, S: 0.1643 },
  { age: 8.5, L: -0.6214, M: 28.3163, S: 0.1705 },
  { age: 9, L: -0.5521, M: 30.2033, S: 0.1758 },
  { age: 9.5, L: -0.4623, M: 32.2323, S: 0.1806 },
  { age: 10, L: -0.3496, M: 34.4014, S: 0.1852 },
  { age: 10.5, L: -0.2377, M: 36.7011, S: 0.1882 },
  { age: 11, L: -0.1419, M: 39.0908, S: 0.1884 },
  { age: 11.5, L: -0.0641, M: 41.4657, S: 0.1862 },
  { age: 12, L: -0.0241, M: 43.74, S: 0.1818 },
  { age: 12.5, L: -0.0326, M: 45.8261, S: 0.1756 },
  { age: 13, L: -0.0745, M: 47.6564, S: 0.1679 },
  { age: 13.5, L: -0.129, M: 49.2069, S: 0.1603 },
  { age: 14, L: -0.1734, M: 50.5233, S: 0.1536 },
  { age: 14.5, L: -0.1869, M: 51.6479, S: 0.1476 },
  { age: 15, L: -0.1846, M: 52.5631, S: 0.1424 },
  { age: 15.5, L: -0.1901, M: 53.2482, S: 0.1382 },
  { age: 16, L: -0.21, M: 53.7253, S: 0.1351 },
  { age: 16.5, L: -0.2499, M: 54.0055, S: 0.1326 },
  { age: 17, L: -0.3423, M: 54.0797, S: 0.1306 },
  { age: 17.5, L: -0.4627, M: 54.0634, S: 0.1289 },
  { age: 18, L: -0.5908, M: 54.0217, S: 0.1273 },
];

// ── LMS 계산 함수 ──

/** 나이에 맞는 LMS 행을 선형 보간 */
function interpolateLMS(age: number, table: LMSRow[]): LMSRow | null {
  if (table.length === 0) return null;
  if (age <= table[0].age) return table[0];
  if (age >= table[table.length - 1].age) return table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    if (age >= table[i].age && age <= table[i + 1].age) {
      const t = (age - table[i].age) / (table[i + 1].age - table[i].age);
      return {
        age,
        L: table[i].L + t * (table[i + 1].L - table[i].L),
        M: table[i].M + t * (table[i + 1].M - table[i].M),
        S: table[i].S + t * (table[i + 1].S - table[i].S),
      };
    }
  }
  return table[0];
}

/** LMS → Z-score. 일반식: Z = ((X/M)^L - 1) / (L*S), L=0이면 Z = ln(X/M)/S */
function zScoreFromLMS(value: number, lms: LMSRow): number {
  if (Math.abs(lms.L) < 0.001) {
    return Math.log(value / lms.M) / lms.S;
  }
  return (Math.pow(value / lms.M, lms.L) - 1) / (lms.L * lms.S);
}

/** Z-score → 백분위수 (정규분포 CDF, Abramowitz & Stegun 근사) */
function zToPercentile(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return Math.max(0, Math.min(100, ((1 + sign * erf) / 2) * 100));
}

/**
 * LMS 기반 키 백분위수
 * @returns 백분위수 (0~100, 소수 1자리)
 */
export function calculateHeightPercentileLMS(
  height: number,
  age: number,
  gender: 'male' | 'female',
  standard: GrowthStandard = 'KR',
): number {
  const table = heightTable(gender, standard);
  const lms = interpolateLMS(age, table);
  if (!lms) return 50;
  const z = zScoreFromLMS(height, lms);
  return Math.round(zToPercentile(z) * 10) / 10;
}

/**
 * LMS 기반 체중 백분위수
 * @returns 백분위수 (0~100, 소수 1자리)
 */
export function calculateWeightPercentileLMS(
  weight: number,
  age: number,
  gender: 'male' | 'female',
): number {
  const table = gender === 'male' ? MALE_WEIGHT_LMS : FEMALE_WEIGHT_LMS;
  const lms = interpolateLMS(age, table);
  if (!lms) return 50;
  const z = zScoreFromLMS(weight, lms);
  return Math.round(zToPercentile(z) * 10) / 10;
}

/**
 * LMS 기반 예측 성인키 (현재 퍼센타일 유지 가정)
 * 현재 Z-score를 구한 뒤, 18세 기준 같은 Z-score의 키를 역산
 * @returns 예측 성인키(cm, 소수 1자리)
 */
/**
 * 특정 나이에서 동일 Z-score의 키를 역산 (예측 경로용)
 * @param currentHeight 현재 키
 * @param currentAge 현재 나이
 * @param targetAge 구하고 싶은 나이
 * @param gender 성별
 * @returns 해당 나이에서의 예상 키 (cm)
 */
export function heightAtSamePercentile(
  currentHeight: number,
  currentAge: number,
  targetAge: number,
  gender: 'male' | 'female',
  standard: GrowthStandard = 'KR',
): number {
  const table = heightTable(gender, standard);
  const currentLms = interpolateLMS(currentAge, table);
  const targetLms = interpolateLMS(targetAge, table);
  if (!currentLms || !targetLms) return 0;

  const z = zScoreFromLMS(currentHeight, currentLms);
  return heightFromLMS(targetLms, z);
}

export function predictAdultHeightLMS(
  height: number,
  age: number,
  gender: 'male' | 'female',
  standard: GrowthStandard = 'KR',
): number {
  const table = heightTable(gender, standard);
  const currentLms = interpolateLMS(age, table);
  const adultLms = table[table.length - 1]; // 18세
  if (!currentLms) return 0;

  const z = zScoreFromLMS(height, currentLms);

  // 역변환: X = M * (1 + L*S*Z)^(1/L), L≈0이면 X = M * exp(S*Z)
  if (Math.abs(adultLms.L) < 0.001) {
    return Math.round(adultLms.M * Math.exp(adultLms.S * z) * 10) / 10;
  }
  const inside = 1 + adultLms.L * adultLms.S * z;
  if (inside <= 0) return 0;
  return Math.round(adultLms.M * Math.pow(inside, 1 / adultLms.L) * 10) / 10;
}
