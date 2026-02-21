import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/shared/lib/supabase';

// ================================================
// Protected Route - 187 성장케어 v4
// ================================================

export function ProtectedRoute() {
  const { session, isLoading, isInitialized } = useAuthStore();

  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mx-auto" />
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ================================================
// Admin Route - 관리자 ID/PW 인증 게이트
// ================================================

const ADMIN_SESSION_KEY = '187_admin_verified';

export function AdminRoute() {
  const { session, isLoading, isInitialized } = useAuthStore();
  const [verified, setVerified] = useState(() => {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });

  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mx-auto" />
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!verified) {
    return (
      <AdminLoginGate
        onVerified={() => {
          sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
          setVerified(true);
        }}
      />
    );
  }

  return <Outlet />;
}

// ================================================
// AdminLoginGate - 관리자 로그인 폼
// ================================================

function AdminLoginGate({ onVerified }: { onVerified: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      if (data.role !== 'admin' && data.role !== 'doctor') {
        setError('관리자 권한이 없는 계정입니다.');
        return;
      }

      onVerified();
    } catch {
      setError('인증에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">관리자 인증</h1>
          <p className="mt-1 text-sm text-white/60">
            관리자 계정으로 로그인해주세요
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-gray-600">
              관리자 이메일
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800
                         placeholder-gray-400 transition-colors focus:border-gray-500
                         focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-gray-600">
              비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800
                         placeholder-gray-400 transition-colors focus:border-gray-500
                         focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-sm font-semibold text-white
                       shadow-md transition-opacity hover:opacity-90
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '인증 중...' : '관리자 인증'}
          </button>
        </form>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          ← 앱으로 돌아가기
        </button>
      </div>
    </div>
  );
}
