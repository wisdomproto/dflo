// ================================================
// RecordsPage - 187 성장케어 v4
// 환자 진료 기록 (병원에서 측정한 데이터, read-only)
// ================================================

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { GrowthChart } from '@/shared/components/GrowthChart';
import type { GrowthPoint } from '@/shared/components/GrowthChart';
import { useChildrenStore } from '@/stores/childrenStore';
import { useUIStore } from '@/stores/uiStore';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { predictAdultHeightLMS } from '@/shared/data/growthStandard';
import {
  fetchPatientRecords,
  type PatientRecords,
} from '@/features/records/services/patientRecordsService';
import { PatientHeaderCard } from '@/features/records/components/PatientHeaderCard';
import { BoneAgeCompareCard } from '@/features/records/components/BoneAgeCompareCard';
import { VisitTimelineCard } from '@/features/records/components/VisitTimelineCard';

export default function RecordsPage() {
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const child = getSelectedChild();
  const addToast = useUIStore((s) => s.addToast);

  const [records, setRecords] = useState<PatientRecords | null>(null);
  const [loading, setLoading] = useState(false);

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

  // 성장 그래프 points (만나이, 키)
  const chartPoints: GrowthPoint[] = useMemo(() => {
    if (!child || !records) return [];
    return records.measurements
      .map((m) => ({
        age: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal,
        height: m.height,
      }))
      .filter((p) => p.age >= 2)
      .sort((a, b) => a.age - b.age); // 차트는 오름차순
  }, [child, records]);

  // 예측 성인키: 최신 measurement 의 pah 우선, 없으면 LMS
  const predictedAdultHeight = useMemo(() => {
    if (!child || !records || records.measurements.length === 0) return undefined;
    const latest = records.measurements[0];
    if (latest.pah && latest.pah > 0) return latest.pah;
    const age = calculateAgeAtDate(child.birth_date, new Date(latest.measured_date)).decimal;
    const pred = predictAdultHeightLMS(latest.height, age, child.gender);
    return pred > 0 ? pred : undefined;
  }, [child, records]);

  return (
    <Layout title="진료 기록">
      <div className="flex items-center justify-between px-4 pt-2">
        <ChildSelector />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {!selectedChildId ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-gray-400">자녀를 먼저 선택해주세요</p>
          </Card>
        ) : loading ? (
          <LoadingSpinner message="진료 기록 불러오는 중..." />
        ) : !records || !child ? null : records.visitCount === 0 ? (
          <Card className="py-12 text-center space-y-2">
            <p className="text-3xl">🏥</p>
            <p className="text-sm font-medium text-gray-700">아직 진료 기록이 없습니다</p>
            <p className="text-xs text-gray-400">병원 방문 후 측정 데이터가 자동으로 표시됩니다</p>
          </Card>
        ) : (
          <>
            <PatientHeaderCard
              child={child}
              visitCount={records.visitCount}
              lastVisitDate={records.visits[0]?.visit.visit_date ?? null}
              boneAgeCount={records.boneAgeCount}
              prescriptionCount={records.prescriptionCount}
              labCount={records.labCount}
            />

            {/* 성장 그래프 */}
            {chartPoints.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-3">
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5 px-1">
                  <span>📈</span> 키 성장 추이
                  {predictedAdultHeight && (
                    <span className="ml-auto text-xs font-normal text-gray-500">
                      예측 성인키 <span className="font-bold text-primary">{predictedAdultHeight}cm</span>
                    </span>
                  )}
                </h3>
                <GrowthChart
                  gender={child.gender}
                  points={chartPoints}
                  compact
                  showTitle={false}
                  predictedAdultHeight={predictedAdultHeight}
                />
              </div>
            )}

            {/* 뼈나이 비교 */}
            <BoneAgeCompareCard child={child} measurements={records.measurements} />

            {/* 진료 회차 타임라인 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 px-1">
                <span>🏥</span> 진료 회차
                <span className="text-xs text-gray-400 font-normal">
                  ({records.visitCount}회)
                </span>
              </h3>
              {records.visits.map((r, idx) => (
                <VisitTimelineCard
                  key={r.visit.id}
                  record={r}
                  index={idx}
                  totalVisits={records.visitCount}
                  child={child}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
