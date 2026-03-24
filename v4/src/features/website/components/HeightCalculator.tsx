import { useState, useMemo } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import { getHeightStandard } from '@/shared/data/growthStandard';
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
  const [showResult, setShowResult] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
    setShowResult(true);
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';
  const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';

  return (
    <>
      <section id="calculator" className="bg-white">
        <div className="max-w-lg mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-semibold text-[#0F6E56] mb-1">성장 진단</p>
              <h2 className="text-xl font-extrabold text-gray-900">우리 아이 예상 키 측정</h2>
            </div>
            <button onClick={() => setShowHelp(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-gray-100 text-xs font-bold">
              ?
            </button>
          </div>
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
        </div>
      </section>

      {/* Result Modal */}
      {result && (
        <ResultModal result={result} isOpen={showResult} onClose={() => setShowResult(false)} />
      )}

      {/* Help Modal */}
      <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="예상키 측정 방법 안내">
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">📊 측정 원리</h4>
            <p>
              본 예상키 계산은 <strong>한국 질병관리청(2017)</strong>에서 발표한
              소아·청소년 성장 표준 데이터(LMS 방법)를 기반으로 합니다.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">📐 LMS 방법이란?</h4>
            <p>
              세계보건기구(WHO)가 권장하는 통계 기법으로, 같은 나이·성별 아이들의
              키 분포를 L(왜도), M(중앙값), S(변동계수) 세 가지 파라미터로 모델링합니다.
              아이의 현재 키가 또래 중 어느 위치(백분위)인지 정밀하게 계산할 수 있습니다.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">🎯 예상 성인 키 계산</h4>
            <p>
              현재 키의 백분위를 유지한다는 가정 하에, 18세 시점의 동일 백분위 키를
              역산하여 예상 성인 키를 산출합니다.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">⚠️ 참고사항</h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-600">
              <li>골연령, 성장호르몬 수치, 영양 상태 등은 반영되지 않은 통계적 추정치입니다.</li>
              <li>정확한 진단은 성장판 검사와 전문의 상담이 필요합니다.</li>
              <li>성조숙증이나 만성 질환이 있는 경우 결과가 달라질 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </InfoModal>
    </>
  );
}

/** Result popup with full-range growth chart */
function ResultModal({ result, isOpen, onClose }: { result: Result; isOpen: boolean; onClose: () => void }) {
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
        {
          label: '우리 아이',
          data: [{ x: Math.round(result.age * 2) / 2, y: result.currentHeight }],
          borderColor: '#0F6E56',
          backgroundColor: '#0F6E56',
          borderWidth: 0,
          pointRadius: 8,
          pointHoverRadius: 10,
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
        min: 30,
        max: 185,
        ticks: { font: { size: 11 }, stepSize: 10 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

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
          <p className="text-xs text-amber-700 leading-relaxed">
            {result.percentile >= 75
              ? '현재 또래 대비 큰 편입니다. 꾸준한 성장 관리로 잠재력을 최대한 발휘할 수 있습니다.'
              : result.percentile >= 50
                ? '현재 또래 평균 수준입니다. 적절한 영양, 운동, 수면 관리로 더 클 수 있습니다.'
                : result.percentile >= 25
                  ? '또래 평균보다 약간 작은 편입니다. 전문 상담을 통해 성장 가능성을 확인해보세요.'
                  : '또래 대비 작은 편이므로, 성장판이 열려있는 지금이 성장 치료의 골든타임입니다.'}
          </p>
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
