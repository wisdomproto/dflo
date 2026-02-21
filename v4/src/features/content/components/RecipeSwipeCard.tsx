// ================================================
// RecipeSwipeCard - 건강 레시피 스와이프 카드
// ================================================

import type { Recipe } from '@/shared/types';

interface Props {
  recipe: Recipe;
  onClick: () => void;
}

export function RecipeSwipeCard({ recipe, onClick }: Props) {
  return (
    <button onClick={onClick} className="w-full text-left active:scale-[0.97] transition-transform">
      <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        {recipe.image_url ? (
          <div className="relative">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-28 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-28 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
            <span className="text-5xl opacity-60">🍳</span>
          </div>
        )}
        <div className="px-3.5 py-3">
          <h4 className="text-sm font-bold text-gray-900 truncate">{recipe.title}</h4>
          {recipe.key_benefits && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{recipe.key_benefits}</p>
          )}
        </div>
      </div>
    </button>
  );
}
