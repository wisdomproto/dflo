import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AboutModal } from './AboutModal';
import { ShareSheet } from './ShareSheet';
import { trackKakaoConsult } from '@/shared/lib/analytics';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/_ZxneSb';


interface NavAction {
  label: string;
  action: 'scroll' | 'modal' | 'link';
  target: string;
  children?: { label: string; action: 'scroll' | 'modal' | 'link'; target: string }[];
}

const NAV_ITEMS: NavAction[] = [
  {
    label: '병원 소개',
    action: 'modal',
    target: 'about',
  },
  {
    label: '187 성장프로그램',
    action: 'scroll',
    target: 'programs',
  },
  {
    label: '커뮤니티',
    action: 'scroll',
    target: 'guides',
    children: [
      { label: '📝 블로그', action: 'link', target: 'https://blog.naver.com/saebom2469' },
      { label: '📸 인스타그램', action: 'link', target: 'https://www.instagram.com/187growup/' },
      { label: '🎬 유튜브', action: 'link', target: 'https://www.youtube.com/@187growup' },
    ],
  },
];

export function WebsiteHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleAction = (item: { action: string; target: string }) => {
    setMenuOpen(false);
    if (item.action === 'modal' && item.target === 'about') {
      setShowAbout(true);
    } else if (item.action === 'link') {
      window.open(item.target, '_blank', 'noopener,noreferrer');
    } else if (item.action === 'scroll') {
      const el = document.getElementById(item.target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    setMenuOpen(false);
    navigate('/banner-admin');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="https://www.yssaebomq.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 md:gap-3"
              title="연세새봄의원 홈페이지로 이동"
            >
              <img src="/images/logo.jpg" alt="187 성장클리닉" className="h-9 md:h-11 w-auto rounded" />
            </a>
            <span className="flex items-center gap-1 md:gap-1.5 text-[11px] sm:text-xs md:text-sm font-semibold text-[#0F6E56] animate-pulse whitespace-nowrap">
              <span aria-hidden="true">←</span>
              홈페이지가기
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 공유하기 — 카카오톡/링크복사/네이티브 공유 시트 열기 */}
            <button
              onClick={() => setShowShare(true)}
              className="w-9 h-9 flex items-center justify-center text-gray-700 hover:text-[#0F6E56] active:scale-95 transition-all"
              aria-label="공유하기"
              title="공유하기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Hamburger — 모든 뷰포트에서 노출 */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 flex items-center justify-center" aria-label="메뉴 열기">
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

      </header>

      {/* Slide-in drawer (all viewports) */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300
          ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
          <span className="text-sm font-bold text-[#0F6E56]">메뉴</span>
          <button onClick={() => setMenuOpen(false)} className="w-9 h-9 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Nav items */}
        <div className="px-5 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
          {NAV_ITEMS.map((item) => (
            <div key={item.label}>
              <button onClick={() => handleAction(item)}
                className="block w-full text-left text-base font-semibold text-gray-800 py-3 hover:text-[#0F6E56] transition-colors">
                {item.label}
              </button>
              {item.children && (
                <div className="pl-4 space-y-0.5 mb-2 border-l-2 border-[#0F6E56]/20">
                  {item.children.map((child) => (
                    <button key={child.target} onClick={() => handleAction(child)}
                      className="block w-full text-left text-sm text-gray-500 py-2 hover:text-[#0F6E56] transition-colors">
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
            <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
              onClick={() => trackKakaoConsult('header_drawer')}
              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-[#0F6E56] rounded-xl px-4 py-3 hover:bg-[#0D5A47] transition-colors">
              💬 카카오톡 상담
            </a>
            <button onClick={handleAdminClick}
              className="block w-full text-center text-xs text-gray-400 hover:text-[#0F6E56] py-2">
              ⚙️ 관리자
            </button>
          </div>
        </div>
      </div>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} />
    </>
  );
}
