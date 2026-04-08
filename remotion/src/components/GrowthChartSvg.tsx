import { evolvePath } from "@remotion/paths";
import { interpolate } from "remotion";
import chartData from "../data/growthChartData.json";
import { COLORS, buildGrowthPath, SAMPLE_GENDER } from "../lib/constants";
import { t } from "../lib/texts";

type PercentileKey = "5th" | "50th" | "95th";

interface DataPoint {
  month: number;
  height: number;
}

const PADDING = { top: 40, right: 80, bottom: 70, left: 70 };
const WIDTH = 940;
const HEIGHT = 1000;
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

const MIN_MONTH = 36;
const MAX_MONTH = 216;
const MIN_HEIGHT = 85;
const MAX_HEIGHT = 195;

function scaleX(month: number): number {
  return (
    PADDING.left + ((month - MIN_MONTH) / (MAX_MONTH - MIN_MONTH)) * CHART_W
  );
}

function scaleY(height: number): number {
  return (
    PADDING.top +
    CHART_H -
    ((height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * CHART_H
  );
}

function filterRange(points: DataPoint[]): DataPoint[] {
  return points.filter((p) => p.month >= MIN_MONTH && p.month <= MAX_MONTH);
}

function pointsToPath(points: DataPoint[]): string {
  const filtered = filterRange(points);
  const sampled = filtered.filter(
    (_, i) => i % 3 === 0 || i === filtered.length - 1
  );
  return sampled
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`
    )
    .join(" ");
}

function areaPath(lower: DataPoint[], upper: DataPoint[]): string {
  const filteredLower = filterRange(lower);
  const filteredUpper = filterRange(upper);
  const sampledLower = filteredLower.filter(
    (_, i) => i % 3 === 0 || i === filteredLower.length - 1
  );
  const sampledUpper = filteredUpper.filter(
    (_, i) => i % 3 === 0 || i === filteredUpper.length - 1
  );
  const forward = sampledLower
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`
    )
    .join(" ");
  const backward = [...sampledUpper]
    .reverse()
    .map(
      (p) =>
        `L ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`
    )
    .join(" ");
  return `${forward} ${backward} Z`;
}

type GrowthChartSvgProps = {
  curvesProgress: number;
  trajectoryProgress: number;
  finalPointScale: number;
  labelOpacity: number;
  predictedHeight: number;
  /** 0-1: annotation callouts opacity */
  annotationProgress?: number;
};

export const GrowthChartSvg: React.FC<GrowthChartSvgProps> = ({
  curvesProgress,
  trajectoryProgress,
  finalPointScale,
  labelOpacity,
  predictedHeight,
  annotationProgress = 0,
}) => {
  const data = (chartData as Record<string, Record<PercentileKey, DataPoint[]>>)
    [SAMPLE_GENDER] as Record<PercentileKey, DataPoint[]>;
  const growthPath = buildGrowthPath();

  const childPoints: DataPoint[] = growthPath.map((p) => ({
    month: p.age * 12,
    height: p.height,
  }));

  const percentiles: PercentileKey[] = ["5th", "50th", "95th"];
  const ageLabels = [3, 5, 7, 9, 11, 13, 15, 17];
  const heightLabels = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

  const childPathD = childPoints
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(p.month).toFixed(1)} ${scaleY(p.height).toFixed(1)}`
    )
    .join(" ");

  const lastChild = childPoints[childPoints.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="band-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.chart50th} stopOpacity={0.06} />
          <stop offset="50%" stopColor={COLORS.chart50th} stopOpacity={0.12} />
          <stop
            offset="100%"
            stopColor={COLORS.chart50th}
            stopOpacity={0.06}
          />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
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
            x1={PADDING.left}
            y1={scaleY(h)}
            x2={WIDTH - PADDING.right}
            y2={scaleY(h)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
          <text
            x={PADDING.left - 8}
            y={scaleY(h) + 4}
            textAnchor="end"
            fill="#9ca3af"
            style={{ fontSize: 28 }}
          >
            {h}
          </text>
        </g>
      ))}
      {ageLabels.map((age) => (
        <g key={age}>
          <line
            x1={scaleX(age * 12)}
            y1={PADDING.top}
            x2={scaleX(age * 12)}
            y2={HEIGHT - PADDING.bottom}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
          <text
            x={scaleX(age * 12)}
            y={HEIGHT - PADDING.bottom + 20}
            textAnchor="middle"
            fill="#6b7280"
            style={{ fontSize: 28 }}
          >
            {age}세
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text
        x={WIDTH / 2}
        y={HEIGHT - 10}
        textAnchor="middle"
        fill="#9ca3af"
        style={{ fontSize: 28 }}
      >
        나이
      </text>
      <text
        x={12}
        y={HEIGHT / 2}
        textAnchor="middle"
        fill="#9ca3af"
        style={{ fontSize: 28 }}
        transform={`rotate(-90, 12, ${HEIGHT / 2})`}
      >
        신장 (cm)
      </text>

      {/* Shaded band */}
      <path
        d={areaPath(data["5th"], data["95th"])}
        fill="url(#band-gradient)"
        opacity={interpolate(curvesProgress, [0, 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />

      {/* Percentile curves */}
      {percentiles.map((p) => {
        const pathD = pointsToPath(data[p]);
        if (!pathD) return null;
        const isCenter = p === "50th";
        const evolved = evolvePath(curvesProgress, pathD);
        return (
          <path
            key={p}
            d={pathD}
            fill="none"
            stroke={
              p === "50th" ? COLORS.chart50th : p === "95th" ? COLORS.chart95th : COLORS.chart5th
            }
            strokeWidth={isCenter ? 3 : 1.5}
            strokeLinecap="round"
            strokeDasharray={evolved.strokeDasharray}
            strokeDashoffset={evolved.strokeDashoffset}
            opacity={isCenter ? 1 : 0.6}
          />
        );
      })}

      {/* Percentile labels */}
      {curvesProgress > 0.9 &&
        percentiles.map((p) => {
          const points = filterRange(data[p]);
          const last = points[points.length - 1];
          if (!last) return null;
          const labelY = p === "5th" ? 24 : p === "95th" ? -16 : 8;
          const labelText = p;
          return (
            <text
              key={`label-${p}`}
              x={scaleX(last.month) + 6}
              y={scaleY(last.height) + labelY}
              style={{
                fontSize: 22,
                fill:
                  p === "50th"
                    ? COLORS.chart50th
                    : p === "95th" ? COLORS.chart95th : COLORS.chart5th,
                fontWeight: 700,
              }}
              opacity={interpolate(curvesProgress, [0.9, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            >
              {labelText}
            </text>
          );
        })}

      {/* Child trajectory */}
      {trajectoryProgress > 0 &&
        (() => {
          const evolved = evolvePath(trajectoryProgress, childPathD);
          return (
            <path
              d={childPathD}
              fill="none"
              stroke={COLORS.chartPath}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={evolved.strokeDasharray}
              strokeDashoffset={evolved.strokeDashoffset}
              filter="url(#glow)"
            />
          );
        })()}

      {/* Child data points */}
      {childPoints.map((p, i) => {
        const pointProgress = interpolate(
          trajectoryProgress,
          [i / childPoints.length, (i + 1) / childPoints.length],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        if (pointProgress <= 0) return null;
        return (
          <circle
            key={i}
            cx={scaleX(p.month)}
            cy={scaleY(p.height)}
            r={4}
            fill={COLORS.chartPath}
            stroke="white"
            strokeWidth={2}
            opacity={pointProgress}
          />
        );
      })}

      {/* Final point pulse */}
      {lastChild && finalPointScale > 0 && (
        <g
          transform={`translate(${scaleX(lastChild.month)}, ${scaleY(lastChild.height)}) scale(${finalPointScale})`}
        >
          <circle
            cx={0}
            cy={0}
            r={10}
            fill={COLORS.accent}
            stroke="white"
            strokeWidth={3}
          />
          <circle
            cx={0}
            cy={0}
            r={16}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={1.5}
            opacity={0.4}
          />
        </g>
      )}

      {/* Predicted height label */}
      {lastChild && labelOpacity > 0 && (
        <g opacity={labelOpacity}>
          <rect
            x={scaleX(lastChild.month) - 70}
            y={scaleY(lastChild.height) - 46}
            width={140}
            height={36}
            rx={10}
            fill={COLORS.accent}
          />
          <text
            x={scaleX(lastChild.month)}
            y={scaleY(lastChild.height) - 21}
            textAnchor="middle"
            fill="white"
            style={{ fontSize: 26, fontWeight: 700 }}
          >
            {predictedHeight.toFixed(1)}cm
          </text>
        </g>
      )}

      {/* Annotation callouts — appear after chart is drawn */}
      {annotationProgress > 0 && (() => {
        const data50th = filterRange(data["50th"]);
        // 50th line annotation: point at age 12 on 50th percentile
        const anno50thPt = data50th.find((d) => d.month === 144); // 12세
        // Prediction path annotation: midpoint
        const annoPathPt = childPoints[Math.floor(childPoints.length / 2)];

        return (
          <g opacity={annotationProgress}>
            {/* Arrow marker definition */}
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={COLORS.gray600} />
              </marker>
              <marker id="arrowhead-teal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={COLORS.teal} />
              </marker>
            </defs>

            {/* 50th percentile annotation — arrow points to 50th line at age 7 */}
            {anno50thPt && (() => {
              // Find 50th percentile point at age 7 (month 84)
              const pt7 = data50th.find((d) => d.month === 84);
              if (!pt7) return null;
              const arrowTipX = scaleX(pt7.month);
              const arrowTipY = scaleY(pt7.height);
              // Label positioned to the right and below
              const labelX = arrowTipX + 120;
              const labelY = arrowTipY + 70;
              return (
                <g>
                  <line
                    x1={labelX}
                    y1={labelY}
                    x2={arrowTipX + 5}
                    y2={arrowTipY + 5}
                    stroke={COLORS.gray600}
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  <rect
                    x={labelX - 10}
                    y={labelY - 16}
                    width={170}
                    height={34}
                    rx={10}
                    fill="white"
                    stroke={COLORS.gray200}
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelX + 75}
                    y={labelY + 5}
                    textAnchor="middle"
                    fill={COLORS.gray600}
                    style={{ fontSize: 20, fontWeight: 600 }}
                  >
                    {t().annoAvgCurve}
                  </text>
                </g>
              );
            })()}

            {/* Child trajectory annotation — arrow to midpoint of path */}
            {annoPathPt && (() => {
              const tipX = scaleX(annoPathPt.month);
              const tipY = scaleY(annoPathPt.height);
              // Label below and to the right
              const labelX = tipX + 60;
              const labelY = tipY + 80;
              return (
                <g>
                  <line
                    x1={labelX + 10}
                    y1={labelY}
                    x2={tipX + 5}
                    y2={tipY + 5}
                    stroke={COLORS.teal}
                    strokeWidth={2}
                    markerEnd="url(#arrowhead-teal)"
                  />
                  <rect
                    x={labelX}
                    y={labelY - 16}
                    width={210}
                    height={34}
                    rx={10}
                    fill={COLORS.tealLight}
                    stroke={COLORS.teal}
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelX + 105}
                    y={labelY + 5}
                    textAnchor="middle"
                    fill={COLORS.teal}
                    style={{ fontSize: 20, fontWeight: 700 }}
                  >
                    {t().annoPredPath}
                  </text>
                </g>
              );
            })()}

            {/* 95th annotation — "상위 5%" */}
            {(() => {
              const pts95 = filterRange(data["95th"]);
              const pt = pts95.find((d) => d.month === 168); // 14세
              if (!pt) return null;
              const tx = scaleX(pt.month);
              const ty = scaleY(pt.height);
              return (
                <g>
                  <line
                    x1={tx - 40} y1={ty - 50}
                    x2={tx - 5} y2={ty - 5}
                    stroke={COLORS.chart95th} strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  <rect x={tx - 140} y={ty - 76} width={110} height={30} rx={8}
                    fill="white" stroke="rgba(239,68,68,0.4)" strokeWidth={1} />
                  <text x={tx - 85} y={ty - 56} textAnchor="middle"
                    fill="rgba(239,68,68,0.7)" style={{ fontSize: 18, fontWeight: 600 }}>
                    {t().annoTop5}
                  </text>
                </g>
              );
            })()}

            {/* 5th annotation — "하위 5%" */}
            {(() => {
              const pts5 = filterRange(data["5th"]);
              const pt = pts5.find((d) => d.month === 168); // 14세
              if (!pt) return null;
              const tx = scaleX(pt.month);
              const ty = scaleY(pt.height);
              return (
                <g>
                  <line
                    x1={tx - 40} y1={ty + 50}
                    x2={tx - 5} y2={ty + 5}
                    stroke={COLORS.chart5th} strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  <rect x={tx - 140} y={ty + 38} width={110} height={30} rx={8}
                    fill="white" stroke="rgba(59,130,246,0.4)" strokeWidth={1} />
                  <text x={tx - 85} y={ty + 58} textAnchor="middle"
                    fill="rgba(59,130,246,0.7)" style={{ fontSize: 18, fontWeight: 600 }}>
                    {t().annoBot5}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })()}
    </svg>
  );
};
