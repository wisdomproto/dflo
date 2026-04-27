// SectionCarousel - Instagram card-news style carousel
// 4:5 aspect ratio, small dots at bottom, swipe-only navigation
//
// 카드는 PC 에서도 모바일 폭(WebsiteHomePage 의 max-w-[460px]) 그대로 유지된다.
// 텍스트는 px 절대값 그대로 모바일 비율로 자연스럽게 렌더된다.

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
  showNav?: boolean;
}

export function SectionCarousel({ slides, initialIndex = 0, showNav = true }: Props) {
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
    <div className="w-full">
      {/* Top navigation row — visible when multi-slide */}
      {total > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-gray-100">
          <button
            onClick={prev}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 active:scale-90 transition-all"
            aria-label="이전 슬라이드"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 flex-shrink-0 ${
                  i === current
                    ? 'w-4 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-gray-300'
                }`}
                aria-label={`슬라이드 ${i + 1}`}
              />
            ))}
          </div>

          <span className="text-[11px] font-medium text-gray-400 tabular-nums whitespace-nowrap flex-shrink-0">
            {current + 1} / {total}
          </span>

          <button
            onClick={next}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 active:scale-90 transition-all"
            aria-label="다음 슬라이드"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

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

      {/* Left/Right arrows removed — top nav + swipe handle navigation. */}

      {/* Dots — toggleable per section */}
      {total > 1 && showNav && (
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
    </div>
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
            className={`font-bold leading-[1.15] mb-3 whitespace-pre-line font-['Noto_Sans_KR'] ${
              !s.titleColor ? 'text-white' : ''
            }`}
            style={{
              fontSize: s.titleSize ? `${s.titleSize}px` : '96px',
              fontWeight: 700,
              textAlign: s.titleAlign ?? 'center',
              color: s.titleColor || undefined,
              textShadow: (s.titleShadow ?? true) ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {s.title}
          </h1>
          {s.subtitle && (
            <p
              className={`mb-4 whitespace-pre-line font-['Noto_Sans_KR'] ${
                !s.subtitleColor ? 'text-white/90' : ''
              }`}
              style={{
                fontSize: s.subtitleSize ? `${s.subtitleSize}px` : '50px',
                fontWeight: 500,
                textAlign: s.subtitleAlign ?? 'center',
                color: s.subtitleColor || undefined,
                textShadow: (s.subtitleShadow ?? true) ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {s.subtitle}
            </p>
          )}
          {s.ctaText && !isFullLink && !isModal && (() => {
            const ctaPx = s.ctaSizePx
              ?? (s.ctaSize === 'sm' ? 18 : s.ctaSize === 'lg' ? 42 : 30);
            return (
              <div style={{ textAlign: s.ctaAlign ?? 'center' }}>
                <button
                  onClick={handleCta}
                  className="inline-flex items-center gap-2 rounded-full shadow-lg active:scale-95 transition-all font-['Noto_Sans_KR']"
                  style={{
                    fontSize: `${ctaPx}px`,
                    fontWeight: 500,
                    padding: `${ctaPx * 0.45}px ${ctaPx * 1.0}px`,
                    backgroundColor: s.ctaBgColor || '#0F6E56',
                    color: s.ctaTextColor || '#ffffff',
                  }}
                >
                  {s.ctaText}
                </button>
              </div>
            );
          })()}
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
    const zoom = (s.iframeZoom || 70) / 100;
    // CSS `zoom` 은 layout-aware scaling 이라 transform: scale 과 달리
    // 텍스트가 흐려지지 않는다. 모바일 Chrome/Safari/WebKit 모두 지원.
    return (
      <div className="absolute inset-0 bg-white overflow-hidden">
        <iframe
          src={s.ctaTarget}
          title={s.title || ''}
          className="border-0"
          style={{
            width: '100%',
            height: '100%',
            zoom: zoom !== 1 ? zoom : undefined,
            overflow: 'auto',
          }}
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

  // 예상키가 입력된 첫 번째/마지막 회차 — 실제키와 예상키를 한 쌍으로 묶어 비교한다.
  const msWithPredicted = ms.filter((m) => (m.predictedHeight ?? 0) > 0);
  const firstPredicted = msWithPredicted[0];
  const lastPredicted = msWithPredicted[msWithPredicted.length - 1];
  const hasPredictedPair = msWithPredicted.length >= 2 && firstPredicted !== lastPredicted;

  // 어드민에서 fontScale 로 슬라이드별 글자 크기 미세조정 (기본 100 = no-op).
  const fontZoom = (s.fontScale ?? 100) / 100;
  const fontZoomStyle: React.CSSProperties | undefined =
    fontZoom === 1 ? undefined : { zoom: fontZoom, width: `${100 / fontZoom}%` };
  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <div className="py-5 space-y-4" style={fontZoomStyle}>
        {/* 1. Patient Header (이름, 성별) */}
        <div className="px-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg
            ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
            {isMale ? '👦' : '👧'}
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">{s.patientName}</p>
            <p className="text-xs text-gray-400">
              {isMale ? '남아' : '여아'}
              {s.category && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-medium">{s.category}</span>}
            </p>
          </div>
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

        {/* 3. 키 변화: 초진 시점과 최종 시점에서 각각 실제키 vs 예상키 비교 */}
        {hasPredictedPair && (
          <div className="mx-4 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-2">📊 키 변화</p>
            <CasesBarChart
              initialActual={firstPredicted.height}
              initialPredicted={firstPredicted.predictedHeight}
              finalActual={lastPredicted.height}
              finalPredicted={lastPredicted.predictedHeight}
              initialDate={firstPredicted.date}
              finalDate={lastPredicted.date}
              isMale={isMale}
              isActive={isActive}
            />
          </div>
        )}

        {/* 3.5. YouTube Video (치료 후기 영상) */}
        {s.youtubeUrl && (
          <div className="mx-4 rounded-xl overflow-hidden border border-gray-200">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${extractYoutubeId(s.youtubeUrl)}`}
                title="치료 후기 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* 3.6. Allergy Test Results (알러지 검사 결과) */}
        {s.allergyData && (s.allergyData.danger?.length > 0 || s.allergyData.caution?.length > 0) && (
          <AllergyDataSection data={s.allergyData} />
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
                      {ms.some((mm) => mm.boneAge) && <td className="px-1.5 py-1.5 text-center text-amber-600 font-semibold">{m.boneAge ? m.boneAge.toFixed(1) : '-'}</td>}
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
        {s.showCta && (
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

function AllergyDataSection({ data }: { data: { danger: string[]; caution: string[] } }) {
  const [open, setOpen] = React.useState(false);
  const total = (data.danger?.length || 0) + (data.caution?.length || 0);
  return (
    <div className="mx-4 rounded-xl border border-gray-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors">
        <p className="text-[10px] font-semibold text-gray-500">🍽️ 음식 알러지 검사 결과 ({total}개)</p>
        <span className={`text-[10px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && data.danger?.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-[10px] font-bold text-red-500 mb-1">🚫 위험 ({data.danger.length}개)</p>
          <div className="flex flex-wrap gap-1">
            {data.danger.map((food, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] border border-red-200">{food}</span>
            ))}
          </div>
        </div>
      )}
      {open && data.caution?.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-[10px] font-bold text-amber-600 mb-1">⚠️ 경계 ({data.caution.length}개)</p>
          <div className="flex flex-wrap gap-1">
            {data.caution.map((food, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] border border-amber-200">{food}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return '';
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[0].slice(2)}/${parts[1]}/${parts[2]}` : d;
}

function extractYoutubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
  return m?.[1] || '';
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
    predictedCurve?: { age: number; height: number }[];
    initialPredictedCurve?: { age: number; height: number }[];
  }> | null>(null);
  const [heightStandard, setHeightStandard] = React.useState<{ age: number; p5: number; p50: number; p95: number }[] | null>(null);

  React.useEffect(() => {
    Promise.all([
      import('@/shared/components/GrowthChart'),
      import('@/shared/data/growthStandard'),
    ]).then(([chartMod, stdMod]) => {
      setGrowthChartComp(() => chartMod.GrowthChart as unknown as typeof GrowthChartComp extends null ? never : NonNullable<typeof GrowthChartComp>);
      setHeightStandard(stdMod.getHeightStandard(gender));
    });
  }, [gender]);

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

  // Build predicted curve: bone-age percentile → projected yearly points to age 18
  const predictedCurve = React.useMemo(() => {
    if (!heightStandard || points.length === 0) return undefined;
    const lastWithBone = [...measurements].reverse().find((m) => (m.boneAge ?? 0) > 0 && (m.predictedHeight ?? 0) > 0);
    if (!lastWithBone) return undefined;

    const lastPoint = points[points.length - 1];
    const lastBA = lastWithBone.boneAge!;
    const lastCA = lastPoint.age;
    if (lastCA >= 18 || lastBA >= 18) return undefined;

    const getStdAtAge = (ageYr: number) => {
      let best = heightStandard[0];
      let bestDiff = Math.abs(best.age - ageYr);
      for (const s of heightStandard) {
        const diff = Math.abs(s.age - ageYr);
        if (diff < bestDiff) { best = s; bestDiff = diff; }
      }
      return best;
    };

    const heightAtPct = (ageYr: number, pct: number) => {
      const s = getStdAtAge(ageYr);
      if (pct <= 5) return s.p5 * pct / 5;
      if (pct <= 50) return s.p5 + (s.p50 - s.p5) * (pct - 5) / 45;
      if (pct <= 95) return s.p50 + (s.p95 - s.p50) * (pct - 50) / 45;
      return s.p95 + (s.p95 - s.p50) * (pct - 95) / 2; // inverse of forward: pct = 95 + 2*(h-p95)/(p95-p50)
    };

    // Calculate percentile at bone age (clamped to 3~97 to prevent wild extrapolation)
    const std = getStdAtAge(lastBA);
    let pct: number;
    if (lastPoint.height <= std.p5) {
      pct = Math.max(3, 5 * lastPoint.height / std.p5);
    } else if (lastPoint.height <= std.p50) {
      pct = 5 + 45 * (lastPoint.height - std.p5) / (std.p50 - std.p5);
    } else if (lastPoint.height <= std.p95) {
      pct = 50 + 45 * (lastPoint.height - std.p50) / (std.p95 - std.p50);
    } else {
      // Cap at 97 to prevent extrapolation beyond chart bounds
      pct = Math.min(97, 95 + 2 * (lastPoint.height - std.p95) / Math.max(std.p95 - std.p50, 1));
    }

    // Project: bone age progresses linearly from lastBA → 18 as chronological age goes lastCA → 18
    // So at chronological age Y, projected bone age = lastBA + (Y - lastCA) * (18 - lastBA) / (18 - lastCA)
    const baRate = (18 - lastBA) / (18 - lastCA);

    const curve: { age: number; height: number }[] = [{ age: lastPoint.age, height: lastPoint.height }];
    const startYear = Math.ceil(lastCA);
    for (let y = startYear; y <= 18; y++) {
      const projectedBA = lastBA + (y - lastCA) * baRate;
      const h = heightAtPct(Math.min(projectedBA, 18), pct);
      curve.push({ age: y, height: Math.round(h * 10) / 10 });
    }
    return curve.length > 1 ? curve : undefined;
  }, [measurements, points, heightStandard]);

  // "치료 받지 않았다면" baseline — 첫 측정 시점의 percentile 을 18세까지 그대로 유지.
  // 사용자 요구: 첫 측정 percentile 기준으로 매년 점, 마지막(18세)에서 가로선.
  const initialPredictedCurve = React.useMemo(() => {
    if (!heightStandard || points.length === 0) return undefined;
    const first = points[0];
    if (first.age >= 18) return undefined;

    const getStdAtAge = (ageYr: number) => {
      let best = heightStandard[0];
      let bestDiff = Math.abs(best.age - ageYr);
      for (const s of heightStandard) {
        const diff = Math.abs(s.age - ageYr);
        if (diff < bestDiff) { best = s; bestDiff = diff; }
      }
      return best;
    };

    const heightAtPct = (ageYr: number, pct: number) => {
      const s = getStdAtAge(ageYr);
      if (pct <= 5) return s.p5 * pct / 5;
      if (pct <= 50) return s.p5 + (s.p50 - s.p5) * (pct - 5) / 45;
      if (pct <= 95) return s.p50 + (s.p95 - s.p50) * (pct - 50) / 45;
      return s.p95 + (s.p95 - s.p50) * (pct - 95) / 2;
    };

    // 첫 측정 키의 percentile
    const std = getStdAtAge(first.age);
    let pct: number;
    if (first.height <= std.p5) pct = Math.max(3, 5 * first.height / std.p5);
    else if (first.height <= std.p50) pct = 5 + 45 * (first.height - std.p5) / (std.p50 - std.p5);
    else if (first.height <= std.p95) pct = 50 + 45 * (first.height - std.p50) / (std.p95 - std.p50);
    else pct = Math.min(97, 95 + 2 * (first.height - std.p95) / Math.max(std.p95 - std.p50, 1));

    const curve: { age: number; height: number }[] = [{ age: first.age, height: first.height }];
    const startYear = Math.ceil(first.age);
    for (let y = startYear; y <= 18; y++) {
      curve.push({ age: y, height: Math.round(heightAtPct(y, pct) * 10) / 10 });
    }
    return curve.length > 1 ? curve : undefined;
  }, [points, heightStandard]);

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
          predictedCurve={predictedCurve}
          initialPredictedCurve={initialPredictedCurve}
        />
      ) : (
        <div className="h-32 flex items-center justify-center text-xs text-gray-400">로딩...</div>
      )}
    </div>
  );
}

function CasesBarChart({
  initialActual, initialPredicted,
  finalActual, finalPredicted,
  initialDate, finalDate,
  isMale, isActive,
}: {
  initialActual: number; initialPredicted: number;
  finalActual: number; finalPredicted: number;
  initialDate?: string; finalDate?: string;
  isMale: boolean; isActive: boolean;
}) {
  // 차트는 "예상키 변화" 한 가지만 보여준다. 실제키는 자연 성장 영향이
  // 크기 때문에 같이 그리면 어린 환자에서는 갭이 커 보이고 큰 환자에서는
  // 작아 보여 치료 효과가 왜곡된다. 정직한 비교를 위해 예상키 1개 바.
  const lowerBound = 60;
  const upperBound = Math.ceil((Math.max(initialPredicted, finalPredicted) + 5) / 10) * 10;
  const range = Math.max(1, upperBound - lowerBound);
  const pct = (val: number) => ((val - lowerBound) / range) * 100;

  const tickStep = 20;
  const yTicks: number[] = [];
  for (let v = lowerBound; v <= upperBound; v += tickStep) yTicks.push(v);

  // 초진 = before treatment (중성 회색 그라디언트), 최종 = after (브랜드 비비드)
  const initialBg = 'linear-gradient(180deg, #CBD5E1 0%, #64748B 100%)';     // slate-300 → slate-500
  const initialColor = '#475569'; // slate-600 — readable on white
  const finalBg = isMale
    ? 'linear-gradient(180deg, #38BDF8 0%, #2563EB 100%)'   // sky-400 → blue-600
    : 'linear-gradient(180deg, #FB7185 0%, #BE185D 100%)';  // rose-400 → pink-700
  const finalColor = isMale ? '#2563EB' : '#BE185D';
  const accent = isMale ? 'text-blue-600' : 'text-pink-600';
  const accentBg = isMale ? 'bg-blue-50' : 'bg-pink-50';

  const actualGrowth = (finalActual - initialActual).toFixed(1);
  const predictedGrowth = (finalPredicted - initialPredicted).toFixed(1);

  const fmtDate = (d?: string) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };

  // 치료기간: initial → final (개월 단위, 12개월 넘으면 "Y년 M개월")
  const treatmentDuration = (() => {
    if (!initialDate || !finalDate) return null;
    const start = new Date(initialDate);
    const end = new Date(finalDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const months = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
    );
    if (months < 12) return `${months}개월`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths === 0 ? `${years}년` : `${years}년 ${remMonths}개월`;
  })();

  const CHART_HEIGHT = 180;

  // 예상키 한 개의 막대만 그린다. 측면 라벨은 같은 좌우로 충돌하지 않게
  // 초진은 왼쪽으로, 최종은 오른쪽으로 펼친다.
  const Group = ({
    title, dateLabel,
    predicted,
    delayBase, labelSide,
    barBg, labelColor,
  }: {
    title: string; dateLabel: string;
    predicted: number;
    delayBase: number; labelSide: 'left' | 'right';
    barBg: string; labelColor: string;
  }) => {
    const predictedPct = pct(predicted);
    // Bar half-width = 26px (52/2); add small gap before the side label.
    const sideStyle = labelSide === 'left'
      ? { right: 'calc(50% + 30px)', left: -4 }
      : { left: 'calc(50% + 30px)', right: -4 };
    const flexDir = labelSide === 'left' ? 'flex-row-reverse' : 'flex-row';
    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="relative w-full" style={{ height: CHART_HEIGHT }}>
          <div
            className="absolute bottom-0 rounded-t-md overflow-hidden ring-1 ring-black/5"
            style={{
              left: '50%', transform: 'translateX(-50%)',
              width: 52, height: '100%',
              background: 'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.5) 100%)',
            }}
          >
            <GrowBar heightPct={predictedPct} color={barBg} delayMs={delayBase} isActive={isActive} />
          </div>

          {/* Predicted indicator line + label (level = predictedPct) */}
          <div
            className={`absolute flex items-center gap-1 ${flexDir} pointer-events-none`}
            style={{ ...sideStyle, bottom: `${predictedPct}%`, transform: 'translateY(50%)' }}
          >
            <span
              className="text-[11px] font-black tabular-nums whitespace-nowrap leading-none px-1 rounded bg-white/85 backdrop-blur-[1px]"
              style={{ color: labelColor }}
            >
              {predicted}
            </span>
            <div className="border-t border-dashed" style={{ borderColor: labelColor, width: 14 }} />
          </div>
        </div>

        {/* x-axis label */}
        <div className="text-center mt-2 leading-tight">
          <p className="text-[11px] font-bold text-gray-700">{title}</p>
          {dateLabel && <p className="text-[9px] text-gray-400 mt-0.5">{dateLabel}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-stretch">
        {/* Chart area (Y-axis labels removed — per-bar indicator gives the precise cm) */}
        <div className="relative flex-1">
          {/* Background grid + bottom axis */}
          <div className="absolute inset-x-0 pointer-events-none" style={{ height: CHART_HEIGHT }}>
            {yTicks.map((v) => (
              <div
                key={v}
                className="absolute inset-x-0 border-t border-dashed"
                style={{ bottom: `${pct(v)}%`, borderColor: 'rgba(15,23,42,0.04)' }}
              />
            ))}
            <div
              className="absolute inset-x-0 border-t"
              style={{ bottom: 0, borderColor: 'rgba(15,23,42,0.12)' }}
            />
          </div>

          {/* Two predicted bars + connecting arrow — 색깔로 before/after 구분 */}
          <div className="relative flex items-stretch">
            <Group
              title="초진 예상키"
              dateLabel={fmtDate(initialDate)}
              predicted={initialPredicted}
              delayBase={0}
              labelSide="left"
              barBg={initialBg}
              labelColor={initialColor}
            />
            <div
              className="flex items-center justify-center text-gray-300 text-base"
              style={{ height: CHART_HEIGHT, width: 18 }}
            >
              →
            </div>
            <Group
              title="최종 예상키"
              dateLabel={fmtDate(finalDate)}
              predicted={finalPredicted}
              delayBase={400}
              labelSide="right"
              barBg={finalBg}
              labelColor={finalColor}
            />
          </div>
        </div>
      </div>

      {/* 치료 기간 동안 실제키·예상키가 얼마나 변했는지 — 한 줄로 가운데 */}
      <div className="flex items-center justify-center">
        <div className={`inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 ${accentBg} rounded-lg px-3 py-1.5`}>
          {treatmentDuration && (
            <span className="text-[11px] text-gray-700">
              치료 <span className="font-bold text-gray-900">{treatmentDuration}</span> 동안
            </span>
          )}
          <span className="text-[11px] text-gray-600">
            실제키 <span className="font-bold text-gray-800">+{actualGrowth}cm</span>
          </span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className={`text-[11px] font-black ${accent}`}>
            예상키 +{predictedGrowth}cm
          </span>
        </div>
      </div>
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
        // `background` accepts plain colors AND linear-gradient strings.
        background: color,
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
