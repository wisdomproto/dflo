import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AboutModal } from './AboutModal';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';


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
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const handleAction = (item: { action: string; target: string }) => {
    setMenuOpen(false);
    setHoveredMenu(null);
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
    navigate('/website/admin');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/website" className="flex items-center gap-2">
            <img src="/images/logo.jpg" alt="187 성장클리닉" className="h-9 w-auto rounded" />
            <span className="text-sm font-bold text-gray-700 hidden sm:inline">성장클리닉</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative"
                onMouseEnter={() => item.children && setHoveredMenu(item.label)}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button onClick={() => handleAction(item)}
                  className="text-sm font-medium text-gray-600 hover:text-[#0F6E56] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                  {item.label}
                </button>
                {/* Dropdown */}
                {item.children && hoveredMenu === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] z-50">
                    {item.children.map((child) => (
                      <button key={child.target} onClick={() => handleAction(child)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#0F6E56] transition-colors">
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
              className="ml-2 text-sm font-bold text-white bg-[#0F6E56] rounded-full px-4 py-2 hover:bg-[#0D5A47] transition-colors">
              상담 예약
            </a>
            <button onClick={handleAdminClick}
              className="ml-1 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm hover:bg-gray-200 transition-colors"
              title="관리자">
              ⚙️
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

      </header>

      {/* Mobile slide-in drawer */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-50 transition-opacity duration-300
          ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl
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
    </>
  );
}
