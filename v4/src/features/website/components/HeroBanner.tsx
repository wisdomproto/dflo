// ================================================
// HeroBanner - 롤링 배너 (자동 재생 + 수동 조작)
// ================================================

import { useState, useEffect, useCallback, useRef } from 'react';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaAction: 'scroll' | 'link';
  ctaTarget: string;
  imageUrl?: string;
  bgGradient?: string;
  order: number;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'default-1',
    title: '우리 아이,\n얼마나 클까?',
    subtitle: '지금 바로 예상 키를 무료로 측정해보세요',
    ctaText: '예측키 무료 측정하기',
    ctaAction: 'scroll',
    ctaTarget: 'calculator',
    imageUrl: '/images/banners/banner-1.jpg',
    order: 0,
  },
  {
    id: 'default-4',
    title: '성조숙증,\n골든타임을 놓치지 마세요',
    subtitle: '조기 발견과 맞춤 치료가 아이의 키를 바꿉니다',
    ctaText: '',
    ctaAction: 'scroll',
    ctaTarget: 'programs',
    bgGradient: 'linear-gradient(135deg, #0D5A47 0%, #1A4A3A 50%, #0F6E56 100%)',
    order: 1,
  },
  {
    id: 'default-5',
    title: '187 성장\n통합 프로그램',
    subtitle: '',
    ctaText: '',
    ctaAction: 'scroll',
    ctaTarget: 'programs',
    imageUrl: '/images/banners/banner-5.jpg',
    order: 2,
  },
];

const AUTO_INTERVAL = 5000;

interface Props {
  slides?: BannerSlide[];
}

export function HeroBanner({ slides: propSlides }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load slides from localStorage or use defaults
  const [slides, setSlides] = useState<BannerSlide[]>(DEFAULT_SLIDES);

  useEffect(() => {
    if (propSlides && propSlides.length > 0) {
      setSlides(propSlides);
      return;
    }
    try {
      const saved = localStorage.getItem('website-banners');
      if (saved) {
        const parsed = JSON.parse(saved) as BannerSlide[];
        if (parsed.length > 0) setSlides(parsed.sort((a, b) => a.order - b.order));
      }
    } catch { /* ignore */ }
  }, [propSlides]);

  const total = slides.length;

  const goTo = useCallback((i: number) => {
    setCurrent(((i % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-play
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, next, total]);

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

  const s = slides[current];
  if (!s) return null;

  return (
    <section
      className="relative overflow-hidden aspect-[16/9] md:aspect-[16/7] max-h-[80vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === current ? 1 : 0,
            pointerEvents: i === current ? 'auto' : 'none',
            background: slide.imageUrl
              ? undefined
              : slide.bgGradient || 'linear-gradient(135deg, #0F6E56, #1A3A32)',
          }}
        >
          {slide.imageUrl && (
            <>
              <img
                src={slide.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for text readability — fades to near-transparent on right */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            </>
          )}
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 flex flex-col justify-center h-full py-12 md:py-20">
        <div className="max-w-lg">
          <h1
            key={s.id}
            className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-3 whitespace-pre-line animate-[fadeUp_0.5s_ease-out]"
          >
            {s.title}
          </h1>
          <p className="text-base md:text-lg text-white/85 animate-[fadeUp_0.5s_ease-out_0.1s_both]">
            {s.subtitle}
          </p>
        </div>
      </div>

      {/* Dots + arrows — bottom center */}
      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button onClick={prev}
            className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
          </div>
          <button onClick={next}
            className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Progress bar */}
      {total > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
          <div
            className="h-full bg-white/50 animate-[progress_5s_linear]"
            key={`progress-${current}`}
          />
        </div>
      )}
    </section>
  );
}
