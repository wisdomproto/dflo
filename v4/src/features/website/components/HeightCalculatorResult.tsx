// ================================================
// HeightCalculatorResult - 예상키 측정 결과 모달
// 애니메이션: 카운트업 숫자 + 선 그리기 + 포인트 팝
// ================================================

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { heightAtSamePercentile, getHeightStandard } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
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

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export interface HeightResult {
  predicted: number;
  percentile: number;
  age: number;
  currentHeight: number;
  gender: 'male' | 'female';
}

interface Props {
  result: HeightResult;
  isOpen: boolean;
  onClose: () => void;
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

export function HeightCalculatorResult({ result, isOpen, onClose }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [phase, setPhase] = useState(0); // 0=init, 1=countUp, 2=chart, 3=done
  const [drawnPoints, setDrawnPoints] = useState(0); // how many path points are visible
  const chartRef = useRef<ChartJS<'line'>>(null);

  const allPathPoints = useMemo(() => {
    const startAge = Math.ceil(result.age * 2) / 2;
    const points: { x: number; y: number }[] = [
      { x: Math.round(result.age * 2) / 2, y: result.currentHeight },
    ];
    for (let a = startAge + 0.5; a <= 17.5; a += 0.5) {
      const h = heightAtSamePercentile(result.currentHeight, result.age, a, result.gender);
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
    const standard = getHeightStandard(result.gender);
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
          label: '예상 성장 경로',
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
  }, [result, pathPoints, drawnPoints, allPathPoints.length]);

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
          boxWidth: 14, font: { size: 11 }, padding: 10,
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
        title: { display: true, text: '나이(세)', font: { size: 12 } },
        min: 3, max: 18,
        ticks: { stepSize: 1, font: { size: 11 }, callback: (val) => Number.isInteger(Number(val)) ? `${val}` : '' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: '키(cm)', font: { size: 12 } },
        min: 70, max: 185,
        ticks: { font: { size: 11 }, stepSize: 10 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }), [phase]);

  const interpretation = result.percentile >= 75
    ? '현재 또래 대비 큰 편입니다. 꾸준한 성장 관리로 잠재력을 최대한 발휘할 수 있습니다.'
    : result.percentile >= 50
      ? '현재 또래 평균 수준입니다. 적절한 영양, 운동, 수면 관리로 더 클 수 있습니다.'
      : result.percentile >= 25
        ? '또래 평균보다 약간 작은 편입니다. 전문 상담을 통해 성장 가능성을 확인해보세요.'
        : '또래 대비 작은 편이므로, 성장판이 열려있는 지금이 성장 치료의 골든타임입니다.';

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-5">
        {/* Title + help button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-900">예상키 측정 결과</h2>
          <button onClick={() => setShowHelp(!showHelp)}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-gray-100 text-xs font-bold shrink-0">
            ?
          </button>
        </div>

        {/* Help dropdown */}
        {showHelp && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-600 leading-relaxed animate-[fadeUp_0.3s_ease-out]">
            <p><strong>📊 측정 원리:</strong> 한국 질병관리청(2017) 소아·청소년 성장 표준 데이터(LMS 방법) 기반</p>
            <p><strong>🎯 예상 키:</strong> 현재 키의 백분위를 유지한다는 가정 하에 18세 시점의 동일 백분위 키를 역산</p>
            <p><strong>⚠️ 참고:</strong> 골연령, 성장호르몬, 영양 상태 등은 반영되지 않은 통계적 추정치입니다. 정확한 진단은 전문의 상담이 필요합니다.</p>
          </div>
        )}

        {/* Main result — count-up animation */}
        <div className="bg-[#E8F5F0] rounded-2xl p-5 text-center space-y-2">
          <p className="text-sm font-medium text-[#0F6E56]">예상 성인 키</p>
          <p className="text-5xl font-black text-[#0F6E56] leading-none transition-all">
            {countUp.toFixed(1)} <span className="text-2xl">cm</span>
          </p>
          <div className={`flex justify-center gap-2 flex-wrap text-xs transition-opacity duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="rounded-full bg-[#0F6E56] text-white font-semibold px-3 py-1">
              {result.gender === 'male' ? '남아' : '여아'} · {Math.floor(result.age)}세 {Math.round((result.age % 1) * 12)}개월
            </span>
            <span className="rounded-full bg-white text-[#0F6E56] font-semibold px-3 py-1">
              현재 {result.currentHeight}cm · 백분위 {result.percentile.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Chart — line drawing animation */}
        <div className={`transition-opacity duration-500 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <Line ref={chartRef} data={chartData} options={options} />
          <p className="text-[10px] text-gray-400 text-center mt-1">
            한국 소아 성장 표준 (2017 질병관리청) · 5th / 50th / 95th 백분위
          </p>
        </div>

        {/* Interpretation — fade in at end */}
        <div className={`bg-amber-50 rounded-xl p-4 space-y-1.5 transition-all duration-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xs font-bold text-amber-800">📋 해석 가이드</p>
          <p className="text-xs text-amber-700 leading-relaxed">{interpretation}</p>
        </div>

        {/* CTA — fade in at end */}
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full rounded-xl bg-[#FEE500] py-3.5
                     text-[#3C1E1E] font-bold text-base hover:bg-[#FDD800] active:scale-[0.98] transition-all duration-700
                     ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span>💬</span> 전문 상담 받아보세요
        </a>
      </div>
    </InfoModal>
  );
}
