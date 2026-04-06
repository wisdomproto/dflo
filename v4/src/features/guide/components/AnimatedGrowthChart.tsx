import { useState, useRef } from 'react';
import chartData from '../data/growthChartData.json';

type Gender = 'male' | 'female';
type PercentileKey = '5th' | '50th' | '95th';

interface DataPoint {
  month: number;
  height: number;
}

const PERCENTILES: PercentileKey[] = ['5th', '50th', '95th'];

// Chart dimensions — 1:1.5 ratio (width:height)
const PADDING = { top: 28, right: 34, bottom: 46, left: 44 };
const WIDTH = 380;
const HEIGHT = 570;
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

// Data range — 3세(36개월)부터 18세(216개월)
const MIN_MONTH = 36;
const MAX_MONTH = 216;
const MIN_HEIGHT = 85;
const MAX_HEIGHT = 195;

const COLORS = {
  male: {
    '5th': '#a5b4fc',
    '50th': '#667eea',
    '95th': '#a5b4fc',
    band: '#667eea',
  },
  female: {
    '5th': '#fda4af',
    '50th': '#e11d48',
    '95th': '#fda4af',
    band: '#e11d48',
  },
};

function scaleX(month: number): number {
  return PADDING.left + ((month - MIN_MONTH) / (MAX_MONTH - MIN_MONTH)) * CHART_W;
}

function scaleY(height: number): number {
  return PADDING.top + CHART_H - ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * CHART_H;
}

function filterRange(points: DataPoint[]): DataPoint[] {
  return points.filter((p) => p.month >= MIN_MONTH && p.month <= MAX_MONTH);
}

function pointsToPath(points: DataPoint[]): string {
  const filtered = filterRange(points);
  const sampled = filtered.filter((_, i) => i % 3 === 0 || i === filtered.length - 1);
  return sampled
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(' ');
}

function areaPath(lower: DataPoint[], upper: DataPoint[]): string {
  const sampledLower = filterRange(lower).filter((_, i) => i % 3 === 0 || i === filterRange(lower).length - 1);
  const sampledUpper = filterRange(upper).filter((_, i) => i % 3 === 0 || i === filterRange(upper).length - 1);
  const forward = sampledLower
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(' ');
  const backward = [...sampledUpper]
    .reverse()
    .map((p) => `L ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`)
    .join(' ');
  return `${forward} ${backward} Z`;
}

const EXAMPLE_BOY: DataPoint[] = [
  { month: 36, height: 96 },
  { month: 48, height: 103 },
  { month: 60, height: 110 },
  { month: 72, height: 118 },
  { month: 84, height: 125 },
  { month: 96, height: 131 },
  { month: 108, height: 138 },
  { month: 120, height: 145 },
  { month: 132, height: 153 },
  { month: 144, height: 161 },
  { month: 156, height: 167 },
  { month: 168, height: 172 },
  { month: 180, height: 175 },
  { month: 192, height: 176 },
  { month: 204, height: 176.5 },
];

const EXAMPLE_GIRL: DataPoint[] = [
  { month: 36, height: 95 },
  { month: 48, height: 102 },
  { month: 60, height: 108 },
  { month: 72, height: 115 },
  { month: 84, height: 121 },
  { month: 96, height: 127 },
  { month: 108, height: 133 },
  { month: 120, height: 140 },
  { month: 132, height: 148 },
  { month: 144, height: 155 },
  { month: 156, height: 159 },
  { month: 168, height: 161 },
  { month: 180, height: 162 },
  { month: 192, height: 162.5 },
];

const PERCENTILE_LABELS: Record<PercentileKey, string> = {
  '5th': '5th',
  '50th': '50th (평균)',
  '95th': '95th',
};

