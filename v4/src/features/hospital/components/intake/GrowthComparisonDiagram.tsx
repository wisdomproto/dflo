interface Props {
  initialHeight: number;
  predictedAdultHeight: number;
  finalHeight: number;
  lang?: 'ko' | 'en';
  extraCm?: number;
  className?: string;
}

// Person silhouette path, viewBox 120 x 260. Drawn in pencil by the user —
// rounded head + torso + arms at sides + two legs with a visible gap.
const PERSON_PATH =
  'M60 0a20 20 0 1 1 0 40 20 20 0 1 1 0-40z ' +
  'm-16 44c-16 6-22 18-24 30l-10 45c-2 8 4 13 10 11l10-51 6-7 ' +
  '2 92 0 78c0 6 4 10 8 10l8 0c4 0 4-4 4-10l-2-78 4-6 4 6-2 78 ' +
  'c0 6 0 10 4 10l8 0c4 0 8-4 8-10l0-78 2-92 6 7 10 51c6 2 12-3 10-11 ' +
  'l-10-45c-2-12-8-24-24-30z';

const PERSON_VB_W = 120;
const PERSON_VB_H = 260;

/**
 * Growth comparison diagram — three person silhouettes side-by-side showing
 * initial height, initial predicted adult height, and final predicted adult
 * height. Layout mirrors the pencil design 1:1 so any visual tweak can be
 * made in pencil and copied back. The highlight band spans the top of the
 * two predicted figures.
 */
