// ================================================
// CasesListPage - 성장 관리 사례 전체 목록
// ================================================

import { useState, useEffect } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import GenderIcon from '@/shared/components/GenderIcon';
import { fetchGrowthCases } from '@/features/content/services/contentService';
import { CasePredictionBadge, type CaseMeasurementRow } from '@/features/content/components/CasePredictionBadge';
import { CaseDetail } from '@/features/content/components/CaseDetail';
import { useUIStore } from '@/stores/uiStore';
import type { GrowthCase } from '@/shared/types';

export default function CasesListPage() {
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GrowthCase | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    fetchGrowthCases()
      .then(setCases)
      .catch(() => addToast('error', '데이터를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <Layout title="성장 관리 사례" showBack>
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSpinner size="md" message="불러오는 중..." />
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm">등록된 사례가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cases.map((c) => (
              <button key={c.id} onClick={() => setDetail(c)} className="text-left w-full">
                <Card>
                  <div className="flex items-center gap-2">
                    <GenderIcon gender={c.gender} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{c.patient_name}</h3>
                      {c.special_notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.special_notes}</p>}
                    </div>
                    <CasePredictionBadge measurements={(c.measurements ?? []) as CaseMeasurementRow[]} />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.patient_name} 성장 사례` : ''} size="lg">
        {detail && <CaseDetail caseData={detail} />}
      </Modal>
    </Layout>
  );
}
