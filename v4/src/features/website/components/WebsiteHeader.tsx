import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AboutModal } from './AboutModal';

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';
const ADMIN_PIN = '8054';

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
      { label: '성장 가이드', action: 'scroll', target: 'guides' },
      { label: '성장 레시피', action: 'scroll', target: 'recipes' },
      { label: '운동 프로그램', action: 'scroll', target: 'exercises' },
      { label: '치료 사례', action: 'scroll', target: 'cases' },
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
    } else if (item.action === 'scroll') {
      const el = document.getElementById(item.target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    setMenuOpen(false);
    // Check if already authenticated this session
    if (sessionStorage.getItem('website-admin-auth') === 'true') {
      navigate('/website/admin/banners');
      return;
    }
    const input = prompt('관리자 비밀번호를 입력하세요');
    if (input === ADMIN_PIN) {
      sessionStorage.setItem('website-admin-auth', 'true');
      navigate('/website/admin/banners');
    } else if (input !== null) {
      alert('비밀번호가 올바르지 않습니다');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/website" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-[#0F6E56]">187</span>
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

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label}>
                <button onClick={() => handleAction(item)}
                  className="block w-full text-left text-sm font-semibold text-gray-800 py-2.5 hover:text-[#0F6E56]">
                  {item.label}
                </button>
                {item.children && (
                  <div className="pl-4 space-y-0.5 mb-1">
                    {item.children.map((child) => (
                      <button key={child.target} onClick={() => handleAction(child)}
                        className="block w-full text-left text-sm text-gray-500 py-1.5 hover:text-[#0F6E56]">
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
              className="block text-center text-sm font-bold text-white bg-[#0F6E56] rounded-full px-4 py-2.5 mt-3">
              카카오톡 상담
            </a>
            <button onClick={handleAdminClick}
              className="block w-full text-center text-xs text-gray-400 hover:text-[#0F6E56] py-2 mt-1">
              ⚙️ 관리자
            </button>
          </div>
        )}
      </header>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
