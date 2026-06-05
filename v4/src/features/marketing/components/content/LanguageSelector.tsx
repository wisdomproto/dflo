// src/features/marketing/components/content/LanguageSelector.tsx
import type { MarketingArticle } from '../../types';

const ACCENT = '#4A2D6B';

// 1차 활성 언어 (import 스코프 ko/th + 향후 vi/en)
const LANGS: { code: string; label: string; flag: string }[] = [
  { code: 'ko', label: 'KO', flag: '🇰🇷' },
  { code: 'th', label: 'TH', flag: '🇹🇭' },
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
];

interface Props {
  article: MarketingArticle;
  language: string;
  onChange: (lang: string) => void;
}

export function LanguageSelector({ article, language, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/60 px-4 py-2">
      <span className="mr-1 text-xs text-gray-400">언어</span>
      <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
        {LANGS.map((l) => {
          const active = language === l.code;
          const hasTr = l.code === 'ko' || !!article.translations[l.code]?.body?.trim();
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onChange(l.code)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                active ? 'text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={active ? { backgroundColor: ACCENT } : undefined}
              title={l.code === 'ko' ? '원본' : hasTr ? '번역 있음' : '번역 없음'}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === 'ko' ? (
                <span className="text-[10px] opacity-70">원본</span>
              ) : hasTr ? (
                <span className="text-[10px]">✓</span>
              ) : (
                <span className="text-[10px] opacity-60">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
