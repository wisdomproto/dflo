// ================================================
// BottomNav 컴포넌트 - 187 성장케어 v4
// 고정 하단 네비게이션 바
// 비로그인: 홈 + 병원소개 + 커뮤니티 + 상담
// 로그인: 홈 + 데일리 루틴 + 체형 + 병원소개 + 커뮤니티 + 상담
// ================================================

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AboutModal } from '@/features/website/components/AboutModal';
import { CommunityBottomSheet } from '@/features/website/components/CommunityBottomSheet';
import { HeightCalculator } from '@/features/website/components/HeightCalculator';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const guestNavItems: NavItem[] = [
  { path: '/app', label: '홈', icon: '🏠' },
];

const patientNavItems: NavItem[] = [
  { path: '/app', label: '홈', icon: '🏠' },
  { path: '/app/routine', label: '루틴', icon: '📝' },
  { path: '/app/body-analysis', label: '체형', icon: '🧍' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = !!useAuthStore((s) => s.user);
  const navItems = isLoggedIn ? patientNavItems : guestNavItems;

  const [showAbout, setShowAbout] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  // SectionCarousel 의 banner CTA(예측키 측정하기 등)에서 dispatch 하는 이벤트.
  // website 의 FloatingButtons 와 동일한 패턴으로 모달 오픈.
  useEffect(() => {
    const handler = () => setShowCalc(true);
    document.addEventListener('open-height-calculator', handler);
    return () => document.removeEventListener('open-height-calculator', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center w-full h-full
                           transition-all duration-200 ${
                             active
                               ? 'text-primary'
                               : 'text-gray-400 active:text-gray-600'
                           }`}
              >
                {active && (
                  <span className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-primary/10" />
                )}
                <span className={`relative text-xl leading-none mb-0.5 ${active ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
                <span
                  className={`relative text-[10px] leading-tight ${
                    active ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* 병원 소개 */}
          <button
            onClick={() => setShowAbout(true)}
            className="relative flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-gray-600 transition-all"
          >
            <span className="relative text-xl leading-none mb-0.5">🏥</span>
            <span className="relative text-[10px] leading-tight font-medium">병원소개</span>
          </button>

          {/* 커뮤니티 */}
          <button
            onClick={() => setShowCommunity(true)}
            className="relative flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-gray-600 transition-all"
          >
            <span className="relative text-xl leading-none mb-0.5">💬</span>
            <span className="relative text-[10px] leading-tight font-medium">커뮤니티</span>
          </button>

          {/* 카카오톡 상담 */}
          <a
            href="https://pf.kakao.com/_ZxneSb"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-95"
          >
            <span className="relative mb-0.5">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FEE500">
                <rect width="24" height="24" rx="6" fill="#FEE500" />
                <path d="M12 6C8.69 6 6 8.15 6 10.82c0 1.72 1.13 3.23 2.83 4.1l-.72 2.66c-.05.2.07.26.18.18l3.08-2.04c.2.02.41.04.63.04 3.31 0 6-2.15 6-4.94C18 8.15 15.31 6 12 6z" fill="#3C1E1E" />
              </svg>
            </span>
            <span className="relative text-[10px] leading-tight font-medium" style={{ color: '#3C1E1E' }}>
              상담
            </span>
          </a>
        </div>
      </nav>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <CommunityBottomSheet isOpen={showCommunity} onClose={() => setShowCommunity(false)} />
      <HeightCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
    </>
  );
}
