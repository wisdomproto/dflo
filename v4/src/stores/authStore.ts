import { create } from 'zustand';
import type { Child, User } from '@/shared/types';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Auth Store - 187 성장케어 v4
//
// 두 가지 로그인 모드
// - signInPatient(chartNumber, password)
//     children 테이블의 chart_number + password 매칭.
//     로그인 후 그 자녀(selectedChildId)만 활성화된다.
// - signInAdmin(email, password)
//     users 테이블의 email + password 평문 매칭. role 가 admin/doctor 여야 통과.
//
// 두 모드 모두 user(부모/관리자) 객체를 동일한 user state 에 저장한다.
// 환자 모드에서는 selectedChildId 가 함께 저장된다.
// ================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  selectedChildId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInPatient: (chartNumber: string, password: string) => Promise<Child>;
  signInAdmin: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
}

type AuthStore = AuthState & AuthActions;

const STORED_USER_KEY = '187_growth_user';
const STORED_CHILD_ID_KEY = '187_growth_child_id';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredChildId(): string | null {
  try {
    return localStorage.getItem(STORED_CHILD_ID_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  session: null,
  selectedChildId: null,
  isLoading: true,
  isInitialized: false,

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true });

      // 1) 로컬스토리지에 저장된 레거시 유저 복원
      const storedUser = loadStoredUser();
      const storedChildId = loadStoredChildId();
      if (storedUser) {
        set({
          user: storedUser,
          selectedChildId: storedChildId,
          session: { user: { id: storedUser.id } } as Session,
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // 2) Supabase Auth 세션 확인 (admin SSO 가 추가될 경우 대비)
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        logger.error('Failed to get session:', sessionError);
        set({ isLoading: false, isInitialized: true });
        return;
      }

      const session = sessionData.session;

      if (session) {
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
          set({ session: null, user: null, selectedChildId: null });
        }
      });
    } catch (err) {
      logger.error('Auth initialization error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signInPatient: async (chartNumber: string, password: string) => {
    set({ isLoading: true });

    const trimmedChart = chartNumber.trim();
    const trimmedPwd = password.trim();

    // 1) children 테이블에서 chart_number + password 매칭
    const { data: child, error: childErr } = await supabase
      .from('children')
      .select('*')
      .eq('chart_number', trimmedChart)
      .eq('password', trimmedPwd)
      .maybeSingle();

    if (childErr || !child) {
      set({ isLoading: false });
      throw new Error('차트번호 또는 비밀번호가 올바르지 않습니다.');
    }

    const childRow = child as Child;

    // 2) 부모 users 정보 조회 (parent_id)
    const { data: parent, error: parentErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', childRow.parent_id)
      .single();

    if (parentErr || !parent) {
      set({ isLoading: false });
      throw new Error('보호자 정보를 찾을 수 없습니다. 병원에 문의해주세요.');
    }

    const profile = parent as User;

    // 3) 로컬스토리지 저장
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(profile));
    localStorage.setItem(STORED_CHILD_ID_KEY, childRow.id);

    // 4) last_login_at 업데이트 (best-effort)
    void supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id);

    set({
      user: profile,
      selectedChildId: childRow.id,
      session: { user: { id: profile.id } } as Session,
      isLoading: false,
    });

    return childRow;
  },

  signInAdmin: async (email: string, password: string) => {
    set({ isLoading: true });

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
    if (profile.role !== 'admin' && profile.role !== 'doctor') {
      set({ isLoading: false });
      throw new Error('관리자 권한이 없는 계정입니다.');
    }

    localStorage.setItem(STORED_USER_KEY, JSON.stringify(profile));
    localStorage.removeItem(STORED_CHILD_ID_KEY);

    void supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id);

    set({
      user: profile,
      selectedChildId: null,
      session: { user: { id: profile.id } } as Session,
      isLoading: false,
    });
  },

  signOut: async () => {
    localStorage.removeItem(STORED_USER_KEY);
    localStorage.removeItem(STORED_CHILD_ID_KEY);

    try {
      await supabase.auth.signOut();
    } catch {
      // Supabase Auth 세션이 없어도 무시
    }

    set({ user: null, session: null, selectedChildId: null });
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin' || user?.role === 'doctor';
  },
}));
