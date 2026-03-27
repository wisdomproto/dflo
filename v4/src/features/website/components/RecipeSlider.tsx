import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { InfoModal } from './InfoModal';
import { RecipeDetail } from '@/features/content/components/RecipeDetail';
import { fetchRecipes } from '@/features/content/services/contentService';
import type { Recipe } from '@/shared/types';

export function RecipeSlider() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(() => {});
  }, []);

  if (!recipes.length) return null;

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <WebsiteSlider id="recipes" title="🥗 키 쑥쑥 영양 만점 식단" desktopCards={3} sideHeader>
        {recipes.map((r) => (
          <button key={r.id} onClick={() => setSelected(r)}
            className="w-full text-left rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100 border-l-4 border-l-orange-400 h-full
                       hover:shadow-md hover:border-orange-200 hover:border-l-orange-400 transition-all group active:scale-[0.98] flex flex-col">
            <div className="relative flex-1">
              {r.image_url ? (
                <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-5xl">🍳</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-2 left-3 flex gap-1.5">
                {r.cooking_time_minutes && (
                  <span className="text-xs font-bold bg-white/90 backdrop-blur-sm text-gray-700 rounded-full px-2.5 py-1">
                    ⏱ {r.cooking_time_minutes}분
                  </span>
                )}
                {r.difficulty && (
                  <span className="text-xs font-bold bg-orange-500/90 text-white rounded-full px-2.5 py-1">
                    {r.difficulty}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="text-base font-bold text-gray-800">{r.title}</p>
              {r.key_benefits && <p className="text-sm text-gray-500 line-clamp-1 mt-1">{r.key_benefits}</p>}
            </div>
          </button>
        ))}
        </WebsiteSlider>
      </div>

      <InfoModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''}>
        {selected && <RecipeDetail recipe={selected} />}
      </InfoModal>
    </>
  );
}
