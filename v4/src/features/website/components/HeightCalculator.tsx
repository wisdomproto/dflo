// ================================================
// HeightCalculator - 예상키 측정 입력 폼 모달
// ================================================

import { useState } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
import { HeightCalculatorResult, type HeightResult } from './HeightCalculatorResult';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function HeightCalculator({ isOpen, onClose }: Props) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<HeightResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const calculate = () => {
    const h = parseFloat(height);
    if (!birthDate || !h) return;
    const age = calculateAgeAtDate(birthDate, new Date());
    const pct = calculateHeightPercentileLMS(h, age.decimal, gender);
    const pred = predictAdultHeightLMS(h, age.decimal, gender);
    setResult({ predicted: pred, percentile: pct, age: age.decimal, currentHeight: h, gender });
    setShowResult(true);
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';
  const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';

  return (
    <>
      {/* Calculator Form Modal */}
      <InfoModal isOpen={isOpen} onClose={onClose} title="">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0F6E56] mb-1">성장 진단</p>
              <h2 className="text-xl font-extrabold text-gray-900">우리 아이 예상 키 측정</h2>
            </div>
            <button onClick={() => setShowHelp(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-gray-100 text-xs font-bold shrink-0">
              ?
            </button>
          </div>
          <p className="text-sm text-gray-500 -mt-2">간단한 정보만 입력하면 예상 성인 키를 바로 확인할 수 있어요</p>

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

          {/* Calculate button */}
          <button onClick={calculate} disabled={!birthDate || !height}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F6E56] text-white py-3.5
                       font-bold text-base disabled:opacity-40 hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
            <span>📊</span> 예상키 계산하기
          </button>
        </div>
      </InfoModal>

      {/* Result Modal */}
      {result && (
        <HeightCalculatorResult result={result} isOpen={showResult} onClose={() => setShowResult(false)} />
      )}

      {/* Help Modal */}
      <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="예상키 측정 방법 안내">
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">📊 측정 원리</h4>
            <p>본 예상키 계산은 <strong>한국 질병관리청(2017)</strong>에서 발표한 소아·청소년 성장 표준 데이터(LMS 방법)를 기반으로 합니다.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">📐 LMS 방법이란?</h4>
            <p>세계보건기구(WHO)가 권장하는 통계 기법으로, 같은 나이·성별 아이들의 키 분포를 L(왜도), M(중앙값), S(변동계수) 세 가지 파라미터로 모델링합니다.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">🎯 예상 성인 키 계산</h4>
            <p>현재 키의 백분위를 유지한다는 가정 하에, 18세 시점의 동일 백분위 키를 역산하여 예상 성인 키를 산출합니다.</p>
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
