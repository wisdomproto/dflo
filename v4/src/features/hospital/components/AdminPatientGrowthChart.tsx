// Growth chart for the admin patient detail page.
// KDCA 2017 percentile curves (rendered dim) + accumulated visit points.
// When a visit is selected, draws TWO projection paths from that point:
//   • BA-based — same percentile at bone age, ends at chrono age (CA + 18-BA)
//   • CA-based — same percentile at chrono age, ends at age 18

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartDataset,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  getHeightStandard,
  heightAtSamePercentile,
  type Nationality,
} from '@/features/bone-age/lib/growthStandard';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { ZoomModal } from '@/shared/components/ZoomModal';
import type { Child, HospitalMeasurement } from '@/shared/types';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Filler);

type LineDataset = ChartDataset<'line', { x: number; y: number }[]>;

const X_MIN = 5;
const X_MAX = 18;
const Y_MIN = 90;
const Y_MAX = 185;

const COLORS = {
  // Percentile curves rendered with low opacity for less visual noise.
  p3: 'rgba(59, 130, 246, 0.4)',
  p15: 'rgba(245, 158, 11, 0.4)',
  p50: 'rgba(34, 197, 94, 0.4)',
  p85: 'rgba(239, 68, 68, 0.4)',
  p97: 'rgba(168, 85, 247, 0.4)',
  patient: '#0f172a',
  baProj: '#6366f1', // indigo — bone-age projection
  caProj: '#0d9488', // teal — chronologic-age projection
  desired: '#9333ea',
};

const PERCENTILE_LEGEND = [
  { key: 'p3', label: '3rd', color: COLORS.p3 },
  { key: 'p15', label: '15th', color: COLORS.p15 },
  { key: 'p50', label: '50th', color: COLORS.p50 },
  { key: 'p85', label: '85th', color: COLORS.p85 },
  { key: 'p97', label: '97th', color: COLORS.p97 },
];

type ToggleKey = 'boneAge' | 'baProj' | 'caProj' | 'desired';

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
  selectedVisitId?: string | null;
  /** Optional callback invoked when the user changes the nationality via
   *  the in-chart toggle. If provided, the parent should persist the change
   *  back to the children record so all other views stay in sync. */
  onNationalityChange?: (next: Nationality) => void;
  /** Patient-facing simplified mode: forces baOnly=true, hides the toggle
   *  legend / nationality switch, makes the chart click-selectable, and
   *  shows a compact line above the chart with the selected visit's
   *  BA-based predicted adult height. */
  simplified?: boolean;
  /** Called when the user clicks a measurement point. Useful in simplified
   *  mode where the parent doesn't already track a selected visit. */
  onVisitSelect?: (visitId: string) => void;
}

function buildProjection(
  startCA: number,
  startH: number,
  startReference: number, // BA or CA — the percentile reference age
  gender: 'male' | 'female',
  nationality: Nationality,
): { x: number; y: number }[] | null {
  if (startReference >= 18) return null;
  // Always extend the projection to the chart's right edge (X_MAX) so the
  // dashed curve visually terminates at CA=18. Beyond the point where the
  // reference age (BA or CA) hits 18, the height plateaus at the predicted
  // adult value — modeling growth-plate closure without leaving a visual gap
  // between the projection and the chart boundary.
  const points: { x: number; y: number }[] = [
    { x: Number(startCA.toFixed(2)), y: startH },
  ];
  const firstInt = Math.ceil(startCA + 0.0001);
  for (let yr = firstInt; yr <= X_MAX; yr++) {
    const refAtYr = Math.min(18, startReference + (yr - startCA));
    const y = heightAtSamePercentile(startH, startReference, refAtYr, gender, nationality);
    if (y > 0) points.push({ x: yr, y: Number(y.toFixed(1)) });
  }
  // Clamp the final point at CA=X_MAX to the predicted adult height (same-
  // percentile at reference age 18) so the dashed curve visually terminates
  // on the solid horizontal "adult" line. For delayed-BA patients (BA < CA),
  // refAtYr doesn't reach 18 within the chart, which otherwise leaves a gap
  // between the curve endpoint and the adult line.
  const adult = heightAtSamePercentile(startH, startReference, 18, gender, nationality);
  if (adult > 0 && points.length > 0) {
    const last = points[points.length - 1];
    if (last.x === X_MAX) {
      last.y = Number(adult.toFixed(1));
    } else {
      points.push({ x: X_MAX, y: Number(adult.toFixed(1)) });
    }
  }
  return points.length >= 2 ? points : null;
}

