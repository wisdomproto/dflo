// Minimal visit list for the admin patient detail page.
// Each row is just "#N  YYYY-MM-DD". Click to select (indigo highlight),
// hover to reveal the delete button. Clinical data is edited in the
// center column via VisitDetailPanel.

import { useMemo, useState } from 'react';
import { deleteVisit, updateVisit } from '@/features/hospital/services/visitService';
import { logger } from '@/shared/lib/logger';
import type { HospitalMeasurement, Visit } from '@/shared/types';

interface Props {
  childId: string;
  visits: Visit[];
  measurements?: HospitalMeasurement[];
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  /** Parent refreshes after a row is removed. */
  onVisitDeleted?: () => void;
  /** Parent refreshes after a row's date is edited. */
  onVisitUpdated?: () => void;
}

export function VisitList({
  childId: _childId,
  visits,
  measurements = [],
  selectedVisitId,
  onSelectVisit,
  onVisitDeleted,
  onVisitUpdated,
}: Props) {
  // BA measurements are per-visit but rare — pre-index so row rendering is cheap.
  const baByVisitId = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of measurements) {
      if (m.visit_id && m.bone_age != null) map.set(m.visit_id, m.bone_age);
    }
    return map;
  }, [measurements]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');

  async function saveDate(visitId: string) {
    if (!editDate) return;
    setBusyId(visitId);
    try {
      await updateVisit(visitId, { visit_date: editDate });
      setEditingId(null);
      onVisitUpdated?.();
    } catch (err) {
      logger.error('update visit date failed', err);
      alert('날짜 수정에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        내원 기록이 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {visits.map((v, i) => {
        const idx = visits.length - i;
        const isSelected = selectedVisitId === v.id;
        const hasBA = baByVisitId.has(v.id);
        const rowClass = hasBA
          ? isSelected
            ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-200'
            : 'border-amber-300 bg-amber-50 hover:border-amber-400'
          : isSelected
            ? 'border-indigo-400 bg-white ring-2 ring-indigo-100'
            : 'border-slate-200 bg-white hover:border-slate-300';
        const idxBadgeClass = hasBA
          ? isSelected
            ? 'bg-amber-600 text-white'
            : 'bg-amber-200 text-amber-900'
          : isSelected
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-500';
        return (
          <li
            key={v.id}
            className={`group relative overflow-hidden rounded-lg border transition-colors ${rowClass}`}
          >
            {editingId === v.id ? (
              <div className="flex w-full items-center gap-1.5 px-2 py-2">
                <span
                  className={'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ' + idxBadgeClass}
                >
                  #{idx}
                </span>
                <input
                  type="date"
                  value={editDate}
                  autoFocus
                  disabled={busyId === v.id}
                  onChange={(e) => setEditDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDate(v.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-800"
                />
                <button
                  type="button"
                  title="저장"
                  aria-label="날짜 저장"
                  disabled={busyId === v.id}
                  onClick={() => saveDate(v.id)}
                  className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  ✓
                </button>
                <button
                  type="button"
                  title="취소"
                  aria-label="취소"
                  disabled={busyId === v.id}
                  onClick={() => setEditingId(null)}
                  className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            ) : (
            <button
              type="button"
              onClick={() => onSelectVisit(v.id)}
              aria-pressed={isSelected}
              className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left"
            >
              <span
                className={'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ' + idxBadgeClass}
              >
                #{idx}
              </span>
              <span
                className={
                  'whitespace-nowrap text-sm font-semibold ' +
                  (hasBA ? 'text-amber-900' : 'text-slate-900')
                }
              >
                {v.visit_date}
              </span>
              {hasBA && (
                <span
                  className="ml-auto shrink-0 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                  title={`뼈나이 측정됨: BA ${baByVisitId.get(v.id)?.toFixed(1)}`}
                >
                  🦴 BA {baByVisitId.get(v.id)?.toFixed(1)}
                </span>
              )}
            </button>
            )}
            {editingId !== v.id && (
            <button
              type="button"
              title="진료 날짜 수정"
              aria-label="진료 날짜 수정"
              onClick={(e) => {
                e.stopPropagation();
                setEditDate(v.visit_date);
                setEditingId(v.id);
              }}
              className="absolute right-8 top-1/2 hidden -translate-y-1/2 rounded p-1 text-slate-400 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50 hover:text-slate-700 group-hover:inline-flex"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            )}
            {editingId !== v.id && (
            <button
              type="button"
              title="진료 기록 삭제"
              aria-label="진료 기록 삭제"
              disabled={busyId === v.id}
              onClick={async (e) => {
                e.stopPropagation();
                const ok = window.confirm(
                  `${v.visit_date} 진료 기록을 삭제하시겠습니까?\n` +
                    `측정, X-ray, 검사, 처방 등 해당 회차의 모든 데이터가 함께 삭제됩니다.`,
                );
                if (!ok) return;
                setBusyId(v.id);
                try {
                  await deleteVisit(v.id);
                  if (selectedVisitId === v.id) onSelectVisit(null);
                  onVisitDeleted?.();
                } catch (err) {
                  logger.error('delete visit failed', err);
                  alert('삭제에 실패했습니다.');
                } finally {
                  setBusyId(null);
                }
              }}
              className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded p-1 text-red-400 shadow-sm ring-1 ring-red-100 hover:bg-red-50 hover:text-red-600 group-hover:inline-flex"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
