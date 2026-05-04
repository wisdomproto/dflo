// ================================================
// ExerciseCard - 성장 운동 체크리스트 + YouTube 동영상
// 운동 마스터는 DB exercises 테이블에서 fetch
// ================================================

import { useEffect, useMemo, useState } from 'react';
import Card from '@/shared/components/Card';
import { useUIStore } from '@/stores/uiStore';
import { YouTubeModal } from './YouTubeModal';
import { fetchExercises } from '@/features/exercise/services/exerciseService';
import {
  upsertExerciseLog,
  deleteExerciseLog,
} from '@/features/routine/services/routineService';
import type { Exercise, ExerciseLog } from '@/shared/types';

interface ExerciseCardProps {
  routineId: string | null;
  exerciseLogs: ExerciseLog[];
  onDataChange: () => void;
  /** 루틴이 없으면 자동 생성 후 id 반환 */
  ensureRoutineId: () => Promise<string | null>;
}

export function ExerciseCard({ routineId, exerciseLogs, onDataChange, ensureRoutineId }: ExerciseCardProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExercises()
      .then((list) => {
        if (!cancelled) setExercises(list);
      })
      .catch((e) => {
        if (!cancelled) addToast('error', e?.message ?? '운동 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  // exercise_name → ExerciseLog 매핑
  const logMap = useMemo(() => {
    const map = new Map<string, ExerciseLog>();
    exerciseLogs.forEach((log) => map.set(log.exercise_name, log));
    return map;
  }, [exerciseLogs]);

  const completedCount = exercises.filter((ex) => logMap.has(ex.name)).length;

  const handleToggle = async (exercise: Exercise) => {
    const rid = routineId ?? (await ensureRoutineId());
    if (!rid) {
      addToast('warning', '다이어리 생성에 실패했습니다.');
      return;
    }
    setSaving(exercise.id);
    try {
      const existing = logMap.get(exercise.name);
      if (existing) {
        await deleteExerciseLog(existing.id);
      } else {
        await upsertExerciseLog({
          daily_routine_id: rid,
          exercise_name: exercise.name,
          completed: true,
        });
      }
      onDataChange();
    } catch {
      addToast('error', '운동 기록 저장에 실패했습니다.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Card>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏋️</span>
            <h3 className="font-semibold text-gray-800 text-sm">운동</h3>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              exercises.length > 0 && completedCount === exercises.length
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {completedCount}/{exercises.length}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 text-center py-4">불러오는 중...</p>
        ) : exercises.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">등록된 운동이 없습니다</p>
        ) : (
          <div className="space-y-0.5">
            {exercises.map((ex) => {
              const completed = logMap.has(ex.name);
              const isSaving = saving === ex.id;

              return (
                <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0">
                  {/* 체크박스 */}
                  <button
                    onClick={() => handleToggle(ex)}
                    disabled={isSaving}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      completed
                        ? 'bg-primary border-primary text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSaving ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : completed ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>

                  {/* 운동 이름 */}
                  <span className={`flex-1 text-sm ${completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {ex.name}
                  </span>

                  {/* 카테고리 뱃지 */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      ex.category === '근육운동'
                        ? 'bg-orange-50 text-orange-500'
                        : 'bg-blue-50 text-blue-500'
                    }`}
                  >
                    {ex.category === '근육운동' ? '💪' : '🧘'}
                  </span>

                  {/* YouTube 재생 버튼 — youtube_url 있을 때만 */}
                  {ex.youtube_url && (
                    <button
                      onClick={() => setVideoExercise(ex)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 active:bg-red-100 transition-colors flex-shrink-0"
                      aria-label={`${ex.name} 동영상 보기`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <YouTubeModal
        isOpen={!!videoExercise}
        onClose={() => setVideoExercise(null)}
        exercise={videoExercise}
      />
    </>
  );
}
