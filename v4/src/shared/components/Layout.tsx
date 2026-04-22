// ================================================
// Layout 컴포넌트 - 187 성장케어 v4
// 메인 앱 레이아웃 (헤더 + 콘텐츠 + 하단 네비)
// ================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [showMenu, setShowMenu] = useState(false);
  const [showGearPin, setShowGearPin] = useState(false);
  const isLoggedIn = !!user;

  const handleLogout = async () => {
    setShowMenu(false);
    await signOut();
    navigate('/app');
  };

  const handleGearSubmit = (pin: string) => {
    if (pin === '8054') {
      sessionStorage.setItem('website_admin_pin', pin);
      sessionStorage.setItem('website-admin-auth', 'true');
      setShowGearPin(false);
      navigate('/app-home-admin');
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#f0f0ff' }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 safe-top bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center min-w-0 gap-2">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="mr-1 w-9 h-9 flex items-center justify-center rounded-full
                           text-gray-500 hover:text-gray-800 hover:bg-gray-100
                           transition-colors"
                aria-label="뒤로 가기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link to="/app" className="flex items-center gap-2 min-w-0" aria-label="홈으로 가기">
              <img
                src="/images/logo.jpg"
                alt="187 성장클리닉"
                className="h-8 w-auto rounded"
              />
              {/* 페이지 별 보조 제목 (홈일 땐 굳이 안 보이게) */}
              {title && title !== '187 성장케어' && (
                <span className="text-sm font-semibold text-gray-700 truncate border-l border-gray-200 pl-2">
                  {title}
                </span>
              )}
            </Link>
          </div>

          {/* 톱니바퀴 — 앱 홈 콘텐츠 관리 (PIN 8054) */}
          <button
            onClick={() => setShowGearPin(true)}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-full
                       text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="콘텐츠 관리"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* 햄버거(...) — 로그인/로그아웃 */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                         text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[150px]">
                  {!isLoggedIn ? (
                    <button
                      onClick={() => { setShowMenu(false); navigate('/login'); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      환자 로그인
                    </button>
                  ) : (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      로그아웃
                    </button>
                  )}
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

      {/* 콘텐츠 관리 PIN 모달 */}
      {showGearPin && (
        <GearPinModal
          onClose={() => setShowGearPin(false)}
          onSubmit={handleGearSubmit}
        />
      )}
    </div>
  );
}

// ── GearPinModal ──

function GearPinModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (pin: string) => boolean;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!onSubmit(pin)) {
      setError('비밀번호가 틀렸습니다');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-gray-900 text-center">콘텐츠 관리</h2>
        <p className="text-xs text-gray-500 text-center mt-1 mb-4">관리자 비밀번호를 입력하세요</p>
        <input
          type="password"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="비밀번호"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-primary text-center text-lg tracking-widest"
          maxLength={4}
          autoFocus
        />
        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!pin}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
