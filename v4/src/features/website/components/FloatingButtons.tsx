import { useState } from 'react';
import { LocationModal } from './LocationModal';
import { HoursModal } from './HoursModal';
import { HeightCalculator } from './HeightCalculator';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

const btnBase = 'flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg text-sm font-bold transition-all hover:scale-105 active:scale-95';

export function FloatingButtons() {
  const [showLocation, setShowLocation] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  return (
    <>
      {/* Floating button group */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 items-end">
        <button onClick={() => setShowCalc(true)}
          className={`${btnBase} bg-[#0F6E56] text-white hover:shadow-xl hover:bg-[#0D5A47]`}>
          <span>📏</span> 예상키 측정
        </button>
        <button onClick={() => setShowLocation(true)}
          className={`${btnBase} bg-white text-gray-700 border border-gray-200 hover:shadow-xl`}>
          <span>📍</span> 병원 위치
        </button>
        <button onClick={() => setShowHours(true)}
          className={`${btnBase} bg-white text-gray-700 border border-gray-200 hover:shadow-xl`}>
          <span>🕐</span> 진료시간
        </button>
        <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
          className={`${btnBase} bg-[#FEE500] text-[#3C1E1E] hover:shadow-xl`}>
          <span>💬</span> 카카오톡 상담
        </a>
      </div>

      {/* Modals */}
      <HeightCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
      <LocationModal isOpen={showLocation} onClose={() => setShowLocation(false)} />
      <HoursModal isOpen={showHours} onClose={() => setShowHours(false)} />
    </>
  );
}
