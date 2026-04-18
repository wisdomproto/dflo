import { useMemo, useState, type ReactNode } from 'react';
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
 * 첫 상담 프레젠테이션. 기본 정보 위에 접힌 상태로 상주하며, 펼치면
 * 모든 섹션을 세로 스크롤로 한 번에 보여준다(환자/보호자와 스크롤하며
 * 훑어보는 패턴). 한/영 2 가지 언어를 헤더 토글로 전환한다.
 *
 * 섹션 01~06 은 설명 하단에 실제 Intake 편집 컴포넌트를 끼워넣어 여기서
 * 바로 입력/수정이 가능하다(기본 정보 탭과 동일한 데이터 소스).
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

  const survey: IntakeSurvey = useMemo(
    () => child.intake_survey ?? DEFAULT_INTAKE_SURVEY,
    [child.intake_survey],
  );

  const handleSurveyPatch = async (patch: Partial<IntakeSurvey>) => {
    try {
      const updated = await updateIntakeSurvey(child.id, patch);
      onChildUpdated(updated);
    } catch {
      /* noop — surface via toast when available */
    }
  };

  const editorFor = (slide: ConsultSlide): ReactNode => {
    if (slide.kind !== 'section') return null;
    switch (slide.badge) {
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
        return <IntakeClinicalSection child={child} onChildUpdated={onChildUpdated} />;
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
        {expanded && <LangToggle lang={lang} onChange={setLang} />}
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
        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-emerald-50/30">
          <div className="flex flex-col">
            {slides.map((s, i) => {
              const editor = editorFor(s);
              return (
                <div
                  key={`${lang}-${i}`}
                  className={i === 0 ? '' : 'border-t border-emerald-100'}
                >
                  <SlideRender slide={s} lang={lang} />
                  {editor && (
                    <div className="border-t border-emerald-100 bg-white px-8 py-8 md:px-12">
                      <div className="mx-auto flex max-w-5xl flex-col gap-5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          {lang === 'ko' ? '직접 입력' : 'Direct input'}
                        </div>
                        {editor}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

// --------------------------- Slide renderers ---------------------------
// 각 슬라이드를 세로 스크롤에서 한 화면씩 차지할 수 있도록 큼직하게 렌더.
// 최소 높이는 90vh 로 잡아 "한 화면 = 한 섹션" 느낌을 살린다.

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
      className="relative flex min-h-[90vh] flex-col justify-between px-16 py-20 text-white"
      style={{ backgroundColor: '#1F4F3C' }}
    >
      <div className="space-y-3">
        <div className="text-xl font-light tracking-wide text-white/85">
          {slide.lineTop}
        </div>
        <h1 className="text-6xl font-bold leading-tight md:text-7xl">{slide.title}</h1>
      </div>
      <div className="space-y-1 text-base text-white/85">
        <div>{slide.footer1}</div>
        <div className="text-xl font-medium text-white">{slide.footer2}</div>
        <div className="pt-3 text-sm text-white/70">{slide.website}</div>
      </div>
      {/* subtle brand mark in corner */}
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
    <div className="grid min-h-[90vh] grid-cols-1 gap-10 px-12 py-16 md:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div
          className="text-5xl font-bold leading-tight md:text-6xl"
          style={{ color: '#1F4F3C' }}
        >
          {slide.title}
        </div>
        <div className="mt-10 space-y-5 text-base">
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
        <ul className="mt-10 list-disc space-y-1.5 pl-6 text-sm text-slate-600">
          {slide.extras.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
      <aside className="flex flex-col items-start justify-between rounded-2xl bg-emerald-50 p-8">
        <blockquote
          className="relative font-serif text-3xl leading-snug md:text-4xl"
          style={{ color: '#1F4F3C' }}
        >
          <span className="absolute -left-4 -top-3 text-5xl">“</span>
          {slide.quote}
          <span className="ml-1 text-5xl">”</span>
        </blockquote>
        <div className="mt-8 text-sm text-emerald-900/70">{slide.footerName}</div>
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
    <div className="min-h-[90vh] px-12 py-16">
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
      <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
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
      {/* Placeholder photo strip — 실사진은 admin 에서 R2/Supabase 에 업로드 후 교체 */}
      <div className="mt-12 grid grid-cols-6 gap-3">
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
    <div className="min-h-[90vh] px-12 py-16">
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
      <p className="mt-8 max-w-4xl text-lg leading-relaxed text-slate-700">
        {slide.intro}
      </p>
      <ul className="mt-10 space-y-4">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: '#1F4F3C' }}
            />
            <span className="text-base text-slate-700">{b}</span>
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
    <div className="min-h-[90vh] px-12 py-16">
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
      <ul className="mt-10 space-y-4">
        {slide.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-base text-slate-700">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
