import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { fetchRecipes } from '@/features/content/services/contentService';
import type { Recipe } from '@/shared/types';

export function RecipeSlider() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(() => {});
  }, []);

  if (!recipes.length) return null;

  return (
    <WebsiteSlider tag="오늘의 성장 레시피" title="키 쑥쑥 영양 만점 식단" desktopCards={3}>
      {recipes.map((r) => (
        <div key={r.id} className="rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100 h-full">
          {r.image_url ? (
            <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-4xl">🍳</div>
          )}
          <div className="p-4 space-y-2">
            <p className="text-base font-bold text-gray-800">{r.title}</p>
            {r.key_benefits && <p className="text-sm text-gray-500 line-clamp-1">{r.key_benefits}</p>}
            <div className="flex gap-2 flex-wrap">
              {r.cooking_time_minutes && (
                <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                  ⏱ {r.cooking_time_minutes}분
                </span>
              )}
              {r.difficulty && (
                <span className="text-xs font-medium bg-[#E8F5F0] text-[#0F6E56] rounded-full px-2.5 py-0.5">
                  {r.difficulty}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </WebsiteSlider>
  );
}
