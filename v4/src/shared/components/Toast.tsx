// ================================================
// Toast 컴포넌트 - 187 성장케어 v4
// uiStore 기반 토스트 알림 렌더링
// ================================================

import { useUIStore } from '@/stores/uiStore';

const typeStyles: Record<string, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-gray-900',
  info: 'bg-blue-500 text-white',
};

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i',
};

export default function Toast() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[60] flex flex-col gap-2 w-[90vw] sm:w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                     animate-[slideDown_0.3s_ease-out] ${typeStyles[toast.type]}`}
        >
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {typeIcons[toast.type]}
          </span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center
                       rounded-full hover:bg-white/20 transition-colors
                       text-current opacity-70 hover:opacity-100"
            aria-label="닫기"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
