import { useState } from 'react';
import type { PatientVisitRecord } from '@/features/records/services/patientRecordsService';
import type { Child } from '@/shared/types';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { heightAtSamePercentile } from '@/shared/data/growthStandard';
import { LabDetailModal } from '@/features/records/components/LabDetailModal';
import { panelTypeOf, type PanelType } from '@/features/hospital/components/LabHistoryPanel';

interface Props {
  record: PatientVisitRecord;
  index: number; // 회차 번호 (역순 — 1=가장 오래된 회차)
  totalVisits: number;
  child: Child;
}

function formatDateKo(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const wd = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} (${wd})`;
}

const PANEL_LABELS: Record<PanelType, string> = {
  blood: '혈액검사',
  food_intolerance: '음식 알레르기 (IgG4)',
  mast_allergy: 'MAST 알레르기',
  nk_activity: 'NK세포 활성도',
  organic_acid: '유기산',
  hair_mineral: '모발 중금속',
  attachment: '검사 결과지',
  unknown: '기타 검사',
};

export function VisitTimelineCard({ record, index, totalVisits, child }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [labModal, setLabModal] = useState<{ open: boolean; panel?: PanelType }>({ open: false });
  const { visit, measurement, prescriptions, labTests } = record;

  const visitNo = totalVisits - index;

  const visitAge = calculateAgeAtDate(child.birth_date, new Date(visit.visit_date)).decimal;

  const hasMeasurement = !!measurement;
  const hasBoneAge = measurement?.bone_age != null;
  const noteText = visit.notes?.trim();

  // PAH: DB값 우선, 없으면 BA 측정된 회차에서 LMS 기반 계산
  let pahValue: number | null = null;
  if (measurement?.pah && measurement.pah > 0) {
    pahValue = measurement.pah;
  } else if (hasBoneAge && measurement?.height) {
    const computed = heightAtSamePercentile(measurement.height, measurement.bone_age!, 18, child.gender);
    if (computed > 0) pahValue = Math.round(computed * 10) / 10;
  }

  // panel별 그룹화 (요약 칩용)
  const labsByPanel = labTests.reduce((acc, l) => {
    const p = panelTypeOf(l);
    acc.set(p, (acc.get(p) || 0) + 1);
    return acc;
  }, new Map<PanelType, number>());

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-400">#{visitNo}회차</span>
              <span className="text-sm font-bold text-gray-800">
                {formatDateKo(visit.visit_date)}
              </span>
              <span className="text-[11px] text-gray-500">
                만 <span className="font-semibold">{visitAge.toFixed(1)}</span>세
              </span>
            </div>

            {/* 측정값 한 줄 */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-gray-600">
              {measurement?.height != null && (
                <span>📏 <span className="font-semibold text-gray-800">{measurement.height}</span> cm</span>
              )}
              {measurement?.weight != null && (
                <span>⚖️ <span className="font-semibold text-gray-800">{measurement.weight}</span> kg</span>
              )}
              {hasBoneAge && (
                <span className="text-amber-600">🦴 뼈나이 <span className="font-semibold">{measurement!.bone_age!.toFixed(1)}</span>세</span>
              )}
              {pahValue != null && (
                <span className="text-indigo-600">🎯 예측키 <span className="font-semibold">{pahValue}</span>cm</span>
              )}
              {!hasMeasurement && (
                <span className="text-gray-400">측정 기록 없음</span>
              )}
            </div>

            {/* 요약 배지 */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {prescriptions.length > 0 && (
                <Badge color="emerald">처방 {prescriptions.length}</Badge>
              )}
              {labTests.length > 0 && (
                <Badge color="cyan">검사 {labTests.length}</Badge>
              )}
              {noteText && <Badge color="slate">메모</Badge>}
            </div>
          </div>

          <span className={`shrink-0 mt-1 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
          {/* 처방 */}
          {prescriptions.length > 0 && (
            <Section title="처방 약품" emoji="💊">
              <div className="space-y-1.5">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-gray-100"
                  >
                    <span className="font-medium text-gray-800 truncate">
                      {p.medication_name}
                    </span>
                    {p.dose && (
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {p.dose}
                        {p.medication_unit ? ` ${p.medication_unit}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 검사 — 칩을 버튼으로, 클릭 시 디테일 모달 */}
          {labTests.length > 0 && (
            <Section title="검사" emoji="🧪">
              <div className="flex flex-wrap gap-1.5">
                {[...labsByPanel.entries()].map(([panel, count]) => (
                  <button
                    key={panel}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLabModal({ open: true, panel });
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 active:bg-cyan-100 transition-colors flex items-center gap-1"
                  >
                    {PANEL_LABELS[panel]} <span className="font-semibold">{count}</span>
                    <span className="text-[10px] text-cyan-500">›</span>
                  </button>
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLabModal({ open: true });
                }}
                className="mt-2 text-xs font-semibold text-cyan-700 active:text-cyan-900"
              >
                📋 검사 결과 자세히 보기
              </button>
            </Section>
          )}

          {/* 메모 */}
          {noteText && (
            <Section title="진료 메모" emoji="📝">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-100">
                {noteText}
              </p>
            </Section>
          )}

          {!prescriptions.length && !labTests.length && !noteText && (
            <p className="text-xs text-gray-400 text-center py-2">추가 기록이 없습니다</p>
          )}
        </div>
      )}

      <LabDetailModal
        isOpen={labModal.open}
        onClose={() => setLabModal({ open: false })}
        labTests={labTests}
        initialPanel={labModal.panel}
      />
    </div>
  );
}

function Section({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
        <span>{emoji}</span> {title}
      </h4>
      {children}
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-100',
};

function Badge({ color, children }: { color: keyof typeof BADGE_COLORS; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${BADGE_COLORS[color]}`}>
      {children}
    </span>
  );
}

