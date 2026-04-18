import { useEffect, useState } from 'react';
import {
  firstConsultContent,
  type ConsultLang,
  type ConsultSlide,
} from './firstConsultContent';

/**
 * 첫 상담 프레젠테이션 덱. 기본 정보 위에 접힌 상태로 상주하며, 펼치면
 * 슬라이드 덱(커버 / 대표원장 / 병원 / 기본정보 1~6 / MPH / PAH) 을 순서대로
 * 넘겨가며 환자와 대면 상담용으로 사용한다. 한/영 2 가지 언어를 지원한다.
 */
interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export function FirstConsultPanel({ expanded, onToggle }: Props) {
  const [lang, setLang] = useState<ConsultLang>('ko');
  const slides = firstConsultContent[lang];
  const [idx, setIdx] = useState(0);
  const clamped = Math.min(idx, slides.length - 1);
  const slide = slides[clamped];

  // Keyboard left/right when expanded for quick slide nav.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, slides.length]);

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
        <div className="relative min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-emerald-50/30">
          <SlideRender slide={slide} lang={lang} />
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
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-emerald-100 bg-white/95 px-4 py-2 backdrop-blur">
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
              'h-2 w-2 rounded-full transition ' +
              (i === idx
                ? 'w-5 bg-emerald-600'
                : 'bg-slate-300 hover:bg-slate-400')
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

function SlideRender({ slide, lang }: { slide: ConsultSlide; lang: ConsultLang }) {
  switch (slide.kind) {
    case 'cover':
      return <CoverSlide slide={slide} />;
    case 'director':
      return <DirectorSlide slide={slide} />;
    case 'hospital':
      return <HospitalSlide slide={slide} />;
    case 'section':
      return <SectionSlide slide={slide} />;
    case 'method':
      return <MethodSlide slide={slide} lang={lang} />;
  }
}

function CoverSlide({ slide }: { slide: Extract<ConsultSlide, { kind: 'cover' }> }) {
  return (
    <div
      className="relative flex min-h-[60vh] flex-col justify-between px-12 py-14 text-white"
      style={{ backgroundColor: '#1F4F3C' }}
    >
      <div className="space-y-2">
        <div className="text-lg font-light tracking-wide text-white/85">
          {slide.lineTop}
        </div>
        <h1 className="text-5xl font-bold leading-tight md:text-6xl">{slide.title}</h1>
      </div>
      <div className="space-y-1 text-[15px] text-white/85">
        <div>{slide.footer1}</div>
        <div className="text-lg font-medium text-white">{slide.footer2}</div>
        <div className="pt-2 text-sm text-white/70">{slide.website}</div>
      </div>
      {/* subtle brand mark in corner */}
      <div className="absolute right-10 top-10 select-none text-right text-[10px] leading-tight text-white/70">
        <div className="text-sm tracking-widest">SAEBOM</div>
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
    <div className="grid grid-cols-1 gap-6 px-8 py-10 md:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div
          className="text-3xl font-bold leading-tight md:text-4xl"
          style={{ color: '#1F4F3C' }}
        >
          {slide.title}
        </div>
        <div className="mt-6 space-y-4 text-sm">
          {slide.timeline.map((t) => (
            <div key={t.year} className="grid grid-cols-[60px_1fr] gap-3">
              <div className="font-semibold text-emerald-800">{t.year}</div>
              <ul className="space-y-1 text-slate-700">
                {t.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-6 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {slide.extras.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
      <aside className="flex flex-col items-start justify-between rounded-2xl bg-emerald-50 p-6">
        <blockquote
          className="relative text-xl font-serif leading-snug md:text-2xl"
          style={{ color: '#1F4F3C' }}
        >
          <span className="absolute -left-3 -top-2 text-3xl">“</span>
          {slide.quote}
          <span className="ml-1 text-3xl">”</span>
        </blockquote>
        <div className="mt-6 text-xs text-emerald-900/70">{slide.footerName}</div>
      </aside>
    </div>
  );
}

function HospitalSlide({
  slide,
}: {
  slide: Extract<ConsultSlide, { kind: 'hospital' }>;
}) {
  return (
    <div className="px-8 py-10">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
        187 Growth Clinic
      </div>
      <h2
        className="text-3xl font-bold leading-tight md:text-4xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        {slide.lead}
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
      {/* Placeholder photo strip — 실사진은 admin 에서 R2/Supabase 에 업로드 후 교체 */}
      <div className="mt-8 grid grid-cols-6 gap-2">
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
}: {
  slide: Extract<ConsultSlide, { kind: 'section' }>;
}) {
  return (
    <div className="px-8 py-10">
      <div className="flex items-baseline gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: '#1F4F3C' }}
        >
          {slide.badge}
        </span>
        <h2
          className="text-2xl font-bold leading-tight md:text-3xl"
          style={{ color: '#1F4F3C' }}
        >
          {slide.title}
        </h2>
      </div>
      <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        {slide.intro}
      </p>
      <ul className="mt-6 space-y-3">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
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
    <div className="px-8 py-10">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold tracking-wide text-white"
          style={{ backgroundColor: '#1F4F3C' }}
        >
          {slide.badge}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {slide.subtitle}
        </span>
      </div>
      <h2
        className="mt-3 text-2xl font-bold leading-tight md:text-3xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          {lang === 'ko' ? '공식' : 'Formula'}
        </div>
        <pre className="mt-1 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-slate-900">
          {slide.formula}
        </pre>
        <div className="mt-2 text-xs text-slate-500">{slide.formulaNote}</div>
      </div>
      <ul className="mt-6 space-y-3">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
