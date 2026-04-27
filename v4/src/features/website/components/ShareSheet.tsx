// 공유하기 바텀시트.
// 1) 다른 앱 — Web Share API (모바일 네이티브 시트, 안드로이드/iOS 에서 카톡·메시지·메일 등). 미지원 환경(데스크톱 일부)에서는 숨김.
// 2) 링크 복사 — clipboard API.
//
// 카카오톡 SDK 직접 연동은 차후 — 지금은 Web Share 시트 안의 카카오톡 옵션 또는 링크 복사로 대체.

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  url?: string;
}

const DEFAULT_TITLE = '연세새봄의원 187 성장클리닉';
const DEFAULT_DESC = '성장진료 10년의 노하우 — 우리 아이 예상키를 무료로 측정해보세요';

export function ShareSheet({
  isOpen,
  onClose,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  url,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const canWebShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const showToast = (msg: string, ms = 1800) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard();
    showToast(ok ? '링크가 복사됐어요!' : '복사에 실패했어요.');
  };

  const handleNative = async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({ title, text: description, url: shareUrl });
      onClose();
    } catch {
      // 사용자가 취소한 경우 — 무시
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="공유하기"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">공유하기</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* 다른 앱 (모바일 네이티브 공유 시트 — 카톡·메시지·메일 등 포함) */}
          {canWebShare && (
            <button
              onClick={handleNative}
              className="flex items-center gap-4 w-full rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 active:scale-[0.98] transition-all"
            >
              <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-base text-gray-900">다른 앱으로 공유</p>
                <p className="text-xs text-gray-500">카카오톡·메시지·메일 등</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 링크 복사 */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 active:scale-[0.98] transition-all"
          >
            <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 015.656 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 01-5.656-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
              </svg>
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-base text-gray-900">링크 복사</p>
              <p className="text-xs text-gray-500 truncate">{shareUrl}</p>
            </div>
          </button>
        </div>

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full px-4 py-2 bg-gray-900 text-white text-xs rounded-full shadow-lg whitespace-nowrap">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
