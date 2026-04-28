import { useState, useEffect } from 'react';
import { HeightCalculator } from './HeightCalculator';
import { AboutModal } from './AboutModal';
import { CommunityBottomSheet } from './CommunityBottomSheet';
import { trackKakaoConsult } from '@/shared/lib/analytics';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';

export function FloatingButtons() {
  const [showCalc, setShowCalc] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  // Listen for banner CTA click
  useEffect(() => {
    const handler = () => setShowCalc(true);
    document.addEventListener('open-height-calculator', handler);
    return () => document.removeEventListener('open-height-calculator', handler);
  }, []);

  return (
    <>
      {/* Fixed bottom tab bar — primary nav on all viewports.
          PC 에서는 카드 폭(460px) 보다 약간 넓은 max-w-2xl 로 키워 4 개 탭이 크게 보이게 한다. */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-14 md:h-20">
          <button onClick={() => setShowAbout(true)}
            className="flex flex-col items-center gap-0.5 md:gap-1 px-4 md:px-6 py-1.5 md:py-2 text-gray-600 hover:text-[#0F6E56] active:scale-95 transition-all">
            <span className="text-lg md:text-2xl">🏥</span>
            <span className="text-[11px] md:text-sm font-semibold">병원 소개</span>
          </button>
          <button onClick={() => setShowCalc(true)}
            className="flex flex-col items-center gap-0.5 md:gap-1 px-4 md:px-6 py-1.5 md:py-2 text-[#0F6E56] hover:text-[#0d5e4a] active:scale-95 transition-all">
            <span className="text-lg md:text-2xl">📏</span>
            <span className="text-[11px] md:text-sm font-bold">예상키 측정</span>
          </button>
          <button onClick={() => setShowCommunity(true)}
            className="flex flex-col items-center gap-0.5 md:gap-1 px-4 md:px-6 py-1.5 md:py-2 text-gray-600 hover:text-[#0F6E56] active:scale-95 transition-all">
            <span className="text-lg md:text-2xl">💬</span>
            <span className="text-[11px] md:text-sm font-semibold">커뮤니티</span>
          </button>
          <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => trackKakaoConsult('bottom_tabbar')}
            className="flex flex-col items-center gap-0.5 md:gap-1 px-4 md:px-6 py-1.5 md:py-2 text-gray-600 hover:text-gray-800 active:scale-95 transition-all">
            <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="#FEE500">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.64 6.59-.15.53-.96 3.41-1 3.56 0 .1.04.2.13.26.06.04.13.06.2.06.09 0 .18-.04.25-.1.93-.68 3.41-2.32 3.95-2.69.58.08 1.18.12 1.83.12 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
            </svg>
            <span className="text-[11px] md:text-sm font-semibold">카카오톡 상담</span>
          </a>
        </div>
      </div>

      {/* Modals */}
      <HeightCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <CommunityBottomSheet isOpen={showCommunity} onClose={() => setShowCommunity(false)} />
    </>
  );
}
