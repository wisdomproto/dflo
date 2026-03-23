// ================================================
// AdminContentPage - 콘텐츠 저작도구 (다크 테마)
// 성장 가이드 / 건강 레시피 / 성장 사례 통합 관리
// ================================================

import { useCallback, useEffect, useState } from 'react';
import {
  upsertRecipe, deleteRecipe,
  upsertGuide, deleteGuide,
  upsertGrowthCase, deleteGrowthCase,
} from '@/features/admin/services/adminService';
import { fetchRecipes, fetchGrowthCases, fetchGrowthGuides } from '@/features/content/services/contentService';
import { useUIStore } from '@/stores/uiStore';
import { type Tab, TABS } from '@/features/admin/components/AdminContentShared';
import { AdminRecipeTab } from '@/features/admin/components/AdminRecipeTab';
import { AdminGuideTab } from '@/features/admin/components/AdminGuideTab';
import { AdminCaseTab } from '@/features/admin/components/AdminCaseTab';
import type { Recipe, GrowthCase, GrowthGuide } from '@/shared/types';
import type { ERecipe, EGuide, ECase } from '@/features/admin/components/AdminContentShared';

export default function AdminContentPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = useState<Tab>('guide');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [loading, setLoading] = useState<Record<Tab, boolean>>({ recipe: false, guide: false, case: false });
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading((p) => ({ ...p, [t]: true }));
    try {
      if (t === 'recipe') setRecipes(await fetchRecipes());
      else if (t === 'guide') setGuides(await fetchGrowthGuides());
      else setCases(await fetchGrowthCases());
    } catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.'); }
    finally { setLoading((p) => ({ ...p, [t]: false })); }
  }, [addToast]);

  useEffect(() => { load(tab); }, [tab, load]);

  const saveRecipe = async (item: ERecipe) => {
    setSaving(true);
    try { await upsertRecipe(item); addToast('success', '저장되었습니다'); await load('recipe'); }
    catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const saveGuide = async (item: EGuide) => {
    setSaving(true);
    try { await upsertGuide(item); addToast('success', '저장되었습니다'); await load('guide'); }
    catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const saveCase = async (item: ECase) => {
    setSaving(true);
    try { await upsertGrowthCase(item); addToast('success', '저장되었습니다'); await load('case'); }
    catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const del = async (t: Tab, id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      if (t === 'recipe') await deleteRecipe(id);
      else if (t === 'guide') await deleteGuide(id);
      else await deleteGrowthCase(id);
      addToast('success', '삭제되었습니다');
      await load(t);
    } catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '삭제에 실패했습니다.'); }
  };

  return (
    <div className="space-y-6 bg-gray-900 -m-4 lg:-m-6 p-4 lg:p-6 min-h-full rounded-xl">
      <h1 className="text-2xl font-bold text-gray-100">콘텐츠 저작도구</h1>
      <div className="flex gap-2">
        {TABS.map(({ key, label: l, emoji }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full py-2 px-4 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{emoji}</span> {l}
          </button>
        ))}
      </div>

      {tab === 'recipe' && <AdminRecipeTab items={recipes} loading={loading.recipe} saving={saving} onSave={saveRecipe} onDelete={(id) => del('recipe', id)} onLightbox={setLightboxUrl} />}
      {tab === 'guide' && <AdminGuideTab items={guides} loading={loading.guide} saving={saving} onSave={saveGuide} onDelete={(id) => del('guide', id)} onLightbox={setLightboxUrl} />}
      {tab === 'case' && <AdminCaseTab items={cases} loading={loading.case} saving={saving} onSave={saveCase} onDelete={(id) => del('case', id)} onLightbox={setLightboxUrl} />}

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="크게 보기" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-sm hover:bg-red-500 transition-colors">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
