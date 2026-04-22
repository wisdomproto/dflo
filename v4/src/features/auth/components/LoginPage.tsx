import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// ================================================
// Login Page (환자/보호자) - 187 성장케어 v4
// 병원에서 발급받은 차트번호 + 비밀번호로 로그인.
// 관리자는 /admin/login 에서 이메일 로그인.
// ================================================

export function LoginPage() {
  const [chartNumber, setChartNumber] = useState('');
  const [password, setPassword] = useState('1234');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const signInPatient = useAuthStore((s) => s.signInPatient);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    if (!chartNumber.trim() || !password.trim()) {
      setErrorMsg('차트번호와 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signInPatient(chartNumber, password);
      navigate(from || '/app', { replace: true });
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">187</h1>
          <p className="mt-1 text-lg text-white/90">성장케어</p>
          <p className="mt-2 text-sm text-white/70">
            우리 아이 성장을 함께 관리해요
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 className="mb-1 text-center text-lg font-semibold text-gray-800">
            환자 로그인
          </h2>
          <p className="mb-6 text-center text-xs text-gray-500">
            병원에서 안내받은 차트번호로 로그인하세요
          </p>

          <div className="mb-4">
            <label
              htmlFor="chartNumber"
              className="mb-1 block text-sm font-medium text-gray-600"
            >
              차트번호
            </label>
            <input
              id="chartNumber"
              type="text"
              inputMode="numeric"
              value={chartNumber}
              onChange={(e) => setChartNumber(e.target.value)}
              placeholder="예: 22028"
              autoComplete="username"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="mb-2">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-600"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <p className="mb-6 text-xs text-gray-400">
            초기 비밀번호는 <span className="font-mono font-semibold text-gray-500">1234</span> 입니다.
          </p>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">⚠️ 로그인 실패</p>
              <p className="mt-1 text-xs break-all">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/70">
          <a href="/" className="hover:underline">병원 홈페이지</a>
          <span className="text-white/30">·</span>
          <a href="/admin/login" className="hover:underline">관리자 로그인</a>
        </div>
        <p className="mt-3 text-center text-xs text-white/50">
          187 성장케어 v4
        </p>
      </div>
    </div>
  );
}
