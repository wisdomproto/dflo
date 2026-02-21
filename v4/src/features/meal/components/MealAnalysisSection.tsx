// ================================================
// MealAnalysisSection - 187 성장케어 v4
// 아침/점심/저녁 탭으로 AI 분석 결과 표시
// ================================================

import { useState, useCallback } from 'react';
import Card from '@/shared/components/Card';
import { useUIStore } from '@/stores/uiStore';
import { analyzeMealPhoto as analyzePhoto } from '@/shared/services/aiService';
import { saveMealAnalysis } from '@/features/meal/services/mealService';
import { compressImage } from '@/shared/utils/image';
import type { MealAnalysis, MealType, Meal, MealPhoto } from '@/shared/types';

const TABS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: '아침', icon: '🌅' },
  { type: 'lunch', label: '점심', icon: '☀️' },
  { type: 'dinner', label: '저녁', icon: '🌙' },
];

interface Props {
  analyses: (MealAnalysis & { meal_type: MealType })[];
  meals: Meal[];
  photos: (MealPhoto & { meal_type: MealType })[];
  childId: string;
  onAnalysisChange: () => void;
}

export function MealAnalysisSection({ analyses, meals, photos, childId, onAnalysisChange }: Props) {
  const [activeTab, setActiveTab] = useState<MealType>('breakfast');
  const [reanalyzing, setReanalyzing] = useState<MealType | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const current = analyses.find((a) => a.meal_type === activeTab);
  const hasPhoto = photos.some((p) => p.meal_type === activeTab);
  const meal = meals.find((m) => m.meal_type === activeTab);

  // 재분석: 기존 사진 URL에서 이미지를 fetch 후 AI 분석
  const handleReanalyze = useCallback(async () => {
    const photo = photos.find((p) => p.meal_type === activeTab);
    if (!photo || !meal) {
      addToast('warning', '사진이 없습니다. 먼저 사진을 촬영해주세요.');
      return;
    }

    setReanalyzing(activeTab);
    try {
      // photo_url에서 이미지 fetch → 압축 → File로 변환
      const res = await fetch(photo.photo_url);
      const blob = await res.blob();
      const rawFile = new File([blob], 'reanalyze.jpg', { type: blob.type || 'image/jpeg' });
      const file = await compressImage(rawFile);

      const result = await analyzePhoto(file);
      await saveMealAnalysis(meal.id, result);
      onAnalysisChange();
      addToast('success', `${TABS.find(t => t.type === activeTab)?.label} 재분석 완료!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '재분석 실패';
      addToast('error', `재분석 실패: ${msg}`);
    } finally {
      setReanalyzing(null);
    }
  }, [activeTab, photos, meal, addToast, onAnalysisChange]);

  const hasAnyAnalysis = analyses.length > 0;

  if (!hasAnyAnalysis && !photos.length) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <span>🤖</span> AI 영양 분석
        </h3>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-3">
        {TABS.map((tab) => {
          const hasAnalysis = analyses.some((a) => a.meal_type === tab.type);
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors relative
                ${activeTab === tab.type
                  ? 'bg-primary text-white'
                  : hasAnalysis
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
            >
              {tab.icon} {tab.label}
              {hasAnalysis && activeTab !== tab.type && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 분석 결과 or 빈 상태 */}
      {reanalyzing === activeTab ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-gray-400">AI 재분석 중...</span>
        </div>
      ) : current ? (
        <AnalysisDetail analysis={current} childId={childId} />
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-gray-400">
            {hasPhoto ? '아직 분석 결과가 없습니다' : '사진을 먼저 촬영해주세요'}
          </p>
        </div>
      )}

      {/* 재분석 버튼 */}
      {hasPhoto && meal && reanalyzing !== activeTab && (
        <button
          onClick={handleReanalyze}
          className="mt-3 w-full rounded-lg border border-primary/30 py-2 text-xs font-medium text-primary active:bg-primary/5 transition-colors"
        >
          🔄 {current ? '다시 분석하기' : 'AI 분석하기'}
        </button>
      )}
    </Card>
  );
}

// ── 분석 상세 표시 ──

function AnalysisDetail({ analysis, childId: _childId }: { analysis: MealAnalysis; childId: string }) {
  const scoreColor = analysis.growth_score >= 7
    ? 'text-green-600 bg-green-50 border-green-200'
    : analysis.growth_score >= 4
      ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
      : 'text-red-600 bg-red-50 border-red-200';

  const scoreEmoji = analysis.growth_score >= 7 ? '👍' : analysis.growth_score >= 4 ? '🤔' : '⚠️';
  const scoreLabel = analysis.growth_score >= 7 ? '성장에 좋아요!' : analysis.growth_score >= 4 ? '보통이에요' : '개선이 필요해요';

  return (
    <div className="space-y-3">
      {/* 메뉴명 + 성장 점수 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{analysis.menu_name}</p>
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${scoreColor}`}>
          {scoreEmoji} {analysis.growth_score}/10
        </span>
      </div>

      {/* 성장 평가 배너 */}
      <div className={`rounded-xl px-4 py-3 ${scoreColor.split(' ').slice(1).join(' ')} border`}>
        <p className="text-xs font-bold">{scoreLabel}</p>
        <p className="text-[11px] mt-1 leading-relaxed opacity-80">
          💡 {analysis.advice}
        </p>
      </div>

      {/* 영양소 그리드 */}
      <div className="grid grid-cols-4 gap-2">
        <MacroBadge label="칼로리" value={analysis.calories} unit="kcal" color="bg-orange-50 text-orange-600" />
        <MacroBadge label="탄수화물" value={analysis.carbs} unit="g" color="bg-blue-50 text-blue-600" />
        <MacroBadge label="단백질" value={analysis.protein} unit="g" color="bg-red-50 text-red-600" />
        <MacroBadge label="지방" value={analysis.fat} unit="g" color="bg-yellow-50 text-yellow-600" />
      </div>

      {/* 재료 */}
      {analysis.ingredients.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">🥗 재료</p>
          <div className="flex flex-wrap gap-1">
            {analysis.ingredients.map((ing, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 매크로 뱃지 ──

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className={`rounded-lg px-2 py-2 text-center ${color}`}>
      <p className="text-[9px] opacity-70">{label}</p>
      <p className="text-xs font-bold">{value}<span className="text-[9px] font-normal ml-0.5">{unit}</span></p>
    </div>
  );
}
