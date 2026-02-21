// ================================================
// 성장 계산 유틸리티 - 187 성장케어 v4
// ================================================

import type { Gender, PercentileData } from '@/shared/types';

// ================================================
// Bayley-Pinneau 성인 예측키(PAH) 기준 백분율 테이블
// 골연령에 따른 현재 키가 성인 키의 몇 %인지
// ================================================

const BP_MALE_PERCENTAGE: Record<number, number> = {
  6: 68.5,
  7: 72.5,
  8: 75.5,
  9: 78.5,
  10: 81,
  11: 83.5,
  12: 86,
  13: 88.5,
  14: 91.5,
  15: 94.5,
  16: 97,
  17: 99,
};

const BP_FEMALE_PERCENTAGE: Record<number, number> = {
  6: 73,
  7: 76.5,
  8: 80,
  9: 83,
  10: 86,
  11: 89,
  12: 92,
  13: 95,
  14: 97,
  15: 98.5,
  16: 99.5,
  17: 100,
};

// ================================================
// 백분위수 기준값과 실제 백분위 매핑
// ================================================

const PERCENTILE_KEYS = [
  'p3', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p97',
] as const;

const PERCENTILE_VALUES = [3, 5, 10, 25, 50, 75, 90, 95, 97] as const;

/**
 * 주어진 나이, 성별, 측정값, 기준 데이터를 이용하여 백분위수를 계산합니다.
 * 백분위 구간 사이를 선형 보간하여 추정합니다.
 *
 * @param age - 소수점 나이 (예: 7.5)
 * @param _gender - 성별 (데이터가 이미 성별로 분리되어 전달된다고 가정)
 * @param value - 측정값 (키 또는 몸무게)
 * @param data - 해당 성별의 PercentileData 배열
 * @returns 추정 백분위수 (0-100)
 */
export function calculatePercentile(
  age: number,
  _gender: Gender,
  value: number,
  data: PercentileData[],
): number {
  if (data.length === 0) return 50;

  // 가장 가까운 나이의 데이터를 찾기 (보간)
  const row = interpolateDataRow(age, data);
  if (!row) return 50;

  // 측정값이 p3 이하이면 0~3 사이 보간
  if (value <= row.p3) {
    return Math.max(0, (value / row.p3) * 3);
  }

  // 측정값이 p97 이상이면 97~100 사이 보간
  if (value >= row.p97) {
    // p97 초과분은 100에 가까워지도록 간단히 처리
    return Math.min(100, 97 + ((value - row.p97) / row.p97) * 100);
  }

  // 백분위 구간 사이 선형 보간
  for (let i = 0; i < PERCENTILE_KEYS.length - 1; i++) {
    const lowerKey = PERCENTILE_KEYS[i];
    const upperKey = PERCENTILE_KEYS[i + 1];
    const lowerValue = row[lowerKey];
    const upperValue = row[upperKey];

    if (value >= lowerValue && value <= upperValue) {
      const lowerPercentile = PERCENTILE_VALUES[i];
      const upperPercentile = PERCENTILE_VALUES[i + 1];
      const ratio = (value - lowerValue) / (upperValue - lowerValue);
      return lowerPercentile + ratio * (upperPercentile - lowerPercentile);
    }
  }

  return 50;
}

/**
 * 나이를 기준으로 PercentileData 배열에서 보간된 데이터 행을 반환합니다.
 */
