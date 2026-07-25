import { useState } from 'react';
import type { IntakeLang } from '../types';
import IntakeWizard from '../components/IntakeWizard';

// Global intake entry (/intake): pick a language first, then fill the survey.
// Per-language direct links (/intake/:lang) stay separate (PublicIntakePage).

const LANGS: { lang: IntakeLang; flag: string; label: string }[] = [
  { lang: 'en', flag: '🇺🇸', label: 'English' },
  { lang: 'ko', flag: '🇰🇷', label: '한국어' },
  { lang: 'th', flag: '🇹🇭', label: 'ไทย' },
  { lang: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { lang: 'zh-hans', flag: '🇨🇳', label: '简体中文' },
  { lang: 'zh-hant', flag: '🇹🇼', label: '繁體中文' },
  { lang: 'ja', flag: '🇯🇵', label: '日本語' },
  { lang: 'es', flag: '🇪🇸', label: 'Español' },
  { lang: 'ar', flag: '🇸🇦', label: 'العربية' },
];

export default function GlobalIntakePage() {
  const [lang, setLang] = useState<IntakeLang | null>(null);

  if (!lang) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-1 text-center text-3xl">🌐</div>
          <h1 className="mb-1 text-center text-lg font-bold text-slate-800">
            언어 선택 / Select language
          </h1>
          <p className="mb-5 text-center text-sm text-slate-500">
            설문에 사용할 언어를 선택하세요.
          </p>
          <div className="grid gap-2.5">
            {LANGS.map((o) => (
              <button
                key={o.lang}
                type="button"
                onClick={() => setLang(o.lang)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="text-2xl">{o.flag}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLang(null)}
        className="fixed right-3 top-3 z-10 rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur hover:bg-slate-50"
      >
        🌐 언어 변경
      </button>
      {/* Remount wizard on language change so form state / country default reset. */}
      <IntakeWizard key={lang} lang={lang} />
    </div>
  );
}
