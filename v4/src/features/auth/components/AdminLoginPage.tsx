import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// ================================================
// Admin Login Page - 187 성장케어 v4
// 관리자/의사 전용 이메일 로그인.
// 환자는 /login 에서 차트번호로 로그인.
// ================================================

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const signInAdmin = useAuthStore((s) => s.signInAdmin);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signInAdmin(email, password);
      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '로그인에 실패했습니다.';
      const isNetwork = message.includes('fetch') || message.includes('network') || message.includes('Failed to');
      const displayMsg = isNetwork
        ? `서버 연결 실패: ${message}`
        : message;
      setErrorMsg(displayMsg);
      addToast('error', displayMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">187 성장케어</h1>
          <p className="mt-1 text-sm text-white/70">관리자 콘솔</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">
            관리자 로그인
          </h2>

          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-600">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@187growth.com"
              autoComplete="email"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-600">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">⚠️ 로그인 실패</p>
              <p className="mt-1 text-xs break-all">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/70">
          <a href="/" className="hover:underline">병원 홈페이지</a>
          <span className="text-white/30">·</span>
          <a href="/login" className="hover:underline">환자 로그인</a>
        </div>
      </div>
    </div>
  );
}
