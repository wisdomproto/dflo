import { useState } from 'react';
import { GrowthComparisonDiagram } from '@/features/hospital/components/intake/GrowthComparisonDiagram';

export default function AdminDiagramPreviewPage() {
  const [initial, setInitial] = useState(141.5);
  const [predicted, setPredicted] = useState(167);
  const [finalH, setFinalH] = useState(178.3);
  const [lang, setLang] = useState<'ko' | 'en'>('ko');

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-bold text-slate-900">Growth Comparison Diagram · Preview</h1>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Initial" value={initial} onChange={setInitial} />
        <Field label="Predicted" value={predicted} onChange={setPredicted} />
        <Field label="Final" value={finalH} onChange={setFinalH} />
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Language</span>
          <div className="inline-flex overflow-hidden rounded border border-slate-300">
            {(['ko', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={
                  'px-3 py-1 text-xs font-semibold ' +
                  (lang === l ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700')
                }
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <GrowthComparisonDiagram
          initialHeight={initial}
          predictedAdultHeight={predicted}
          finalHeight={finalH}
          lang={lang}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      <span>{label} (cm)</span>
      <input
        type="number"
        step={0.1}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-28 rounded border border-slate-200 px-2 py-1 text-sm"
      />
    </label>
  );
}
