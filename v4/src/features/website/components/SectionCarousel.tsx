// SectionCarousel - Instagram card-news style carousel
// 4:5 aspect ratio, small dots at bottom, swipe-only navigation

import React, { useState, useCallback, useRef } from 'react';
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
  initialIndex?: number;
}

export function SectionCarousel({ slides, initialIndex = 0 }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const total = slides.length;

  // Sync with external initialIndex changes (admin preview)
  React.useEffect(() => {
    setCurrent(initialIndex);
  }, [initialIndex]);

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

  return (
    <section
      className="relative overflow-hidden w-full aspect-[4/5]"
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
            transition: 'opacity 500ms ease-in-out, visibility 500ms ease-in-out',
          }}
        >
          {slide.template === 'banner'
            ? <BannerContent slide={slide} />
            : <VideoContent slide={slide} />
          }
        </div>
      ))}

      {/* Instagram-style dots at bottom */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-[5px]">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-[6px] h-[6px] bg-white'
                  : 'w-[6px] h-[6px] bg-white/40'
              }`} />
          ))}
        </div>
      )}
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
            className={`font-extrabold leading-[1.15] mb-3 whitespace-pre-line ${
              !s.titleSize ? 'text-[36px] md:text-[48px]' : ''
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
              className={`mb-4 whitespace-pre-line ${
                !s.subtitleSize ? 'text-[15px] md:text-lg' : ''
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
              className={`inline-flex items-center gap-2 rounded-full bg-[#0F6E56] text-white font-bold shadow-lg hover:bg-[#0d5e4a] active:scale-95 transition-all ${
                s.ctaSize === 'sm' ? 'px-5 py-2.5 text-xs' :
                s.ctaSize === 'lg' ? 'px-10 py-5 text-lg' :
                'px-7 py-3.5 text-sm'
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
      <div className="w-full flex-shrink-0 bg-black" style={{ height: '60%' }}>
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 text-center overflow-y-auto">
        {s.title && (
          <h2
            className="text-xl md:text-2xl font-extrabold leading-tight mb-2 whitespace-pre-line"
            style={{ color: s.titleColor || '#1a1a1a' }}
          >
            {s.title}
          </h2>
        )}
        {s.description && (
          <p
            className="text-sm leading-relaxed whitespace-pre-line max-w-lg"
            style={{ color: s.descriptionColor || '#666666' }}
          >
            {s.description}
          </p>
        )}
      </div>
    </div>
  );
}
