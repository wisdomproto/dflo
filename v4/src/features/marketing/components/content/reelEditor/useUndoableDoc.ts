// 세션 내 undo/redo (≤20 스냅샷) — 700ms 자동저장으로 즉시 영구화되는 드래그/삭제 실수 방어.
// 서버측 버전 이력은 v1 범위 외 (스펙). Ctrl+Z/Y 는 입력 필드 포커스 시 무시(브라우저 기본 동작 보존).
import { useCallback, useEffect, useRef, useState } from 'react';

export function useUndoableDoc<T>(initial: T, onCommit: (next: T) => void) {
  const [doc, setDocState] = useState<T>(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);
  // ★ docRef = 현재 문서의 ref 미러. setState 함수형 안에서 부수효과(스택 push) 금지 —
  //   모든 전이(setDoc/undo/redo/reset)는 이벤트 핸들러 경로에서 docRef 기준으로 스택을 조작하고
  //   마지막에 docRef 를 직접 갱신한다(렌더 바디 동기화에 의존하지 않음 — 연속 전이 안전).
  const docRef = useRef<T>(initial);
  const setDoc = useCallback((next: T) => {
    undoStack.current.push(docRef.current);
    if (undoStack.current.length > 20) undoStack.current.shift();
    redoStack.current = [];
    docRef.current = next;
    setDocState(next);
    onCommit(next);
  }, [onCommit]);
  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    redoStack.current.push(docRef.current);
    docRef.current = prev;
    setDocState(prev);
    onCommit(prev);
  }, [onCommit]);
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(docRef.current);
    docRef.current = next;
    setDocState(next);
    onCommit(next);
  }, [onCommit]);
  const reset = useCallback((next: T) => {
    undoStack.current = []; redoStack.current = [];
    docRef.current = next;
    setDocState(next); // reset 은 onCommit 호출 안 함(콘텐츠 전환은 저장 대상 아님)
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo]);
  return { doc, setDoc, undo, redo, reset };
}
