import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Child, IntakeSurvey } from '@/shared/types';
import {
  DEFAULT_INTAKE_SURVEY,
  updateIntakeSurvey,
} from '@/features/hospital/services/intakeSurveyService';
import {
  firstConsultContent,
  type ConsultLang,
  type ConsultSlide,
} from './firstConsultContent';
import { IntakeBasicInfoSection } from './IntakeBasicInfoSection';
import { IntakeGrowthHistoryTable } from './IntakeGrowthHistoryTable';
import { IntakeFamilySection } from './IntakeFamilySection';
import { IntakeMedicalSection } from './IntakeMedicalSection';
import { IntakeCausesSection } from './IntakeCausesSection';
import { IntakeClinicalSection } from './IntakeClinicalSection';

/**
 * 첫 상담 프레젠테이션 (슬라이드 덱 모드).
 *
 * 한 번에 한 장의 슬라이드를 큰 영역으로 보여주고, ← / → 버튼 또는
 * 방향키로 다음 슬라이드로 넘어간다 (PowerPoint 스타일). KO/EN 언어 토글
 * 은 헤더에 유지.
 *
 * 섹션 01~06 슬라이드는 설명 위에 실제 Intake 편집 컴포넌트를 배치해서
 * 상담 흐름 안에서 바로 데이터 입력이 가능하다. 편집기 위쪽엔 설명, 아래쪽엔
 * bullet 포인트를 두 컬럼으로 나누는 레이아웃 대신, 편집기가 먼저 오고
 * 설명이 아래에 따라오는 구조로 바꿔 좁은 높이 안에서도 입력창이 잘리지
 * 않게 한다.
 */
interface Props {
  expanded: boolean;
  onToggle: () => void;
  child: Child;
  onChildUpdated: (child: Child) => void;
}

