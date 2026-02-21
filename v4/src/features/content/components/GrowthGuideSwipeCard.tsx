// ================================================
// GrowthGuideSwipeCard - 성장 가이드 배너 카드
// ================================================

import type { GrowthGuide } from '@/shared/types';

interface Props {
  guide: GrowthGuide;
  onClick: () => void;
}

export function GrowthGuideSwipeCard({ guide, onClick }: Props) {
  const bg = guide.banner_color || 'linear-gradient(135deg, #667eea, #764ba2)';

  return (
    <button onClick={onClick} className="w-full text-left active:scale-[0.97] transition-transform">
      <div
        className="rounded-xl p-4 h-36 flex flex-col justify-between relative overflow-hidden shadow-sm"
        style={{ background: bg }}
      >
        {/* 장식 원형 */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative">
          <span className="text-3xl drop-shadow-sm">{guide.icon || '📖'}</span>
        </div>
        <div className="relative">
          <h4 className="text-sm font-bold text-white leading-snug">{guide.title}</h4>
          {guide.subtitle && (
            <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">{guide.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
}
