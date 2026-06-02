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
import { splitBoneAgeYM } from '@/shared/utils/boneAge';
import type { Child, HospitalMeasurement } from '@/shared/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const COLOR_PAH = '#6366f1';
const Y_AXIS_W = 46;
const PAD_R = 12;

// "2021-11-29" → "21.11.29"
const fmtDate = (d: string) => d.slice(2, 10).replace(/-/g, '.');

// 뼈−만 차이(소수점 년) → 개월 기준 표기. 예: 0.7 → "+8개월", -1.33 → "-1년 4개월".
function fmtDeltaYM(decYears: number): string {
  const total = Math.round(decYears * 12);
  const sign = total > 0 ? '+' : total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const y = Math.floor(abs / 12);
  const mo = abs % 12;
  if (y === 0) return `${sign}${mo}개월`;
  if (mo === 0) return `${sign}${y}년`;
  return `${sign}${y}년 ${mo}개월`;
}

interface TrendRow {
  key: string;
  date: string; // YYYY-MM-DD
  ca: number; // 만나이 소수점(Δ 계산용)
  caY: number; // 만나이 년
  caM: number; // 만나이 개월
  ba: number;
  height: number;
  pah: number;
}

interface Props {
  child: Child;
  measurements: HospitalMeasurement[];
  /** 확대 모달용 — 텍스트·점·축 폰트를 키운다. */
  enlarged?: boolean;
}

export function PredictedHeightTrend({ child, measurements, enlarged = false }: Props) {
  const nat: Nationality = child.nationality ?? 'KR';
  const yAxisW = enlarged ? 64 : Y_AXIS_W;
  const cellTxt = enlarged ? 'text-[15px]' : 'text-[10px]';

  const rows = useMemo<TrendRow[]>(() => {
    return [...measurements]
      .filter((m) => m.bone_age != null && typeof m.height === 'number' && m.height! > 0)
      .sort(
        (a, b) => new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime(),
      )
      .map((m, idx) => {
        const age = calculateAgeAtDate(child.birth_date, new Date(m.measured_date));
        const ba = m.bone_age as number;
        const pah = Number(
          heightAtSamePercentile(m.height as number, ba, 18, child.gender, nat).toFixed(1),
        );
        return {
          key: m.id ?? `${idx}`,
          date: m.measured_date.slice(0, 10),
          ca: age.decimal,
          caY: age.years,
          caM: age.months,
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
        borderWidth: enlarged ? 3.5 : 2.5,
        pointRadius: enlarged ? 6 : 4,
        pointHoverRadius: enlarged ? 8 : 6,
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
      // offset:true → 포인트를 각 밴드(카테고리) 중앙에 배치 → 아래 HTML 그리드
      // (1fr 칸마다 중앙 정렬된 날짜/나이 텍스트)와 가로 위치가 정확히 맞는다.
      x: { offset: true, grid: { display: false }, ticks: { display: false } },
      y: {
        title: {
          display: true,
          text: '예측키 (cm)',
          font: { size: enlarged ? 17 : 12 },
        },
        ticks: { font: { size: enlarged ? 15 : 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
        afterFit: (axis: any) => {
          axis.width = yAxisW;
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
        className={`grid border-t border-slate-100 text-center ${enlarged ? 'pt-3' : 'pt-1.5'}`}
        style={{
          gridTemplateColumns: `repeat(${rows.length}, minmax(0,1fr))`,
          paddingLeft: yAxisW,
          paddingRight: PAD_R,
        }}
      >
        {rows.map((r) => {
          const d = r.ba - r.ca; // 뼈나이 − 만나이
          const good = d <= 0;
          const baYM = splitBoneAgeYM(r.ba);
          return (
            <div key={r.key} className={enlarged ? 'leading-[1.6]' : 'leading-[1.35]'}>
              <div className={`${cellTxt} font-bold text-slate-700`}>{fmtDate(r.date)}</div>
              <div className={`${cellTxt} text-slate-400`}>
                만 {r.caY}세 {r.caM}개월
              </div>
              <div className={`${cellTxt} text-orange-500`}>
                뼈 {baYM.y}세 {baYM.m}개월
              </div>
              <div className={`${cellTxt} font-bold ${good ? 'text-emerald-600' : 'text-rose-500'}`}>
                {fmtDeltaYM(d)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
