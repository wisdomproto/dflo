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
} from '@/features/bone-age/lib/growthStandard';
import { calculateAgeAtDate } from '@/shared/utils/age';
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
}

function buildProjection(
  startCA: number,
  startH: number,
  startReference: number, // BA or CA — the percentile reference age
  gender: 'male' | 'female',
): { x: number; y: number }[] | null {
  if (startReference >= 18) return null;
  // chrono age when reference reaches 18
  const endCA = Math.min(X_MAX, startCA + (18 - startReference));
  const points: { x: number; y: number }[] = [
    { x: Number(startCA.toFixed(2)), y: startH },
  ];
  const firstInt = Math.ceil(startCA + 0.0001);
  for (let yr = firstInt; yr < endCA; yr++) {
    const refAtYr = startReference + (yr - startCA);
    if (refAtYr >= 18) break;
    const y = heightAtSamePercentile(startH, startReference, refAtYr, gender);
    if (y > 0) points.push({ x: yr, y: Number(y.toFixed(1)) });
  }
  const yEnd = heightAtSamePercentile(startH, startReference, 18, gender);
  if (yEnd > 0) points.push({ x: Number(endCA.toFixed(2)), y: Number(yEnd.toFixed(1)) });
  return points.length >= 2 ? points : null;
}

export function AdminPatientGrowthChart({
  child,
  measurements,
  selectedVisitId = null,
}: Props) {
  const [visible, setVisible] = useState<Record<ToggleKey, boolean>>({
    boneAge: true,
    baProj: true,
    caProj: true,
    desired: true,
  });

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

  // Two projection variants for the selected visit point
  const baProjection = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    const startBA = selectedMeas.bone_age;
    if (startBA == null) return null;
    return buildProjection(selectedAge, selectedMeas.height!, startBA, child.gender);
  }, [selectedMeas, selectedAge, child.gender]);

  const caProjection = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    return buildProjection(selectedAge, selectedMeas.height!, selectedAge, child.gender);
  }, [selectedMeas, selectedAge, child.gender]);

  const baAdult = useMemo(() => {
    if (!selectedMeas || selectedAge == null || selectedMeas.bone_age == null) return null;
    return Number(
      heightAtSamePercentile(selectedMeas.height!, selectedMeas.bone_age, 18, child.gender).toFixed(1),
    );
  }, [selectedMeas, selectedAge, child.gender]);

  const caAdult = useMemo(() => {
    if (!selectedMeas || selectedAge == null) return null;
    return Number(
      heightAtSamePercentile(selectedMeas.height!, selectedAge, 18, child.gender).toFixed(1),
    );
  }, [selectedMeas, selectedAge, child.gender]);

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
    const standard = getHeightStandard(child.gender);
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

    // Per-dataset animation that fans the projection out from its first
    // point's pixel — safe because it's scoped to projection datasets only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projAnimation = (label: string): any => ({
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
        });
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
        });
      }
    }

    if (visible.desired && typeof desired === 'number') {
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

    const patientPoints = sortedMeasurements.map((m) => ({
      x: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal,
      y: m.height!,
    }));

    const isSelected = sortedMeasurements.map(
      (m) => selectedVisitId != null && m.visit_id === selectedVisitId,
    );

    const patientDataset: LineDataset = {
      label: 'patient',
      data: patientPoints,
      borderColor: COLORS.patient,
      backgroundColor: isSelected.map((sel) => (sel ? '#facc15' : COLORS.patient)),
      borderWidth: 2,
      pointRadius: isSelected.map((sel) => (sel ? 9 : 5)),
      pointHoverRadius: 9,
      pointBorderColor: isSelected.map((sel) => (sel ? '#0f172a' : 'transparent')),
      pointBorderWidth: isSelected.map((sel) => (sel ? 2 : 0)),
      showLine: patientPoints.length > 1,
      tension: 0,
      order: 0,
    };

    return { datasets: [...percentileDatasets, ...refDatasets, patientDataset] };
  }, [child, sortedMeasurements, visible, baProjection, caProjection, baAdult, caAdult, desired, selectedVisitId]);

  const options: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: 'easeOutQuart',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onProgress: undefined as any,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (ctx) =>
          ctx.dataset.label === 'patient' ||
          ctx.dataset.label === 'baProjection' ||
          ctx.dataset.label === 'caProjection',
        callbacks: {
          label: (ctx) => {
            if (ctx.parsed.y == null) return '';
            const tag =
              ctx.dataset.label === 'baProjection'
                ? 'BA 예측'
                : ctx.dataset.label === 'caProjection'
                ? 'CA 예측'
                : '실측';
            return `${tag} ${ctx.parsed.y}cm @ ${Number(ctx.parsed.x).toFixed(1)}세`;
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

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Top legend — value chips with toggles */}
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
      </div>

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
}
