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
    const user = useAuthStore.getState().user;
    if (!user) {
      logger.warn('Cannot fetch children: no authenticated user');
      return;
    }

    set({ isLoading: true });

    try {
      // Fetch children for the current user
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

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
                .from('measurements')
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

      // Auto-select first child if none selected
      const { selectedChildId } = get();
      if (!selectedChildId && childrenWithMeasurements.length > 0) {
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
