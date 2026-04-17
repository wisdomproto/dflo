import { useEffect, useState } from 'react';
import type { GrowthHistoryEntry, IntakeSurvey } from '@/shared/types';
import { SectionCard } from './SectionCard';

interface Props {
  survey: IntakeSurvey;
  onSave: (patch: Partial<IntakeSurvey>) => void;
}

const AGES = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const AGE_LABELS: Record<number, string> = {
  8: '초1',
  9: '초2',
  10: '초3',
  11: '초4',
  12: '초5',
  13: '초6',
  14: '중1',
  15: '중2',
  16: '중3',
};

/**
 * Section 2 — Q4 과거 성장표 + 체크박스 3개.
 * Supports excel paste (TSV) via a modal textarea. Accepts 1-col (heights only,
 * ages inferred 8..16) or 2-col (age<TAB>height) formats. Individual cells can
 * still be edited after paste.
 */
export function IntakeGrowthHistoryTable({ survey, onSave }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);

  const toArray = (entries: GrowthHistoryEntry[]): GrowthHistoryEntry[] =>
    AGES.map((age) => entries.find((e) => e.age === age) ?? { age, height: null });

  const entries = toArray(survey.growth_history ?? []);

  const updateRow = (age: number, height: number | null) => {
    const next = entries.map((e) => (e.age === age ? { ...e, height } : e));
    onSave({ growth_history: next });
  };

  const handlePaste = (raw: string) => {
    const parsed = parseTsv(raw);
    if (parsed.length === 0) {
      setPasteOpen(false);
      return;
    }
    onSave({ growth_history: toArray(parsed) });
    setPasteOpen(false);
  };

  const flags = survey.growth_flags ?? {
    rapid_growth: false,
    slowed: false,
    puberty_concern: false,
  };

  return (
    <SectionCard
      step="02"
      title="과거 성장표"
      subtitle="생활기록부 · 소아과 기록"
      accent="violet"
      action={
        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm transition hover:bg-violet-50"
        >
          📋 엑셀 붙여넣기
        </button>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="py-1.5 text-left font-medium">한국 나이 (학년)</th>
            <th className="py-1.5 text-left font-medium">키 (cm)</th>
            <th className="py-1.5 text-left font-medium">변화값</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const prev = idx > 0 ? entries[idx - 1].height : null;
            const delta =
              entry.height != null && prev != null ? (entry.height - prev).toFixed(1) : '';
            return (
              <HeightRow
                key={entry.age}
                age={entry.age}
                label={AGE_LABELS[entry.age]}
                value={entry.height}
                delta={delta}
                onSave={(v) => updateRow(entry.age, v)}
              />
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap gap-2">
        <FlagChip
          checked={flags.rapid_growth}
          label="최근 키가 부쩍 많이 자란다"
          onToggle={() => onSave({ growth_flags: { rapid_growth: !flags.rapid_growth } })}
        />
        <FlagChip
          checked={flags.slowed}
          label="최근 크는 속도가 급격히 줄었다"
          onToggle={() => onSave({ growth_flags: { slowed: !flags.slowed } })}
        />
        <FlagChip
          checked={flags.puberty_concern}
          label="성조숙증이 걱정된다"
          onToggle={() =>
            onSave({ growth_flags: { puberty_concern: !flags.puberty_concern } })
          }
        />
      </div>

      {pasteOpen && <PasteModal onCancel={() => setPasteOpen(false)} onApply={handlePaste} />}
    </SectionCard>
  );
}

function HeightRow({
  age,
  label,
  value,
  delta,
  onSave,
}: {
  age: number;
  label: string;
  value: number | null;
  delta: string;
  onSave: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(value == null ? '' : String(value));
  useEffect(() => setLocal(value == null ? '' : String(value)), [value]);
  return (
    <tr className="border-b border-slate-100">
      <td className="py-1.5 text-xs text-slate-600">
        {age}세 <span className="text-slate-400">({label})</span>
      </td>
      <td className="py-1.5">
        <input
          type="number"
          step={0.1}
          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const trimmed = local.trim();
            const parsed = trimmed === '' ? null : Number(trimmed);
            if (parsed !== null && Number.isNaN(parsed)) return;
            const currentStr = value == null ? '' : String(value);
            if (trimmed !== currentStr) onSave(parsed);
          }}
        />
      </td>
      <td className="py-1.5 text-xs text-slate-500">{delta}</td>
    </tr>
  );
}

function FlagChip({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        'rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition ' +
        (checked
          ? 'border-violet-400 bg-violet-50 text-violet-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50')
      }
    >
      {checked ? '✓ ' : ''}
      {label}
    </button>
  );
}

function PasteModal({
  onCancel,
  onApply,
}: {
  onCancel: () => void;
  onApply: (raw: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">엑셀 붙여넣기</h3>
        <p className="mb-2 text-xs text-slate-500">
          1열(키만) 또는 2열(나이<span className="mx-1">·</span>키) 형식 지원. 비어 있는 행은 건너뜁니다.
        </p>
        <textarea
          autoFocus
          className="h-40 w-full rounded border border-slate-200 p-2 font-mono text-xs focus:border-slate-400 focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'예)\n8\t123.5\n9\t128.2\n...\n\n또는\n123.5\n128.2\n...'}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onApply(text)}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse pasted TSV into GrowthHistoryEntry[]. Accepts:
 * - 1 column (heights only): assigned to ages 8..16 in order
 * - 2 columns (age, height): age column used directly
 * Non-numeric rows are skipped. Heights outside AGES (<8 or >16) are dropped.
 */
function parseTsv(raw: string): GrowthHistoryEntry[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const cells = lines.map((l) => l.split(/\t|,|\s+/).filter(Boolean));
  const isTwoCol = cells.every((row) => row.length >= 2);
  const out: GrowthHistoryEntry[] = [];
  if (isTwoCol) {
    for (const row of cells) {
      const age = Number(row[0]);
      const height = Number(row[1]);
      if (!Number.isFinite(age) || !Number.isFinite(height)) continue;
      if (age < 8 || age > 16) continue;
      out.push({ age, height });
    }
  } else {
    let ageCursor = 8;
    for (const row of cells) {
      if (ageCursor > 16) break;
      const height = Number(row[0]);
      if (!Number.isFinite(height)) {
        ageCursor++;
        continue;
      }
      out.push({ age: ageCursor, height });
      ageCursor++;
    }
  }
  return out;
}
