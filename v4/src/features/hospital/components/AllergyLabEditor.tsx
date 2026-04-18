import { useState } from 'react';

export interface AllergyResultData {
  danger: string[];
  caution: string[];
}

export function AllergyLabEditor({
  value,
  onChange,
}: {
  value: AllergyResultData;
  onChange: (v: AllergyResultData) => void;
}) {
  const [dangerInput, setDangerInput] = useState('');
  const [cautionInput, setCautionInput] = useState('');

  function addTo(key: 'danger' | 'caution', v: string) {
    const item = v.trim();
    if (!item) return;
    if (value[key].includes(item)) return;
    onChange({ ...value, [key]: [...value[key], item] });
    if (key === 'danger') setDangerInput('');
    else setCautionInput('');
  }
  function removeFrom(key: 'danger' | 'caution', item: string) {
    onChange({ ...value, [key]: value[key].filter((x) => x !== item) });
  }

  return (
    <div className="space-y-3">
      <Bucket
        label="위험 식품"
        color="bg-red-100 text-red-700"
        items={value.danger}
        inputValue={dangerInput}
        onInput={setDangerInput}
        onAdd={(v) => addTo('danger', v)}
        onRemove={(v) => removeFrom('danger', v)}
      />
      <Bucket
        label="주의 식품"
        color="bg-amber-100 text-amber-700"
        items={value.caution}
        inputValue={cautionInput}
        onInput={setCautionInput}
        onAdd={(v) => addTo('caution', v)}
        onRemove={(v) => removeFrom('caution', v)}
      />
    </div>
  );
}

function Bucket({
  label,
  color,
  items,
  inputValue,
  onInput,
  onAdd,
  onRemove,
}: {
  label: string;
  color: string;
  items: string[];
  inputValue: string;
  onInput: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((x) => (
          <span key={x} className={`rounded px-2 py-0.5 text-xs ${color}`}>
            {x}{' '}
            <button onClick={() => onRemove(x)} className="ml-1">
              ×
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd(inputValue);
            }
          }}
          placeholder="식품명 +Enter"
          className="rounded border px-2 py-0.5 text-xs"
        />
      </div>
    </div>
  );
}
