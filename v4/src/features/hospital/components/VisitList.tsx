// Minimal visit list for the admin patient detail page.
// Each row is just "#N  YYYY-MM-DD". Click to select (indigo highlight),
// hover to reveal the delete button. Clinical data is edited in the
// center column via VisitDetailPanel.

import { useMemo, useState } from 'react';
import { deleteVisit } from '@/features/hospital/services/visitService';
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
}

export function VisitList({
  childId: _childId,
  visits,
  measurements = [],
  selectedVisitId,
  onSelectVisit,
  onVisitDeleted,
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
        return (
          <li
            key={v.id}
            className={`group relative overflow-hidden rounded-lg border bg-white transition-colors ${
              isSelected
                ? 'border-indigo-400 ring-2 ring-indigo-100'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectVisit(v.id)}
              aria-pressed={isSelected}
              className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left"
            >
              <span
                className={
                  'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ' +
                  (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')
                }
              >
                #{idx}
              </span>
              <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
                {v.visit_date}
              </span>
              {baByVisitId.has(v.id) && (
                <span
                  className="ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                  title={`뼈나이 측정됨: BA ${baByVisitId.get(v.id)?.toFixed(1)}`}
                >
                  🦴 BA {baByVisitId.get(v.id)?.toFixed(1)}
                </span>
              )}
            </button>
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
          </li>
        );
      })}
    </ul>
  );
}
