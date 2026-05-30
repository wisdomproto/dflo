// ================================================
// HeightCalculatorResult - 예상키 측정 결과 모달
// 애니메이션: 카운트업 숫자 + 선 그리기 + 포인트 팝
// ================================================

import { useMemo, useState, useEffect, useRef } from 'react';
import { heightAtSamePercentile, getHeightStandard, type GrowthStandard } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
import { trackKakaoConsult } from '@/shared/lib/analytics';
import { getCalcLabels, type CalcLang } from './calcLabels';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';

// 언어별 메신저 CTA (i18n/messenger.yml 과 동일). th 는 LINE OA, 나머지는 KakaoTalk.
const MESSENGER: Record<CalcLang, { url: string; bgClass: string; fgClass: string; hoverClass: string }> = {
  ko: { url: KAKAO_URL, bgClass: 'bg-[#FEE500]', fgClass: 'text-[#3C1E1E]', hoverClass: 'hover:bg-[#FDD800]' },
  vi: { url: KAKAO_URL, bgClass: 'bg-[#FEE500]', fgClass: 'text-[#3C1E1E]', hoverClass: 'hover:bg-[#FDD800]' },
  en: { url: KAKAO_URL, bgClass: 'bg-[#FEE500]', fgClass: 'text-[#3C1E1E]', hoverClass: 'hover:bg-[#FDD800]' },
  th: { url: 'https://line.me/R/ti/p/%40894qhqtu', bgClass: 'bg-[#06C755]', fgClass: 'text-white', hoverClass: 'hover:brightness-95' },
};

export interface HeightResult {
  predicted: number;
  percentile: number;
  age: number;
  currentHeight: number;
  gender: 'male' | 'female';
  /** 성장 표준 (예측 경로·배경 백분위 곡선에 동일 적용). 기본 'KR'. */
  standard?: GrowthStandard;
}

interface Props {
  result: HeightResult;
  isOpen: boolean;
  onClose: () => void;
  /** Render result inline as a page (no modal overlay). Used by /calc-embed. */
  embedded?: boolean;
  /** Locale for UI labels. Default 'ko'. */
  lang?: CalcLang;
}

/** Count-up hook: animates from 0 to target over duration ms */
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

