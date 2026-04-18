import { useEffect, useState } from 'react';
import type { Child } from '@/shared/types';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { SectionCard } from './SectionCard';

interface Props {
  child: Child;
  onSaved: (child: Child) => void;
}

type ChildPatch = Parameters<typeof updateChildField>[1];

/**
 * Section 1 — 기본 정보. Edits first-class `children` columns only (no JSONB).
 * Each input flushes on blur via `updateChildField`.
 */
export function IntakeBasicInfoSection({ child, onSaved }: Props) {
  const save = async (patch: ChildPatch) => {
    try {
      const updated = await updateChildField(child.id, patch);
      onSaved(updated);
    } catch {
      // surface via toast later; keep local state intact
    }
  };

  return (
    <SectionCard step="01" title="기본 정보" subtitle="이름 · 생년월일 · 부모 키 등" accent="indigo">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldText
          label="환자번호"
          value={child.chart_number}
          onSave={(v) => {
            const trimmed = v.trim();
            if (!trimmed) return; // chart_number NOT NULL
            save({ chart_number: trimmed });
          }}
        />
        <FieldText label="이름" value={child.name} onSave={(v) => save({ name: v })} />
        <FieldDate
          label="생년월일"
          value={child.birth_date}
          onSave={(v) => save({ birth_date: v })}
        />
        <div className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <span>성별 · 국적</span>
          <div className="flex items-center gap-2">
            <GenderToggle
              value={child.gender}
              onChange={(v) => save({ gender: v })}
            />
            <NationalityToggle
              value={child.nationality ?? 'KR'}
              onChange={(v) => save({ nationality: v })}
            />
          </div>
        </div>

        <FieldNumber
          label="출생 임신주수 (주)"
          value={child.birth_week ?? null}
          onSave={(v) => save({ birth_week: v ?? undefined })}
        />
        <FieldNumber
          label="출생 몸무게 (kg)"
          value={child.birth_weight ?? null}
          step={0.01}
          onSave={(v) => save({ birth_weight: v ?? undefined })}
        />
        <div />

        <div className="md:col-span-3">
          <FieldText
            label="출생시 특이사항"
            value={child.birth_notes ?? ''}
            onSave={(v) => save({ birth_notes: v || undefined })}
          />
        </div>

        <FieldNumber
          label="아버지 키 (cm)"
          value={child.father_height ?? null}
          step={0.1}
          onSave={(v) => save({ father_height: v ?? undefined })}
        />
        <FieldNumber
          label="어머니 키 (cm)"
          value={child.mother_height ?? null}
          step={0.1}
          onSave={(v) => save({ mother_height: v ?? undefined })}
        />
        <FieldNumber
          label="희망 키 (cm)"
          value={child.desired_height ?? null}
          step={0.1}
          onSave={(v) => save({ desired_height: v ?? undefined })}
        />

        <FieldText
          label="학년"
          value={child.grade ?? ''}
          onSave={(v) => save({ grade: v || undefined })}
          placeholder="예) 초3"
        />
        <FieldText
          label="학급 내 키번호"
          value={child.class_height_rank ?? ''}
          onSave={(v) => save({ class_height_rank: v || undefined })}
          placeholder="예) 12번"
        />
      </div>
    </SectionCard>
  );
}

function GenderToggle({
  value,
  onChange,
}: {
  value: 'male' | 'female';
  onChange: (v: 'male' | 'female') => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('male')}
        className={
          'px-3 py-1 text-[11px] font-semibold transition ' +
          (value === 'male'
            ? 'bg-sky-500 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50')
        }
      >
        남
      </button>
      <button
        type="button"
        onClick={() => onChange('female')}
        className={
          'border-l border-slate-200 px-3 py-1 text-[11px] font-semibold transition ' +
          (value === 'female'
            ? 'bg-pink-500 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50')
        }
      >
        여
      </button>
    </div>
  );
}

function NationalityToggle({
  value,
  onChange,
}: {
  value: 'KR' | 'CN';
  onChange: (v: 'KR' | 'CN') => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      {(['KR', 'CN'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={
            'px-2.5 py-1 text-[11px] font-semibold transition ' +
            (value === code
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50')
          }
          title={code === 'KR' ? '한국 표준 성장곡선' : '중국 표준 성장곡선'}
        >
          {code === 'KR' ? '🇰🇷 KR' : '🇨🇳 CN'}
        </button>
      ))}
    </div>
  );
}

// --- small local field primitives (keep file self-contained) ---

function FieldText({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="text"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
      />
    </label>
  );
}

function FieldDate({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="date"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onSave(local);
        }}
      />
    </label>
  );
}

function FieldNumber({
  label,
  value,
  step = 1,
  onSave,
}: {
  label: string;
  value: number | null;
  step?: number;
  onSave: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(value == null ? '' : String(value));
  useEffect(() => setLocal(value == null ? '' : String(value)), [value]);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
    </label>
  );
}
