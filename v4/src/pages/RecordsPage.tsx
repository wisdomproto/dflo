// ================================================
// RecordsPage - 187 성장케어 v4
// 환자 진료 기록 (병원에서 측정한 데이터, read-only)
// ================================================

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { useChildrenStore } from '@/stores/childrenStore';
import { useUIStore } from '@/stores/uiStore';
import {
  fetchPatientRecords,
  type PatientRecords,
} from '@/features/records/services/patientRecordsService';
import { PatientHeaderCard } from '@/features/records/components/PatientHeaderCard';
import { GrowthComparisonCard } from '@/features/records/components/GrowthComparisonCard';
import { BoneAgeCompareCard } from '@/features/records/components/BoneAgeCompareCard';
import { VisitTimelineCard } from '@/features/records/components/VisitTimelineCard';
import { ConsultationRecordView } from '@/features/records/components/ConsultationRecordView';

export default function RecordsPage() {
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const child = getSelectedChild();
  const addToast = useUIStore((s) => s.addToast);

  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [loading, setLoading] = useState(false);

  // 진료 회차 필터 — 한 가지라도 체크되면 그 조건 만족하는 회차만 표시.
  // 모두 해제 시 전체 표시.
  const [filterMemo, setFilterMemo] = useState(false);
  const [filterBoneAge, setFilterBoneAge] = useState(false);
  const [filterLab, setFilterLab] = useState(false);

  const filteredVisits = useMemo(() => {
    if (!records) return [];
    const anyActive = filterMemo || filterBoneAge || filterLab;
    if (!anyActive) return records.visits;
    return records.visits.filter((r) => {
      if (filterMemo && r.visit.notes && r.visit.notes.trim()) return true;
      if (filterBoneAge && r.measurement?.bone_age != null) return true;
      if (filterLab && r.labTests.length > 0) return true;
      return false;
    });
  }, [records, filterMemo, filterBoneAge, filterLab]);

  useEffect(() => {
    if (!selectedChildId) {
      setRecords(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPatientRecords(selectedChildId)
      .then((r) => {
        if (cancelled) return;
        setRecords(r);
      })
      .catch((e) => {
        if (cancelled) return;
        addToast('error', e?.message ?? '진료 기록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId, addToast]);

  // 상담 단계 환자 (status='consultation' 또는 진료기록 0건) — 상담 기록 뷰 표시
  const isConsultation =
    !!child && (child.treatment_status === 'consultation' || (!!records && records.visitCount === 0));

  return (
    <Layout title={isConsultation ? '상담 기록' : '진료 기록'}>
      <div className="flex items-center justify-between px-4 pt-2">
        <ChildSelector />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {!selectedChildId ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-gray-400">자녀를 먼저 선택해주세요</p>
          </Card>
        ) : loading ? (
          <LoadingSpinner message="기록 불러오는 중..." />
        ) : !child ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-gray-400">환자 정보를 불러오지 못했어요</p>
            <p className="text-[11px] text-gray-300 mt-1">새로고침을 시도해 보세요</p>
          </Card>
        ) : !records ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-gray-400">기록을 불러오지 못했어요</p>
            <p className="text-[11px] text-gray-300 mt-1">잠시 후 다시 시도해 주세요</p>
          </Card>
        ) : isConsultation ? (
          <ConsultationRecordView child={child} measurements={records.measurements} />
        ) : (
          <>
            <PatientHeaderCard
              child={child}
              visitCount={records.visitCount}
              firstVisitDate={records.visits[records.visits.length - 1]?.visit.visit_date ?? null}
              lastVisitDate={records.visits[0]?.visit.visit_date ?? null}
              boneAgeCount={records.boneAgeCount}
              prescriptionCount={records.prescriptionCount}
              labCount={records.labCount}
            />

            {/* 성장 비교 (초기 키 / 최초 예측 / 최종 예측) — BA ≥2 일 때만 노출 */}
            <GrowthComparisonCard child={child} measurements={records.measurements} />

            {/* 성장 그래프 — 어드민 차트 simplified 모드 재사용 */}
            {records.measurements.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-3">
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5 px-1">
                  <span>📈</span> 키 성장 추이
                  <span className="ml-auto text-[11px] font-normal text-gray-400">
                    🦴 = 뼈나이 측정 회차
                  </span>
                </h3>
                <div className="h-[360px]">
                  <AdminPatientGrowthChart
                    child={child}
                    measurements={records.measurements}
                    simplified
                  />
                </div>
              </div>
            )}

            {/* 뼈나이 비교 */}
            <BoneAgeCompareCard child={child} measurements={records.measurements} />

            {/* 진료 회차 타임라인 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span>🏥</span> 진료 회차
                  <span className="text-xs text-gray-400 font-normal">
                    {filteredVisits.length === records.visitCount
                      ? `(${records.visitCount}회)`
                      : `(${filteredVisits.length}/${records.visitCount}회)`}
                  </span>
                </h3>
              </div>

              {/* 필터 체크박스 */}
              <div className="flex flex-wrap gap-1.5 px-1">
                <FilterChip
                  active={filterBoneAge}
                  onToggle={() => setFilterBoneAge((v) => !v)}
                  label="🦴 뼈나이"
                  activeColor="bg-amber-100 text-amber-800 border-amber-200"
                />
                <FilterChip
                  active={filterLab}
                  onToggle={() => setFilterLab((v) => !v)}
                  label="🧪 검사"
                  activeColor="bg-cyan-100 text-cyan-800 border-cyan-200"
                />
                <FilterChip
                  active={filterMemo}
                  onToggle={() => setFilterMemo((v) => !v)}
                  label="📝 메모"
                  activeColor="bg-slate-200 text-slate-800 border-slate-300"
                />
                {(filterBoneAge || filterLab || filterMemo) && (
                  <button
                    onClick={() => {
                      setFilterBoneAge(false);
                      setFilterLab(false);
                      setFilterMemo(false);
                    }}
                    className="text-xs px-2 py-1 text-gray-400 active:text-gray-600 transition-colors"
                  >
                    전체
                  </button>
                )}
              </div>

              {filteredVisits.length === 0 ? (
                <Card className="py-6 text-center">
                  <p className="text-xs text-gray-400">조건에 맞는 회차가 없습니다</p>
                </Card>
              ) : (
                filteredVisits.map((r) => {
                  // 회차번호는 전체 시간순 기준이라 records.visits 의 원래 인덱스로 계산
                  const origIdx = records.visits.indexOf(r);
                  return (
                    <VisitTimelineCard
                      key={r.visit.id}
                      record={r}
                      index={origIdx}
                      totalVisits={records.visitCount}
                      child={child}
                    />
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function FilterChip({
  active,
  onToggle,
  label,
  activeColor,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  activeColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
        active ? activeColor : 'bg-white text-gray-500 border-gray-200 active:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}
