// ================================================
// BottomNav 컴포넌트 - 187 성장케어 v4
// 환자 단계(treatment_status)별 분기:
//   - treatment   : 진료기록 / 생활 다이어리 / 생활 통계 / 1:1상담 (홈 없음)
//   - consultation: 홈 / 첫 상담 기록 / 1:1상담 (다이어리 없음)
// ================================================

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChildrenStore } from '@/stores/childrenStore';
import { HeightCalculator } from '@/features/website/components/HeightCalculator';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const guestNavItems: NavItem[] = [
  { path: '/app', label: '홈', icon: '🏠' },
];

const consultationNavItems: NavItem[] = [
  { path: '/app', label: '홈', icon: '🏠' },
  { path: '/app/records', label: '첫 상담 기록', icon: '📋' },
];

const treatmentNavItems: NavItem[] = [
  { path: '/app/records', label: '진료기록', icon: '📋' },
  { path: '/app/routine', label: '생활 다이어리', icon: '📔' },
  { path: '/app/stats', label: '생활 통계', icon: '📊' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = !!useAuthStore((s) => s.user);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const selectedChild = getSelectedChild();

  const navItems = !isLoggedIn
    ? guestNavItems
    : selectedChild?.treatment_status === 'treatment'
    ? treatmentNavItems
    : consultationNavItems;

  const [showCalc, setShowCalc] = useState(false);

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

          {/* 카카오톡 1:1 상담 — 양 단계 공통 */}
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
              1:1상담
            </span>
          </a>
        </div>
      </nav>

      <HeightCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
    </>
  );
}
