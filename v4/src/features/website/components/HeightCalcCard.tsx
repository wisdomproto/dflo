// ================================================
// HeightCalcCard - 4:5 카드 안에 입력 폼 ↔ 결과를 토글
// 모달 X. 같은 카드 안에서 계산 후 바로 결과로 전환된다.
// ================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
  heightAtSamePercentile,
  getHeightStandard,
} from '@/shared/data/growthStandard';
import { trackKakaoConsult } from '@/shared/lib/analytics';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { HeightCalcSlide } from '../types/websiteSection';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_qxnKxfX';

interface Props {
  slide: HeightCalcSlide;
}

interface Result {
  predicted: number;
  percentile: number;
  age: number;
  currentHeight: number;
  gender: 'male' | 'female';
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(eased * target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);
  return value;
}

export function HeightCalcCard({ slide }: Props) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const ctaBg = slide.ctaBgColor || '#0F6E56';
  const ctaFg = slide.ctaTextColor || '#ffffff';
  const ctaText = slide.ctaText || '예상키 계산하기';
  const resultCtaText = slide.resultCtaText || '1:1 카톡 상담';
  const resultCtaUrl = slide.resultCtaUrl || KAKAO_URL;

  const calculate = () => {
    const h = parseFloat(height);
    if (!birthDate || !h) return;
    const age = calculateAgeAtDate(birthDate, new Date());
    const pct = calculateHeightPercentileLMS(h, age.decimal, gender);
    const pred = predictAdultHeightLMS(h, age.decimal, gender);
    setResult({ predicted: pred, percentile: pct, age: age.decimal, currentHeight: h, gender });
  };

  const reset = () => setResult(null);

  if (result) {
    return <CardResult result={result} ctaText={resultCtaText} ctaUrl={resultCtaUrl} onReset={reset} />;
  }

  return (
    <div className="w-full h-full flex flex-col p-5 bg-white">
      {/* Header */}
      <div className="text-center mb-3">
        {slide.badge && (
          <p className="text-[11px] font-semibold tracking-wider mb-1.5" style={{ color: ctaBg }}>
            {slide.badge}
          </p>
        )}
        <h2 className="text-[17px] font-extrabold text-gray-900 leading-tight">
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{slide.subtitle}</p>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col gap-3 justify-center">
        {/* Gender */}
        <div>
          <span className="text-[10px] font-semibold text-gray-500 mb-1 block">성별</span>
          <div className="flex gap-1.5">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
                style={{
                  background: gender === g ? ctaBg : '#f3f4f6',
                  color: gender === g ? ctaFg : '#6b7280',
                }}
              >
                {g === 'male' ? '👦 남아' : '👧 여아'}
              </button>
            ))}
          </div>
        </div>

        {/* Birth date */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">생년월일</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ }}
          />
        </div>

        {/* Height */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">현재 키 (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="예: 132.5"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={calculate}
        disabled={!birthDate || !height}
        className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all mt-3"
        style={{ background: ctaBg, color: ctaFg }}
      >
        📊 {ctaText}
      </button>
    </div>
  );
}

// ============== RESULT VIEW ==============
interface ResultProps {
  result: Result;
  ctaText: string;
  ctaUrl: string;
  onReset: () => void;
}

