import { useState } from 'react';

export interface VisitFormValues {
  visit_date: string;
  chief_complaint: string;
  plan: string;
  notes: string;
}

export function VisitForm({
  initial,
  onSubmit,
  submitLabel = '저장',
}: {
  initial?: Partial<VisitFormValues>;
  onSubmit: (values: VisitFormValues) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<VisitFormValues>({
    visit_date: initial?.visit_date ?? new Date().toISOString().slice(0, 10),
    chief_complaint: initial?.chief_complaint ?? '',
    plan: initial?.plan ?? '',
    notes: initial?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit(values);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm">
        내원일
        <input
          type="date"
          required
          value={values.visit_date}
          onChange={(e) => setValues((v) => ({ ...v, visit_date: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block text-sm">
        주호소 (chief complaint)
        <input
          type="text"
          value={values.chief_complaint}
          onChange={(e) => setValues((v) => ({ ...v, chief_complaint: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block text-sm">
        플랜
        <input
          type="text"
          value={values.plan}
          onChange={(e) => setValues((v) => ({ ...v, plan: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block text-sm">
        자유 진료 메모
        <textarea
          rows={5}
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-[#667eea] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? '저장 중…' : submitLabel}
      </button>
    </form>
  );
}
