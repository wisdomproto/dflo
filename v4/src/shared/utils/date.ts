// ================================================
// 날짜/시간 유틸리티 - 187 성장케어 v4
// ================================================

/**
 * 날짜를 한국어 형식으로 포맷합니다.
 *
 * @param date - 날짜 (문자열 "YYYY-MM-DD" 또는 Date 객체)
 * @param format - 포맷 종류
 *   - 'full': "2026년 2월 21일"
 *   - 'short': "2026.02.21"
 *   - 'month': "2월 21일"
 */
export function formatDate(
  date: string | Date,
  format: 'full' | 'short' | 'month' = 'full',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  switch (format) {
    case 'full':
      return `${year}년 ${month}월 ${day}일`;
    case 'short':
      return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    case 'month':
      return `${month}월 ${day}일`;
  }
}

/**
 * 24시간제 시간 문자열을 한국어 오전/오후 형식으로 변환합니다.
 * @param time - "HH:MM" 형식의 시간 문자열 (예: "21:30")
 * @returns 한국어 시간 문자열 (예: "오후 9:30")
 */
export function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? '00';

  if (isNaN(hour)) return time;

  if (hour === 0) {
    return `오전 12:${minute}`;
  }
  if (hour < 12) {
    return `오전 ${hour}:${minute}`;
  }
  if (hour === 12) {
    return `오후 12:${minute}`;
  }
  return `오후 ${hour - 12}:${minute}`;
}

/**
 * 지정한 연도/월의 일수를 반환합니다.
 * @param year - 연도
 * @param month - 월 (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  // month는 1-12이므로 Date 생성 시 다음 달의 0일 = 해당 월의 마지막 일
  return new Date(year, month, 0).getDate();
}

/**
 * 지정한 연도/월의 모든 날짜 배열을 반환합니다.
 * @param year - 연도
 * @param month - 월 (1-12)
 * @returns 해당 월의 모든 Date 객체 배열
 */
export function getMonthDates(year: number, month: number): Date[] {
  const days = getDaysInMonth(year, month);
  const dates: Date[] = [];

  for (let day = 1; day <= days; day++) {
    dates.push(new Date(year, month - 1, day));
  }

  return dates;
}

/**
 * 두 날짜가 같은 날(연/월/일)인지 확인합니다.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Date 객체를 "YYYY-MM-DD" 문자열로 변환합니다.
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