function CardResult({ result, ctaText, ctaUrl, onReset }: ResultProps) {
  const [drawnPoints, setDrawnPoints] = useState(1);

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

  useEffect(() => {
    setDrawnPoints(1);
  }, [result]);

  useEffect(() => {
    if (drawnPoints >= allPathPoints.length) return;
    const interval = Math.max(60, 800 / allPathPoints.length);
    const t = setTimeout(() => setDrawnPoints((p) => p + 1), interval);
    return () => clearTimeout(t);
  }, [drawnPoints, allPathPoints.length]);

  const countUp = useCountUp(result.predicted, 1200, true);
  const pathPoints = allPathPoints.slice(0, drawnPoints);

  const chartData = useMemo(() => {
    const standard = getHeightStandard(result.gender);
    const filtered = standard.filter((d) => d.age >= 3 && d.age <= 18);
    const toXY = (vals: number[]) => filtered.map((d, i) => ({ x: d.age, y: vals[i] }));
    return {
      datasets: [
        { label: '95th', data: toXY(filtered.map((d) => d.p95)), borderColor: 'rgba(239,68,68,0.25)', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false, tension: 0.3 },
        { label: '50th', data: toXY(filtered.map((d) => d.p50)), borderColor: 'rgba(34,197,94,0.4)', borderWidth: 1.5, borderDash: [4, 2], pointRadius: 0, fill: false, tension: 0.3 },
        { label: '5th', data: toXY(filtered.map((d) => d.p5)), borderColor: 'rgba(59,130,246,0.25)', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false, tension: 0.3 },
        ...(pathPoints.length > 0 ? [{
          label: '예상',
          data: pathPoints,
          borderColor: '#0F6E56',
          backgroundColor: 'rgba(15,110,86,0.08)',
          borderWidth: 2,
          pointRadius: pathPoints.map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isFirst ? 5 : isLast ? 7 : 0;
          }),
          pointBackgroundColor: pathPoints.map((_, i) => {
            const isLast = i === pathPoints.length - 1 && drawnPoints >= allPathPoints.length;
            return isLast ? '#F59E0B' : '#0F6E56';
          }),
          fill: true,
          tension: 0.4,
        }] : []),
      ],
    };
  }, [result, pathPoints, drawnPoints, allPathPoints.length]);

  const options: Parameters<typeof Line>[0]['options'] = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { type: 'linear', min: 3, max: 18, ticks: { stepSize: 3, font: { size: 9 } }, grid: { display: false } },
      y: { min: 70, max: 185, ticks: { stepSize: 30, font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
    },
  }), []);

  const interpretation = result.percentile >= 75 ? '또래 대비 큰 편이에요' :
    result.percentile >= 50 ? '또래 평균 수준입니다' :
    result.percentile >= 25 ? '또래보다 약간 작은 편이에요' :
    '또래 대비 작은 편 — 골든타임입니다';

  return (
    <div className="w-full h-full flex flex-col p-4 bg-white">
      {/* Predicted height card */}
      <div className="bg-[#E8F5F0] rounded-xl p-3 text-center mb-2.5">
        <p className="text-[10px] font-semibold text-[#0F6E56] mb-0.5">우리 아이 예상 성인 키</p>
        <p className="text-[36px] font-black text-[#0F6E56] leading-none">
          {countUp.toFixed(1)}<span className="text-base">cm</span>
        </p>
        <div className="flex justify-center gap-1 flex-wrap mt-2">
          <span className="rounded-full bg-[#0F6E56] text-white font-semibold px-2 py-0.5 text-[10px]">
            {result.gender === 'male' ? '남아' : '여아'} · {Math.floor(result.age)}세 {Math.round((result.age % 1) * 12)}개월
          </span>
          <span className="rounded-full bg-white text-[#0F6E56] font-semibold px-2 py-0.5 text-[10px]">
            현재 {result.currentHeight}cm · {result.percentile.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="flex-1 min-h-0 mb-2">
        <Line data={chartData} options={options} />
      </div>

      {/* Interpretation */}
      <div className="bg-amber-50 rounded-lg px-3 py-2 mb-2 text-center">
        <p className="text-[11px] text-amber-800 font-semibold">📋 {interpretation}</p>
      </div>

      {/* CTA */}
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackKakaoConsult('height_calc_card_result')}
        className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#FEE500] py-2.5
                   text-[#3C1E1E] font-bold text-sm active:scale-[0.98] transition-all"
      >
        💬 {ctaText}
      </a>

      {/* Reset */}
      <button
        onClick={onReset}
        className="mt-1.5 text-[11px] text-gray-400 hover:text-gray-600 underline"
      >
        다시 계산하기
      </button>
    </div>
  );
}
