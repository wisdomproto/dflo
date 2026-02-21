// ================================================
// Gender 유틸 - 187 성장케어 v4
// 성별 아이콘·색상 통합 모듈
// ================================================

import type { Gender } from '@/shared/types';

export interface GenderStyle {
  symbol: string;      // ♂ / ♀
  label: string;       // 남 / 여
  labelFull: string;   // 남아 / 여아
  color: string;       // text-blue-600 / text-pink-600
  bg: string;          // bg-blue-100 / bg-pink-100
  bgLight: string;     // bg-blue-50 / bg-pink-50
  ring: string;        // ring-blue-200 / ring-pink-200
}

const MALE_STYLE: GenderStyle = {
  symbol: '♂',
  label: '남',
  labelFull: '남아',
  color: 'text-blue-600',
  bg: 'bg-blue-100',
  bgLight: 'bg-blue-50',
  ring: 'ring-blue-200',
};

const FEMALE_STYLE: GenderStyle = {
  symbol: '♀',
  label: '여',
  labelFull: '여아',
  color: 'text-pink-600',
  bg: 'bg-pink-100',
  bgLight: 'bg-pink-50',
  ring: 'ring-pink-200',
};

/**
 * 성별에 맞는 스타일(심볼, 색상) 반환
 */
export function getGenderStyle(gender: Gender): GenderStyle {
  return gender === 'male' ? MALE_STYLE : FEMALE_STYLE;
}
