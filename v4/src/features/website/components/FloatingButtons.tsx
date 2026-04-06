import { useState, useEffect } from 'react';
import { HeightCalculator } from './HeightCalculator';
import { AboutModal } from './AboutModal';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';

const COMMUNITY_LINKS = [
  { name: '유튜브', icon: '🎬', url: 'https://www.youtube.com/@187growup', color: 'bg-red-50 text-red-600 border-red-100' },
  { name: '인스타그램', icon: '📸', url: 'https://www.instagram.com/187growup/', color: 'bg-pink-50 text-pink-600 border-pink-100' },
  { name: '스레드', icon: '🧵', url: 'https://www.threads.com/@187growup', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { name: '블로그', icon: '📝', url: 'https://m.blog.naver.com/saebom2469?tab=1', color: 'bg-green-50 text-green-600 border-green-100' },
];

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
      {/* Fixed bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto flex items-center justify-around h-14">
          <button onClick={() => setShowAbout(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600 hover:text-[#0F6E56] active:scale-95 transition-all">
            <span className="text-lg">🏥</span>
            <span className="text-[11px] font-semibold">병원 소개</span>
          </button>
          <button onClick={() => setShowCalc(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[#0F6E56] hover:text-[#0d5e4a] active:scale-95 transition-all">
            <span className="text-lg">📏</span>
            <span className="text-[11px] font-bold">예상키 측정</span>
          </button>
          <button onClick={() => setShowCommunity(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600 hover:text-[#0F6E56] active:scale-95 transition-all">
            <span className="text-lg">💬</span>
            <span className="text-[11px] font-semibold">커뮤니티</span>
          </button>
          <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600 hover:text-gray-800 active:scale-95 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FEE500">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.64 6.59-.15.53-.96 3.41-1 3.56 0 .1.04.2.13.26.06.04.13.06.2.06.09 0 .18-.04.25-.1.93-.68 3.41-2.32 3.95-2.69.58.08 1.18.12 1.83.12 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
            </svg>
            <span className="text-[11px] font-semibold">카카오톡 상담</span>
          </a>
        </div>
      </div>

      {/* Community modal */}
      {showCommunity && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowCommunity(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">커뮤니티</h3>
              <button onClick={() => setShowCommunity(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {COMMUNITY_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 w-full rounded-2xl border px-5 py-4 active:scale-[0.98] transition-all ${link.color}`}
                >
                  <span className="text-2xl">{link.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-base">{link.name}</p>
                    <p className="text-xs opacity-60">@187growup</p>
                  </div>
                  <svg className="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <HeightCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
