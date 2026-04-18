import { useEffect, useMemo, useState } from 'react';
import type { Medication } from '@/shared/types';
import { fetchMedications } from '@/features/hospital/services/medicationService';

export function MedicationPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string, m: Medication) => void;
}) {
  const [all, setAll] = useState<Medication[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchMedications({ activeOnly: true }).then(setAll);
  }, []);

  const filtered = useMemo(
    () =>
      all
        .filter((m) => {
          const q = query.toLowerCase();
          return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
        })
        .slice(0, 20),
    [all, query],
  );

  return (
    <div>
      <input
        placeholder="약품 검색 (코드/이름)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <ul className="mt-1 max-h-40 overflow-y-auto rounded border bg-white text-sm">
        {filtered.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onChange(m.id, m)}
              className={`w-full px-2 py-1 text-left hover:bg-gray-50 ${
                value === m.id ? 'bg-[#eef2ff]' : ''
              }`}
            >
              <span className="font-mono">{m.code}</span> · {m.name}
              {m.default_dose && (
                <span className="text-xs text-gray-500">
                  {' '}
                  ({m.default_dose}
                  {m.unit ?? ''})
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
