import { create } from 'zustand';
import type { Child, Measurement } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { useAuthStore } from '@/stores/authStore';

// ================================================
// Children Store - 187 성장케어 v4
// ================================================

interface ChildWithLatestMeasurement extends Child {
  latestMeasurement?: Measurement;
}

interface ChildrenState {
  children: ChildWithLatestMeasurement[];
  selectedChildId: string | null;
  isLoading: boolean;
}

interface ChildrenActions {
  fetchChildren: () => Promise<void>;
  selectChild: (childId: string) => void;
  addChild: (
    child: Omit<Child, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ) => Promise<void>;
  updateChild: (id: string, updates: Partial<Child>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  getSelectedChild: () => ChildWithLatestMeasurement | undefined;
}

type ChildrenStore = ChildrenState & ChildrenActions;

export const useChildrenStore = create<ChildrenStore>((set, get) => ({
  // State
  children: [],
  selectedChildId: null,
  isLoading: false,

  // Actions
  fetchChildren: async () => {
    const auth = useAuthStore.getState();
    const user = auth.user;
    if (!user) {
      logger.warn('Cannot fetch children: no authenticated user');
      return;
    }

    set({ isLoading: true });

    try {
      // 환자 모드: authStore.selectedChildId 가 있으면 그 자녀 1명만 조회.
      // (한 부모가 여러 자녀더라도 차트번호 단위 로그인이므로 1명만 활성)
      // admin 모드 등 selectedChildId 가 없을 때는 parent_id 전체.
      const baseQuery = supabase.from('children').select('*');
      const filtered = auth.selectedChildId
        ? baseQuery.eq('id', auth.selectedChildId)
        : baseQuery.eq('parent_id', user.id);

      const { data: childrenData, error: childrenError } = await filtered.order(
        'created_at',
        { ascending: true },
      );

      if (childrenError) {
        logger.error('Failed to fetch children:', childrenError);
        set({ isLoading: false });
        return;
      }

      const children = (childrenData ?? []) as Child[];

      // Fetch latest measurement for each child
      const childrenWithMeasurements: ChildWithLatestMeasurement[] =
        await Promise.all(
          children.map(async (child) => {
            const { data: measurementData, error: measurementError } =
              await supabase
                .from('hospital_measurements')
                .select('*')
                .eq('child_id', child.id)
                .order('measured_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (measurementError) {
              logger.error(
                `Failed to fetch measurement for child ${child.id}:`,
                measurementError
              );
              return { ...child };
            }

            return {
              ...child,
              latestMeasurement: (measurementData as Measurement) ?? undefined,
            };
          })
        );

      set({ children: childrenWithMeasurements, isLoading: false });

      // Auto-select if invalid: 다른 환자 로그인 후 옛 selectedChildId 가
      // 새 children 배열에 없으면 (예: 22028 → 로그아웃 → F9999 로그인) 첫
      // 환자로 자동 전환. 이걸 안 하면 RecordsPage 가 child=undefined 라
      // 빈 화면 → 새로고침 후에야 정상이 됨.
      const { selectedChildId } = get();
      const valid = !!selectedChildId && childrenWithMeasurements.some((c) => c.id === selectedChildId);
      if (!valid && childrenWithMeasurements.length > 0) {
        set({ selectedChildId: childrenWithMeasurements[0].id });
      }
    } catch (err) {
      logger.error('Fetch children error:', err);
      set({ isLoading: false });
    }
  },

  selectChild: (childId: string) => {
    set({ selectedChildId: childId });
  },

  addChild: async (
    child: Omit<Child, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('인증된 사용자가 없습니다.');
    }

    const { error } = await supabase.from('children').insert({
      ...child,
      parent_id: user.id,
    });

    if (error) {
      logger.error('Failed to add child:', error);
      throw error;
    }

    // Refresh children list
    await get().fetchChildren();
  },

  updateChild: async (id: string, updates: Partial<Child>) => {
    const { error } = await supabase
      .from('children')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      logger.error('Failed to update child:', error);
      throw error;
    }

    // Refresh children list
    await get().fetchChildren();
  },

  deleteChild: async (id: string) => {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete child:', error);
      throw error;
    }

    // If the deleted child was selected, clear selection
    const { selectedChildId } = get();
    if (selectedChildId === id) {
      set({ selectedChildId: null });
    }

    // Refresh children list
    await get().fetchChildren();
  },

  getSelectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find((c) => c.id === selectedChildId);
  },
}));
