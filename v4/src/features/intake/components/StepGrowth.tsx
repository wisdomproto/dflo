import type { StepProps } from './StepBasic';
import type { GrowthHistoryEntry } from '@/shared/types';

const AGES = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export function StepGrowth({ state, set, L }: StepProps) {
  const history = state.survey.growth_history;
  const heightFor = (age: number): string => {
    const row = history.find((h) => h.age === age);
    return row && row.height != null ? String(row.height) : '';
  };

  const setHeight = (age: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const height = parsed != null && Number.isNaN(parsed) ? null : parsed;
    const next: GrowthHistoryEntry[] = AGES.map((a) => {
      if (a === age) return { age: a, height };
      const existing = history.find((h) => h.age === a);
      return { age: a, height: existing ? existing.height : null };
    });
    set({ survey: { ...state.survey, growth_history: next } });
  };

  const flags = state.survey.growth_flags;
  const setFlag = (key: keyof typeof flags, v: boolean) => {
    set({ survey: { ...state.survey, growth_flags: { ...flags, [key]: v } } });
  };

  const flagRows: { key: keyof typeof flags; label: string }[] = [
    { key: 'rapid_growth', label: L.flagRapid },
    { key: 'slowed', label: L.flagSlowed },
    { key: 'puberty_concern', label: L.flagPuberty },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s2Title}</h2>
      <p className="text-sm text-slate-500">{L.growthHint}</p>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-2 text-left font-semibold">{L.ageCol}</th>
              <th className="px-4 py-2 text-left font-semibold">{L.heightCol}</th>
            </tr>
          </thead>
          <tbody>
            {AGES.map((age) => (
              <tr key={age} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-700">{age}</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    value={heightFor(age)}
                    onChange={(e) => setHeight(age, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3">
        {flagRows.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 text-base text-slate-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              checked={flags[key]}
              onChange={(e) => setFlag(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
