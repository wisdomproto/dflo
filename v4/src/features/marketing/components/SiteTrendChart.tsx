// src/features/marketing/components/SiteTrendChart.tsx
// 일자별 추세 라인 차트 (사용자 / 세션 / 페이지뷰). 사이트 분석 대시보드 전용.
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DailyPoint } from '../services/marketingAnalyticsService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// GA4 date(YYYYMMDD) → MM/DD
function fmtDate(d: string): string {
  return d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d;
}

export function SiteTrendChart({ daily }: { daily: DailyPoint[] }) {
  if (!daily.length) {
    return <p className="rounded-lg bg-gray-50 px-3 py-8 text-center text-xs text-gray-400">데이터 없음</p>;
  }
  const labels = daily.map((p) => fmtDate(p.date));
  const data = {
    labels,
    datasets: [
      {
        label: '사용자',
        data: daily.map((p) => p.users),
        borderColor: '#4A2D6B',
        backgroundColor: 'rgba(74,45,107,0.10)',
        fill: true,
        tension: 0.3,
        pointRadius: daily.length > 31 ? 0 : 2,
      },
      {
        label: '세션',
        data: daily.map((p) => p.sessions),
        borderColor: '#06B6D4',
        fill: false,
        tension: 0.3,
        pointRadius: daily.length > 31 ? 0 : 2,
      },
      {
        label: '페이지뷰',
        data: daily.map((p) => p.views),
        borderColor: '#F59E0B',
        fill: false,
        tension: 0.3,
        pointRadius: daily.length > 31 ? 0 : 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
    },
  };
  return (
    <div style={{ height: 220 }}>
      <Line data={data} options={options} />
    </div>
  );
}
