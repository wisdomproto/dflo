// ================================================
// RecipeDetail - 레시피 상세 보기
// ================================================

import type { Recipe } from '@/shared/types';

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return (
    <div className="space-y-5">
      {recipe.image_url && (
        <img src={recipe.image_url} alt={recipe.title} className="w-full h-48 object-cover rounded-xl" />
      )}
      {recipe.key_benefits && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-blue-800 mb-1">핵심 효능</h4>
          <p className="text-sm text-blue-700">{recipe.key_benefits}</p>
        </div>
      )}
      {recipe.main_nutrients && recipe.main_nutrients.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-2">주요 영양소</h4>
          <div className="flex flex-wrap gap-2">
            {recipe.main_nutrients.map((n, i) => (
              <span key={i} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full">{n}</span>
            ))}
          </div>
        </div>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-2">재료</h4>
          <ul className="grid grid-cols-2 gap-1">
            {recipe.ingredients.map((item, i) => (
              <li key={i} className="text-sm text-gray-600">{item}</li>
            ))}
          </ul>
        </div>
      )}
      {recipe.steps && recipe.steps.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-2">조리 순서</h4>
          <ol className="space-y-2">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-yellow-800 mb-1">조리 팁</h4>
          {recipe.tips.map((rawTip, i) => {
            const tip: Record<string, string> = typeof rawTip === 'string'
              ? (() => { try { return JSON.parse(rawTip); } catch { return { content: rawTip }; } })()
              : (rawTip as Record<string, string>);
            return (
              <p key={i} className="text-sm text-yellow-700">
                {tip.content || tip.description || tip.text || ''}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
