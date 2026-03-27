// ================================================
// SectionSlider - 섹션 carousel (HeroBanner 스타일)
// ================================================

import { useState, useCallback, useRef } from 'react';

export interface SectionItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

interface Props {
  items: SectionItem[];
}

export function SectionSlider({ items }: Props) {
  const [current, setCurrent] = useState(0);

  if (!items || items.length === 0) return null;

  const total = items.length;

  const goTo = useCallback((i: number) => {
    setCurrent(((i % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Touch swipe
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  const item = items[current];
  if (!item) return null;

  return (
    <section
      className="relative overflow-hidden w-full"
      style={{ minHeight: '80vh' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background image */}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-100" />
      )}

      {/* Bottom gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.8) 75%, #fff 100%)' }}
      />

      {/* Emoji icon (large, center-top) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-10 text-8xl">
        {item.emoji}
      </div>

      {/* Text content (bottom) */}
      <div className="absolute bottom-[12%] left-0 right-0 z-10 px-6">
        <div className="text-center">
          {/* Title */}
          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 leading-tight whitespace-pre-line">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-base text-gray-600 mb-4 whitespace-pre-line line-clamp-3">
            {item.description}
          </p>

          {/* CTA Link */}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56] px-5 py-2.5 text-white text-xs sm:text-sm font-bold hover:bg-[#0D5A47] transition-colors"
            >
              자세히 보기
            </a>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            →
          </button>
        </>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-3 h-2 bg-[#0F6E56]'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
