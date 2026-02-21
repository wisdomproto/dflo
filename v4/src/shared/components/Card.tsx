// ================================================
// Card 컴포넌트 - 187 성장케어 v4
// 재사용 가능한 카드 래퍼
// ================================================

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm p-4 w-full text-left
                 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
                 ${className}`}
    >
      {children}
    </Component>
  );
}
