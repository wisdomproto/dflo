// ================================================
// HeightCalculatorResult - 예상키 측정 결과 모달
// 성장 차트 (3~18세) + 해석 가이드 + 카카오톡 CTA
// ================================================

import { useMemo } from 'react';
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

export function HeightCalculatorResult({ result, isOpen, onClose }: Props) {
  const chartData = useMemo(() => {
    const standard = getHeightStandard(result.gender);
    const filtered = standard.filter((d) => d.age >= 3 && d.age <= 18);
    const toXY = (vals: number[]) => filtered.map((d, i) => ({ x: d.age, y: vals[i] }));

    return {
      datasets: [
        {
          label: '95th',
          data: toXY(filtered.map((d) => d.p95)),
          borderColor: 'rgba(239,68,68,0.3)',
          borderWidth: 1.5,
          borderDash: [4, 4] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: '50th',
          data: toXY(filtered.map((d) => d.p50)),
          borderColor: 'rgba(34,197,94,0.5)',
          borderWidth: 2,
          borderDash: [6, 3] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: '5th',
          data: toXY(filtered.map((d) => d.p5)),
          borderColor: 'rgba(59,130,246,0.3)',
          borderWidth: 1.5,
          borderDash: [4, 4] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        // Prediction path: intermediate points at same percentile
        (() => {
          const startAge = Math.ceil(result.age * 2) / 2;
          const pathPoints: { x: number; y: number }[] = [
            { x: Math.round(result.age * 2) / 2, y: result.currentHeight },
          ];
          for (let a = startAge + 0.5; a <= 17.5; a += 0.5) {
            const h = heightAtSamePercentile(result.currentHeight, result.age, a, result.gender);
            if (h > 0) pathPoints.push({ x: a, y: h });
          }
          pathPoints.push({ x: 18, y: result.predicted });
          return {
            label: '예상 성장 경로',
            data: pathPoints,
            borderColor: 'rgba(15,110,86,0.35)',
            backgroundColor: 'rgba(15,110,86,0.08)',
            borderWidth: 2,
            borderDash: [3, 3] as number[],
            pointRadius: pathPoints.map((_, i) => (i === 0 || i === pathPoints.length - 1) ? 0 : 2.5),
            pointBackgroundColor: 'rgba(15,110,86,0.3)',
            pointBorderColor: 'rgba(15,110,86,0.3)',
            fill: false,
            tension: 0.4,
          };
        })(),
        {
          label: '현재 키',
          data: [{ x: Math.round(result.age * 2) / 2, y: result.currentHeight }],
          borderColor: '#0F6E56',
          backgroundColor: '#0F6E56',
          borderWidth: 0,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        },
        {
          label: '예상 성인 키',
          data: [{ x: 18, y: result.predicted }],
          borderColor: '#D97706',
          backgroundColor: '#F59E0B',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'star' as const,
          showLine: false,
        },
      ],
    };
  }, [result]);

  const options: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1 / 1.4,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 14, font: { size: 11 }, padding: 10 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.parsed.y != null ? `${ctx.dataset.label}: ${ctx.parsed.y}cm` : '',
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: '나이(세)', font: { size: 12 } },
        min: 3,
        max: 18,
        ticks: { stepSize: 1, font: { size: 11 }, callback: (val) => Number.isInteger(Number(val)) ? `${val}` : '' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: '키(cm)', font: { size: 12 } },
        min: 70,
        max: 185,
        ticks: { font: { size: 11 }, stepSize: 10 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  const interpretation = result.percentile >= 75
    ? '현재 또래 대비 큰 편입니다. 꾸준한 성장 관리로 잠재력을 최대한 발휘할 수 있습니다.'
    : result.percentile >= 50
      ? '현재 또래 평균 수준입니다. 적절한 영양, 운동, 수면 관리로 더 클 수 있습니다.'
      : result.percentile >= 25
        ? '또래 평균보다 약간 작은 편입니다. 전문 상담을 통해 성장 가능성을 확인해보세요.'
        : '또래 대비 작은 편이므로, 성장판이 열려있는 지금이 성장 치료의 골든타임입니다.';

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="예상키 측정 결과">
      <div className="space-y-5">
        {/* Main result */}
        <div className="bg-[#E8F5F0] rounded-2xl p-5 text-center space-y-2">
          <p className="text-sm font-medium text-[#0F6E56]">예상 성인 키</p>
          <p className="text-5xl font-black text-[#0F6E56] leading-none">
            {result.predicted.toFixed(1)} <span className="text-2xl">cm</span>
          </p>
          <div className="flex justify-center gap-2 flex-wrap text-xs">
            <span className="rounded-full bg-[#0F6E56] text-white font-semibold px-3 py-1">
              {result.gender === 'male' ? '남아' : '여아'} · {Math.floor(result.age)}세 {Math.round((result.age % 1) * 12)}개월
            </span>
            <span className="rounded-full bg-white text-[#0F6E56] font-semibold px-3 py-1">
              현재 {result.currentHeight}cm · 백분위 {result.percentile.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Chart */}
        <div>
          <Line data={chartData} options={options} />
          <p className="text-[10px] text-gray-400 text-center mt-1">
            한국 소아 성장 표준 (2017 질병관리청) · 5th / 50th / 95th 백분위
          </p>
        </div>

        {/* Interpretation */}
        <div className="bg-amber-50 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-amber-800">📋 해석 가이드</p>
          <p className="text-xs text-amber-700 leading-relaxed">{interpretation}</p>
        </div>

        {/* CTA */}
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#FEE500] py-3.5
                     text-[#3C1E1E] font-bold text-base hover:bg-[#FDD800] active:scale-[0.98] transition-all">
          <span>💬</span> 전문 상담 받아보세요
        </a>
      </div>
    </InfoModal>
  );
}
