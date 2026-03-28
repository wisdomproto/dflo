// SectionCarousel - Unified carousel for mixed banner/video slides
// Each slide renders according to its own template field

import { useState, useCallback, useRef } from 'react';
import type { Slide, BannerSlide, VideoSlide } from '../types/websiteSection';

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  if (/^[\w-]{11}$/.test(url)) return url;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface Props {
  slides: Slide[];
}

export function SectionCarousel({ slides }: Props) {
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  const goTo = useCallback((i: number) => {
    setCurrent(((i % total) + total) % total);
  }, [total]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

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

  return (
    <section
      className="relative overflow-hidden w-full h-[calc(100dvh-57px)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content - fade transition */}
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
          {slide.template === 'banner'
            ? <BannerContent slide={slide} />
            : <VideoContent slide={slide} />
          }
        </div>
      ))}

      {/* Arrows */}
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

      {/* Dots */}
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className="w-6 h-6 text-white/70 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// ============= Banner slide content =============
function BannerContent({ slide: s }: { slide: BannerSlide }) {
  const handleCta = () => {
    if (s.ctaAction === 'scroll') {
      document.dispatchEvent(new CustomEvent('open-height-calculator'));
    } else if (s.ctaAction === 'link') {
      window.open(s.ctaTarget, '_blank');
    }
  };

  return (
    <div className="absolute inset-0">
      {s.imageUrl ? (
        <img src={s.imageUrl} alt="" className={`absolute inset-0 w-full h-full object-center ${s.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
      ) : (
        <div className="absolute inset-0 bg-[#F5F0EA]" />
      )}
      <div className="absolute left-0 right-0 z-10 px-6" style={{ bottom: `${s.textPositionY ?? 12}%` }}>
        <div className="max-w-2xl mx-auto text-center">
          <h1
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
              onClick={handleCta}
              className={`inline-flex items-center gap-2 rounded-full bg-[#0F6E56] text-white font-bold shadow-lg hover:bg-[#0d5e4a] hover:scale-105 active:scale-95 transition-all animate-[fadeUp_0.5s_ease-out_0.2s_both] ${
                s.ctaSize === 'sm' ? 'px-5 py-2.5 text-xs' :
                s.ctaSize === 'lg' ? 'px-10 py-5 text-lg md:text-xl' :
                'px-7 py-3.5 md:px-8 md:py-4 text-sm md:text-base'
              }`}
            >
              {s.ctaText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= Video slide content =============
function VideoContent({ slide: s }: { slide: VideoSlide }) {
  const videoId = extractVideoId(s.videoUrl);

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="w-full flex-shrink-0 bg-black" style={{ height: '55%' }}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={s.title || 'Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
            YouTube URL을 입력하세요
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 text-center overflow-y-auto">
        {s.title && (
          <h2
            className="text-2xl md:text-3xl font-extrabold leading-tight mb-3 whitespace-pre-line"
            style={{ color: s.titleColor || '#1a1a1a' }}
          >
            {s.title}
          </h2>
        )}
        {s.description && (
          <p
            className="text-sm md:text-base leading-relaxed whitespace-pre-line max-w-lg"
            style={{ color: s.descriptionColor || '#666666' }}
          >
            {s.description}
          </p>
        )}
      </div>
    </div>
  );
}
