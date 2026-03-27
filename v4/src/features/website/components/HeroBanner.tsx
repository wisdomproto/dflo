// ================================================
// HeroBanner - 모바일 풀스크린 배너 (배경 + 아이 이미지 + 하단 텍스트)
// ================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBanners } from '../services/bannerService';

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaAction: 'scroll' | 'link';
  ctaTarget: string;
  /** Full background image (fills entire slide) */
  imageUrl?: string;
  /** Child cutout PNG (overlaid on bg, centered top) */
  childImageUrl?: string;
  bgGradient?: string;
  order: number;
  /** Text customization */
  titleSize?: number;   // px, default 36
  titleColor?: string;  // hex, default #111827 (gray-900)
  subtitleSize?: number; // px, default 14
  subtitleColor?: string; // hex, default #6b7280 (gray-500)
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'default-1',
    title: '우리 아이,\n얼마나 클까?',
    subtitle: '지금 바로 예상 키를 무료로 측정해보세요',
    ctaText: '예측키 무료 측정하기',
    ctaAction: 'scroll',
    ctaTarget: 'calculator',
    imageUrl: '/images/slide1_bg.jpg',
    childImageUrl: '/images/slide1_child.png',
    order: 0,
  },
  {
    id: 'default-4',
    title: '성조숙증,\n골든타임을 놓치지 마세요',
    subtitle: '조기 발견과 맞춤 치료가 아이의 키를 바꿉니다',
    ctaText: '',
    ctaAction: 'scroll',
    ctaTarget: 'programs',
    imageUrl: '/images/slide3_bg.jpg',
    childImageUrl: '/images/slide3_child.png',
    order: 1,
  },
  {
    id: 'default-5',
    title: '187 성장\n통합 프로그램',
    subtitle: '체계적인 성장 관리로 아이의 가능성을 키웁니다',
    ctaText: '',
    ctaAction: 'scroll',
    ctaTarget: 'programs',
    imageUrl: '/images/slide5_bg.jpg',
    childImageUrl: '/images/slide5_child.png',
    order: 2,
  },
];

interface Props {
  slides?: BannerSlide[];
}

export function HeroBanner({ slides: propSlides }: Props) {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<BannerSlide[]>(DEFAULT_SLIDES);

  useEffect(() => {
    if (propSlides && propSlides.length > 0) {
      setSlides(propSlides);
      return;
    }
    fetchBanners()
      .then((data) => { if (data.length > 0) setSlides(data); })
      .catch(() => { /* keep defaults */ });
  }, [propSlides]);

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
      className="relative overflow-hidden w-full"
      style={{ minHeight: '80vh' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ===== Slide backgrounds ===== */}
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
          {/* Background layer */}
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: slide.bgGradient || 'linear-gradient(180deg, #EDE8E0 0%, #F5F0EA 100%)',
              }}
            />
          )}

          {/* Bottom gradient fade: transparent → cream/white */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.95) 80%, #fff 100%)',
            }}
          />
        </div>
      ))}

      {/* ===== Text content — bottom area ===== */}
      <div className="absolute bottom-[12%] md:bottom-[14%] left-0 right-0 z-10 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1
            key={s.id}
            className={`font-extrabold leading-[1.15] mb-3 whitespace-pre-line animate-[fadeUp_0.5s_ease-out] ${
              !s.titleSize ? 'text-[42px] md:text-[56px]' : ''
            } ${!s.titleColor ? 'text-gray-900' : ''}`}
            style={{
              fontSize: s.titleSize ? `${s.titleSize}px` : undefined,
              color: s.titleColor || undefined,
            }}
          >
            {s.title}
          </h1>
          {s.subtitle && (
            <p
              className={`mb-5 whitespace-pre-line animate-[fadeUp_0.5s_ease-out_0.1s_both] ${
                !s.subtitleSize ? 'text-[17px] md:text-xl' : ''
              } ${!s.subtitleColor ? 'text-gray-500' : ''}`}
              style={{
                fontSize: s.subtitleSize ? `${s.subtitleSize}px` : undefined,
                color: s.subtitleColor || undefined,
              }}
            >
              {s.subtitle}
            </p>
          )}
          {s.ctaText && (
            <button
              key={`cta-${s.id}`}
              onClick={handleCta}
              className="inline-flex items-center gap-2 rounded-full
                         bg-[#0F6E56] px-7 py-3.5 md:px-8 md:py-4
                         text-white font-bold text-sm md:text-base
                         shadow-lg hover:bg-[#0d5e4a] hover:scale-105 active:scale-95
                         transition-all animate-[fadeUp_0.5s_ease-out_0.2s_both]"
            >
              <span>📏</span> {s.ctaText}
            </button>
          )}
        </div>
      </div>

      {/* ===== Navigation dots + arrows — bottom center ===== */}
      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-full bg-gray-200/60 text-gray-600 flex items-center justify-center hover:bg-gray-300/80 transition-colors"
          >
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
                  i === current ? 'w-6 bg-[#0F6E56]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-8 h-8 rounded-full bg-gray-200/60 text-gray-600 flex items-center justify-center hover:bg-gray-300/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
