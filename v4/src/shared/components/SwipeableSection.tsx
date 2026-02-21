// ================================================
// SwipeableSection - 좌우 스와이프 캐러셀 섹션
// CSS scroll-snap 기반, pill dot indicator
// ================================================

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface SwipeableSectionProps {
  title: string;
  emoji: string;
  children: ReactNode[];
  isLoading?: boolean;
  onSeeAll?: () => void;
}

export function SwipeableSection({
  title, emoji, children, isLoading, onSeeAll,
}: SwipeableSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = children.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || total === 0) return;
    const firstChild = el.children[0] as HTMLElement | undefined;
    if (!firstChild) return;
    const itemW = firstChild.offsetWidth;
    const gap = 12;
    const idx = Math.round(el.scrollLeft / (itemW + gap));
    setActiveIndex(Math.min(idx, total - 1));
  }, [total]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.children[0] as HTMLElement | undefined;
    if (!firstChild) return;
    const itemW = firstChild.offsetWidth;
    const gap = 12;
    el.scrollTo({ left: idx * (itemW + gap), behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gray-100" />
          <div className="w-28 h-4 rounded bg-gray-100" />
        </div>
        <div className="flex gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-[72vw] max-w-[280px] h-36 rounded-xl bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
        {onSeeAll && (
          <button onClick={onSeeAll}
            className="text-xs text-primary font-semibold flex items-center gap-0.5 active:opacity-70 transition-opacity">
            전체보기
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </div>

      {/* 스와이프 컨테이너 */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children.map((child, i) => (
          <div key={i} className="snap-start flex-shrink-0 w-[72vw] max-w-[280px]">
            {child}
          </div>
        ))}
      </div>

      {/* Pill dot indicators */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-5 h-1.5 bg-primary'
                  : 'w-1.5 h-1.5 bg-gray-200'
              }`}
              aria-label={`${i + 1}번 카드로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
