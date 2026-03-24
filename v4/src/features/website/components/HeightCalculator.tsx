import { useState } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

interface Result {
  predicted: number;
  percentile: number;
  mph: number | null;
  age: number;
  currentHeight: number;
  gender: 'male' | 'female';
}

export function HeightCalculator() {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [fatherH, setFatherH] = useState('');
  const [motherH, setMotherH] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const h = parseFloat(height);
    if (!birthDate || !h) return;

    const age = calculateAgeAtDate(birthDate, new Date());
    const pct = calculateHeightPercentileLMS(h, age.decimal, gender);
    const pred = predictAdultHeightLMS(h, age.decimal, gender);
    const fH = parseFloat(fatherH);
    const mH = parseFloat(motherH);
    const mph = fH && mH ? calculateMidParentalHeight(fH, mH, gender) : null;

    setResult({ predicted: pred, percentile: pct, mph, age: age.decimal, currentHeight: h, gender });
  };

  // Build chart points: current position + predicted adult height at age 18
  const chartPoints: GrowthPoint[] = [];
  if (result && result.predicted > 0) {
    chartPoints.push({ age: result.age, height: result.currentHeight });
    if (result.predicted > 0) {
      chartPoints.push({ age: 18, height: result.predicted });
    }
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';
  const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';

  return (
    <section id="calculator" className="bg-white">
      <div className="max-w-lg mx-auto px-6 py-10">
        <p className="text-xs font-semibold text-[#0F6E56] mb-1">성장 진단</p>
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">우리 아이 예상 키 측정</h2>
        <p className="text-sm text-gray-500 mb-6">간단한 정보만 입력하면 예상 성인 키를 바로 확인할 수 있어요</p>

        <div className="space-y-4">
          {/* Gender */}
          <div>
            <span className={labelCls}>성별</span>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    gender === g ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {g === 'male' ? '👦 남아' : '👧 여아'}
                </button>
              ))}
            </div>
          </div>

          {/* Birth date */}
          <div>
            <label className={labelCls}>생년월일</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className={inputCls} max={new Date().toISOString().split('T')[0]} />
          </div>

          {/* Height / Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>현재 키 (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="0.0"
                value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>현재 체중 (kg)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="0.0"
                value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Parent heights */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>아버지 키 (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="175"
                value={fatherH} onChange={(e) => setFatherH(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>어머니 키 (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" placeholder="162"
                value={motherH} onChange={(e) => setMotherH(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Calculate button */}
          <button onClick={calculate} disabled={!birthDate || !height}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F6E56] text-white py-3.5
                       font-bold text-base disabled:opacity-40 hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
            <span>📊</span> 예상키 계산하기
          </button>
        </div>

        {/* Result */}
        {result && result.predicted > 0 && (
          <div className="mt-6 space-y-5">
            {/* Summary card */}
            <div className="bg-[#E8F5F0] rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm font-medium text-[#0F6E56]">예상 성인 키</p>
              <p className="text-5xl font-black text-[#0F6E56] leading-none">
                {result.predicted.toFixed(1)} <span className="text-2xl">cm</span>
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1">
                  현재 상위 {(100 - result.percentile).toFixed(0)}%
                </span>
                {result.mph && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white text-[#0F6E56] text-xs font-semibold px-3 py-1">
                    유전적 예측: {result.mph.toFixed(1)}cm
                  </span>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl py-3 px-2">
                <p className="text-[10px] text-gray-400 font-medium">현재 나이</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {Math.floor(result.age)}세 {Math.round((result.age % 1) * 12)}개월
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl py-3 px-2">
                <p className="text-[10px] text-gray-400 font-medium">현재 키</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{result.currentHeight}cm</p>
              </div>
              <div className="bg-gray-50 rounded-xl py-3 px-2">
                <p className="text-[10px] text-gray-400 font-medium">백분위</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{result.percentile.toFixed(1)}%ile</p>
              </div>
            </div>

            {/* Growth chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <GrowthChart gender={result.gender} points={chartPoints} showTitle={false} />
              <p className="text-[11px] text-gray-400 text-center mt-2">
                한국 소아 성장 표준 (2017 질병관리청) 기준 · 5th / 50th / 95th 백분위
              </p>
            </div>

            {/* Interpretation */}
            <div className="bg-amber-50 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-amber-800">📋 해석 가이드</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {result.percentile >= 75
                  ? '현재 또래 대비 큰 편입니다. 꾸준한 성장 관리로 잠재력을 최대한 발휘할 수 있습니다.'
                  : result.percentile >= 50
                    ? '현재 또래 평균 수준입니다. 적절한 영양, 운동, 수면 관리로 더 클 수 있습니다.'
                    : result.percentile >= 25
                      ? '또래 평균보다 약간 작은 편입니다. 전문 상담을 통해 성장 가능성을 확인해보세요.'
                      : '또래 대비 작은 편이므로, 성장판이 열려있는 지금이 성장 치료의 골든타임입니다.'}
              </p>
              {result.mph && Math.abs(result.predicted - result.mph) > 3 && (
                <p className="text-xs text-amber-700 leading-relaxed">
                  {result.predicted > result.mph
                    ? `유전적 예측(${result.mph.toFixed(1)}cm)보다 높은 성장이 기대됩니다.`
                    : `유전적 예측(${result.mph.toFixed(1)}cm)에 도달하려면 적극적인 성장 관리가 필요합니다.`}
                </p>
              )}
            </div>

            {/* CTA */}
            <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#FEE500] py-3.5
                         text-[#3C1E1E] font-bold text-base hover:bg-[#FDD800] active:scale-[0.98] transition-all">
              <span>💬</span> 전문 상담 받아보세요
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
