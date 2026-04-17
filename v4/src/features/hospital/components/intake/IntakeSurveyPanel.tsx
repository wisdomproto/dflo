import { useMemo, useState } from 'react';
import type { Child, IntakeSurvey } from '@/shared/types';
import {
  DEFAULT_INTAKE_SURVEY,
  updateIntakeSurvey,
} from '@/features/hospital/services/intakeSurveyService';
import { IntakeBasicInfoSection } from './IntakeBasicInfoSection';
import { IntakeGrowthHistoryTable } from './IntakeGrowthHistoryTable';
import { IntakeFamilySection } from './IntakeFamilySection';
import { IntakeMedicalSection } from './IntakeMedicalSection';
import { IntakeCausesSection } from './IntakeCausesSection';
import { IntakeClinicalSection } from './IntakeClinicalSection';

interface Props {
  child: Child;
  onChildUpdated: (child: Child) => void;
}

type SaveStatus = 'idle' | 'saving' | 'error';

/**
 * 기본 정보 탭 루트. 5개 섹션을 세로로 배치하고 저장 상태를 헤더에 표시한다.
 * children 컬럼 변경은 각 섹션이 `updateChildField` 를 직접 호출하고,
 * 여기서는 JSONB intake_survey 패치만 중앙에서 처리한다.
 */
export function IntakeSurveyPanel({ child, onChildUpdated }: Props) {
  const survey: IntakeSurvey = useMemo(
    () => child.intake_survey ?? DEFAULT_INTAKE_SURVEY,
    [child.intake_survey],
  );
  const [status, setStatus] = useState<SaveStatus>('idle');

  const handleSurveyPatch = async (patch: Partial<IntakeSurvey>) => {
    setStatus('saving');
    try {
      const updated = await updateIntakeSurvey(child.id, patch);
      onChildUpdated(updated);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 bg-gradient-to-b from-slate-50/60 to-transparent p-1">
      {/* Sticky header — 설문지 · 저장 상태 */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex h-5 items-center rounded-full bg-indigo-50 px-2 font-semibold text-indigo-700">
            초진 설문
          </span>
          <span className="text-slate-500">Q1 ~ Q16</span>
        </div>
        <SaveIndicator status={status} updatedAt={survey.updated_at} />
      </div>

      <IntakeBasicInfoSection child={child} onSaved={onChildUpdated} />
      <IntakeGrowthHistoryTable survey={survey} onSave={handleSurveyPatch} />
      <IntakeFamilySection survey={survey} onSave={handleSurveyPatch} />
      <IntakeMedicalSection
        survey={survey}
        defaultGender={child.gender}
        onSave={handleSurveyPatch}
      />
      <IntakeCausesSection survey={survey} onSave={handleSurveyPatch} />
      <IntakeClinicalSection child={child} onChildUpdated={onChildUpdated} />
    </div>
  );
}

function SaveIndicator({
  status,
  updatedAt,
}: {
  status: SaveStatus;
  updatedAt: string;
}) {
  if (status === 'saving') return <span className="text-slate-500">저장 중…</span>;
  if (status === 'error') return <span className="text-red-500">저장 실패</span>;
  const ts = new Date(updatedAt).getTime();
  if (!ts || ts <= 0) return <span className="text-slate-400">—</span>;
  return <span className="text-slate-500">저장됨 · {formatRelative(ts)}</span>;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return '방금 전';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = Math.floor(hr / 24);
  return `${d}일 전`;
}
