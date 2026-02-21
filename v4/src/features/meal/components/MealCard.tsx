// ================================================
// MealCard - 187 성장케어 v4
// 식단 기록 + AI 영양 분석 (Gemini Vision)
// ================================================

import { useState, useRef, useCallback } from 'react';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { logger } from '@/shared/lib/logger';
import {
  upsertMeal,
  uploadMealPhoto,
  deleteMealPhoto,
  saveMealAnalysis,
} from '@/features/meal/services/mealService';
import { analyzeMealPhoto } from '@/shared/services/aiService';
import { compressImage } from '@/shared/utils/image';
import type { Meal, MealPhoto, MealType } from '@/shared/types';

// ── 타입 ──

interface MealSlot {
  type: MealType;
  label: string;
  icon: string;
  meal?: Meal;
  photos: MealPhoto[];
}

export interface MealCardProps {
  routineId: string | null;
  childId: string;
  meals: Meal[];
  photos: (MealPhoto & { meal_type: MealType })[];
  onDataChange: () => void;
  onAnalysisChange?: () => void;
  ensureRoutineId: () => Promise<string | null>;
}

// ── 상수 ──

const MEAL_SLOTS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: '아침', icon: '🌅' },
  { type: 'lunch', label: '점심', icon: '☀️' },
  { type: 'dinner', label: '저녁', icon: '🌙' },
];

// ── MealCard ──

