// src/features/marketing/components/ads/AdDocPanel.tsx
// 광고 관리 안에 들어가는 접이식 문서 패널(평소엔 접힘). HTML 가이드를 iframe 으로 임베드.
// 전략 기획서·실행 가이드·검수 자료 등 정적 HTML 문서를 공통으로 표시.
import { useState } from 'react';

export function AdDocPanel({
  title,
  subtitle,
  src,
  height = '72vh',
}: {
  title: string;
  subtitle?: string;
  src: string;
  height?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#4A2D6B]/25 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-[#4A2D6B]">
          {title}
          {subtitle && <span className="ml-1 font-normal text-gray-400">{subtitle}</span>}
        </span>
        <span className={`flex-shrink-0 text-xs text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 p-2">
          <iframe src={src} title={title} className="w-full rounded-lg border-0" style={{ height }} />
        </div>
      )}
    </div>
  );
}
