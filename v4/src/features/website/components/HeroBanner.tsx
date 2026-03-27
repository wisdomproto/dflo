// HeroBanner - Full-screen banner carousel
// Receives slides from parent, no self-fetching

import { useState, useCallback, useRef } from 'react';
import type { BannerSlide } from '../types/websiteSection';

// Re-export for backward compatibility
export type { BannerSlide };

interface Props {
  slides: BannerSlide[];
}

export function HeroBanner({ slides }: Props) {
  const [current, setCurrent] = useState(0);

  const total = slides.length;

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

  if (!slides.length) return null;

  const s = slides[current];
  if (!s) return null;

  const handleCta = () => {
    if (s.ctaAction === 'scroll') {
      document.dispatchEvent(new CustomEvent('open-height-calculator'));
    } else if (s.ctaAction === 'link') {
      window.open(s.ctaTarget, '_blank');
    }
  };

  return (
    <section
      className="relative overflow-hidden w-full min-h-dvh"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide backgrounds */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            visibility: i === current ? 'visible' : 'hidden',
            pointerEvents: i === current ? 'auto' : 'none',
            transition: 'opacity 700ms ease-in-out, visibility 700ms ease-in-out',
          }}
        >
          {slide.imageUrl ? (
            <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 bg-[#F5F0EA]" />
          )}
        </div>
      ))}

      {/* Text content */}
      <div className="absolute bottom-[12%] md:bottom-[14%] left-0 right-0 z-10 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1
            key={s.id}
            className={`font-extrabold leading-[1.15] mb-3 whitespace-pre-line animate-[fadeUp_0.5s_ease-out] ${
              !s.titleSize ? 'text-[42px] md:text-[56px]' : ''
            } ${!s.titleColor ? 'text-white' : ''}`}
            style={{
              fontSize: s.titleSize ? `${s.titleSize}px` : undefined,
              color: s.titleColor || undefined,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {s.title}
          </h1>
          {s.subtitle && (
            <p
              className={`mb-5 whitespace-pre-line animate-[fadeUp_0.5s_ease-out_0.1s_both] ${
                !s.subtitleSize ? 'text-[17px] md:text-xl' : ''
              } ${!s.subtitleColor ? 'text-white/90' : ''}`}
              style={{
                fontSize: s.subtitleSize ? `${s.subtitleSize}px` : undefined,
                color: s.subtitleColor || undefined,
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
              }}
            >
              {s.subtitle}
            </p>
          )}
          {s.ctaText && (
            <button
              key={`cta-${s.id}`}
              onClick={handleCta}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F6E56] px-7 py-3.5 md:px-8 md:py-4 text-white font-bold text-sm md:text-base shadow-lg hover:bg-[#0d5e4a] hover:scale-105 active:scale-95 transition-all animate-[fadeUp_0.5s_ease-out_0.2s_both]"
            >
              {s.ctaText}
            </button>
          )}
        </div>
      </div>

      {/* Left/Right arrows on sides */}
      {total > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 active:scale-95 transition-all backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 active:scale-95 transition-all backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
              }`} />
          ))}
        </div>
      )}

      {/* Scroll down indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
