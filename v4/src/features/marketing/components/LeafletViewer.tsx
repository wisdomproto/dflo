// src/features/marketing/components/LeafletViewer.tsx
// 187 리플렛 언어별 뷰어. 정적 리플렛(/leaflet/{lang}/index.html)을 iframe 으로 표시.
// 자산: v4/public/leaflet/{ko,en}/index.html + shared/ (배경 webp 공유). 원본 편집은 docs/Leaflet/ (sync-leaflet.mjs 로 복사).
import { useState } from 'react';

type Lang = { code: string; label: string; flag: string; ready: boolean };

const LANGS: Lang[] = [
  { code: 'ko', label: '한글', flag: '🇰🇷', ready: true },
  { code: 'en', label: '영어', flag: '🇺🇸', ready: true },
  { code: 'cn', label: '중국어 (간체)', flag: '🇨🇳', ready: true },
  { code: 'tw', label: '중국어 (번체)', flag: '🇹🇼', ready: true },
  { code: 'th', label: '태국어', flag: '🇹🇭', ready: true },
  { code: 'vi', label: '베트남어', flag: '🇻🇳', ready: true },
];

export function LeafletViewer() {
  const [active, setActive] = useState('ko');
  const [toast, setToast] = useState('');
  const cur = LANGS.find((l) => l.code === active) ?? LANGS[0];

  const share = async () => {
    const url = `${window.location.origin}/leaflet/view.html?lang=${cur.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast(`🔗 ${cur.label} 공유 링크 복사됨 · 비밀번호 8054`);
    } catch {
      setToast(url);
    }
    window.setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 언어 탭 */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/60 px-4 py-2">
        <span className="mr-1 text-xs text-gray-400">언어</span>
        <div className="flex flex-wrap gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(l.code)}
              className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                active === l.code
                  ? 'border-transparent text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
              }`}
              style={active === l.code ? { backgroundColor: '#4A2D6B' } : undefined}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {!l.ready && (
                <span
                  className={`rounded px-1 py-0.5 text-[9px] ${
                    active === l.code ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  준비 중
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {cur.ready && (
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-1 rounded-md border border-[#4A2D6B] px-2.5 py-1 text-xs font-semibold text-[#4A2D6B] hover:bg-[#4A2D6B] hover:text-white"
            >
              🔗 공유
            </button>
          )}
          <a
            href={`/leaflet/${cur.code}/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${
              cur.ready ? 'text-[#4A2D6B] hover:underline' : 'pointer-events-none text-gray-300'
            }`}
          >
            새 탭에서 열기 ↗
          </a>
        </div>
      </div>

      {/* 뷰어 */}
      {cur.ready ? (
        <iframe
          key={cur.code}
          src={`/leaflet/${cur.code}/index.html`}
          title={`리플렛 ${cur.label}`}
          className="w-full flex-1 border-0"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-gray-50 p-8 text-center">
          <div>
            <div className="mb-3 text-4xl">🚧</div>
            <p className="text-sm font-semibold text-gray-700">
              {cur.flag} {cur.label} 리플렛은 준비 중입니다
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              현재 <b className="text-gray-600">한글 · 영어</b> 리플렛을 보실 수 있습니다.
              <br />
              나머지 언어는 한글/영어 배경을 공유해 번역만 추가하면 제작됩니다.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#0d2a26] px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
