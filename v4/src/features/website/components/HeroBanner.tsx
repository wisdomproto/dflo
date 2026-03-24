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
    bgGradient: 'linear-gradient(135deg, #0F6E56 0%, #0D5A47 50%, #1A3A32 100%)',
    order: 0,
  },
  {
    id: 'default-2',
    title: '20년 경력\n채용현 원장',
    subtitle: '15,000명 이상의 아이들이 함께한 성장 전문 클리닉',
    ctaText: '상담 예약하기',
    ctaAction: 'link',
    ctaTarget: KAKAO_URL,
    bgGradient: 'linear-gradient(135deg, #1A3A32 0%, #0F6E56 50%, #2D8B6F 100%)',
    order: 1,
  },
  {
    id: 'default-3',
    title: '실제 성장 치료\n성공 사례',
    subtitle: '유전적 한계를 극복한 아이들의 성장 기록',
    ctaText: '사례 보기',
    ctaAction: 'scroll',
    ctaTarget: 'cases',
    bgGradient: 'linear-gradient(135deg, #2D8B6F 0%, #0F6E56 50%, #0D5A47 100%)',
    order: 2,
  },
  {
    id: 'default-4',
    title: '성조숙증,\n골든타임을 놓치지 마세요',
    subtitle: '조기 발견과 맞춤 치료가 아이의 키를 바꿉니다',
    ctaText: '프로그램 보기',
    ctaAction: 'scroll',
    ctaTarget: 'programs',
    bgGradient: 'linear-gradient(135deg, #0D5A47 0%, #1A4A3A 50%, #0F6E56 100%)',
    order: 3,
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

  const handleCta = (slide: BannerSlide) => {
    if (slide.ctaAction === 'scroll') {
      document.getElementById(slide.ctaTarget)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.open(slide.ctaTarget, '_blank');
    }
  };

  const s = slides[current];
  if (!s) return null;

  return (
    <section
      className="relative overflow-hidden min-h-[360px] md:min-h-[440px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
              ? `linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)`
              : slide.bgGradient || 'linear-gradient(135deg, #0F6E56, #1A3A32)',
          }}
        >
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20 flex flex-col justify-center min-h-[360px] md:min-h-[440px]">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 mb-6">
            <span className="text-sm">📏</span>
            <span className="text-xs font-semibold text-white/80">187 성장클리닉</span>
          </div>

          <h1
            key={s.id}
            className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 whitespace-pre-line animate-[fadeUp_0.5s_ease-out]"
          >
            {s.title}
          </h1>
          <p className="text-base md:text-lg text-white/65 mb-8 animate-[fadeUp_0.5s_ease-out_0.1s_both]">
            {s.subtitle}
          </p>
          <button
            onClick={() => handleCta(s)}
            className="flex items-center justify-center gap-2 w-full md:w-auto rounded-2xl bg-white px-8 py-4
                       text-[#0F6E56] font-bold text-base hover:bg-gray-50 active:scale-[0.98] transition-all shadow-lg
                       animate-[fadeUp_0.5s_ease-out_0.2s_both]"
          >
            {s.ctaText}
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 text-white
                       flex items-center justify-center hover:bg-black/40 transition-colors backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 text-white
                       flex items-center justify-center hover:bg-black/40 transition-colors backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
