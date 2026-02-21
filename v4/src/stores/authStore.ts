import { create } from 'zustand';
import type { User } from '@/shared/types';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Auth Store - 187 성장케어 v4
// DB 직접 인증 (레거시) + Supabase Auth 통합
// ================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
}

type AuthStore = AuthState & AuthActions;

/** 로컬스토리지 키 */
const STORED_USER_KEY = '187_growth_user';

/** 저장된 유저 복원 */
function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true });

      // 1) 로컬스토리지에 저장된 레거시 유저 복원
      const storedUser = loadStoredUser();
      if (storedUser) {
        set({
          user: storedUser,
          session: { user: { id: storedUser.id } } as Session,
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // 2) Supabase Auth 세션 확인
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        logger.error('Failed to get session:', sessionError);
        set({ isLoading: false, isInitialized: true });
        return;
      }

      const session = sessionData.session;

      if (session) {
        // Supabase Auth 유저 → users 테이블 조회
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        set({
          session,
          user: profile as User | null,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ session: null, user: null, isLoading: false, isInitialized: true });
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        logger.info('Auth state changed:', event);

        if (newSession) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('email', newSession.user.email)
            .single();
          set({ session: newSession, user: profile as User | null });
        } else {
          set({ session: null, user: null });
        }
      });
    } catch (err) {
      logger.error('Auth initialization error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    // DB 직접 인증 (레거시: password 컬럼 평문 비교)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      set({ isLoading: false });
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const profile = user as User;

    // 로컬스토리지에 유저 저장 (세션 유지)
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(profile));

    // last_login_at 업데이트
    supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then();

    set({
      user: profile,
      session: { user: { id: profile.id } } as Session,
      isLoading: false,
    });
  },

  signOut: async () => {
    localStorage.removeItem(STORED_USER_KEY);

    try {
      await supabase.auth.signOut();
    } catch {
      // Supabase Auth 세션이 없어도 무시
    }

    set({ user: null, session: null });
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin' || user?.role === 'doctor';
  },
}));
