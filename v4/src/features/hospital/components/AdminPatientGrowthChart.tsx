// Growth chart for the admin patient detail page.
// Minimal: toggles double as value chips (checkbox + label + current value),
// no in-chart overlays. Percentile legend moved beneath the canvas.

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartDataset,
  type Plugin,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getHeightStandard } from '@/features/bone-age/lib/growthStandard';
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
  chrono: '#f97316',
  actualHeight: '#dc2626',
  pah: '#2563eb',
  mph: '#64748b',
  desired: '#9333ea',
};

type ToggleKey = 'chrono' | 'actual' | 'boneAge' | 'mph' | 'pah' | 'desired';

function calcMph(child: Child): number | null {
  if (!child.father_height || !child.mother_height) return null;
  const adj = child.gender === 'male' ? 13 : -13;
  return Number(((child.father_height + child.mother_height + adj) / 2).toFixed(1));
}

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
}

export function AdminPatientGrowthChart({ child, measurements }: Props) {
  const [visible, setVisible] = useState<Record<ToggleKey, boolean>>({
    chrono: true,
    actual: true,
    boneAge: true,
    mph: true,
    pah: true,
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
  const chronoAge = latest
    ? calculateAgeAtDate(child.birth_date, new Date(latest.measured_date)).decimal
    : null;
  const actualHeight = latest?.height ?? null;
  const boneAge = latest?.bone_age ?? null;
  const pah = latest?.pah ?? null;
  const mph = calcMph(child);
  const desired = child.desired_height ?? null;

  const toggles: Array<{
    key: ToggleKey;
    label: string;
    color: string;
    value: string | null;
  }> = [
    {
      key: 'chrono',
      label: 'Chrono',
      color: COLORS.chrono,
      value: chronoAge != null ? chronoAge.toFixed(1) : null,
    },
    {
      key: 'actual',
      label: '실측 키',
      color: COLORS.actualHeight,
      value: actualHeight != null ? `${actualHeight}` : null,
    },
    {
      key: 'boneAge',
      label: 'BA',
      color: '#0f172a',
      value: boneAge != null ? boneAge.toFixed(1) : null,
    },
    { key: 'mph', label: 'MPH', color: COLORS.mph, value: mph != null ? `${mph}` : null },
    {
      key: 'pah',
      label: 'PAH',
      color: COLORS.pah,
      value: pah != null ? `${pah}` : null,
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

    if (visible.chrono && typeof chronoAge === 'number') {
      refDatasets.push({
        label: 'chrono',
        data: [
          { x: chronoAge, y: Y_MIN },
          { x: chronoAge, y: Y_MAX },
        ],
        borderColor: COLORS.chrono,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        order: 3,
      });
    }

    if (visible.actual && typeof actualHeight === 'number') {
      refDatasets.push({
        label: 'actual',
        data: [
          { x: X_MIN, y: actualHeight },
          { x: X_MAX, y: actualHeight },
        ],
        borderColor: COLORS.actualHeight,
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0,
        order: 3,
      });
    }

    if (visible.mph && typeof mph === 'number') {
      refDatasets.push({
        label: 'mph',
        data: [
          { x: X_MIN, y: mph },
          { x: X_MAX, y: mph },
        ],
        borderColor: COLORS.mph,
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0,
        order: 4,
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

    if (visible.pah && typeof pah === 'number' && typeof chronoAge === 'number') {
      refDatasets.push({
        label: 'pah',
        data: [
          { x: chronoAge, y: pah },
          { x: X_MAX, y: pah },
        ],
        borderColor: COLORS.pah,
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0,
        order: 3,
      });
    }

    const patientPoints = sortedMeasurements.map((m) => ({
      x: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal,
      y: m.height!,
    }));

    const patientDataset: LineDataset = {
      label: 'patient',
      data: patientPoints,
      borderColor: COLORS.patient,
      backgroundColor: COLORS.patient,
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: patientPoints.length > 1,
      tension: 0,
      order: 1,
    };

    return { datasets: [...percentileDatasets, ...refDatasets, patientDataset] };
  }, [child, sortedMeasurements, visible, chronoAge, actualHeight, mph, desired, pah]);

  const pahArrowPlugin: Plugin<'line'> = useMemo(
    () => ({
      id: 'pahArrow',
      afterDatasetsDraw(chart) {
        if (!visible.pah || typeof pah !== 'number' || typeof chronoAge !== 'number') return;
        const { ctx, scales } = chart;
        const xEnd = scales.x.getPixelForValue(X_MAX);
        const yEnd = scales.y.getPixelForValue(pah);
        const headLen = 10;
        const headWidth = 7;
        ctx.save();
        ctx.fillStyle = COLORS.pah;
        ctx.beginPath();
        ctx.moveTo(xEnd, yEnd);
        ctx.lineTo(xEnd - headLen, yEnd - headWidth);
        ctx.lineTo(xEnd - headLen, yEnd + headWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
    }),
    [visible.pah, pah, chronoAge],
  );

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
        <Line data={chartData} options={options} plugins={[pahArrowPlugin]} />
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