function interpolateDataRow(
  age: number,
  data: PercentileData[],
): PercentileData | null {
  if (data.length === 0) return null;

  // 정확히 일치하는 나이가 있으면 바로 반환
  const exact = data.find((d) => d.age === age);
  if (exact) return exact;

  // 나이 범위 밖이면 가장 가까운 끝값 반환
  if (age <= data[0].age) return data[0];
  if (age >= data[data.length - 1].age) return data[data.length - 1];

  // 나이 사이의 두 행을 찾아 보간
  let lower: PercentileData | null = null;
  let upper: PercentileData | null = null;

  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].age <= age && data[i + 1].age >= age) {
      lower = data[i];
      upper = data[i + 1];
      break;
    }
  }

  if (!lower || !upper) return data[0];

  const ratio = (age - lower.age) / (upper.age - lower.age);

  const interpolated: PercentileData = {
    age,
    p3: lower.p3 + ratio * (upper.p3 - lower.p3),
    p5: lower.p5 + ratio * (upper.p5 - lower.p5),
    p10: lower.p10 + ratio * (upper.p10 - lower.p10),
    p25: lower.p25 + ratio * (upper.p25 - lower.p25),
    p50: lower.p50 + ratio * (upper.p50 - lower.p50),
    p75: lower.p75 + ratio * (upper.p75 - lower.p75),
    p90: lower.p90 + ratio * (upper.p90 - lower.p90),
    p95: lower.p95 + ratio * (upper.p95 - lower.p95),
    p97: lower.p97 + ratio * (upper.p97 - lower.p97),
  };

  return interpolated;
}

/**
 * BMI를 계산합니다.
 * @param height - 키 (cm)
 * @param weight - 몸무게 (kg)
 * @returns BMI 값 (소수점 1자리)
 */
export function calculateBMI(height: number, weight: number): number {
  if (height <= 0 || weight <= 0) return 0;
  const heightM = height / 100;
  return parseFloat((weight / (heightM * heightM)).toFixed(1));
}

/**
 * Bayley-Pinneau 방법으로 성인 예측키(PAH)를 계산합니다.
 * PAH = 현재키 / (골연령 기준 백분율 / 100)
 *
 * @param currentHeight - 현재 키 (cm)
 * @param boneAge - 골연령 (세, 정수)
 * @param gender - 성별
 * @returns 예측 성인키 (cm, 소수점 1자리). 골연령이 테이블 범위 밖이면 0 반환.
 */
export function calculatePAH(
  currentHeight: number,
  boneAge: number,
  gender: Gender,
): number {
  if (currentHeight <= 0) return 0;

  const table = gender === 'male' ? BP_MALE_PERCENTAGE : BP_FEMALE_PERCENTAGE;

  // 골연령이 정수가 아닌 경우 가장 가까운 정수 사이를 보간
  const floorAge = Math.floor(boneAge);
  const ceilAge = Math.ceil(boneAge);

  const floorPct = table[floorAge];
  const ceilPct = table[ceilAge];

  // 테이블에 없는 골연령이면 0 반환
  if (floorPct === undefined && ceilPct === undefined) return 0;

  let percentage: number;

  if (floorAge === ceilAge || ceilPct === undefined) {
    // 정수 골연령이거나 상한이 테이블에 없는 경우
    percentage = floorPct ?? 0;
  } else if (floorPct === undefined) {
    // 하한이 테이블에 없는 경우
    percentage = ceilPct;
  } else {
    // 소수점 골연령 보간
    const ratio = boneAge - floorAge;
    percentage = floorPct + ratio * (ceilPct - floorPct);
  }

  if (percentage <= 0) return 0;

  return parseFloat((currentHeight / (percentage / 100)).toFixed(1));
}

/**
 * 부모 평균키(MPH, Mid-Parental Height)를 계산합니다.
 * 남아: (아버지키 + 어머니키 + 13) / 2
 * 여아: (아버지키 + 어머니키 - 13) / 2
 *
 * @param fatherHeight - 아버지 키 (cm)
 * @param motherHeight - 어머니 키 (cm)
 * @param gender - 아이 성별
 * @returns 부모 평균키 (cm, 소수점 1자리)
 */
export function calculateMidParentalHeight(
  fatherHeight: number,
  motherHeight: number,
  gender: Gender,
): number {
  if (fatherHeight <= 0 || motherHeight <= 0) return 0;

  const adjustment = gender === 'male' ? 13 : -13;
  return parseFloat(((fatherHeight + motherHeight + adjustment) / 2).toFixed(1));
}
