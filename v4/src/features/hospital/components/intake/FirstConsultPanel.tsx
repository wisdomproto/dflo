import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Child, HospitalMeasurement, IntakeSurvey, Visit } from '@/shared/types';
import {
  DEFAULT_INTAKE_SURVEY,
  updateIntakeSurvey,
  updateChildField,
} from '@/features/hospital/services/intakeSurveyService';
import {
  getOrCreateIntakeVisit,
  updateVisit,
} from '@/features/hospital/services/visitService';
import {
  fetchMeasurementsByVisit,
  upsertMeasurementField,
} from '@/features/hospital/services/hospitalMeasurementService';
import { logger } from '@/shared/lib/logger';
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
import { XrayPanel } from '@/features/hospital/components/XrayPanel';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { GrowthChartOverlay } from './GrowthChartOverlay';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';

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

  // Deck-level live X-ray state so slide 10 (X-ray module) can stream the
  // in-progress bone age / PAH to slide 11 (growth chart) without requiring
  // an explicit save first. Cleared when the patient changes.
  const [liveXray, setLiveXray] = useState<{
    boneAge: number | null;
    predictedAdult: number | null;
  }>({ boneAge: null, predictedAdult: null });
  useEffect(() => {
    setLiveXray({ boneAge: null, predictedAdult: null });
  }, [child.id]);

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
    if (s.kind === 'survey-bundle') {
      return (
        <div className="flex flex-col gap-5">
          {/* Current height + date pulled into view at the top so the doctor
              sees the latest measurement without scrolling. Sourced from the
              same is_intake visit that IntakeClinicalSection edits. */}
          <CurrentHeightBlock child={child} onChildUpdated={onChildUpdated} />
          <IntakeBasicInfoSection child={child} onSaved={onChildUpdated} />
          <IntakeGrowthHistoryTable survey={survey} onSave={handleSurveyPatch} />
          <IntakeFamilySection survey={survey} onSave={handleSurveyPatch} />
          <IntakeMedicalSection
            survey={survey}
            defaultGender={child.gender}
            onSave={handleSurveyPatch}
          />
          <IntakeCausesSection survey={survey} onSave={handleSurveyPatch} />
        </div>
      );
    }
    if (s.kind !== 'section') return null;
    switch (s.badge) {
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
            <SlideRender
              slide={slide}
              lang={lang}
              editor={editorFor(slide)}
              child={child}
              onChildUpdated={onChildUpdated}
              liveXray={liveXray}
              onLiveXrayChange={setLiveXray}
            />
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

type LiveXray = {
  boneAge: number | null;
  predictedAdult: number | null;
};

function SlideRender({
  slide,
  lang,
  editor,
  child,
  onChildUpdated,
  liveXray,
  onLiveXrayChange,
}: {
  slide: ConsultSlide;
  lang: ConsultLang;
  editor: ReactNode;
  child: Child;
  onChildUpdated: (child: Child) => void;
  liveXray: LiveXray;
  onLiveXrayChange: (next: LiveXray) => void;
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
    case 'survey-bundle':
      return <SurveyBundleSlide slide={slide} lang={lang} editor={editor} />;
    case 'method':
      return <MethodSlide slide={slide} lang={lang} />;
    case 'methods-comparison':
      return <MethodsComparisonSlide slide={slide} lang={lang} />;
    case 'mph-distribution':
      return <MPHDistributionSlide slide={slide} child={child} />;
    case 'xray-module':
      return (
        <XrayModuleSlide
          slide={slide}
          child={child}
          onChildUpdated={onChildUpdated}
          liveXray={liveXray}
          onLiveXrayChange={onLiveXrayChange}
        />
      );
    case 'growth-chart-module':
      return (
        <GrowthChartModuleSlide
          slide={slide}
          child={child}
          onChildUpdated={onChildUpdated}
          liveXray={liveXray}
        />
      );
  }
}

/**
 * Gaussian distribution slide for MPH. Draws a normal curve centered on
 * the computed MPH with σ = 2.5 cm (one inch ≈ 2.54 cm — matches the
 * Korean growth-literature convention of the "±1 inch" rule). Regions
 * are colored by their probability mass:
 *   center (±1σ)  = 68 %   → light blue
 *   ±1σ to ±2σ    = 14 %   → royal blue (each side)
 *   beyond ±2σ    =  2 %   → magenta (each tail)
 */
function MPHDistributionSlide({
  slide,
  child,
}: {
  slide: Extract<ConsultSlide, { kind: 'mph-distribution' }>;
  child: Child;
}) {
  const father = child.father_height ?? null;
  const mother = child.mother_height ?? null;
  const genderAdj = child.gender === 'male' ? 6.5 : -6.5;
  const hasHeights = father != null && mother != null;
  const mph = hasHeights ? (father! + mother!) / 2 + genderAdj : null;
  const sd = 2.5; // 1 inch ≈ 2.54 cm
  const signLabel = genderAdj > 0 ? '+ 6.5' : '- 6.5';

  return (
    <div className="flex h-full min-h-0 flex-col px-8 py-6">
      <h2
        className="shrink-0 text-xl font-bold leading-tight md:text-2xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <p className="mt-1 max-w-4xl shrink-0 text-xs leading-snug text-slate-600">
        {slide.caption}
      </p>

      {/* Formula line at top — matches the reference brochure layout */}
      <div
        className="mt-3 shrink-0 text-lg font-semibold md:text-xl"
        style={{ color: '#111' }}
      >
        {hasHeights ? (
          <>
            MPH : ({father} + {mother}) / 2 {signLabel} ={' '}
            <span style={{ color: '#1F4F3C' }}>{mph!.toFixed(1)} cm</span>
          </>
        ) : (
          <span className="text-slate-400">
            부모 키(father · mother)를 입력하면 MPH 가 계산됩니다.
          </span>
        )}
      </div>

      {/* The gaussian graphic — fills remaining vertical space */}
      <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
        <GaussianChart mph={mph} sd={sd} />
      </div>
    </div>
  );
}

/**
 * SVG-rendered bell curve with ±1σ / ±2σ shading, center & side lines,
 * and x-axis tick labels at MPH ± 2.5 and MPH ± 5.
 *
 * Math: pdf(z) = exp(-z²/2) / (σ√2π)
 * Peak when σ = 2.5 → 1/(2.5·2.507) ≈ 0.160, so scaling to 16 on the
 * y-axis gives a natural "percent within two inches" reading.
 */
function GaussianChart({ mph, sd }: { mph: number | null; sd: number }) {
  // Chart dimensions
  const W = 960;
  const H = 440;
  const PAD = { top: 20, right: 40, bottom: 60, left: 64 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  // x-range = MPH ± 4σ (same visual extent as the brochure example)
  const xRange = 4 * sd;
  // Use a dummy center when MPH is unknown, just for axis layout
  const center = mph ?? 0;
  const xMin = center - xRange;
  const xMax = center + xRange;
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;

  // y-axis: percent within 2 inches — peak ≈ 16
  const yMax = 16;
  const sy = (y: number) => PAD.top + ph - (y / yMax) * ph;

  const N = 240;
  const pdf = (x: number) => {
    const z = (x - center) / sd;
    return (Math.exp((-z * z) / 2) / (sd * Math.sqrt(2 * Math.PI))) * 100;
  };

  // Sample points along x for the curve
  const points = Array.from({ length: N + 1 }, (_, i) => {
    const x = xMin + (i / N) * (xMax - xMin);
    return { x, y: pdf(x) };
  });

  // Build a filled-region polygon for a [xa, xb] band under the curve.
  const regionPath = (xa: number, xb: number): string => {
    const segment = points.filter((p) => p.x >= xa && p.x <= xb);
    if (segment.length < 2) return '';
    const parts: string[] = [];
    parts.push(`M ${sx(xa).toFixed(2)} ${sy(0).toFixed(2)}`);
    parts.push(`L ${sx(xa).toFixed(2)} ${sy(pdf(xa)).toFixed(2)}`);
    for (const p of segment) {
      parts.push(`L ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`);
    }
    parts.push(`L ${sx(xb).toFixed(2)} ${sy(pdf(xb)).toFixed(2)}`);
    parts.push(`L ${sx(xb).toFixed(2)} ${sy(0).toFixed(2)}`);
    parts.push('Z');
    return parts.join(' ');
  };

  // Outline of the curve
  const curvePath = points
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`,
    )
    .join(' ');

  const regions = [
    { from: xMin, to: center - 2 * sd, color: '#E636A4', label: '2%' }, // left tail
    { from: center - 2 * sd, to: center - sd, color: '#1F4FE8', label: '14%' }, // left mid
    { from: center - sd, to: center + sd, color: '#3AA0FF', label: '68%' }, // center
    { from: center + sd, to: center + 2 * sd, color: '#1F4FE8', label: '14%' }, // right mid
    { from: center + 2 * sd, to: xMax, color: '#E636A4', label: '2%' }, // right tail
  ];

  // Label positions for % tags inside regions
  const regionLabels = regions.map((r) => ({
    ...r,
    mid: (r.from + r.to) / 2,
  }));

  const verticalLinesX = [center - sd, center, center + sd];

  const xTicks = mph != null
    ? [
        { x: mph - 5, label: (mph - 5).toFixed(0), emphasize: false },
        { x: mph - 2.5, label: (mph - 2.5).toFixed(1), emphasize: false },
        { x: mph, label: mph.toFixed(1), emphasize: true },
        { x: mph + 2.5, label: (mph + 2.5).toFixed(1), emphasize: false },
        { x: mph + 5, label: (mph + 5).toFixed(0), emphasize: false },
      ]
    : [];

  const yTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full max-h-full select-none"
    >
      {/* y-axis label (rotated) */}
      <text
        x={16}
        y={PAD.top + ph / 2}
        transform={`rotate(-90 16 ${PAD.top + ph / 2})`}
        textAnchor="middle"
        className="fill-slate-700"
        fontSize={14}
      >
        Percent within two inches
      </text>

      {/* y-axis ticks and gridlines */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={sy(t)}
            y2={sy(t)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={sy(t) + 4}
            textAnchor="end"
            fontSize={12}
            className="fill-slate-500"
          >
            {t}
          </text>
        </g>
      ))}

      {/* Filled regions (colored bands under the curve) */}
      {regions.map((r, i) => (
        <path
          key={i}
          d={regionPath(r.from, r.to)}
          fill={r.color}
          opacity={0.9}
        />
      ))}

      {/* Curve outline (thin dark red line, like the reference) */}
      <path d={curvePath} fill="none" stroke="#c62828" strokeWidth={1.2} />

      {/* Vertical orange lines at -1σ, 0, +1σ */}
      {verticalLinesX.map((vx, i) => (
        <line
          key={i}
          x1={sx(vx)}
          x2={sx(vx)}
          y1={PAD.top}
          y2={PAD.top + ph}
          stroke="#F59E0B"
          strokeWidth={3}
        />
      ))}

      {/* Percentage labels inside each region */}
      {regionLabels.map((r, i) => {
        // Position labels vertically: center in middle of the 68% mass,
        // side/tail labels near the x-axis for readability.
        const isCenter = i === 2;
        const ly = isCenter ? sy(7) : sy(1.5);
        const big = isCenter;
        return (
          <text
            key={i}
            x={sx(r.mid)}
            y={ly}
            textAnchor="middle"
            fontSize={big ? 44 : 22}
            className="fill-white"
            style={{ fontWeight: 600 }}
          >
            {r.label}
          </text>
        );
      })}

      {/* x-axis line */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={sy(0)}
        y2={sy(0)}
        stroke="#334155"
        strokeWidth={1.25}
      />

      {/* x-axis tick labels at MPH (center) · MPH ±2.5 · MPH ±5 */}
      {xTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={sx(t.x)}
            x2={sx(t.x)}
            y1={sy(0)}
            y2={sy(0) + (t.emphasize ? 9 : 6)}
            stroke={t.emphasize ? '#F59E0B' : '#334155'}
            strokeWidth={t.emphasize ? 1.5 : 1}
          />
          <text
            x={sx(t.x)}
            y={sy(0) + (t.emphasize ? 26 : 22)}
            textAnchor="middle"
            fontSize={t.emphasize ? 18 : 14}
            style={{ fontWeight: t.emphasize ? 700 : 400 }}
            fill={t.emphasize ? '#D97706' : '#334155'}
          >
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Uses the shared is_intake visit (same as CurrentHeightBlock + section
 * 06 / 기본 정보 탭) so all bone-age edits made on this slide flow through
 * to the rest of the deck and the admin clinical views.
 */
function useIntakeVisitAndMeasurement(childId: string) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [measurement, setMeasurement] = useState<HospitalMeasurement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const v = await getOrCreateIntakeVisit(childId, today);
        if (cancelled) return;
        setVisit(v);
        const ms = await fetchMeasurementsByVisit(v.id);
        if (cancelled) return;
        setMeasurement(ms[0] ?? null);
      } catch (e) {
        logger.error('intake visit fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const refreshMeasurement = useCallback(async () => {
    if (!visit) return;
    try {
      const ms = await fetchMeasurementsByVisit(visit.id);
      setMeasurement(ms[0] ?? null);
    } catch (e) {
      logger.error('measurement refresh failed', e);
    }
  }, [visit]);

  return { visit, measurement, loading, refreshMeasurement };
}

function XrayModuleSlide({
  slide,
  child,
  onChildUpdated,
  liveXray,
  onLiveXrayChange,
}: {
  slide: Extract<ConsultSlide, { kind: 'xray-module' }>;
  child: Child;
  onChildUpdated: (child: Child) => void;
  liveXray: LiveXray;
  onLiveXrayChange: (next: LiveXray) => void;
}) {
  const { visit, measurement, loading, refreshMeasurement } =
    useIntakeVisitAndMeasurement(child.id);

  if (loading || !visit) {
    return (
      <div className="px-10 py-6 text-sm text-slate-400">
        X-ray 모듈을 불러오는 중…
      </div>
    );
  }

  // CA pulled from birth date + visit date; current height from slide 5;
  // BA + predicted adult prefer live values (from XrayPanel) and fall
  // back to the saved measurement row.
  const ca = calculateAgeAtDate(child.birth_date, new Date(visit.visit_date))
    .decimal;
  const currentHeight = measurement?.height ?? null;
  const effectiveBA = liveXray.boneAge ?? measurement?.bone_age ?? null;
  const effectivePAH =
    liveXray.predictedAdult ??
    (currentHeight != null && effectiveBA != null
      ? predictAdultHeightByBonePercentile(
          currentHeight,
          effectiveBA,
          child.gender === 'male' ? 'M' : 'F',
          child.nationality ?? 'KR',
        )
      : null);

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4">
      <h2
        className="shrink-0 text-lg font-bold leading-tight md:text-xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      {slide.caption && (
        <p className="mt-1 max-w-4xl shrink-0 text-[11px] leading-snug text-slate-600">
          {slide.caption}
        </p>
      )}
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Stat label="CA · 현재 나이" value={`${ca.toFixed(1)}세`} />
        <Stat
          label="현재 키"
          value={currentHeight != null ? `${currentHeight} cm` : '— 첫 페이지에서 입력'}
        />
        <Stat
          label="BA · 뼈나이"
          value={effectiveBA != null ? `${effectiveBA.toFixed(1)}세` : '—'}
        />
        <Stat
          label="PAH · 예측 성인키"
          value={effectivePAH != null ? `${effectivePAH.toFixed(1)} cm` : '—'}
          accent
        />
      </div>
      <div className="mt-2 flex min-h-0 flex-1 items-start justify-center rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
        <div className="w-full max-w-[880px]">
          <XrayPanel
            child={child}
            visit={visit}
            measurements={measurement ? [measurement] : []}
            collapsed={false}
            onToggleCollapse={() => {
              /* no-op — no collapse inside slide */
            }}
            onSaved={refreshMeasurement}
            embedded
            onLiveChange={onLiveXrayChange}
            onNationalityChange={async (next) => {
              try {
                const updated = await updateChildField(child.id, {
                  nationality: next,
                });
                onChildUpdated(updated);
              } catch {
                /* noop */
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function GrowthChartModuleSlide({
  slide,
  child,
  onChildUpdated,
  liveXray,
}: {
  slide: Extract<ConsultSlide, { kind: 'growth-chart-module' }>;
  child: Child;
  onChildUpdated: (child: Child) => void;
  liveXray: LiveXray;
}) {
  const { visit, measurement, loading } = useIntakeVisitAndMeasurement(
    child.id,
  );

  // 슬라이드 5 에서 기록된 현재 키/측정일 + 슬라이드 10 에서 측정한 뼈나이를
  // 한 줄 요약으로 헤더 아래에 노출. 같은 is_intake visit 에 저장되므로
  // 자동으로 동기화된다. 아직 저장되지 않은 live BA(슬라이드 10 에서 스텝 중)
  // 가 있으면 그걸로 fallback 해서 그래프에도 바로 반영한다.
  const ca =
    visit && measurement?.height
      ? calculateAgeAtDate(child.birth_date, new Date(visit.visit_date)).decimal
      : null;
  const ba = liveXray.boneAge ?? measurement?.bone_age ?? null;
  const predictedAdult =
    measurement?.height && ba != null
      ? predictAdultHeightByBonePercentile(
          measurement.height,
          ba,
          child.gender === 'male' ? 'M' : 'F',
          child.nationality ?? 'KR',
        )
      : null;

  // 차트에 넘기는 measurement 는 live BA 를 우선 반영하도록 합성.
  // AdminPatientGrowthChart 는 measurement.bone_age 를 보고 BA 예측 곡선을
  // 그리기 때문에 여기서 bone_age 를 채워주면 저장 전에도 곡선이 나타난다.
  const effectiveMeasurement: HospitalMeasurement | null = measurement
    ? { ...measurement, bone_age: ba ?? undefined }
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4">
      <h2
        className="shrink-0 text-lg font-bold leading-tight md:text-xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      {slide.caption && (
        <p className="mt-1 max-w-4xl shrink-0 text-[11px] leading-snug text-slate-600">
          {slide.caption}
        </p>
      )}
      {!loading && (
        <>
          <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <Stat label="CA · 현재 나이" value={ca != null ? `${ca.toFixed(1)}세` : '—'} />
            <Stat
              label="현재 키"
              value={measurement?.height ? `${measurement.height} cm` : '— 5페이지에서 입력'}
            />
            <Stat
              label="BA · 뼈나이"
              value={ba != null ? `${ba.toFixed(1)}세` : '— 10페이지에서 측정'}
            />
            <Stat
              label="PAH · 예측 성인키"
              value={predictedAdult != null ? `${predictedAdult.toFixed(1)} cm` : '—'}
              accent
            />
          </div>
          {(!measurement?.height || ba == null) && (
            <div className="mt-1 shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800 ring-1 ring-amber-200">
              {!measurement?.height && !ba
                ? '현재 키(5페이지)와 뼈나이(10페이지)를 입력하면 뼈나이 기반 예측 곡선이 그려집니다.'
                : !measurement?.height
                  ? '현재 키가 없어 예측 곡선을 그릴 수 없습니다 (5페이지에서 입력).'
                  : '뼈나이가 없어 예측 곡선을 그릴 수 없습니다 (10페이지에서 측정).'}
            </div>
          )}
        </>
      )}
      <div className="relative mt-2 min-h-0 flex-1 rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-400">성장 그래프 불러오는 중…</div>
        ) : (
          <>
            <AdminPatientGrowthChart
              child={child}
              measurements={effectiveMeasurement ? [effectiveMeasurement] : []}
              selectedVisitId={visit?.id ?? null}
              onNationalityChange={async (next) => {
                try {
                  const updated = await updateChildField(child.id, {
                    nationality: next,
                  });
                  onChildUpdated(updated);
                } catch {
                  /* noop */
                }
              }}
            />
            {/* 우하단에 CA/BA/PAH 드래그·리사이즈 가능한 텍스트 박스. live BA
                가 있으면 우선 반영. */}
            <GrowthChartOverlay
              child={child}
              measurement={effectiveMeasurement}
              referenceDate={visit?.visit_date ?? ''}
              liveBoneAge={liveXray.boneAge}
              livePredictedAdult={liveXray.predictedAdult}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        'inline-flex items-baseline gap-1 rounded-lg px-2.5 py-1 ' +
        (accent
          ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
          : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200')
      }
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function MethodsComparisonSlide({
  slide,
  lang,
}: {
  slide: Extract<ConsultSlide, { kind: 'methods-comparison' }>;
  lang: ConsultLang;
}) {
  return (
    <div className="min-h-full px-10 py-12">
      <h2
        className="text-3xl font-bold leading-tight md:text-4xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-700">
        {slide.intro}
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {slide.methods.map((m) => (
          <div
            key={m.badge}
            className="flex flex-col rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold tracking-wide text-white"
                style={{ backgroundColor: '#1F4F3C' }}
              >
                {m.badge}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {m.subtitle}
              </span>
            </div>
            <h3
              className="mt-3 text-2xl font-bold leading-tight"
              style={{ color: '#1F4F3C' }}
            >
              {m.title}
            </h3>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                {lang === 'ko' ? '공식' : 'Formula'}
              </div>
              <pre className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900">
                {m.formula}
              </pre>
              <div className="mt-2 text-xs text-slate-500">{m.formulaNote}</div>
            </div>
            <ul className="mt-4 space-y-2">
              {m.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveyBundleSlide({
  slide,
  lang,
  editor,
}: {
  slide: Extract<ConsultSlide, { kind: 'survey-bundle' }>;
  lang: ConsultLang;
  editor: ReactNode;
}) {
  return (
    <div className="min-h-full px-12 py-10">
      <h2
        className="text-3xl font-bold leading-tight md:text-4xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <p className="mt-4 max-w-4xl text-base leading-relaxed text-slate-700">
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
    </div>
  );
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
  // h-full (not min-h-full) so the slide is exactly the height of its
  // scrollable parent — this lets max-h-full on the image actually clamp
  // it to the slide's remaining vertical space and avoids the scroll.
  return (
    <div className="flex h-full min-h-0 flex-col px-10 py-6">
      <h2
        className="shrink-0 text-2xl font-bold leading-tight md:text-3xl"
        style={{ color: '#1F4F3C' }}
      >
        {slide.title}
      </h2>
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
        <img
          src={encodeURI(slide.image)}
          alt={slide.title}
          className="block max-h-full max-w-full rounded-lg object-contain shadow-sm"
        />
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

/**
 * Compact "current height + date" block pinned at the top of the survey
 * bundle slide. Reads and writes the same is_intake visit + measurement
 * that IntakeClinicalSection uses, so edits here flow through to the 기본
 * 정보 tab and the clinical section 06 slide automatically.
 *
 * Controlled inputs keep the displayed value in sync with the DB round-trip
 * and a tiny status indicator shows save progress so the doctor knows the
 * number made it to the server.
 */
function CurrentHeightBlock({
  child,
  onChildUpdated,
}: {
  child: Child;
  onChildUpdated: (child: Child) => void;
}) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [measurement, setMeasurement] = useState<HospitalMeasurement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  // Silence the "saved" pill after a moment.
  useEffect(() => {
    if (status !== 'saved') return;
    const t = window.setTimeout(() => setStatus('idle'), 1500);
    return () => window.clearTimeout(t);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const v = await getOrCreateIntakeVisit(child.id, today);
        if (cancelled) return;
        setVisit(v);
        setDateInput(v.visit_date);
        const ms = await fetchMeasurementsByVisit(v.id);
        if (cancelled) return;
        const first = ms[0] ?? null;
        setMeasurement(first);
        setHeightInput(first?.height != null ? String(first.height) : '');
      } catch (e) {
        logger.error('current-height block load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  // Notify parent after every save so the rest of the deck / admin page
  // can re-read. We touch the child reference (without mutation) which is
  // what parent's setChild consumer expects.
  const bumpParent = useCallback(() => {
    onChildUpdated({ ...child });
  }, [child, onChildUpdated]);

  const saveDate = useCallback(
    async (newDate: string) => {
      if (!visit) return;
      setStatus('saving');
      try {
        const next = await updateVisit(visit.id, { visit_date: newDate });
        setVisit(next);
        const updated = await upsertMeasurementField({
          visit_id: next.id,
          child_id: child.id,
          measured_date: newDate,
          patch: {},
        });
        setMeasurement(updated);
        bumpParent();
        setStatus('saved');
      } catch (e) {
        logger.error('current-height date save failed', e);
        setStatus('error');
      }
    },
    [visit, child.id, bumpParent],
  );

  const saveHeight = useCallback(
    async (v: number | null) => {
      if (!visit) return;
      setStatus('saving');
      try {
        const next = await upsertMeasurementField({
          visit_id: visit.id,
          child_id: child.id,
          measured_date: visit.visit_date,
          patch: { height: v ?? undefined },
        });
        setMeasurement(next);
        setHeightInput(next?.height != null ? String(next.height) : '');
        bumpParent();
        setStatus('saved');
      } catch (e) {
        logger.error('current-height save failed', e);
        setStatus('error');
      }
    },
    [visit, child.id, bumpParent],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-400">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
          현재 키 · Current Height
        </div>
        <SaveStatus status={status} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <span>측정일 · Measured Date</span>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            onBlur={() => {
              if (dateInput && dateInput !== visit?.visit_date) {
                saveDate(dateInput);
              }
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <span>현재 키 (cm) · Current Height</span>
          <input
            type="number"
            step={0.1}
            value={heightInput}
            onChange={(e) => setHeightInput(e.target.value)}
            onBlur={() => {
              const t = heightInput.trim();
              const parsed = t === '' ? null : Number(t);
              if (parsed !== null && Number.isNaN(parsed)) return;
              const cur = measurement?.height ?? null;
              if (parsed !== cur) saveHeight(parsed);
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="예: 158.4"
          />
        </label>
      </div>
    </div>
  );
}

function SaveStatus({
  status,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
}) {
  if (status === 'idle') return null;
  const map = {
    saving: { text: '저장 중…', bg: 'bg-slate-100', fg: 'text-slate-600' },
    saved: { text: '✓ 저장됨', bg: 'bg-emerald-100', fg: 'text-emerald-800' },
    error: { text: '저장 실패', bg: 'bg-red-100', fg: 'text-red-700' },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.fg}`}>
      {s.text}
    </span>
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
