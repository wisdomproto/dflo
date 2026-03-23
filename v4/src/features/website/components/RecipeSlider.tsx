import { useEffect, useState } from 'react';
import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { fetchRecipes } from '@/features/content/services/contentService';
import type { Recipe } from '@/shared/types';

export function RecipeSlider() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-8 bg-gray-50">
      <SwipeableSection title="오늘의 성장 레시피" emoji="🥗" isLoading={loading}>
        {recipes.map((r) => (
          <div key={r.id} className="rounded-xl bg-white overflow-hidden shadow-sm">
            {r.image_url && (
              <img src={r.image_url} alt={r.title} className="w-full h-32 object-cover" />
            )}
            <div className="p-3 space-y-1">
              <p className="text-sm font-bold text-gray-800">{r.title}</p>
              {r.key_benefits && <p className="text-xs text-gray-500 line-clamp-1">{r.key_benefits}</p>}
              <div className="flex gap-1.5 flex-wrap">
                {r.cooking_time_minutes && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {r.cooking_time_minutes}분
                  </span>
                )}
                {r.difficulty && (
                  <span className="text-[10px] font-medium bg-[#E8F5F0] text-[#0F6E56] rounded-full px-2 py-0.5">
                    {r.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </SwipeableSection>
    </section>
  );
}
