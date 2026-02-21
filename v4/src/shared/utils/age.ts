// ================================================
// 나이 계산 유틸리티 - 187 성장케어 v4
// 만나이 (Korean international age) 기준
// ================================================

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  /** 소수점 나이 (예: 7세 6개월 = 7.5) */
  decimal: number;
}

/**
 * 생년월일로부터 현재 만나이를 계산합니다.
 * @param birthDate - 생년월일 (문자열 "YYYY-MM-DD" 또는 Date 객체)
 */
export function calculateAge(birthDate: string | Date): AgeResult {
  return calculateAgeAtDate(birthDate, new Date());
}

/**
 * 특정 날짜 기준으로 만나이를 계산합니다.
 * @param birthDate - 생년월일 (문자열 "YYYY-MM-DD" 또는 Date 객체)
 * @param targetDate - 기준 날짜
 */
export function calculateAgeAtDate(
  birthDate: string | Date,
  targetDate: Date,
): AgeResult {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const target = new Date(targetDate);

  // 연도, 월, 일 추출 (시간 무시)
  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  // 일이 음수이면 이전 달의 일수를 더해서 보정
  if (days < 0) {
    months -= 1;
    // 기준 날짜의 이전 달의 마지막 일
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // 월이 음수이면 연도에서 1을 빼고 12를 더해서 보정
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // 소수점 나이: 연도 + (월 / 12)
  const decimal = parseFloat((years + months / 12).toFixed(2));

  return { years, months, days, decimal };
}

/**
 * 나이를 한국어 형식으로 포맷합니다.
 * @example formatAge({ years: 7, months: 6 }) => "7세 6개월"
 * @example formatAge({ years: 0, months: 3 }) => "3개월"
 */
export function formatAge(age: { years: number; months: number }): string {
  if (age.years === 0) {
    return `${age.months}개월`;
  }
  if (age.months === 0) {
    return `${age.years}세`;
  }
  return `${age.years}세 ${age.months}개월`;
}
