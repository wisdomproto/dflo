// Growth chart for the admin patient detail page.
// Shows KDCA 2017 percentiles, patient measurements, and a percentile-based
// projection curve from the most recent point to age 18. A horizontal line
// at the projected adult height caps the prediction.

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
  p3: '#3b82f6',
  p15: '#f59e0b',
  p50: '#22c55e',
  p85: '#ef4444',
  p97: '#a855f7',
  patient: '#0f172a',
  predicted: '#6366f1',
  desired: '#9333ea',
};

type ToggleKey = 'boneAge' | 'predicted' | 'desired';

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
  selectedVisitId?: string | null;
}

export function AdminPatientGrowthChart({
  child,
  measurements,
  selectedVisitId = null,
}: Props) {
  const [visible, setVisible] = useState<Record<ToggleKey, boolean>>({
    boneAge: true,
    predicted: true,
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
  const latestAge = latest
    ? calculateAgeAtDate(child.birth_date, new Date(latest.measured_date)).decimal
    : null;
  const boneAge = latest?.bone_age ?? null;
  const desired = child.desired_height ?? null;

  // Projected curve — stays on the same percentile as the latest point
  const predictedCurve = useMemo(() => {
    if (!latest || latestAge == null) return null;
    if (latestAge >= X_MAX) return null;
    const start = Math.max(X_MIN, latestAge);
    const points: { x: number; y: number }[] = [];
    for (let a = start; a <= X_MAX + 0.0001; a += 0.25) {
      const aa = Math.min(a, X_MAX);
      const y = heightAtSamePercentile(latest.height!, latestAge, aa, child.gender);
      if (y > 0) points.push({ x: Number(aa.toFixed(2)), y: Number(y.toFixed(1)) });
    }
    return points.length >= 2 ? points : null;
  }, [latest, latestAge, child.gender]);

  const predictedAdult = useMemo(() => {
    if (!latest || latestAge == null) return null;
    return Number(
      heightAtSamePercentile(latest.height!, latestAge, X_MAX, child.gender).toFixed(1),
    );
  }, [latest, latestAge, child.gender]);

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
      key: 'predicted',
      label: '예측 18세',
      color: COLORS.predicted,
      value: predictedAdult != null ? `${predictedAdult}` : null,
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

    const percentileDatasets: LineDataset[] = [
      { key: 'p3', color: COLORS.p3 },
      { key: 'p15', color: COLORS.p15 },
      { key: 'p50', color: COLORS.p50 },
      { key: 'p85', color: COLORS.p85 },
      { key: 'p97', color: COLORS.p97 },
    ].map(({ key, color }) => ({
      label: key,
      data: toXY((d) => d[key as keyof (typeof stdFiltered)[number]] as number),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.35,
      order: 2,
    }));

    const refDatasets: LineDataset[] = [];

    if (visible.predicted && predictedCurve) {
      refDatasets.push({
        label: 'predictedCurve',
        data: predictedCurve,
        borderColor: COLORS.predicted,
        backgroundColor: COLORS.predicted,
        borderWidth: 2.5,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      });
    }

    if (visible.predicted && predictedAdult != null) {
      refDatasets.push({
        label: 'predictedHline',
        data: [
          { x: X_MIN, y: predictedAdult },
          { x: X_MAX, y: predictedAdult },
        ],
        borderColor: COLORS.predicted,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        order: 3,
      });
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
      backgroundColor: isSelected.map((sel) =>
        sel ? '#facc15' : COLORS.patient,
      ),
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
  }, [child, sortedMeasurements, visible, predictedCurve, predictedAdult, desired, selectedVisitId]);

  const options: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (ctx) => ctx.dataset.label === 'patient',
        callbacks: {
          label: (ctx) =>
            ctx.parsed.y != null
              ? `${ctx.parsed.y}cm @ ${Number(ctx.parsed.x).toFixed(1)}세`
              : '',
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
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        title: { display: true, text: 'Height (cm)', font: { size: 12 } },
        min: Y_MIN,
        max: Y_MAX,
        ticks: { stepSize: 5, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Value chips — checkboxes with inline current values */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {toggles.map((t) => (
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
            <span className="font-medium" style={{ color: t.color }}>
              {t.label}
            </span>
            <span className="text-slate-600">{t.value ?? '—'}</span>
          </label>
        ))}
      </div>

      {/* Chart fills remaining height */}
      <div className="relative min-h-0 flex-1">
        <Line data={chartData} options={options} />
      </div>

      {/* Percentile legend — single line under chart */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Percentile</span>
        {[
          { label: '3rd', color: COLORS.p3 },
          { label: '15th', color: COLORS.p15 },
          { label: '50th', color: COLORS.p50 },
          { label: '85th', color: COLORS.p85 },
          { label: '97th', color: COLORS.p97 },
        ].map((row) => (
          <span key={row.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-[2px] w-4" style={{ backgroundColor: row.color }} />
            {row.label}
          </span>
        ))}
      </div>
    </div>
  );
}
