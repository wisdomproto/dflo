import { create } from 'zustand';
import type { Toast } from '@/shared/types';
import type { ReactNode } from 'react';

// ================================================
// UI Store - 187 성장케어 v4
// ================================================

interface UIState {
  toasts: Toast[];
  isBottomSheetOpen: boolean;
  bottomSheetContent: ReactNode | null;
}

interface UIActions {
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  openBottomSheet: (content: ReactNode) => void;
  closeBottomSheet: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
  // State
  toasts: [],
  isBottomSheetOpen: false,
  bottomSheetContent: null,

  // Actions
  addToast: (type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  openBottomSheet: (content: ReactNode) => {
    set({ isBottomSheetOpen: true, bottomSheetContent: content });
  },

  closeBottomSheet: () => {
    set({ isBottomSheetOpen: false, bottomSheetContent: null });
  },
}));
