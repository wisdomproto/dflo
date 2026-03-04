// ================================================
// RecipesListPage - 키 쑥쑥 식단 전체 목록
// ================================================

import { useState, useEffect } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { fetchRecipes } from '@/features/content/services/contentService';
import { RecipeDetail } from '@/features/content/components/RecipeDetail';
import { useUIStore } from '@/stores/uiStore';
import type { Recipe } from '@/shared/types';

export default function RecipesListPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(() => addToast('error', '데이터를 불러오는데 실패했습니다'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <Layout title="오늘의 키 쑥쑥 식단" showBack>
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSpinner size="md" message="불러오는 중..." />
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">🍳</span>
            <p className="text-sm">등록된 레시피가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recipes.map((r) => (
              <button key={r.id} onClick={() => setDetail(r)} className="text-left">
                <Card>
                  <div className="flex gap-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🍳</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{r.title}</h3>
                      {r.key_benefits && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.key_benefits}</p>}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''} size="lg">
        {detail && <RecipeDetail recipe={detail} />}
      </Modal>
    </Layout>
  );
}
