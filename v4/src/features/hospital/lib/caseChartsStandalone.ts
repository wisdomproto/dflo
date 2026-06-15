// 치료사례 후보 페이지(정적 HTML, /marketing/strategy/case-candidates.html)용 차트 렌더러.
// 환자 진료 화면의 두 차트(AdminPatientGrowthChart 성장곡선 + PredictedHeightTrend 예측키추세)와
// 동일한 "그리는 모듈"(growthStandard LMS·예측 투영 + Chart.js)을 그대로 재사용한다.
// React 가 아니라 순수 DOM/Chart.js — esbuild 로 IIFE 번들해 정적 페이지에 <script> 로 싣는다.
// 빌드: node cases/build_case_charts.mjs → v4/public/marketing/strategy/case-charts.js
import { Chart, registerables } from 'chart.js';
import {
  getHeightStandard,
  heightAtSamePercentile,
  calculateHeightPercentileLMS,
  type Nationality,
} from '@/features/bone-age/lib/growthStandard';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { splitBoneAgeYM } from '@/shared/utils/boneAge';

Chart.register(...registerables);

const X_MIN = 5, X_MAX = 18, Y_MIN = 90, Y_MAX = 190;
const COLORS = {
  p3: 'rgba(59,130,246,0.4)', p15: 'rgba(245,158,11,0.4)', p50: 'rgba(34,197,94,0.4)',
  p85: 'rgba(239,68,68,0.4)', p97: 'rgba(168,85,247,0.4)',
  patient: '#0f172a', baProj: '#6366f1', pah: '#6366f1',
};
const PERCENTILE_KEYS = ['p3', 'p15', 'p50', 'p85', 'p97'] as const;

// 두 데이터 모드:
//  내부(식별)  — measured_date + 상위 birth_date 로 나이 계산
//  외부(비식별) — ageDecimal/caY/caM 를 미리 넣어 날짜·생년월일 없이 (소스 노출돼도 환자 특정 불가)
interface CaseMeasurement {
  height: number;
  bone_age: number | null;
  measured_date?: string;
  ageDecimal?: number; // 비식별: 만나이(소수)
  caY?: number;        // 비식별: 만나이 년
  caM?: number;        // 비식별: 만나이 개월
}
interface CaseData {
  gender: 'male' | 'female';
  birth_date?: string;
  nationality?: Nationality;
  measurements: CaseMeasurement[];
}

// 측정 → 만나이. 비식별 데이터면 미리 넣은 ageDecimal/caY/caM 사용, 아니면 날짜로 계산.
function ageOf(m: CaseMeasurement, birth?: string): { decimal: number; years: number; months: number } {
  if (m.ageDecimal != null) return { decimal: m.ageDecimal, years: m.caY ?? 0, months: m.caM ?? 0 };
  const a = calculateAgeAtDate(birth ?? '', new Date(m.measured_date ?? ''));
  return { decimal: a.decimal, years: a.years, months: a.months };
}
function sortKey(m: CaseMeasurement): number {
  return m.ageDecimal != null ? m.ageDecimal : new Date(m.measured_date ?? '').getTime();
}

function sortedHeights(d: CaseData) {
  return [...d.measurements]
    .filter((m) => typeof m.height === 'number' && m.height > 0)
    .sort((a, b) => sortKey(a) - sortKey(b));
}

// ── 성장 곡선 (KDCA 백분위 + BA 측정점 + 마지막 BA 시점 예측 투영 + 예측 성인키 라인) ──
function renderGrowth(canvas: HTMLCanvasElement, d: CaseData): void {
  const nat: Nationality = d.nationality ?? 'KR';
  const std = getHeightStandard(d.gender, nat).filter((s) => s.age >= X_MIN && s.age <= X_MAX);
  const toXY = (pick: (s: typeof std[number]) => number) => std.map((s) => ({ x: s.age, y: pick(s) }));

  const percentileDs = PERCENTILE_KEYS.map((key) => ({
    label: key, data: toXY((s) => (s as unknown as Record<string, number>)[key]),
    borderColor: COLORS[key], backgroundColor: COLORS[key],
    borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.35, order: 3,
  }));

  // BA 측정 회차만 — 환자 화면 기본(baOnly) 과 동일
  const ms = sortedHeights(d);
  const baMs = ms.filter((m) => m.bone_age != null);
  const pts = baMs.map((m) => ({ x: ageOf(m, d.birth_date).decimal, y: m.height }));
  const patientDs = {
    label: 'patient', data: pts, borderColor: COLORS.patient, backgroundColor: '#f97316',
    borderWidth: 2, pointStyle: 'rectRot' as const, pointRadius: 7, pointHoverRadius: 9,
    pointBorderColor: '#ffffff', pointBorderWidth: 1.5, showLine: pts.length > 1, tension: 0, order: 0,
  };

  // 예측 투영·최종 예측키 모두 제거 — 성장곡선은 실측(백분위+다이아)만, 예측은 우측 '예측키 추세' 전담.

  (canvas as unknown as { _chart?: Chart })._chart = new Chart(canvas, {
    type: 'line',
    data: { datasets: [...percentileDs, patientDs] as never },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (ctx) => ctx.dataset.label === 'patient',
          callbacks: {
            label: (ctx) => {
              if (ctx.parsed.y == null) return '';
              return `실측 ${ctx.parsed.y}cm @ 만 ${Number(ctx.parsed.x).toFixed(1)}세`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear', title: { display: true, text: 'Age (years)', font: { size: 12 } },
          min: X_MIN, max: X_MAX,
          ticks: { stepSize: 1, font: { size: 11 }, callback: (v) => (Number.isInteger(Number(v)) ? `${v}` : '') },
          grid: { color: 'rgba(0,0,0,0.04)' },
        },
        y: {
          title: { display: true, text: 'Height (cm)', font: { size: 12 } },
          min: Y_MIN, max: Y_MAX, ticks: { stepSize: 5, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.04)' },
        },
      },
    },
  });
}

