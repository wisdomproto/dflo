// admin 환자 상세 성장 그래프 "예측키 추세" 탭 (탭2).
// 예측키(키+뼈나이로 18세 예측) 라인 한 줄 + X축 아래에 실제 진료 날짜 / 만나이 / 뼈나이 / Δ(뼈−만) 표기.
// Δ: + 면 조숙(빨강), − 면 뼈나이가 덜 먹음 = 성장 잠재력↑(초록).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { heightAtSamePercentile, type Nationality } from '@/features/bone-age/lib/growthStandard';
import { calculateAgeAtDate } from '@/shared/utils/age';
import type { Child, HospitalMeasurement } from '@/shared/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const COLOR_PAH = '#6366f1';
const Y_AXIS_W = 46;
const PAD_R = 12;

// "2021-11-29" → "21.11.29"
const fmtDate = (d: string) => d.slice(2, 10).replace(/-/g, '.');

interface TrendRow {
  key: string;
  date: string; // YYYY-MM-DD
  ca: number;
  ba: number;
  height: number;
  pah: number;
}

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
}

export function PredictedHeightTrend({ child, measurements }: Props) {
  const nat: Nationality = child.nationality ?? 'KR';

  const rows = useMemo<TrendRow[]>(() => {
    return [...measurements]
      .filter((m) => m.bone_age != null && typeof m.height === 'number' && m.height! > 0)
      .sort(
        (a, b) => new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime(),
      )
      .map((m, idx) => {
        const ca = calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal;
        const ba = m.bone_age as number;
        const pah = Number(
          heightAtSamePercentile(m.height as number, ba, 18, child.gender, nat).toFixed(1),
        );
        return {
          key: m.id ?? `${idx}`,
          date: m.measured_date.slice(0, 10),
          ca,
          ba,
          height: m.height as number,
          pah,
        };
      });
  }, [child, measurements, nat]);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
        뼈나이가 측정된 회차가 없어 예측키 추세를 표시할 수 없습니다.
      </div>
    );
  }

  const data: any = {
    labels: rows.map((_, i) => `${i}`),
    datasets: [
      {
        label: '예측키',
        data: rows.map((r) => r.pah),
        borderColor: COLOR_PAH,
        backgroundColor: COLOR_PAH,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: PAD_R, top: 6 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: {
        title: { display: true, text: '예측키 (cm)' },
        grid: { color: 'rgba(0,0,0,0.04)' },
        afterFit: (axis: any) => {
          axis.width = Y_AXIS_W;
        },
      },
    },
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Line data={data} options={options} />
      </div>
      <div
        className="grid border-t border-slate-100 pt-1.5 text-center"
        style={{
          gridTemplateColumns: `repeat(${rows.length}, minmax(0,1fr))`,
          paddingLeft: Y_AXIS_W,
          paddingRight: PAD_R,
        }}
      >
        {rows.map((r) => {
          const d = r.ba - r.ca; // 뼈나이 − 만나이
          const good = d <= 0;
          return (
            <div key={r.key} className="leading-[1.35]">
              <div className="text-[10px] font-bold text-slate-700">{fmtDate(r.date)}</div>
              <div className="text-[10px] text-slate-400">만 {r.ca.toFixed(1)}세</div>
              <div className="text-[10px] text-orange-500">뼈 {r.ba.toFixed(1)}세</div>
              <div className={`text-[10px] font-bold ${good ? 'text-emerald-600' : 'text-rose-500'}`}>
                {d >= 0 ? '+' : ''}
                {d.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
