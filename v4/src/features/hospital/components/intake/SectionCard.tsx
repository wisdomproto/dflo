import type { ReactNode } from 'react';

export type SectionAccent = 'indigo' | 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';

interface Props {
  /** Section number badge (string so we can use "01", "02" etc). */
  step: string;
  title: string;
  /** Optional short subtitle shown beside the title in smaller text. */
  subtitle?: string;
  /** Color accent used for the badge + left bar + title underline. */
  accent?: SectionAccent;
  /** Right-aligned controls (e.g. 저장됨 상태 표시, 액션 버튼 등). */
  action?: ReactNode;
  children: ReactNode;
}

const ACCENTS: Record<
  SectionAccent,
  { bar: string; badge: string; text: string; ring: string; bg: string }
> = {
  indigo:  { bar: 'bg-indigo-500',  badge: 'bg-indigo-500',  text: 'text-indigo-600',  ring: 'ring-indigo-100',  bg: 'from-indigo-50/70' },
  violet:  { bar: 'bg-violet-500',  badge: 'bg-violet-500',  text: 'text-violet-600',  ring: 'ring-violet-100',  bg: 'from-violet-50/70' },
  rose:    { bar: 'bg-rose-500',    badge: 'bg-rose-500',    text: 'text-rose-600',    ring: 'ring-rose-100',    bg: 'from-rose-50/70' },
  amber:   { bar: 'bg-amber-500',   badge: 'bg-amber-500',   text: 'text-amber-600',   ring: 'ring-amber-100',   bg: 'from-amber-50/70' },
  emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-100', bg: 'from-emerald-50/70' },
  sky:     { bar: 'bg-sky-500',     badge: 'bg-sky-500',     text: 'text-sky-600',     ring: 'ring-sky-100',     bg: 'from-sky-50/70' },
  slate:   { bar: 'bg-slate-400',   badge: 'bg-slate-500',   text: 'text-slate-600',   ring: 'ring-slate-100',   bg: 'from-slate-50/70' },
};

/**
 * Card used for every section inside the admin 기본 정보 탭.
 * - accent-colored vertical bar on the left
 * - numbered badge + title header with subtle divider
 * - soft gradient header backdrop
 * - shared shadow + border treatment so every section matches
 */
export function SectionCard({ step, title, subtitle, accent = 'indigo', action, children }: Props) {
  const a = ACCENTS[accent];
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/[0.02]`}
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} />
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-b ${a.bg} to-white px-5 py-3 pl-6`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white shadow-sm ${a.badge}`}
          >
            {step}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {/* Body */}
      <div className="px-5 py-4 pl-6">{children}</div>
    </section>
  );
}
