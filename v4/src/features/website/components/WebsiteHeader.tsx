import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { label: '성장프로그램', href: '#programs' },
  { label: '성장가이드', href: '#guides' },
  { label: '치료사례', href: '#cases' },
];

const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export function WebsiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id.replace('#', ''));
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        <Link to="/website" className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-[#0F6E56]">187</span>
          <span className="text-sm font-bold text-gray-700 hidden sm:inline">성장클리닉</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <button key={item.href} onClick={() => scrollTo(item.href)}
              className="text-sm font-medium text-gray-600 hover:text-[#0F6E56] transition-colors">
              {item.label}
            </button>
          ))}
          <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
            className="text-sm font-bold text-white bg-[#0F6E56] rounded-full px-4 py-2 hover:bg-[#0D5A47] transition-colors">
            상담 예약
          </a>
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
            <button key={item.href} onClick={() => scrollTo(item.href)}
              className="block w-full text-left text-sm font-medium text-gray-700 py-2 hover:text-[#0F6E56]">
              {item.label}
            </button>
          ))}
          <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer"
            className="block text-center text-sm font-bold text-white bg-[#0F6E56] rounded-full px-4 py-2.5 mt-2">
            카카오톡 상담
          </a>
        </div>
      )}
    </header>
  );
}
