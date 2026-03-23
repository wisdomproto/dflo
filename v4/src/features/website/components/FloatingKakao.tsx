import { useState } from 'react';
import { LocationModal } from './LocationModal';
import { HoursModal } from './HoursModal';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

const btnBase = 'flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg text-sm font-bold transition-all hover:scale-105 active:scale-95';

export function FloatingKakao() {
  const [showLocation, setShowLocation] = useState(false);
  const [showHours, setShowHours] = useState(false);

  return (
    <>
      {/* Floating button group */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 items-end">
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
      <LocationModal isOpen={showLocation} onClose={() => setShowLocation(false)} />
      <HoursModal isOpen={showHours} onClose={() => setShowHours(false)} />
    </>
  );
}
