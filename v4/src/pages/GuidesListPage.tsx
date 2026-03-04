// ================================================
// GuidesListPage - 키 성장 가이드 전체 목록
// ================================================

import { useState, useEffect } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { fetchGrowthGuides } from '@/features/content/services/contentService';
import { GuideDetail } from '@/features/content/components/GuideDetail';
import { useUIStore } from '@/stores/uiStore';
import type { GrowthGuide } from '@/shared/types';

export default function GuidesListPage() {
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GrowthGuide | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    fetchGrowthGuides()
      .then(setGuides)
      .catch(() => addToast('error', '데이터를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <Layout title="키 성장 가이드" showBack>
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSpinner size="md" message="불러오는 중..." />
        ) : guides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📚</span>
            <p className="text-sm">등록된 가이드가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {guides.map((g) => (
              <button key={g.id} onClick={() => setDetail(g)} className="text-left w-full">
                <Card>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{g.icon || '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{g.title}</h3>
                        {g.category && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600 flex-shrink-0">{g.category}</span>
                        )}
                      </div>
                      {g.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.subtitle}</p>}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''} size="lg">
        {detail && <GuideDetail guide={detail} />}
      </Modal>
    </Layout>
  );
}
