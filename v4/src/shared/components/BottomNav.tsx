// ================================================
// BottomNav 컴포넌트 - 187 성장케어 v4
// 고정 하단 네비게이션 바 (4탭)
// ================================================

import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/routine', label: '데일리 루틴', icon: '📝' },
  { path: '/body-analysis', label: '체형', icon: '🧍' },
  { path: '/info', label: '성장가이드', icon: '📋' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full
                         transition-colors duration-200 ${
                           active
                             ? 'text-primary'
                             : 'text-gray-400 active:text-gray-600'
                         }`}
            >
              <span className="text-xl leading-none mb-0.5">{item.icon}</span>
              <span
                className={`text-[10px] leading-tight ${
                  active ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-[env(safe-area-inset-bottom,0px)] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