export function MealCard({ routineId, childId, meals, photos, onDataChange, onAnalysisChange, ensureRoutineId }: MealCardProps) {
  const addToast = useUIStore((s) => s.addToast);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<MealType | null>(null);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<MealPhoto | null>(null);
  const [showPickerFor, setShowPickerFor] = useState<MealType | null>(null);

  // AI 분석 상태
  const [analyzing, setAnalyzing] = useState<MealType | null>(null);
  const lastFileRef = useRef<{ file: File; mealType: MealType } | null>(null);

  const slots: MealSlot[] = MEAL_SLOTS.map((s) => ({
    ...s,
    meal: meals.find((m) => m.meal_type === s.type),
    photos: photos.filter((p) => p.meal_type === s.type),
  }));

  const handlePhotoTrigger = useCallback(async (mealType: MealType) => {
    const rid = routineId ?? await ensureRoutineId();
    if (!rid) { addToast('warning', '루틴 생성에 실패했습니다.'); return; }
    setShowPickerFor(mealType);
  }, [routineId, addToast, ensureRoutineId]);

  const handleCamera = useCallback(() => {
    if (!showPickerFor) return;
    setActiveMealType(showPickerFor);
    setShowPickerFor(null);
    setTimeout(() => cameraInputRef.current?.click(), 50);
  }, [showPickerFor]);

  const handleGallery = useCallback(() => {
    if (!showPickerFor) return;
    setActiveMealType(showPickerFor);
    setShowPickerFor(null);
    setTimeout(() => galleryInputRef.current?.click(), 50);
  }, [showPickerFor]);

  // AI 분석 실행 + DB 저장
  const runAnalysis = useCallback(async (file: File, mealType: MealType, mealId: string) => {
    setAnalyzing(mealType);
    try {
      const result = await analyzeMealPhoto(file);

      // DB에 저장
      try {
        await saveMealAnalysis(mealId, result);
        onAnalysisChange?.();
      } catch {
        logger.warn('분석 결과 DB 저장 실패 (화면에는 표시됨)');
      }

      addToast('success', `${MEAL_SLOTS.find(s => s.type === mealType)?.label ?? ''} AI 분석 완료!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('AI analysis error:', msg);
      addToast('error', `AI 분석 실패: ${msg}`);
    } finally {
      setAnalyzing(null);
    }
  }, [addToast, onAnalysisChange]);

  // 파일 선택 후 업로드 + AI 분석
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !activeMealType) return;
    e.target.value = '';

    const rid = routineId ?? await ensureRoutineId();
    if (!rid) { addToast('error', '루틴 생성에 실패했습니다.'); return; }

    const currentMealType = activeMealType;
    setUploading(currentMealType);

    // 0) 이미지 압축 (모바일 카메라 사진 5~10MB → ~300KB)
    const file = await compressImage(rawFile);

    // 1) meal 레코드 확보
    let meal = meals.find((m) => m.meal_type === currentMealType);
    try {
      if (!meal) {
        meal = await upsertMeal({ daily_routine_id: rid, meal_type: currentMealType });
      }
    } catch {
      addToast('error', '식사 기록 생성에 실패했습니다.');
      setUploading(null);
      setActiveMealType(null);
      return;
    }

    // 2) Storage 업로드 (실패해도 AI 분석은 진행)
    try {
      await uploadMealPhoto(meal.id, file, childId);
      onDataChange();
      addToast('success', '사진이 저장되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '사진 업로드 실패';
      addToast('warning', `사진 저장 실패 (분석은 진행): ${msg}`);
    }

    // 3) AI 분석 (업로드 성공/실패 관계없이 실행)
    setUploading(null);
    lastFileRef.current = { file, mealType: currentMealType };
    runAnalysis(file, currentMealType, meal.id);
    setActiveMealType(null);
  }, [activeMealType, routineId, childId, meals, onDataChange, addToast, ensureRoutineId, runAnalysis]);

  const handleDeletePhoto = useCallback(async (photo: MealPhoto) => {
    try {
      await deleteMealPhoto(photo);
      setPreviewPhoto(null);
      onDataChange();
      addToast('success', '사진이 삭제되었습니다.');
    } catch {
      addToast('error', '사진 삭제에 실패했습니다.');
    }
  }, [onDataChange, addToast]);

  const pickerLabel = showPickerFor ? MEAL_SLOTS.find((s) => s.type === showPickerFor) : null;

  return (
    <>
      <Card>
        <div className="flex items-center gap-1.5 mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            <span>🍽️</span> 식단 기록
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {slots.map((slot) => (
            <MealSlotView
              key={slot.type}
              slot={slot}
              uploading={uploading === slot.type}
              analyzing={analyzing === slot.type}
              onTriggerPhoto={() => handlePhotoTrigger(slot.type)}
              onPreview={setPreviewPhoto}
            />
          ))}
        </div>

        {/* AI 분석 진행 표시 */}
        {analyzing && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{MEAL_SLOTS.find(s => s.type === analyzing)?.icon} {MEAL_SLOTS.find(s => s.type === analyzing)?.label} AI 영양 분석 중...</span>
            </div>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </Card>

      {/* 카메라/갤러리 선택 바텀시트 */}
      {showPickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowPickerFor(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md mx-4 mb-4 bg-white rounded-2xl overflow-hidden animate-[slideUp_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-gray-800 text-center">{pickerLabel?.icon} {pickerLabel?.label} 사진</p>
            </div>
            <div className="px-4 pb-2 space-y-1">
              <button onClick={handleCamera} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="text-xl">📷</span>
                <span className="text-sm font-medium text-gray-700">카메라로 촬영</span>
              </button>
              <button onClick={handleGallery} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors">
                <span className="text-xl">🖼️</span>
                <span className="text-sm font-medium text-gray-700">갤러리에서 선택</span>
              </button>
            </div>
            <button onClick={() => setShowPickerFor(null)} className="w-full py-3.5 text-sm font-medium text-gray-400 border-t border-gray-100">취소</button>
          </div>
        </div>
      )}

      {/* 사진 미리보기 모달 */}
      <Modal isOpen={!!previewPhoto} onClose={() => setPreviewPhoto(null)} title="식단 사진">
        {previewPhoto && (
          <div className="space-y-4">
            <img src={previewPhoto.photo_url} alt="식단 사진" className="w-full rounded-xl object-contain max-h-[60vh]" />
            <button onClick={() => handleDeletePhoto(previewPhoto)} className="w-full rounded-xl border border-danger py-2.5 text-sm font-medium text-danger active:bg-danger/5 transition-colors">삭제</button>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── 개별 식사 슬롯 ──

function MealSlotView({
  slot, uploading, analyzing, onTriggerPhoto, onPreview,
}: {
  slot: MealSlot;
  uploading: boolean;
  analyzing: boolean;
  onTriggerPhoto: () => void;
  onPreview: (photo: MealPhoto) => void;
}) {
  const hasPhotos = slot.photos.length > 0;
  const thumb = slot.photos[0];
  const busy = uploading || analyzing;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500">{slot.icon} {slot.label}</span>
      <button
        onClick={hasPhotos ? () => onPreview(thumb) : onTriggerPhoto}
        disabled={busy}
        className={`relative w-full aspect-square rounded-xl overflow-hidden transition-colors
          ${hasPhotos ? 'ring-1 ring-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200 active:bg-gray-100'}`}
      >
        {busy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-1">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[9px] text-gray-400">{uploading ? '업로드 중' : '분석 중'}</span>
          </div>
        ) : hasPhotos ? (
          <>
            <img src={thumb.photo_url} alt={slot.label} className="h-full w-full object-cover" />
            {slot.photos.length > 1 && (
              <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {slot.photos.length}
              </span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
            <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-[10px]">촬영</span>
          </div>
        )}
      </button>
      {hasPhotos && !busy && (
        <button onClick={onTriggerPhoto} className="text-[10px] text-primary font-medium active:text-primary/70">+ 추가</button>
      )}
    </div>
  );
}
