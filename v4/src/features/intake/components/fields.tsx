// Shared controlled input primitives for the public patient intake wizard.
// Mirrors the visual language of features/hospital/.../IntakeBasicInfoSection.tsx
// (rounded border, focus ring, small uppercase label) but with larger
// patient-facing touch targets.

import type { ReactNode } from 'react';

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

function FieldShell({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error && <span className="text-xs font-medium text-rose-500">{error}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
  multiline,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      {multiline ? (
        <textarea
          className={INPUT_CLASS + ' min-h-[96px] resize-y'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className={INPUT_CLASS}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <input
        type="text"
        inputMode="numeric"
        className={INPUT_CLASS}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <select
        className={INPUT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function YesNoField({
  label,
  value,
  onChange,
  yes,
  no,
  required,
  error,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  yes: string;
  no: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <div className="flex gap-3">
        {(
          [
            [true, yes],
            [false, no],
          ] as const
        ).map(([v, lbl]) => {
          const active = value === v;
          return (
            <button
              key={lbl}
              type="button"
              onClick={() => onChange(v)}
              className={
                'flex-1 rounded-xl border px-4 py-3 text-base font-semibold transition ' +
                (active
                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function Date3Field({
  label,
  year,
  month,
  day,
  onYear,
  onMonth,
  onDay,
  yearLabel,
  monthLabel,
  dayLabel,
  required,
  error,
}: {
  label: string;
  year: string;
  month: string;
  day: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  onDay: (v: string) => void;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          className={INPUT_CLASS + ' w-2/4'}
          value={year}
          placeholder={yearLabel}
          onChange={(e) => onYear(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className={INPUT_CLASS + ' w-1/4'}
          value={month}
          placeholder={monthLabel}
          onChange={(e) => onMonth(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className={INPUT_CLASS + ' w-1/4'}
          value={day}
          placeholder={dayLabel}
          onChange={(e) => onDay(e.target.value)}
        />
      </div>
    </FieldShell>
  );
}

export function ChipMulti<T extends string>({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label?: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
  error?: string;
}) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={
                'rounded-full border px-4 py-2 text-sm font-medium transition ' +
                (active
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && <span className="text-xs font-medium text-rose-500">{error}</span>}
    </div>
  );
}