export function AdminPatientGrowthChart({
  child,
  measurements,
  selectedVisitId: controlledSelectedVisitId,
  onNationalityChange,
  simplified = false,
  onVisitSelect,
}: Props) {
  const [visible, setVisible] = useState<Record<ToggleKey, boolean>>({
    boneAge: true,
    baProj: true,
    caProj: false,
    desired: true,
  });
  // When true, patient data points are limited to visits that also had a BA
  // reading — useful when the clinic sees the child monthly and the chart gets
  // too crowded to read the long-term trend.
  const [baOnly, setBaOnly] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // Simplified (patient) mode keeps its own selection state so the parent
  // doesn't have to wire up controlled selection. Default selection in
  // simplified mode = the latest BA-measured visit, so the projection curve
  // shows up immediately without an extra click.
  const [internalSelectedVisitId, setInternalSelectedVisitId] = useState<string | null>(() => {
    if (!simplified) return null;
    const latestBa = [...measurements]
      .filter((m) => m.bone_age != null && typeof m.height === 'number' && m.height > 0)
      .sort(
        (a, b) =>
          new Date(b.measured_date).getTime() - new Date(a.measured_date).getTime(),
      )[0];
    return latestBa?.visit_id ?? null;
  });
  const selectedVisitId = controlledSelectedVisitId ?? internalSelectedVisitId;
  const effectiveBaOnly = simplified ? true : baOnly;
  const nationality: Nationality = child.nationality ?? 'KR';

  const sortedMeasurements = useMemo(
    () =>
      [...measurements]
        .filter((m) => typeof m.height === 'number' && m.height > 0)
        .sort(
          (a, b) =>
            new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime(),
        ),
    [measurements],
  );

  const latest = sortedMeasurements.at(-1) ?? null;
  const boneAge = latest?.bone_age ?? null;
  const desired = child.desired_height ?? null;

  const selectedMeas = useMemo(
    () => sortedMeasurements.find((m) => m.visit_id === selectedVisitId) ?? null,
    [sortedMeasurements, selectedVisitId],
  );
  const selectedAge = selectedMeas
    ? calculateAgeAtDate(child.birth_date, new Date(selectedMeas.measured_date)).decimal
    : null;

  const baProjection = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    const startBA = selectedMeas.bone_age;
    if (startBA == null) return null;
    return buildProjection(selectedAge, selectedMeas.height!, startBA, child.gender, nationality);
  }, [selectedMeas, selectedAge, child.gender, nationality]);

  const caProjection = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    return buildProjection(selectedAge, selectedMeas.height!, selectedAge, child.gender, nationality);
  }, [selectedMeas, selectedAge, child.gender, nationality]);

  const baAdult = useMemo(() => {
    if (!selectedMeas || selectedAge == null || selectedMeas.bone_age == null) return null;
    return Number(
      heightAtSamePercentile(selectedMeas.height!, selectedMeas.bone_age, 18, child.gender, nationality).toFixed(1),
    );
  }, [selectedMeas, selectedAge, child.gender, nationality]);

  const caAdult = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    return Number(
      heightAtSamePercentile(selectedMeas.height!, selectedAge, 18, child.gender, nationality).toFixed(1),
    );
  }, [selectedMeas, selectedAge, child.gender, nationality]);

  const toggles: Array<{
    key: ToggleKey;
    label: string;
    color: string;
    value: string | null;
  }> = [
    {
      key: 'boneAge',
      label: 'BA',
      color: '#0f172a',
      value: boneAge != null ? boneAge.toFixed(1) : null,
    },
    {
      key: 'baProj',
      label: 'BA 예측',
      color: COLORS.baProj,
      value: baAdult != null ? `${baAdult}` : null,
    },
    {
      key: 'caProj',
      label: 'CA 예측',
      color: COLORS.caProj,
      value: caAdult != null ? `${caAdult}` : null,
    },
    {
      key: 'desired',
      label: '희망',
      color: COLORS.desired,
      value: desired != null ? `${desired}` : null,
    },
  ];

  const chartData = useMemo(() => {
    const standard = getHeightStandard(child.gender, nationality);
    const stdFiltered = standard.filter((d) => d.age >= X_MIN && d.age <= X_MAX);
    const toXY = (pick: (d: (typeof stdFiltered)[number]) => number) =>
      stdFiltered.map((d) => ({ x: d.age, y: pick(d) }));

    const percentileDatasets: LineDataset[] = PERCENTILE_LEGEND.map(({ key, color }) => ({
      label: key,
      data: toXY((d) => d[key as keyof (typeof stdFiltered)[number]] as number),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0.35,
      order: 3,
    }));

    const refDatasets: LineDataset[] = [];

    const PROJ_DURATION = 700;
    const ADULT_LINE_DURATION = 600;
    // Per-dataset animation that fans the projection out from its first
    // point's pixel — safe because it's scoped to projection datasets only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projAnimation = (label: string): any => ({
      duration: PROJ_DURATION,
      x: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: (ctx: any) => {
          const ds = ctx.chart?.data?.datasets?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (d: any) => d.label === label,
          );
          if (ds?.data?.length && ctx.chart?.scales?.x) {
            return ctx.chart.scales.x.getPixelForValue(
              (ds.data[0] as { x: number }).x,
            );
          }
          return ctx.chart?.chartArea?.left ?? 0;
        },
      },
      y: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: (ctx: any) => {
          const ds = ctx.chart?.data?.datasets?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (d: any) => d.label === label,
          );
          if (ds?.data?.length && ctx.chart?.scales?.y) {
            return ctx.chart.scales.y.getPixelForValue(
              (ds.data[0] as { y: number }).y,
            );
          }
          return ctx.chart?.chartArea?.bottom ?? 0;
        },
      },
    });

    // Adult line: starts from the chart's right edge and sweeps leftward
    // *after* the projection animation finishes. Both endpoints share the
    // same starting x-pixel (chartArea.right); during tween the right point
    // stays put while the left point travels to X_MIN, producing a clean
    // right→left reveal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adultLineAnimation = (): any => ({
      duration: ADULT_LINE_DURATION,
      delay: PROJ_DURATION,
      x: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: (ctx: any) => ctx.chart?.chartArea?.right ?? 0,
      },
    });

    if (visible.baProj && baProjection) {
      refDatasets.push({
        label: 'baProjection',
        data: baProjection,
        borderColor: COLORS.baProj,
        backgroundColor: COLORS.baProj,
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: baProjection.map((_, i) => (i === 0 ? 0 : 4)),
        pointHoverRadius: 6,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        tension: 0,
        order: 1,
        animation: projAnimation('baProjection'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // Solid horizontal at projected adult height
      if (baAdult != null) {
        refDatasets.push({
          label: 'baAdultLine',
          data: [
            { x: X_MIN, y: baAdult },
            { x: X_MAX, y: baAdult },
          ],
          borderColor: COLORS.baProj,
          borderWidth: 1.25,
          pointRadius: 0,
          tension: 0,
          order: 5,
          animation: adultLineAnimation(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }

    if (visible.caProj && caProjection) {
      refDatasets.push({
        label: 'caProjection',
        data: caProjection,
        borderColor: COLORS.caProj,
        backgroundColor: COLORS.caProj,
        borderWidth: 2,
        borderDash: [2, 4],
        pointRadius: caProjection.map((_, i) => (i === 0 ? 0 : 4)),
        pointHoverRadius: 6,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        tension: 0,
        order: 1,
        animation: projAnimation('caProjection'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // Solid horizontal at projected adult height
      if (caAdult != null) {
        refDatasets.push({
          label: 'caAdultLine',
          data: [
            { x: X_MIN, y: caAdult },
            { x: X_MAX, y: caAdult },
          ],
          borderColor: COLORS.caProj,
          borderWidth: 1.25,
          pointRadius: 0,
          tension: 0,
          order: 5,
          animation: adultLineAnimation(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
    }

    // 희망 키(보라색 점선)는 어드민 전용 — 환자 simplified 모드에서는 BA 예측
    // 곡선과 시각적으로 겹쳐서 혼동을 줘서 숨긴다.
    if (!simplified && visible.desired && typeof desired === 'number') {
      refDatasets.push({
        label: 'desired',
        data: [
          { x: X_MIN, y: desired },
          { x: X_MAX, y: desired },
        ],
        borderColor: COLORS.desired,
        borderWidth: 1.5,
        borderDash: [2, 3],
        pointRadius: 0,
        tension: 0,
        order: 4,
      });
    }

    // Optionally trim to BA-measured visits only (checkbox below the chart).
    const chartMeasurements = effectiveBaOnly
      ? sortedMeasurements.filter((m) => m.bone_age != null)
      : sortedMeasurements;

    const patientPoints = chartMeasurements.map((m) => ({
      x: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal,
      y: m.height!,
      // Custom props passed to the tooltip callback so we can show BA when present.
      _boneAge: m.bone_age ?? null,
      _date: m.measured_date,
      _visitId: m.visit_id,
    }));

    const isSelected = chartMeasurements.map(
      (m) => selectedVisitId != null && m.visit_id === selectedVisitId,
    );
    const hasBa = chartMeasurements.map((m) => m.bone_age != null);

    const patientDataset: LineDataset = {
      label: 'patient',
      data: patientPoints,
      borderColor: COLORS.patient,
      backgroundColor: isSelected.map((sel, i) =>
        sel ? '#facc15' : hasBa[i] ? '#f97316' : COLORS.patient,
      ),
      borderWidth: 2,
      // BA-measured points are larger diamonds; selected > BA > regular
      pointStyle: hasBa.map((b) => (b ? 'rectRot' : 'circle')),
      pointRadius: isSelected.map((sel, i) => (sel ? 9 : hasBa[i] ? 7 : 5)),
      pointHoverRadius: 9,
      pointBorderColor: isSelected.map((sel, i) =>
        sel ? '#0f172a' : hasBa[i] ? '#ffffff' : 'transparent',
      ),
      pointBorderWidth: isSelected.map((sel, i) => (sel ? 2 : hasBa[i] ? 1.5 : 0)),
      showLine: patientPoints.length > 1,
      tension: 0,
      order: 0,
    };

    return { datasets: [...percentileDatasets, ...refDatasets, patientDataset] };
  }, [child, sortedMeasurements, visible, effectiveBaOnly, baProjection, caProjection, baAdult, caAdult, desired, selectedVisitId, nationality, simplified]);

  const options: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: 'easeOutQuart',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onProgress: undefined as any,
    },
    onClick: (_evt, elements, chart) => {
      const el = elements[0];
      if (!el) return;
      const ds = chart.data.datasets[el.datasetIndex];
      if (ds.label !== 'patient') return;
      const point = ds.data[el.index] as { _visitId?: string } | undefined;
      const vid = point?._visitId;
      if (!vid) return;
      if (onVisitSelect) onVisitSelect(vid);
      else setInternalSelectedVisitId((cur) => (cur === vid ? null : vid));
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (ctx) =>
          ctx.dataset.label === 'patient' ||
          ctx.dataset.label === 'baProjection' ||
          ctx.dataset.label === 'caProjection',
        callbacks: {
          title: (ctxs) => {
            const patient = ctxs.find((c) => c.dataset.label === 'patient');
            if (patient) {
              const raw = patient.raw as { _date?: string } | undefined;
              if (raw?._date) {
                const dt = new Date(raw._date);
                if (!Number.isNaN(dt.getTime())) {
                  const wd = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
                  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} (${wd})`;
                }
              }
            }
            const x = ctxs[0]?.parsed?.x;
            return x != null ? `만 ${Number(x).toFixed(1)}세` : '';
          },
          label: (ctx) => {
            if (ctx.parsed.y == null) return '';
            const tag =
              ctx.dataset.label === 'baProjection'
                ? '예측키'
                : ctx.dataset.label === 'caProjection'
                ? 'CA 예측'
                : '실측';
            const base = `${tag} ${ctx.parsed.y}cm @ 만 ${Number(ctx.parsed.x).toFixed(1)}세`;
            if (ctx.dataset.label === 'patient') {
              const raw = (ctx.raw as { _boneAge?: number | null } | undefined);
              if (raw?._boneAge != null) return `${base} · 뼈나이 ${raw._boneAge.toFixed(1)}`;
            }
            return base;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Age (years)', font: { size: 12 } },
        min: X_MIN,
        max: X_MAX,
        ticks: {
          stepSize: 1,
          font: { size: 11 },
          callback: (v) => (Number.isInteger(Number(v)) ? `${v}` : ''),
        },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      y: {
        title: { display: true, text: 'Height (cm)', font: { size: 12 } },
        min: Y_MIN,
        max: Y_MAX,
        ticks: { stepSize: 5, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
    },
  };

  // Patient-mode banner: shows the BA-based predicted adult height for the
  // currently selected (clicked) measurement. Empty until the user clicks a
  // BA-measured point.
  const simplifiedBanner = simplified && selectedMeas && selectedMeas.bone_age != null && baAdult != null
    ? (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[12px] bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-900">
        <span className="font-semibold">{new Date(selectedMeas.measured_date).toLocaleDateString('ko-KR')}</span>
        <span className="text-indigo-700">키 <span className="font-bold">{selectedMeas.height}</span>cm</span>
        <span className="text-amber-700">뼈나이 <span className="font-bold">{selectedMeas.bone_age.toFixed(1)}</span>세</span>
        <span>🎯 예측키 <span className="font-bold">{baAdult}</span>cm</span>
      </div>
    )
    : simplified
    ? (
      <div className="text-center text-[11px] text-gray-400 py-1">
        🦴 다이아몬드 포인트를 누르면 그 시점의 예측키가 표시됩니다
      </div>
    )
    : null;

  const renderBody = () => (
    <div className="flex h-full flex-col gap-2">
      {simplifiedBanner}
      {/* Top legend — value chips with toggles (admin only) */}
      {!simplified && (
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {toggles.map((t) => {
          const isProj = t.key === 'baProj' || t.key === 'caProj';
          return (
            <label
              key={t.key}
              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 cursor-pointer select-none hover:border-slate-300"
            >
              <input
                type="checkbox"
                checked={visible[t.key]}
                onChange={(e) =>
                  setVisible((prev) => ({ ...prev, [t.key]: e.target.checked }))
                }
                className="h-3 w-3 accent-slate-700"
              />
              {isProj && (
                <svg width={14} height={6} className="shrink-0">
                  <line
                    x1={0}
                    y1={3}
                    x2={14}
                    y2={3}
                    stroke={t.color}
                    strokeWidth={2}
                    strokeDasharray={t.key === 'baProj' ? '4 3' : '2 3'}
                  />
                </svg>
              )}
              <span className="font-medium" style={{ color: t.color }}>
                {t.label}
              </span>
              <span className="text-slate-600">{t.value ?? '—'}</span>
            </label>
          );
        })}
        {/* Thin data: when the clinic sees the child monthly the chart becomes
            too dense to read. This narrows the patient series to visits that
            also have a BA reading — usually once every few months. */}
        <label
          className={
            'inline-flex items-center gap-1 rounded border px-2 py-1 cursor-pointer select-none ' +
            (baOnly
              ? 'border-orange-400 bg-orange-50 text-orange-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
          }
          title="체크하면 뼈나이를 실제로 측정한 회차의 키만 그래프에 표시합니다"
        >
          <input
            type="checkbox"
            checked={baOnly}
            onChange={(e) => setBaOnly(e.target.checked)}
            className="h-3 w-3 accent-orange-500"
          />
          <span className="font-medium">🦴 뼈나이 측정만</span>
        </label>
      </div>
      )}

      {/* Chart fills remaining height */}
      <div className="relative min-h-0 flex-1">
        <Line data={chartData} options={options} />
      </div>

      {/* Percentile legend — single line under chart */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Percentile</span>
        {PERCENTILE_LEGEND.map((row) => (
          <span key={row.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-[2px] w-4" style={{ backgroundColor: row.color }} />
            {row.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="relative h-full">
        {renderBody()}
        {/* Action bar: placed AFTER renderBody so it sits on top of the
            legend chips in DOM order even with the same z-index, and pinned
            to top-right via absolute positioning. */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-30 flex items-center gap-1"
        >
          {onNationalityChange && (
            <div className="pointer-events-auto inline-flex overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
              {(['KR', 'CN'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNationalityChange(code);
                  }}
                  className={
                    'px-2 py-1 text-[10px] font-semibold transition ' +
                    (nationality === code
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50')
                  }
                  title={code === 'KR' ? '한국 표준' : '중국 표준'}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setZoomed(true);
            }}
            title="크게 보기"
            aria-label="크게 보기"
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            ⤢
          </button>
        </div>
      </div>
      {zoomed && (
        <ZoomModal
          onClose={() => setZoomed(false)}
          title={`성장 도표 · ${child.name}`}
          aspectRatio="2 / 1"
        >
          {renderBody()}
        </ZoomModal>
      )}
    </>
  );
}
