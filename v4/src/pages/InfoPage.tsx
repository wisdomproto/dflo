// ================================================
// InfoPage - 187 성장케어 v4
// 성장 정보 (레시피 / 성장사례 / 가이드)
// ================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import GenderIcon from '@/shared/components/GenderIcon';
import { useUIStore } from '@/stores/uiStore';
import { fetchRecipes, fetchGrowthCases, fetchGrowthGuides } from '@/features/content/services/contentService';
import { CasePredictionBadge, type CaseMeasurementRow } from '@/features/content/components/CasePredictionBadge';
import { RecipeDetail } from '@/features/content/components/RecipeDetail';
import { CaseDetail } from '@/features/content/components/CaseDetail';
import { GuideDetail } from '@/features/content/components/GuideDetail';
import type { Recipe, GrowthCase, GrowthGuide } from '@/shared/types';

type Tab = 'recipes' | 'cases' | 'guides';
type DetailItem = { type: 'recipe'; data: Recipe } | { type: 'case'; data: GrowthCase } | { type: 'guide'; data: GrowthGuide };

const TABS: { key: Tab; label: string }[] = [
  { key: 'recipes', label: '성장 레시피' },
  { key: 'cases', label: '성장 사례' },
  { key: 'guides', label: '성장 가이드' },
];

export default function InfoPage() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'recipes';
  const [activeTab, setActiveTab] = useState<Tab>(
    ['recipes', 'cases', 'guides'].includes(initialTab) ? initialTab : 'recipes',
  );
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'recipes') setRecipes(await fetchRecipes());
        else if (activeTab === 'cases') setCases(await fetchGrowthCases());
        else setGuides(await fetchGrowthGuides());
      } catch {
        addToast('error', '데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, addToast]);

  const renderEmpty = (emoji: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="text-sm">데이터가 없습니다</p>
    </div>
  );

  const renderRecipes = () => {
    if (recipes.length === 0) return renderEmpty('🍳');
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recipes.map((r) => (
          <button key={r.id} onClick={() => setDetail({ type: 'recipe', data: r })} className="text-left">
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
    );
  };

  const renderCases = () => {
    if (cases.length === 0) return renderEmpty('📋');
    return (
      <div className="flex flex-col gap-3">
        {cases.map((c) => (
          <button key={c.id} onClick={() => setDetail({ type: 'case', data: c })} className="text-left w-full">
            <Card>
              <div className="flex items-center gap-2">
                <GenderIcon gender={c.gender} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">차트 #{c.patient_name}</h3>
                  {c.special_notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.special_notes}</p>}
                </div>
                <CasePredictionBadge measurements={(c.measurements ?? []) as CaseMeasurementRow[]} />
              </div>
            </Card>
          </button>
        ))}
      </div>
    );
  };

  const renderGuides = () => {
    if (guides.length === 0) return renderEmpty('📚');
    return (
      <div className="flex flex-col gap-3">
        {guides.map((g) => (
          <button key={g.id} onClick={() => setDetail({ type: 'guide', data: g })} className="text-left w-full">
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
    );
  };

  const renderContent = () => {
    if (loading) return <LoadingSpinner size="md" message="불러오는 중..." />;
    if (activeTab === 'recipes') return renderRecipes();
    if (activeTab === 'cases') return renderCases();
    return renderGuides();
  };

  const detailTitle = detail?.type === 'recipe' ? detail.data.title
    : detail?.type === 'case' ? `차트 #${detail.data.patient_name} 성장 사례`
    : detail?.type === 'guide' ? detail.data.title : '';

  return (
    <Layout title="성장 정보">
      {/* 탭 전환 */}
      <div className="flex mx-4 mt-2 p-1 bg-white/60 backdrop-blur-sm rounded-xl gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === t.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-400 active:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">
        {renderContent()}
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detailTitle} size="lg">
        {detail?.type === 'recipe' && <RecipeDetail recipe={detail.data} />}
        {detail?.type === 'case' && <CaseDetail caseData={detail.data} />}
        {detail?.type === 'guide' && <GuideDetail guide={detail.data} />}
      </Modal>
    </Layout>
  );
}
