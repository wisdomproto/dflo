// ================================================
// GrowthChart - 187 성장케어 v4
// 표준 성장곡선 (5th/50th/95th) + 실제 측정값 오버레이
// GrowthPage & InfoPage(CaseDetail) 공용
// ================================================

import { useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { getHeightStandard } from '@/shared/data/growthStandard';
import type { Gender } from '@/shared/types';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, zoomPlugin);

// ── 공통 측정 포인트 인터페이스 ──
export interface GrowthPoint {
  /** 만나이 (소수, 예: 12.5) */
  age: number;
  /** 키 (cm) */
  height: number;
}

interface GrowthChartProps {
  gender: Gender;
  points: GrowthPoint[];
  /** @deprecated 비율 고정(1:1.5)으로 대체됨 — 무시됨 */
  height?: string;
  /** 제목 표시 여부, 기본 true */
  showTitle?: boolean;
  /** 더블클릭 줌 활성화 (관리자용), 기본 false */
  zoomable?: boolean;
  /** 크게 보기 버튼 클릭 콜백 */
  onExpand?: () => void;
}

export function GrowthChart({
  gender,
  points,
  showTitle = true,
  zoomable = false,
  onExpand,
}: GrowthChartProps) {
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  const chartData = useMemo(() => {
    if (points.length === 0) return null;

    const standard = getHeightStandard(gender);

    // 0.5세 단위로 스냅
    const snapped = points.map((p) => ({
      age: Math.round(p.age * 2) / 2,
      height: p.height,
    }));

    const ages = snapped.map((p) => p.age);
    // zoomable: 전체 범위(3~18), 아닐 때: 측정 나이 ±1세
    const minAge = zoomable ? 3 : Math.max(2, Math.floor(Math.min(...ages)) - 1);
    const maxAge = zoomable ? 18 : Math.min(18, Math.ceil(Math.max(...ages)) + 1);
    const stdFiltered = standard.filter((d) => d.age >= minAge && d.age <= maxAge);

    // {x, y} 포인트 형식으로 변환 (LinearScale 용)
    const toXY = (vals: number[]) =>
      stdFiltered.map((d, i) => ({ x: d.age, y: vals[i] }));

    // 초기 뷰 범위 (측정값 ±1세)
    const focusMin = Math.max(3, Math.floor(Math.min(...ages)) - 1);
    const focusMax = Math.min(18, Math.ceil(Math.max(...ages)) + 1);

    // y축 전체 범위 (줌 제한용)
    const allHeights = stdFiltered.flatMap((d) => [d.p5, d.p50, d.p95]);
    const yMin = Math.floor(Math.min(...allHeights) - 5);
    const yMax = Math.ceil(Math.max(...allHeights) + 5);

    return {
      minAge,
      maxAge,
      focusMin,
      focusMax,
      yMin,
      yMax,
      datasets: [
        {
          label: '95th',
          data: toXY(stdFiltered.map((d) => d.p95)),
          borderColor: 'rgba(239,68,68,0.3)',
          backgroundColor: 'rgba(239,68,68,0.05)',
          borderWidth: 1.5,
          borderDash: [4, 4] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: '50th',
          data: toXY(stdFiltered.map((d) => d.p50)),
          borderColor: 'rgba(34,197,94,0.5)',
          backgroundColor: 'rgba(34,197,94,0.08)',
          borderWidth: 2,
          borderDash: [6, 3] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: '5th',
          data: toXY(stdFiltered.map((d) => d.p5)),
          borderColor: 'rgba(59,130,246,0.3)',
          backgroundColor: 'rgba(59,130,246,0.05)',
          borderWidth: 1.5,
          borderDash: [4, 4] as number[],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
        {
          label: '실제 키',
          data: snapped.map((p) => ({ x: p.age, y: p.height })),
          borderColor: '#667eea',
          backgroundColor: '#667eea',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          spanGaps: true,
          tension: 0.3,
        },
      ],
    };
  }, [gender, points]);

  // 왼쪽 더블클릭 → zoom in (애니메이션), 우클릭 → 3~18세 전체 보기
  const handleDblClick = useCallback(() => {
    chartRef.current?.zoom({ x: 1.5, y: 1.5 });
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const chart = chartRef.current;
    if (!chart) return;
    // 3~18세 전체 보기로 직접 설정
    chart.zoomScale('x', { min: 3, max: 18 }, 'default');
  }, []);

  useEffect(() => {
    if (!zoomable) return;
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;
    canvas.addEventListener('dblclick', handleDblClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => {
      canvas.removeEventListener('dblclick', handleDblClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [zoomable, handleDblClick, handleContextMenu, chartData]);

  if (!chartData) return null;

  const options: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1 / 1.5,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 18, font: { size: 14 }, padding: 14 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.parsed.y != null ? `${ctx.dataset.label}: ${ctx.parsed.y}cm` : '',
        },
      },
      zoom: zoomable
        ? {
            zoom: {
              mode: 'xy' as const,
              wheel: { enabled: true },
              pinch: { enabled: true },
            },
            pan: {
              enabled: true,
              mode: 'xy' as const,
            },
            limits: {
              x: { min: chartData.minAge, max: chartData.maxAge, minRange: 2 },
              y: { min: chartData.yMin, max: chartData.yMax, minRange: 5 },
            },
          }
        : undefined,
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: '나이(세)', font: { size: 14 } },
        ticks: {
          font: { size: 13 },
          stepSize: 1,
          callback: (val) => Number.isInteger(Number(val)) ? `${val}` : '',
        },
        grid: { display: false },
        min: zoomable ? chartData.minAge : chartData.minAge,
        max: zoomable ? chartData.maxAge : chartData.maxAge,
      },
      y: {
        title: { display: true, text: '키(cm)', font: { size: 14 } },
        ticks: { font: { size: 13 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  return (
    <div>
      {showTitle && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-bold text-gray-800">성장 그래프</h4>
          <div className="flex items-center gap-3">
            {zoomable && (
              <span className="text-xs text-gray-400">
                더블클릭: 확대 · 우클릭: 축소
              </span>
            )}
            {onExpand && (
              <button
                onClick={onExpand}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                title="크게 보기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="flex justify-center gap-6 mt-4 text-lg text-gray-500">
        <span>--- 5th / 50th / 95th 표준곡선</span>
        <span className="text-primary font-bold">● 실제 측정값</span>
      </div>
    </div>
  );
}
