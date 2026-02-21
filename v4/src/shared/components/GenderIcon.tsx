// ================================================
// GenderIcon 컴포넌트 - 187 성장케어 v4
// 성별 심볼 (♂/♀) + 원형 배경 색상
// ================================================

import { getGenderStyle } from '@/shared/utils/gender';
import type { Gender } from '@/shared/types';

interface GenderIconProps {
  gender: Gender;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
} as const;

export default function GenderIcon({ gender, size = 'md' }: GenderIconProps) {
  const gs = getGenderStyle(gender);
  return (
    <span
      className={`${SIZE_MAP[size]} rounded-full flex items-center justify-center font-bold ${gs.bg} ${gs.color}`}
    >
      {gs.symbol}
    </span>
  );
}
