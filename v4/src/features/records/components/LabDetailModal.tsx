import { useMemo, useState, useEffect } from 'react';
import Modal from '@/shared/components/Modal';
import {
  PanelContent,
  panelTypeOf,
  type PanelType,
} from '@/features/hospital/components/LabHistoryPanel';
import type { LabTest } from '@/shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  labTests: LabTest[];
  initialPanel?: PanelType;
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

function formatDateShort(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

export function LabDetailModal({ isOpen, onClose, labTests, initialPanel }: Props) {
  // panel 별 그룹화
  const groups = useMemo(() => {
    const m = new Map<PanelType, LabTest[]>();
    for (const l of labTests) {
      const p = panelTypeOf(l);
      const arr = m.get(p) ?? [];
      arr.push(l);
      m.set(p, arr);
    }
    return m;
  }, [labTests]);

  const panelTypes = useMemo(() => [...groups.keys()], [groups]);

  const [activePanel, setActivePanel] = useState<PanelType | null>(initialPanel ?? panelTypes[0] ?? null);

  // initialPanel 또는 panelTypes 가 변할 때 활성 panel 동기화
  useEffect(() => {
    if (!isOpen) return;
    if (initialPanel && groups.has(initialPanel)) {
      setActivePanel(initialPanel);
    } else if (panelTypes.length > 0) {
      setActivePanel(panelTypes[0]);
    }
  }, [isOpen, initialPanel, panelTypes, groups]);

  const activeLabs = activePanel ? groups.get(activePanel) ?? [] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="검사 결과" size="lg">
      <div className="space-y-4">
        {/* 패널 탭 (한 회차에 panel 이 여러 개일 때) */}
        {panelTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5 sticky top-0 bg-white pb-2 -mx-1 px-1 border-b border-gray-100">
            {panelTypes.map((p) => {
              const active = p === activePanel;
              const count = groups.get(p)?.length ?? 0;
              return (
                <button
                  key={p}
                  onClick={() => setActivePanel(p)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {PANEL_LABELS[p]} <span className={active ? 'text-white/80' : 'text-gray-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 선택된 panel 의 lab 들 */}
        {activeLabs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">검사 결과가 없습니다</p>
        ) : (
          <div className="space-y-4">
            {activeLabs.map((lab) => (
              <div key={lab.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-1">
                  <span className="font-semibold text-gray-700">
                    {PANEL_LABELS[panelTypeOf(lab)]}
                  </span>
                  <span>{formatDateShort(lab.collected_date)}</span>
                </div>
                <PanelContent
                  panel={panelTypeOf(lab)}
                  data={(lab.result_data ?? {}) as Record<string, unknown>}
                />
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
          정상 범위 밖 수치는 색으로 표시됩니다. 정확한 해석은 진료 시 의료진과 함께 확인하세요.
        </p>
      </div>
    </Modal>
  );
}