export function FirstConsultPanel({
  expanded,
  onToggle,
  child,
  onChildUpdated,
}: Props) {
  const [lang, setLang] = useState<ConsultLang>('ko');
  const slides = firstConsultContent[lang];
  const [idx, setIdx] = useState(0);
  const clamped = Math.min(idx, slides.length - 1);
  const slide = slides[clamped];

  const survey: IntakeSurvey = useMemo(
    () => child.intake_survey ?? DEFAULT_INTAKE_SURVEY,
    [child.intake_survey],
  );

  const handleSurveyPatch = async (patch: Partial<IntakeSurvey>) => {
    try {
      const updated = await updateIntakeSurvey(child.id, patch);
      onChildUpdated(updated);
    } catch {
      /* noop */
    }
  };

  // Keyboard ← / → when expanded and not focused in a form field.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      )
        return;
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight')
        setIdx((i) => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, slides.length]);

  const editorFor = (s: ConsultSlide): ReactNode => {
    if (s.kind !== 'section') return null;
    switch (s.badge) {
      case '01':
        return <IntakeBasicInfoSection child={child} onSaved={onChildUpdated} />;
      case '02':
        return (
          <IntakeGrowthHistoryTable survey={survey} onSave={handleSurveyPatch} />
        );
      case '03':
        return <IntakeFamilySection survey={survey} onSave={handleSurveyPatch} />;
      case '04':
        return (
          <IntakeMedicalSection
            survey={survey}
            defaultGender={child.gender}
            onSave={handleSurveyPatch}
          />
        );
      case '05':
        return <IntakeCausesSection survey={survey} onSave={handleSurveyPatch} />;
      case '06':
        return (
          <IntakeClinicalSection child={child} onChildUpdated={onChildUpdated} />
        );
      default:
        return null;
    }
  };

  return (
    <section
      className={`overflow-hidden rounded-lg border border-emerald-200 bg-white ${
        expanded ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-emerald-900 hover:opacity-90"
        >
          <span className="text-[11px] uppercase tracking-wider text-emerald-700">
            첫 상담 · First Consult
          </span>
          <span className="text-[11px] font-normal text-emerald-700/70">
            {expanded ? '클릭하여 접기' : '클릭하여 펼치기'}
          </span>
        </button>
        {expanded && (
          <>
            <LangToggle lang={lang} onChange={setLang} />
            <span className="text-[11px] tabular-nums text-emerald-800/80">
              {clamped + 1} / {slides.length}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? '접기' : '펼치기'}
          className="h-6 w-6 rounded border border-emerald-200 text-emerald-700 hover:bg-white"
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white to-emerald-50/30">
          {/* Slide stage — one slide fills the available height; inner scroll
              kicks in if the embedded editor pushes beyond the viewport. */}
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <SlideRender slide={slide} lang={lang} editor={editorFor(slide)} />
          </div>
          <DeckNav
            idx={clamped}
            total={slides.length}
            onPrev={() => setIdx((i) => Math.max(0, i - 1))}
            onNext={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
            onJump={setIdx}
          />
        </div>
      )}
    </section>
  );
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: ConsultLang;
  onChange: (next: ConsultLang) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-emerald-300 text-[10px] font-semibold">
      {(['ko', 'en'] as ConsultLang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={
            'px-2 py-0.5 uppercase transition ' +
            (lang === l
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-emerald-700 hover:bg-emerald-50')
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function DeckNav({
  idx,
  total,
  onPrev,
  onNext,
  onJump,
}: {
  idx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between gap-3 border-t border-emerald-100 bg-white/95 px-4 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onPrev}
        disabled={idx === 0}
        className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        ← 이전
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={
              'h-2 rounded-full transition ' +
              (i === idx
                ? 'w-5 bg-emerald-600'
                : 'w-2 bg-slate-300 hover:bg-slate-400')
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={idx === total - 1}
        className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        다음 →
      </button>
    </div>
  );
}

// --------------------------- Slide renderers ---------------------------

function SlideRender({
  slide,
  lang,
  editor,
}: {
  slide: ConsultSlide;
  lang: ConsultLang;
  editor: ReactNode;
}) {
  switch (slide.kind) {
    case 'cover':
      return <CoverSlide slide={slide} />;
    case 'director':
      return <DirectorSlide slide={slide} />;
    case 'hospital':
      return <HospitalSlide slide={slide} />;
    case 'section':
      return <SectionSlide slide={slide} lang={lang} editor={editor} />;
    case 'method':
      return <MethodSlide slide={slide} lang={lang} />;
  }
}

function CoverSlide({ slide }: { slide: Extract<ConsultSlide, { kind: 'cover' }> }) {
  return (
    <div
      className="relative flex min-h-full flex-col justify-between px-16 py-20 text-white"
      style={{ backgroundColor: '#1F4F3C' }}
    >
      <div className="space-y-3">
        <div className="text-xl font-light tracking-wide text-white/85">
          {slide.lineTop}
        </div>
        <h1 className="text-6xl font-bold leading-tight md:text-7xl">
          {slide.title}
        </h1>
      </div>
      <div className="space-y-1 text-base text-white/85">
        <div>{slide.footer1}</div>
        <div className="text-xl font-medium text-white">{slide.footer2}</div>
        <div className="pt-3 text-sm text-white/70">{slide.website}</div>
      </div>
      <div className="absolute right-14 top-14 select-none text-right text-[11px] leading-tight text-white/70">
        <div className="text-base tracking-widest">SAEBOM</div>
        <div>당신의 가치를 더하는</div>
        <div>메디컬 파트너</div>
      </div>
    </div>
  );
}

function DirectorSlide({
  slide,
}: {
  slide: Extract<ConsultSlide, { kind: 'director' }>;
}) {
  return (
    <div className="relative grid min-h-full grid-cols-1 gap-6 px-12 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left column — bio / timeline.
          `md:ml-auto max-w-[560px]` 로 텍스트가 왼쪽 컬럼의 오른쪽에 붙도록 해
          오른쪽 초상화와 함께 화면 가운데로 모이게 한다. */}
      <div className="relative z-10 md:ml-auto md:max-w-[560px]">
        <div
          className="text-5xl font-bold leading-tight md:text-6xl"
          style={{ color: '#1F4F3C' }}
        >
          {slide.title}
        </div>
        <div className="mt-8 space-y-5 text-base">
          {slide.timeline.map((t) => (
            <div key={t.year} className="grid grid-cols-[72px_1fr] gap-4">
              <div className="font-semibold text-emerald-800">{t.year}</div>
              <ul className="space-y-1.5 text-slate-700">
                {t.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-8 list-disc space-y-1.5 pl-6 text-sm text-slate-600">
          {slide.extras.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>

      {/* Right column — portrait hugs the LEFT of its column so the subject
          sits near the page midline (quote now floats over the image from
          the inner edge). */}
      <div className="relative md:max-w-[560px]">
        <img
          src="/first_session/원장님.png"
          alt={slide.footerName}
          className="pointer-events-none absolute inset-y-0 left-24 h-full w-auto max-w-[calc(100%-6rem)] select-none object-contain object-left"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (!el.dataset.fallback) {
              el.dataset.fallback = '1';
              el.src = '/images/doctor.jpg';
            }
          }}
        />
        <div className="relative z-10 flex min-h-[60vh] flex-col justify-between pl-2">
          <blockquote
            className="font-serif text-3xl leading-snug md:text-4xl"
            style={{ color: '#1F4F3C' }}
          >
            <span className="mr-1 text-5xl align-top">“</span>
            {slide.quote}
            <span className="ml-1 text-5xl align-top">”</span>
          </blockquote>
          <div className="self-end text-right text-sm font-semibold text-emerald-900/80">
            {slide.footerName}
          </div>
        </div>
      </div>
    </div>
  );
}

function HospitalSlide({
  slide,
}: {
  slide: Extract<ConsultSlide, { kind: 'hospital' }>;
}) {
  return (
    <div className="min-h-full px-12 py-14">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        187 Growth Clinic
      </div>
      <h2
        className="text-4xl font-bold leading-tight md:text-5xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <p className="mt-6 max-w-4xl text-lg leading-relaxed text-slate-700">
        {slide.lead}
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-base text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50"
          />
        ))}
      </div>
    </div>
  );
}

function SectionSlide({
  slide,
  lang,
  editor,
}: {
  slide: Extract<ConsultSlide, { kind: 'section' }>;
  lang: ConsultLang;
  editor: ReactNode;
}) {
  return (
    <div className="min-h-full px-12 py-10">
      <div className="flex items-baseline gap-4">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ backgroundColor: '#1F4F3C' }}
        >
          {slide.badge}
        </span>
        <h2
          className="text-3xl font-bold leading-tight md:text-4xl"
          style={{ color: '#1F4F3C' }}
        >
          {slide.title}
        </h2>
      </div>
      <p className="mt-6 max-w-4xl text-base leading-relaxed text-slate-700">
        {slide.intro}
      </p>
      {editor && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            {lang === 'ko' ? '직접 입력' : 'Direct input'}
          </div>
          {editor}
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: '#1F4F3C' }}
            />
            <span className="text-sm text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MethodSlide({
  slide,
  lang,
}: {
  slide: Extract<ConsultSlide, { kind: 'method' }>;
  lang: ConsultLang;
}) {
  return (
    <div className="min-h-full px-12 py-14">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-12 items-center rounded-full px-5 text-base font-bold tracking-wide text-white"
          style={{ backgroundColor: '#1F4F3C' }}
        >
          {slide.badge}
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          {slide.subtitle}
        </span>
      </div>
      <h2
        className="mt-4 text-3xl font-bold leading-tight md:text-4xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <div className="mt-8 rounded-2xl border-2 border-emerald-200 bg-white p-7 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {lang === 'ko' ? '공식' : 'Formula'}
        </div>
        <pre className="mt-2 whitespace-pre-wrap text-lg font-semibold leading-relaxed text-slate-900">
          {slide.formula}
        </pre>
        <div className="mt-3 text-sm text-slate-500">{slide.formulaNote}</div>
      </div>
      <ul className="mt-8 space-y-3">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-base text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
