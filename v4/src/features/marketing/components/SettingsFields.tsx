// src/features/marketing/components/SettingsFields.tsx
import type { BlogCategory } from '../types';

export function Field({
  label,
  value,
  onChange,
  textarea,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          rows={rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
      )}
    </label>
  );
}

export function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label} (쉼표 구분)</span>
      <input
        value={values.join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
      />
    </label>
  );
}

export function CategoryEditor({
  values,
  onChange,
}: {
  values: BlogCategory[];
  onChange: (v: BlogCategory[]) => void;
}) {
  const update = (i: number, patch: Partial<BlogCategory>) =>
    onChange(values.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { code: '', name: '', context: '' }]);

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500">블로그 카테고리</span>
      <div className="space-y-2">
        {values.map((c, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-2">
            <div className="mb-1 flex gap-2">
              <input
                value={c.code}
                onChange={(e) => update(i, { code: e.target.value })}
                placeholder="코드"
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="이름"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="px-2 text-sm text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <textarea
              value={c.context}
              rows={2}
              onChange={(e) => update(i, { context: e.target.value })}
              placeholder="컨텍스트"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 text-xs text-[#4A2D6B] hover:underline">
        + 카테고리 추가
      </button>
    </div>
  );
}