export function HeightCalculatorResult({ result, isOpen, onClose, embedded = false, lang = 'ko' }: Props) {
  const [phase, setPhase] = useState(0); // 0=init, 1=countUp, 2=chart, 3=done
  const [drawnPoints, setDrawnPoints] = useState(0); // how many path points are visible
  const chartRef = useRef<ChartJS<'line'>>(null);
  const t = getCalcLabels(lang);
  const messenger = MESSENGER[lang] || MESSENGER.ko;

  const allPathPoints = useMemo(() => {
    const startAge = Math.ceil(result.age * 2) / 2;
    const points: { x: number; y: number }[] = [
      { x: Math.round(result.age * 2) / 2, y: result.currentHeight },
    ];
    for (let a = startAge + 0.5; a <= 17.5; a += 0.5) {
      const h = heightAtSamePercentile(result.currentHeight, result.age, a, result.gender, result.standard);
      if (h > 0) points.push({ x: a, y: h });
    }
    points.push({ x: 18, y: result.predicted });
    return points;
  }, [result]);

  // Reset phases when modal opens
  useEffect(() => {
    if (!isOpen) { setPhase(0); setDrawnPoints(0); return; }
    // Phase 1: count-up immediately
    setPhase(1);
    // Phase 2: show chart background + start progressive line drawing
    const t2 = setTimeout(() => {
      setPhase(2);
      setDrawnPoints(1); // show first point (current height)
    }, 800);
    return () => clearTimeout(t2);
  }, [isOpen]);

  // Progressive line drawing: add one point at a time
  useEffect(() => {
    if (phase < 2 || drawnPoints === 0) return;
    if (drawnPoints >= allPathPoints.length) {
      // All points drawn → phase 3 (done)
      const t = setTimeout(() => setPhase(3), 300);
      return () => clearTimeout(t);
    }
    // Add next point after interval (faster for more points)
    const interval = Math.max(80, 1200 / allPathPoints.length);
    const t = setTimeout(() => setDrawnPoints((p) => p + 1), interval);
    return () => clearTimeout(t);
  }, [phase, drawnPoints, allPathPoints.length]);

  const countUp = useCountUp(result.predicted, 1200, phase >= 1);

  // Currently visible path points
  const pathPoints = allPathPoints.slice(0, drawnPoints);

  const chartData = useMemo(() => {
    const standard = getHeightStandard(result.gender, result.standard);
    const filtered = standard.filter((d) => d.age >= 3 && d.age <= 18);
    const toXY = (vals: number[]) => filtered.map((d, i) => ({ x: d.age, y: vals[i] }));

    return {
      datasets: [
        // Background percentile lines (always visible)
        {
          label: '95th',
          data: toXY(filtered.map((d) => d.p95)),
          borderColor: 'rgba(239,68,68,0.3)',
          borderWidth: 1.5, borderDash: [4, 4] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        {
          label: '50th',
          data: toXY(filtered.map((d) => d.p50)),
          borderColor: 'rgba(34,197,94,0.5)',
          borderWidth: 2, borderDash: [6, 3] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        {
          label: '5th',
          data: toXY(filtered.map((d) => d.p5)),
          borderColor: 'rgba(59,130,246,0.3)',
          borderWidth: 1.5, borderDash: [4, 4] as number[],
          pointRadius: 0, fill: false, tension: 0.3,
        },
        // Prediction path — progressive line drawing (points added one by one)
        ...(pathPoints.length > 0 ? [{
          label: t.chartPathLegend,
          data: pathPoints,
          borderColor: '#0F6E56',
          backgroundColor: 'rgba(15,110,86,0.06)',
          borderWidth: 2.5,
          borderDash: [] as number[],
          pointRadius: pathPoints.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isFirst ? 8 : isLast ? 10 : 2;
          }),
          pointBackgroundColor: pathPoints.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isFirst ? '#0F6E56' : isLast ? '#F59E0B' : 'rgba(15,110,86,0.3)';
          }),
          pointBorderColor: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? '#D97706' : 'rgba(15,110,86,0.3)';
          }),
          pointBorderWidth: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? 2 : 0;
          }),
          pointStyle: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? 'star' as const : 'circle' as const;
          }),
          fill: true,
          tension: 0.4,
        }] : []),
      ],
    };
  }, [result, pathPoints, drawnPoints, allPathPoints.length, t]);

  const options: Parameters<typeof Line>[0]['options'] = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1 / 1.4,
    animation: false as const,  // Disable — we animate by progressively adding points
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 14, font: { size: 12 }, padding: 10,
          filter: (item) => !item.text?.includes('hidden'),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.parsed.y != null ? `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}cm` : '',
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: t.chartXAxis, font: { size: 13 } },
        min: 3, max: 18,
        ticks: { stepSize: 1, font: { size: 12 }, callback: (val) => Number.isInteger(Number(val)) ? `${val}` : '' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: t.chartYAxis, font: { size: 13 } },
        min: 70, max: 185,
        ticks: { font: { size: 12 }, stepSize: 10 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }), [phase, t]);

  const interpretation = result.percentile >= 75
    ? t.interpretHigh
    : result.percentile >= 50
      ? t.interpretMid
      : result.percentile >= 25
        ? t.interpretLow
        : t.interpretCritical;

  const ageYears = Math.floor(result.age);
  const ageMonths = Math.round((result.age % 1) * 12);

  const body = (
    <>
      <div className="space-y-5 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{t.resultTitle}</h2>

        {/* Main result — count-up animation */}
        <div className="bg-[#E8F5F0] rounded-2xl p-5 md:p-6 text-center space-y-2">
          <p className="text-sm md:text-base font-medium text-[#0F6E56]">{t.resultLabel}</p>
          <p className="text-5xl md:text-6xl font-black text-[#0F6E56] leading-none transition-all">
            {countUp.toFixed(1)} <span className="text-2xl md:text-3xl">cm</span>
          </p>
          <div className={`flex justify-center gap-2 flex-wrap text-xs md:text-sm transition-opacity duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="rounded-full bg-[#0F6E56] text-white font-semibold px-3 py-1">
              {result.gender === 'male' ? t.resultGenderMale : t.resultGenderFemale} · {t.pillAge(ageYears, ageMonths)}
            </span>
            <span className="rounded-full bg-white text-[#0F6E56] font-semibold px-3 py-1">
              {t.pillCurrent(result.currentHeight, result.percentile)}
            </span>
          </div>
        </div>

        {/* Chart — line drawing animation. PC 에선 너무 길어지지 않게 폭 제한(1:1.4 비율) */}
        <div className={`transition-opacity duration-500 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="md:max-w-md md:mx-auto">
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 text-center mt-1">
            {t.chartFooter}
          </p>
        </div>

        {/* Interpretation — fade in at end */}
        <div className={`bg-amber-50 rounded-xl p-4 md:p-5 space-y-1.5 transition-all duration-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xs md:text-sm font-bold text-amber-800">{t.interpretH}</p>
          <p className="text-xs md:text-sm text-amber-700 leading-relaxed break-keep">{interpretation}</p>
        </div>

        {/* Methodology note + Kakao CTA — fade in at end */}
        <div className={`space-y-2.5 md:space-y-3 transition-all duration-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gray-50 rounded-xl p-4 md:p-5 space-y-2 text-xs md:text-sm text-gray-600 leading-relaxed break-keep">
            <p><strong>{t.noteBoxPrincipleLabel}</strong> {t.noteBoxPrincipleBody}</p>
            <p><strong>{t.noteBoxPredictedLabel}</strong> {t.noteBoxPredictedBody}</p>
            <p><strong>{t.noteBoxCautionLabel}</strong> {t.noteBoxCautionBody}</p>
          </div>

          {/* 상담 CTA — th 는 LINE, 나머지는 KakaoTalk */}
          <a href={messenger.url} target="_blank" rel="noopener noreferrer"
            onClick={() => trackKakaoConsult('height_calc_result')}
            className={`flex items-center justify-center gap-2 w-full rounded-xl ${messenger.bgClass} py-3.5 md:py-4
                       ${messenger.fgClass} font-bold text-base md:text-lg ${messenger.hoverClass} active:scale-[0.98] transition-all`}>
            {t.kakaoCta}
          </a>

          {/* Reset button — embedded mode only (modal mode uses close button) */}
          {embedded && (
            <button onClick={onClose}
              className="w-full text-center text-xs md:text-sm text-gray-500 underline underline-offset-4 py-2 hover:text-gray-700">
              {t.reset}
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="max-w-lg md:max-w-2xl mx-auto p-5 md:p-8 bg-white">{body}</div>;
  }

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="">
      {body}
    </InfoModal>
  );
}
