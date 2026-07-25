// Shared controlled input primitives for the public patient intake wizard.
// Mirrors the visual language of features/hospital/.../IntakeBasicInfoSection.tsx
// (rounded border, focus ring, small uppercase label) but with larger
// patient-facing touch targets.

import { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * 검색 가능한 셀렉트 — 국가처럼 항목이 200개쯤 되는 필드용.
 * 네이티브 <select> 는 모바일에서 200개를 훑어야 해서 사실상 못 찾는다.
 * 타이핑하면 걸러지고, 위/아래·엔터·Esc 로도 조작된다.
 */
export function SearchSelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  placeholder,
  searchPlaceholder,
  emptyText,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    // 라벨 앞부분 일치를 먼저 — "in" 이면 India 가 Argentina 보다 위로.
    const starts = options.filter((o) => o.label.toLowerCase().startsWith(s));
    const has = options.filter(
      (o) => !o.label.toLowerCase().startsWith(s) &&
        (o.label.toLowerCase().includes(s) || o.value.toLowerCase() === s),
    );
    return [...starts, ...has];
  }, [options, q]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else { setQ(''); setActive(0); }
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <FieldShell label={label} required={required} error={error}>
      <div ref={boxRef} className="relative">
        <button
          type="button"
          className={`${INPUT_CLASS} flex items-center justify-between text-left`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selected ? '' : 'text-slate-400'}>
            {selected ? selected.label : (placeholder ?? '—')}
          </span>
          <span className={`ml-2 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <input
              ref={inputRef}
              className="w-full border-b border-slate-200 px-4 py-2.5 text-base outline-none"
              value={q}
              placeholder={searchPlaceholder ?? '🔍'}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) pick(filtered[active].value); }
                else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
              }}
            />
            <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-400">{emptyText ?? '—'}</li>
              )}
              {filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    className={`block w-full px-4 py-2.5 text-left text-base ${
                      i === active ? 'bg-indigo-50' : ''
                    } ${o.value === value ? 'font-semibold text-indigo-700' : 'text-slate-800'}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o.value)}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
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
