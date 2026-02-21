// ================================================
// Layout 컴포넌트 - 187 성장케어 v4
// 메인 앱 레이아웃 (헤더 + 콘텐츠 + 하단 네비)
// ================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAuthStore } from '@/stores/authStore';
import type { ReactNode } from 'react';

interface LayoutProps {
  title: string;
  showBack?: boolean;
  children: ReactNode;
}

export default function Layout({ title, showBack = false, children }: LayoutProps) {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    setShowMenu(false);
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#f0f0ff' }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 safe-top bg-gradient-to-r from-primary to-secondary">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center min-w-0">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="mr-2 w-9 h-9 flex items-center justify-center rounded-full
                           text-white/80 hover:text-white hover:bg-white/10
                           transition-colors"
                aria-label="뒤로 가기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
          </div>

          {/* 설정 메뉴 */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="메뉴"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px]">
                  {isAdmin() && (
                    <button
                      onClick={() => { setShowMenu(false); navigate('/admin'); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      관리자 페이지
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto pb-20 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}
