// ================================================
// useHomeContent - 홈 콘텐츠 데이터 훅
// 성장 가이드, 레시피, 성장 사례 병렬 로딩
// ================================================

import { useState, useEffect } from 'react';
import { fetchRecipes, fetchGrowthCases, fetchGrowthGuides } from '@/features/content/services/contentService';
import type { Recipe, GrowthCase, GrowthGuide } from '@/shared/types';

interface HomeContent {
  guides: GrowthGuide[];
  recipes: Recipe[];
  cases: GrowthCase[];
  isLoading: boolean;
}

export function useHomeContent(): HomeContent {
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setIsLoading(true);
      const results = await Promise.allSettled([
        fetchGrowthGuides(),
        fetchRecipes(),
        fetchGrowthCases(),
      ]);

      if (cancelled) return;

      if (results[0].status === 'fulfilled') setGuides(results[0].value);
      if (results[1].status === 'fulfilled') setRecipes(results[1].value);
      if (results[2].status === 'fulfilled') setCases(results[2].value);

      setIsLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  return { guides, recipes, cases, isLoading };
}