export function GrowthComparisonDiagram({
  initialHeight,
  predictedAdultHeight,
  finalHeight,
  lang = 'ko',
  extraCm,
  className,
}: Props) {
  const W = 900;
  const H = 540;
  const BASE_Y = 440;
  const PLOT_TOP = 40;
  const PLOT_LEFT = 60;
  const PLOT_RIGHT = W - 60; // 840
  const PLOT_W = PLOT_RIGHT - PLOT_LEFT; // 780

  const MAX_FIG_H = 320; // pixels — matches pencil's tallest figure
  const maxCm = Math.max(initialHeight, predictedAdultHeight, finalHeight);
  const fig = (cm: number) => (cm / maxCm) * MAX_FIG_H;
  const top = (cm: number) => BASE_Y - fig(cm);

  // Person width must match the path viewBox aspect exactly (120/260), so
  // that preserveAspectRatio="meet" fills the SVG box top-to-bottom and the
  // head top lands precisely on top(cm).
  const PERSON_ASPECT = PERSON_VB_W / PERSON_VB_H; // 120 / 260 ≈ 0.4615
  const figW = (cm: number) => fig(cm) * PERSON_ASPECT;

  const extra =
    extraCm != null
      ? extraCm
      : Math.round((finalHeight - predictedAdultHeight) * 10) / 10;

  const FIGURES = [
    {
      label: lang === 'ko' ? '초기 키' : 'Initial height',
      cm: initialHeight,
      color: '#BCBEC0',
      labelColor: '#6B7280',
      cx: PLOT_LEFT + PLOT_W * (1 / 6),
    },
    {
      label: lang === 'ko' ? '최초 예측 성인키' : 'Initial predicted',
      cm: predictedAdultHeight,
      color: '#A2B939',
      labelColor: '#5E7A20',
      cx: PLOT_LEFT + PLOT_W * (3 / 6),
    },
    {
      label: lang === 'ko' ? '최종 예측 성인키' : 'Final predicted',
      cm: finalHeight,
      color: '#E7843C',
      labelColor: '#B85E16',
      cx: PLOT_LEFT + PLOT_W * (5 / 6),
    },
  ];

  const bandTop = top(finalHeight);
  const bandBottom = top(predictedAdultHeight);
  const bandHeight = Math.max(0, bandBottom - bandTop);
  const showBand = extra > 0.05 && bandHeight > 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? 'h-auto w-full'}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Plot background */}
      <rect
        x={PLOT_LEFT}
        y={PLOT_TOP}
        width={PLOT_W}
        height={BASE_Y - PLOT_TOP}
        fill="#F5F4F2"
        rx={12}
      />

      {/* Axes */}
      <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={BASE_Y} stroke="#1F2937" strokeWidth={2} />
      <line x1={PLOT_LEFT} y1={BASE_Y} x2={PLOT_RIGHT} y2={BASE_Y} stroke="#1F2937" strokeWidth={2} />

      {/* Reference lines only at the two predicted head tops — these are
          the two values we're comparing. Drawn in the same orange family
          as the highlight band so the visual grouping is obvious. */}
      <line
        x1={PLOT_LEFT}
        y1={top(predictedAdultHeight)}
        x2={PLOT_RIGHT}
        y2={top(predictedAdultHeight)}
        stroke="#B85E16"
        strokeDasharray="5 4"
        strokeWidth={1.25}
        opacity={0.75}
      />
      <line
        x1={PLOT_LEFT}
        y1={top(finalHeight)}
        x2={PLOT_RIGHT}
        y2={top(finalHeight)}
        stroke="#B85E16"
        strokeDasharray="5 4"
        strokeWidth={1.25}
        opacity={0.75}
      />

      {/* Highlight band between predicted and final head tops */}
      {showBand && (
        <rect
          x={PLOT_LEFT}
          y={bandTop}
          width={PLOT_W}
          height={bandHeight}
          fill="#F4C39B"
          opacity={0.7}
        />
      )}

      {/* People — nested <svg> so the user's path auto-scales to the given
          width/height via its own viewBox. Positioned so each figure's base
          lands exactly on the floor (y = BASE_Y). */}
      {FIGURES.map((f) => {
        const h = fig(f.cm);
        const w = figW(f.cm);
        return (
          <svg
            key={`person-${f.label}`}
            x={f.cx - w / 2}
            y={BASE_Y - h}
            width={w}
            height={h}
            viewBox={`0 0 ${PERSON_VB_W} ${PERSON_VB_H}`}
            preserveAspectRatio="xMidYMax meet"
          >
            <path d={PERSON_PATH} fill={f.color} />
          </svg>
        );
      })}

      {/* Extra-cm dimension indicator on the left — compact vertical bracket
          with tiny upward/downward arrow heads drawn inline (no SVG markers)
          so orientation is always correct. */}
      {showBand && (() => {
        const arrowX = PLOT_LEFT + 14;
        const tickLen = 5;
        const headW = 4;
        const headH = 5;
        const midY = (bandTop + bandBottom) / 2;
        const pillCx = PLOT_LEFT + 48;
        const pillW = 52;
        const pillH = 20;
        return (
          <g>
            {/* top tick */}
            <line x1={arrowX - tickLen} y1={bandTop} x2={arrowX + tickLen} y2={bandTop} stroke="#E7843C" strokeWidth={1.5} />
            {/* bottom tick */}
            <line x1={arrowX - tickLen} y1={bandBottom} x2={arrowX + tickLen} y2={bandBottom} stroke="#E7843C" strokeWidth={1.5} />
            {/* vertical line between the two heads */}
            <line
              x1={arrowX}
              y1={bandTop + headH}
              x2={arrowX}
              y2={bandBottom - headH}
              stroke="#E7843C"
              strokeWidth={1.25}
            />
            {/* upward arrowhead at top */}
            <polygon
              points={`${arrowX},${bandTop} ${arrowX - headW},${bandTop + headH} ${arrowX + headW},${bandTop + headH}`}
              fill="#E7843C"
            />
            {/* downward arrowhead at bottom */}
            <polygon
              points={`${arrowX},${bandBottom} ${arrowX - headW},${bandBottom - headH} ${arrowX + headW},${bandBottom - headH}`}
              fill="#E7843C"
            />
            {/* connector from arrow to pill */}
            <line
              x1={arrowX + tickLen}
              y1={midY}
              x2={pillCx - pillW / 2}
              y2={midY}
              stroke="#E7843C"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {/* pill label */}
            <rect
              x={pillCx - pillW / 2}
              y={midY - pillH / 2}
              width={pillW}
              height={pillH}
              rx={pillH / 2}
              fill="#FFF3EA"
              stroke="#E7843C"
              strokeWidth={1.25}
            />
            <text
              x={pillCx}
              y={midY + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="#E7843C"
            >
              +{extra}cm
            </text>
          </g>
        );
      })()}

      {/* Callout above the final (tallest) figure */}
      {showBand && (() => {
        const boxW = 180;
        const boxH = 54;
        const cx = Math.min(W - 20 - boxW / 2, Math.max(20 + boxW / 2, FIGURES[2].cx));
        const ty = Math.max(10, top(finalHeight) - boxH - 18);
        const tailX = FIGURES[2].cx - cx;
        return (
          <g>
            <rect x={cx - boxW / 2} y={ty} width={boxW} height={boxH} rx={10} fill="#E7843C" />
            <polygon
              points={`${cx + tailX - 8},${ty + boxH} ${cx + tailX + 8},${ty + boxH} ${cx + tailX},${ty + boxH + 10}`}
              fill="#E7843C"
            />
            <text x={cx} y={ty + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill="white">
              <tspan x={cx} dy={0}>
                {lang === 'ko' ? `예측보다 ${extra}cm` : `grown up ${extra}cm`}
              </tspan>
              <tspan x={cx} dy={18}>
                {lang === 'ko' ? '더 성장했어요' : 'more than expected'}
              </tspan>
            </text>
          </g>
        );
      })()}

      {/* Bottom labels */}
      {FIGURES.map((f) => (
        <g key={`lbl-${f.label}`}>
          <text
            x={f.cx}
            y={BASE_Y + 28}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            fill={f.labelColor}
          >
            {f.label}
          </text>
          <text
            x={f.cx}
            y={BASE_Y + 54}
            textAnchor="middle"
            fontSize={18}
            fontWeight={700}
            fill={f.labelColor}
          >
            {f.cm.toFixed(1)}cm
          </text>
        </g>
      ))}
    </svg>
  );
}
