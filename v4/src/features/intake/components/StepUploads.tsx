import { useState } from 'react';
import type { StepProps } from './StepBasic';
import { validateFile } from '../publicIntakeService';

type Kind = 'xray' | 'lab';

export function StepUploads({ state, set, L }: StepProps) {
  // Per-kind inline rejection messages (e.g. unsupported / too_large).
  const [rejected, setRejected] = useState<Record<Kind, string[]>>({ xray: [], lab: [] });

  const pick = (kind: Kind, fileList: FileList | null) => {
    if (!fileList) return;
    const accepted: File[] = [];
    const bad: string[] = [];
    Array.from(fileList).forEach((f) => {
      const err = validateFile(f);
      if (err) bad.push(`${f.name} — ${err}`);
      else accepted.push(f);
    });
    setRejected((r) => ({ ...r, [kind]: bad }));
    if (accepted.length) {
      if (kind === 'xray') set({ xrayFiles: [...state.xrayFiles, ...accepted] });
      else set({ labFiles: [...state.labFiles, ...accepted] });
    }
  };

  const remove = (kind: Kind, idx: number) => {
    if (kind === 'xray') set({ xrayFiles: state.xrayFiles.filter((_, i) => i !== idx) });
    else set({ labFiles: state.labFiles.filter((_, i) => i !== idx) });
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-slate-800">{L.s6Title}</h2>
      <p className="text-sm text-slate-500">{L.uploadHint}</p>

      <UploadBlock
        label={L.xrayUpload}
        accept="image/*"
        files={state.xrayFiles}
        rejected={rejected.xray}
        onPick={(fl) => pick('xray', fl)}
        onRemove={(i) => remove('xray', i)}
      />
      <UploadBlock
        label={L.labUpload}
        accept="image/*,application/pdf"
        files={state.labFiles}
        rejected={rejected.lab}
        onPick={(fl) => pick('lab', fl)}
        onRemove={(i) => remove('lab', i)}
      />
    </div>
  );
}

function UploadBlock({
  label,
  accept,
  files,
  rejected,
  onPick,
  onRemove,
}: {
  label: string;
  accept: string;
  files: File[];
  rejected: string[];
  onPick: (fl: FileList | null) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/40">
        <span>＋ {label}</span>
        <input
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {rejected.length > 0 && (
        <ul className="flex flex-col gap-1">
          {rejected.map((r, i) => (
            <li key={i} className="text-xs font-medium text-rose-500">
              {r}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <span className="truncate pr-2">{f.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 rounded-full px-2 text-lg leading-none text-slate-400 hover:text-rose-500"
                aria-label="remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
