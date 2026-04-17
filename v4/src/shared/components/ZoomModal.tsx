import { useEffect } from 'react';

interface Props {
  onClose: () => void;
  title?: string;
  /** CSS aspect-ratio for the modal content box (e.g. '2 / 1'). */
  aspectRatio?: string;
  /** Max width as a CSS length (default: 95vw). */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Fullscreen dim-backdrop modal with an aspect-ratio-constrained white content box.
 * - Click outside or Esc to close.
 * - Used by XrayPanel and AdminPatientGrowthChart "크게 보기" buttons.
 */
export function ZoomModal({
  onClose,
  title,
  aspectRatio,
  maxWidth = '95vw',
  children,
}: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        style={{
          maxWidth,
          aspectRatio,
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
          <div className="text-sm font-semibold text-slate-900">{title ?? ''}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