const fmtDate = (s: string) => s.slice(2, 10).replace(/-/g, '.');
function fmtDeltaYM(dec: number): string {
  const total = Math.round(dec * 12);
  const sign = total > 0 ? '+' : total < 0 ? '-' : '';
  const abs = Math.abs(total), y = Math.floor(abs / 12), mo = abs % 12;
  if (y === 0) return `${sign}${mo}개월`;
  if (mo === 0) return `${sign}${y}년`;
  return `${sign}${y}년 ${mo}개월`;
}

// ── 예측키 추세 (PredictedHeightTrend 와 동일 — 예측키 라인 + 백분위 라벨 + 하단 그리드) ──
function renderTrend(canvas: HTMLCanvasElement, gridEl: HTMLElement, d: CaseData): void {
  const nat: Nationality = d.nationality ?? 'KR';
  const Y_AXIS_W = 46, PAD_R = 12;
  const rows = sortedHeights(d)
    .filter((m) => m.bone_age != null)
    .map((m) => {
      const age = ageOf(m, d.birth_date);
      const ba = m.bone_age as number;
      const pah = Number(heightAtSamePercentile(m.height, ba, 18, d.gender, nat).toFixed(1));
      const pct = calculateHeightPercentileLMS(m.height, ba, d.gender, nat);
      // 비식별 모드(measured_date 없음)면 날짜 칸은 비운다.
      return { date: m.measured_date ? m.measured_date.slice(0, 10) : '', ca: age.decimal, caY: age.years, caM: age.months, ba, pah, pct };
    });
  if (rows.length === 0) {
    gridEl.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">뼈나이가 측정된 회차가 없어 예측키 추세를 표시할 수 없습니다.</div>';
    return;
  }

  const pctLabelPlugin = {
    id: 'pctLabels',
    afterDatasetsDraw(chart: Chart) {
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data) return;
      ctx.save();
      ctx.font = '700 10px sans-serif'; ctx.fillStyle = COLORS.pah;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      meta.data.forEach((pt, i) => {
        const r = rows[i];
        if (r) ctx.fillText(`${Math.round(r.pct)}%ile`, pt.x, pt.y - 8);
      });
      ctx.restore();
    },
  };

  (canvas as unknown as { _chart?: Chart })._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: rows.map((_, i) => `${i}`),
      datasets: [{
        label: '예측키', data: rows.map((r) => r.pah),
        borderColor: COLORS.pah, backgroundColor: COLORS.pah,
        tension: 0.3, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      layout: { padding: { right: PAD_R, top: 18 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { offset: true, grid: { display: false }, ticks: { display: false } },
        y: {
          title: { display: true, text: '예측키 (cm)', font: { size: 12 } },
          ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' },
          afterFit: (axis) => { (axis as { width: number }).width = Y_AXIS_W; },
        },
      },
    },
    plugins: [pctLabelPlugin],
  });

  // 하단 그리드 — 날짜 / 만나이 / 뼈나이 / Δ(뼈−만)
  gridEl.style.cssText = `display:grid;grid-template-columns:repeat(${rows.length},minmax(0,1fr));text-align:center;border-top:1px solid #f1f5f9;padding-top:6px;padding-left:${Y_AXIS_W}px;padding-right:${PAD_R}px`;
  gridEl.innerHTML = rows.map((r) => {
    const delta = r.ba - r.ca, good = delta <= 0, baYM = splitBoneAgeYM(r.ba);
    return `<div style="line-height:1.35">
      ${r.date ? `<div style="font-size:10px;font-weight:700;color:#334155">${fmtDate(r.date)}</div>` : ''}
      <div style="font-size:10px;color:#94a3b8">만 ${r.caY}세 ${r.caM}개월</div>
      <div style="font-size:10px;color:#f97316">뼈 ${baYM.y}세 ${baYM.m}개월</div>
      <div style="font-size:10px;font-weight:700;color:${good ? '#059669' : '#f43f5e'}">${fmtDeltaYM(delta)}</div>
    </div>`;
  }).join('');
}

(window as unknown as { CaseCharts: unknown }).CaseCharts = { renderGrowth, renderTrend };