export function AnimatedGrowthChart() {
  const [gender, setGender] = useState<Gender>('male');
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = COLORS[gender];
  const data = (chartData as any)[gender] as Record<PercentileKey, DataPoint[]>;
  const exampleChild = gender === 'male' ? EXAMPLE_BOY : EXAMPLE_GIRL;

  const ageLabels = [3, 5, 7, 9, 11, 13, 15, 17];
  const heightLabels = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

  return (
    <div ref={containerRef} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      {/* Gender toggle */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3 className="text-sm font-bold text-gray-800">표준 성장 도표</h3>
        <div className="flex bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setGender('male')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              gender === 'male' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            ♂ 남아
          </button>
          <button
            onClick={() => setGender('female')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              gender === 'female' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            ♀ 여아
          </button>
        </div>
      </div>

      {/* SVG Chart — 1:1.5 ratio */}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <defs>
          <linearGradient id={`band-${gender}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.band} stopOpacity="0.06" />
            <stop offset="50%" stopColor={colors.band} stopOpacity="0.12" />
            <stop offset="100%" stopColor={colors.band} stopOpacity="0.06" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {heightLabels.map((h) => (
          <g key={h}>
            <line
              x1={PADDING.left} y1={scaleY(h)}
              x2={WIDTH - PADDING.right} y2={scaleY(h)}
              stroke="#f0f0f0" strokeWidth={0.5}
            />
            <text
              x={PADDING.left - 5} y={scaleY(h) + 3}
              textAnchor="end" className="fill-gray-400"
              style={{ fontSize: 11 }}
            >
              {h}
            </text>
          </g>
        ))}

        {ageLabels.map((age) => (
          <g key={age}>
            <line
              x1={scaleX(age * 12)} y1={PADDING.top}
              x2={scaleX(age * 12)} y2={HEIGHT - PADDING.bottom}
              stroke="#f0f0f0" strokeWidth={0.5}
            />
            <text
              x={scaleX(age * 12)} y={HEIGHT - PADDING.bottom + 14}
              textAnchor="middle" className="fill-gray-500"
              style={{ fontSize: 11 }}
            >
              {age}세
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={WIDTH / 2} y={HEIGHT - 6}
          textAnchor="middle" className="fill-gray-400"
          style={{ fontSize: 11 }}
        >
          나이
        </text>
        <text
          x={8} y={HEIGHT / 2}
          textAnchor="middle" className="fill-gray-400"
          style={{ fontSize: 11 }}
          transform={`rotate(-90, 8, ${HEIGHT / 2})`}
        >
          신장 (cm)
        </text>

        {/* Shaded band (5th — 95th) */}
        <path
          d={areaPath(data['5th'], data['95th'])}
          fill={`url(#band-${gender})`}
        />

        {/* 3 percentile curves */}
        {PERCENTILES.map((p) => {
          const path = pointsToPath(data[p]);
          const isCenter = p === '50th';
          return (
            <path
              key={p}
              d={path}
              fill="none"
              stroke={colors[p]}
              strokeWidth={isCenter ? 2.5 : 1}
              strokeLinecap="round"
              style={{
                opacity: isCenter ? 1 : 0.6,
                strokeDasharray: isCenter ? 'none' : '6 3',
              }}
            />
          );
        })}

        {/* Percentile labels (right side) */}
        {PERCENTILES.map((p) => {
          const points = filterRange(data[p]);
          const last = points[points.length - 1];
          if (!last) return null;
          return (
            <text
              key={`label-${p}`}
              x={scaleX(last.month) + 2}
              y={scaleY(last.height) + (p === '5th' ? 10 : p === '95th' ? -4 : 3)}
              style={{
                fontSize: 10,
                fill: colors[p],
                fontWeight: p === '50th' ? 700 : 400,
              }}
            >
              {p}
            </text>
          );
        })}

        {/* Example child data */}
        <g>
          <path
            d={pointsToPath(exampleChild)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinecap="round"
            filter="url(#glow)"
          />
          {exampleChild.map((p, i) => (
            <circle
              key={i}
              cx={scaleX(p.month)}
              cy={scaleY(p.height)}
              r={3}
              fill="#f59e0b"
              stroke="white"
              strokeWidth={1.5}
            />
          ))}
          {/* Label near last point */}
          {(() => {
            const labelPoint = exampleChild[Math.floor(exampleChild.length * 0.7)];
            return (
              <g>
                <rect
                  x={scaleX(labelPoint.month) - 28}
                  y={scaleY(labelPoint.height) - 20}
                  width={55} height={18} rx={5}
                  fill="#f59e0b" fillOpacity={0.9}
                />
                <text
                  x={scaleX(labelPoint.month) - 0.5}
                  y={scaleY(labelPoint.height) - 8}
                  textAnchor="middle" fill="white"
                  style={{ fontSize: 8, fontWeight: 600 }}
                >
                  우리 아이
                </text>
              </g>
            );
          })()}
        </g>
      </svg>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[2.5px] rounded" style={{ backgroundColor: colors['50th'] }} />
          {PERCENTILE_LABELS['50th']}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[1px] rounded" style={{ backgroundColor: colors['5th'], opacity: 0.6 }} />
          5th / 95th
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[2px] rounded bg-amber-400" />
          예시
        </span>
      </div>
    </div>
  );
}
