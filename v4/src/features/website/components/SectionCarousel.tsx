// SectionCarousel - Instagram card-news style carousel
// 4:5 aspect ratio, small dots at bottom, swipe-only navigation

import React, { useState, useCallback, useRef } from 'react';
import type { Slide, BannerSlide, VideoSlide, CasesSlide } from '../types/websiteSection';

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

  // Current slide determines if we use fixed or natural height
  const currentSlide = slides[current];
  const isContain = currentSlide?.template === 'banner' && (currentSlide as BannerSlide).imageFit === 'contain';
  const isModalSlide = currentSlide?.template === 'banner' && (currentSlide as BannerSlide).ctaAction === 'modal';
  const isIframeSlide = currentSlide?.template === 'banner' && (currentSlide as BannerSlide).ctaAction === 'iframe';
  const specialRatio = (isModalSlide || isIframeSlide) ? ((currentSlide as BannerSlide).modalRatio || '9:16') : null;
  const useNaturalHeight = isContain;

  // Determine aspect ratio class
  const aspectClass = (isModalSlide || isIframeSlide)
    ? (specialRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]')
    : useNaturalHeight ? '' : 'aspect-[4/5]';

  return (
    <section
      className={`relative overflow-hidden w-full ${aspectClass}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content */}
      {slides.map((slide, i) => {
        const slideContain = slide.template === 'banner' && (slide as BannerSlide).imageFit === 'contain';
        return (
          <div
            key={slide.id}
            className={i === current && slideContain ? 'relative' : 'absolute inset-0'}
            style={{
              opacity: i === current ? 1 : 0,
              visibility: i === current ? 'visible' : 'hidden',
              pointerEvents: i === current ? 'auto' : 'none',
              transition: 'opacity 500ms ease-in-out, visibility 500ms ease-in-out',
            }}
          >
            {slide.template === 'banner' && <BannerContent slide={slide} />}
            {slide.template === 'video' && <VideoContent slide={slide} />}
            {slide.template === 'cases' && <CasesContent slide={slide as CasesSlide} isActive={i === current} />}
          </div>
        );
      })}

      {/* Left/Right arrows + dots */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center active:scale-90 transition-all md:opacity-0 md:hover:opacity-100 md:w-10 md:h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center active:scale-90 transition-all md:opacity-0 md:hover:opacity-100 md:w-10 md:h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
        </>
      )}

    </section>
  );
}

// ============= Banner slide content =============
function BannerContent({ slide: s }: { slide: BannerSlide }) {
  const handleCta = () => {
    if (s.ctaAction === 'scroll') {
      document.dispatchEvent(new CustomEvent('open-height-calculator'));
    } else if (s.ctaAction === 'link' || s.ctaAction === 'fulllink') {
      window.open(s.ctaTarget, '_blank');
    }
  };

  const isContain = s.imageFit === 'contain';
  const isFullLink = s.ctaAction === 'fulllink';
  const isModal = s.ctaAction === 'modal';

  const content = (
    <div className={isContain ? 'relative w-full' : 'absolute inset-0'}>
      {s.imageUrl ? (
        isContain ? (
          <img src={s.imageUrl} alt="" className="w-full h-auto" />
        ) : (
          <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-center object-cover" />
        )
      ) : (
        <div className={isContain ? 'w-full aspect-[4/5] bg-[#F5F0EA]' : 'absolute inset-0 bg-[#F5F0EA]'} />
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
              textShadow: (s.titleShadow ?? true) ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
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
                textShadow: (s.subtitleShadow ?? true) ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {s.subtitle}
            </p>
          )}
          {s.ctaText && !isFullLink && !isModal && (
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

  if (isFullLink && s.ctaTarget) {
    return (
      <a href={s.ctaTarget} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
        {content}
      </a>
    );
  }

  if (isModal) {
    const modalImgUrl = s.ctaTarget || s.imageUrl || '';
    return (
      <div className="absolute inset-0 bg-black overflow-y-auto">
        <img src={modalImgUrl} alt="" className="w-full" />
      </div>
    );
  }

  if (s.ctaAction === 'iframe' && s.ctaTarget) {
    return (
      <div className="absolute inset-0 bg-white overflow-hidden">
        <iframe
          src={s.ctaTarget}
          title={s.title || ''}
          className="w-full h-full border-0"
          style={{ overflow: 'auto' }}
        />
      </div>
    );
  }

  return content;
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

// ============= Cases slide content (direct input with charts) =============
function CasesContent({ slide: s, isActive }: { slide: CasesSlide; isActive: boolean }) {
  const ms = s.measurements || [];
  const isMale = s.gender === 'male';
  const KAKAO_URL = 'https://pf.kakao.com/_ZxneSb';

  if (!s.patientName && ms.length === 0) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">성장 사례를 입력해주세요</p>
      </div>
    );
  }

  const firstM = ms[0];
  const lastM = ms[ms.length - 1];
  const heightGrowth = firstM && lastM ? (lastM.height - firstM.height).toFixed(1) : null;

  // 예상키가 입력된 첫 번째/마지막 회차 찾기
  const msWithPredicted = ms.filter((m) => (m.predictedHeight ?? 0) > 0);
  const firstPredicted = msWithPredicted[0];
  const lastPredicted = msWithPredicted[msWithPredicted.length - 1];
  const hasPredictedPair = msWithPredicted.length >= 2 && firstPredicted !== lastPredicted;
  const predictedGrowth = hasPredictedPair
    ? (lastPredicted.predictedHeight - firstPredicted.predictedHeight).toFixed(1) : null;

  const scale = (s.fontScale ?? 70) / 100;
  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <div className="py-5 space-y-4" style={scale !== 1 ? { zoom: scale } : undefined}>
        {/* 1. Patient Header (이름, 성별) */}
        <div className="px-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg
            ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
            {isMale ? '👦' : '👧'}
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">{s.patientName}</p>
            <p className="text-xs text-gray-400">{isMale ? '남아' : '여아'}</p>
          </div>
          {heightGrowth && (
            <div className={`ml-auto rounded-xl px-3 py-1 text-center ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
              <p className={`text-lg font-black ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>+{heightGrowth}cm</p>
              <p className="text-[10px] text-gray-400">성장</p>
            </div>
          )}
        </div>

        {/* 2. Initial Memo (초진 메모) */}
        {s.initialMemo && s.initialMemo.trim() && s.initialMemo.trim() !== '0' && (
          <div className="mx-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-[10px] font-semibold text-amber-600 mb-1">🏥 초진 메모</p>
            <p className="text-xs text-gray-700 whitespace-pre-line">{s.initialMemo}</p>
          </div>
        )}

        {/* Intake Info (collapsible, after initial memo) */}
        {s.intakeInfo && Object.values(s.intakeInfo).some(Boolean) && (
          <div className="px-4">
            <CasesIntakeSection info={s.intakeInfo} isMale={isMale} />
          </div>
        )}

        {/* 3. Predicted Height Bar Chart (예상키 입력된 첫/마지막 회차) */}
        {hasPredictedPair && (
          <div className="mx-4 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-2">📊 예상키 변화</p>
            <CasesBarChart
              initialPredicted={firstPredicted.predictedHeight}
              finalPredicted={lastPredicted.predictedHeight}
              isMale={isMale}
              isActive={isActive}
            />
            {predictedGrowth && (
              <p className="text-center text-xs mt-1">
                예상키 <span className={`font-black ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
                  +{predictedGrowth}cm
                </span> 증가
              </p>
            )}
          </div>
        )}

        {/* 4. Growth Standard Chart (카드 너비 가득 — px-0) */}
        {ms.length >= 2 && s.birthDate && (
          <CasesGrowthChartSection measurements={ms} birthDate={s.birthDate} gender={s.gender} />
        )}

        {/* 5. Measurement Table (회차별 기록) */}
        {ms.length > 0 && (
          <div className="px-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-1.5 py-1.5 text-left text-gray-500 font-semibold">#</th>
                  <th className="px-1.5 py-1.5 text-left text-gray-500 font-semibold">날짜</th>
                  <th className="px-1.5 py-1.5 text-right text-gray-500 font-semibold">키</th>
                  <th className="px-1.5 py-1.5 text-right text-gray-500 font-semibold">체중</th>
                  {s.birthDate && <th className="px-1.5 py-1.5 text-center text-gray-500 font-semibold">나이</th>}
                  {ms.some((m) => m.boneAge) && <th className="px-1.5 py-1.5 text-center text-gray-500 font-semibold">뼈나이</th>}
                  <th className="px-1.5 py-1.5 text-right text-[#0F6E56] font-semibold">예상키</th>
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => {
                  const age = s.birthDate && m.date ? calcAge(s.birthDate, m.date) : null;
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-1.5 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-1.5 py-1.5">{m.date ? formatDate(m.date) : '-'}</td>
                      <td className="px-1.5 py-1.5 text-right font-bold">{m.height || '-'}</td>
                      <td className="px-1.5 py-1.5 text-right text-gray-500">{m.weight || '-'}</td>
                      {s.birthDate && <td className="px-1.5 py-1.5 text-center text-gray-500">{age !== null ? `${age}` : '-'}</td>}
                      {ms.some((mm) => mm.boneAge) && <td className="px-1.5 py-1.5 text-center text-amber-600 font-semibold">{m.boneAge || '-'}</td>}
                      <td className="px-1.5 py-1.5 text-right text-[#0F6E56] font-bold">{m.predictedHeight || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Photos per measurement */}
        {ms.some((m) => m.photoFront || m.photoSide || m.xrayFront || m.xraySide) && (
          <div className="px-4">
            <CasesMeasurementPhotos measurements={ms} />
          </div>
        )}

        {/* 6. Final Memo (마무리 메모) */}
        {s.finalMemo && (
          <div className="mx-4 bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-[10px] font-semibold text-green-600 mb-1">🎉 마무리</p>
            <p className="text-xs text-gray-700 whitespace-pre-line">{s.finalMemo}</p>
          </div>
        )}

        {/* CTA */}
        {(s.showCta !== false) && (
          <div className="px-4">
            <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0F6E56] py-3
                         text-white font-bold text-sm hover:bg-[#0D5A47] transition-all">
              💬 우리 아이도 상담 받아보기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return '';
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
}

// Lazy-loaded chart components to avoid bundling Chart.js in the carousel
import type { CaseMeasurementEntry } from '../types/websiteSection';

// Calculate age in years from birthDate and measurement date
function calcAge(birthDate: string, measureDate: string): number | null {
  if (!birthDate || !measureDate) return null;
  const b = new Date(birthDate);
  const m = new Date(measureDate);
  if (isNaN(b.getTime()) || isNaN(m.getTime())) return null;
  const diffMs = m.getTime() - b.getTime();
  return Math.round((diffMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10; // 1 decimal
}

// Growth chart section using the existing GrowthChart component (5th/50th/95th + actual measurements)
function CasesGrowthChartSection({ measurements, birthDate, gender }: {
  measurements: CaseMeasurementEntry[]; birthDate: string; gender: 'male' | 'female';
}) {
  const [GrowthChartComp, setGrowthChartComp] = React.useState<React.ComponentType<{
    gender: string; points: { age: number; height: number }[];
    showTitle?: boolean; zoomable?: boolean; compact?: boolean;
    predictedAdultHeight?: number;
  }> | null>(null);

  React.useEffect(() => {
    import('@/shared/components/GrowthChart').then(({ GrowthChart }) => {
      setGrowthChartComp(() => GrowthChart as unknown as typeof GrowthChartComp extends null ? never : NonNullable<typeof GrowthChartComp>);
    });
  }, []);

  // Convert measurements to GrowthPoint[] (age + height)
  const points = React.useMemo(() => {
    return measurements
      .filter((m) => m.date && m.height)
      .map((m) => {
        const age = calcAge(birthDate, m.date);
        return age ? { age, height: m.height } : null;
      })
      .filter(Boolean) as { age: number; height: number }[];
  }, [measurements, birthDate]);

  // Find the last measurement with predictedHeight
  const lastWithPredicted = [...measurements].reverse().find((m) => (m.predictedHeight ?? 0) > 0);

  if (points.length < 2) return null;

  return (
    <div className="bg-gray-50 px-1 py-2">
      <p className="text-[10px] font-semibold text-gray-500 mb-1 px-3">📈 성장 표준곡선</p>
      {GrowthChartComp ? (
        <GrowthChartComp
          gender={gender}
          points={points}
          showTitle={false}
          compact
          predictedAdultHeight={lastWithPredicted?.predictedHeight}
        />
      ) : (
        <div className="h-32 flex items-center justify-center text-xs text-gray-400">로딩...</div>
      )}
    </div>
  );
}

function CasesBarChart({ initialPredicted, finalPredicted, isMale, isActive }: {
  initialPredicted: number; finalPredicted: number; isMale: boolean; isActive: boolean;
}) {
  const maxVal = Math.max(initialPredicted, finalPredicted);
  const color1 = '#94A3B8';
  const color2 = isMale ? '#3B82F6' : '#EC4899';
  const barPct = (val: number) => ((val - 130) / (maxVal - 130 + 10)) * 100;

  return (
    <div className="flex items-end justify-center gap-8" style={{ height: 160 }}>
      {[
        { label: '초진 예상키', val: initialPredicted, color: color1, delay: 0 },
        { label: '최종 예상키', val: finalPredicted, color: color2, delay: 300 },
      ].map(({ label, val, color, delay }) => (
        <div key={label} className="flex flex-col items-center gap-1 flex-1 max-w-[100px] h-full justify-end">
          <span className="text-xs font-black" style={{ color }}>{val}cm</span>
          <div className="w-full bg-gray-100 rounded-t-lg" style={{ height: '80%', position: 'relative', overflow: 'hidden' }}>
            <GrowBar heightPct={barPct(val)} color={color} delayMs={delay} isActive={isActive} />
          </div>
          <span className="text-[10px] text-gray-500 text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Bar that grows when isActive becomes true, resets when false */
function GrowBar({ heightPct, color, delayMs, isActive }: {
  heightPct: number; color: string; delayMs: number; isActive: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isActive) {
      // Reset first
      el.style.transition = 'none';
      el.style.height = '0%';
      el.getBoundingClientRect(); // force reflow
      // Animate up
      const timer = setTimeout(() => {
        el.style.transition = 'height 1s ease-out';
        el.style.height = `${heightPct}%`;
      }, delayMs + 50);
      return () => clearTimeout(timer);
    } else {
      // Not active → reset instantly
      el.style.transition = 'none';
      el.style.height = '0%';
    }
  }, [isActive, heightPct, delayMs]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: '0.5rem 0.5rem 0 0',
        backgroundColor: color,
        height: '0%',
      }}
    />
  );
}

// ============= Intake Info Section (collapsible) =============
import type { CaseIntakeInfo } from '../types/websiteSection';

function CasesIntakeSection({ info, isMale }: { info: CaseIntakeInfo; isMale: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={`rounded-xl border ${isMale ? 'border-blue-100' : 'border-pink-100'} overflow-hidden`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
        <span className="text-[10px] font-bold text-gray-600">📋 초진 정보</span>
        <span className={`text-[10px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 text-[10px]">
          {info.gestationalWeeks && <InfoRow label="임신 주수" value={`${info.gestationalWeeks}주`} />}
          {info.birthWeight && <InfoRow label="출생 몸무게" value={`${info.birthWeight}kg`} />}
          {info.birthNote && <InfoRow label="출생 특이사항" value={info.birthNote} />}
          {info.currentHeight && <InfoRow label="내원 시 키" value={`${info.currentHeight}cm`} />}
          {info.currentWeight && <InfoRow label="내원 시 몸무게" value={`${info.currentWeight}kg`} />}
          {info.yearlyGrowth && <InfoRow label="연간 성장" value={`${info.yearlyGrowth}cm`} />}
          {info.grade && <InfoRow label="학년" value={info.grade} />}
          {info.heightRank && <InfoRow label="학급 키 순위" value={`${info.heightRank}번`} />}
          {info.desiredHeight && <InfoRow label="희망 키" value={`${info.desiredHeight}cm`} />}
          {info.fatherHeight && <InfoRow label="아버지 키" value={`${info.fatherHeight}cm`} />}
          {info.motherHeight && <InfoRow label="어머니 키" value={`${info.motherHeight}cm`} />}
          {info.growthPattern && <InfoRow label="성장 양상" value={info.growthPattern} />}
          {info.pubertyStage && <InfoRow label="사춘기 평가" value={info.pubertyStage} />}
          {info.growthConcerns && <InfoRow label="보호자 의견" value={info.growthConcerns} />}
          {info.pastConditions && <InfoRow label="과거 질환" value={info.pastConditions} />}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  );
}

// ============= Measurement Photos =============
function CasesMeasurementPhotos({ measurements }: { measurements: CaseMeasurementEntry[] }) {
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  const photosExist = (m: CaseMeasurementEntry) =>
    m.photoFront || m.photoSide || m.xrayFront || m.xraySide;

  return (
    <>
      <div className="space-y-2">
        {measurements.map((m, idx) => {
          if (!photosExist(m)) return null;
          const isOpen = expanded === idx;
          return (
            <div key={idx} className="rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : idx)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-[10px]">
                <span className="font-bold text-gray-600">📷 #{idx + 1}회 사진</span>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 gap-1 p-2">
                  {m.photoFront && <PhotoThumb src={m.photoFront} label="정면" onClick={() => setLightbox(m.photoFront!)} />}
                  {m.photoSide && <PhotoThumb src={m.photoSide} label="측면" onClick={() => setLightbox(m.photoSide!)} />}
                  {m.xrayFront && <PhotoThumb src={m.xrayFront} label="X-ray 정면" onClick={() => setLightbox(m.xrayFront!)} />}
                  {m.xraySide && <PhotoThumb src={m.xraySide} label="X-ray 측면" onClick={() => setLightbox(m.xraySide!)} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">✕</button>
        </div>
      )}
    </>
  );
}

function PhotoThumb({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative rounded-lg overflow-hidden group">
      <img src={src} alt={label} className="w-full aspect-square object-cover" />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
        <p className="text-[9px] text-white font-medium">{label}</p>
      </div>
    </button>
  );
}
