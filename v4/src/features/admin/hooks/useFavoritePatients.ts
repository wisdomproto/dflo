import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'admin.patients.favorites';

/** localStorage 기반 환자 즐겨찾기. 단일 어드민 가정. 다중 PC/계정 동기화가
 *  필요해지면 children 테이블에 컬럼 추가 또는 user_favorites 매핑 테이블로
 *  이전. 같은 탭의 다른 useFavoritePatients 인스턴스, 다른 탭의 storage
 *  이벤트 모두 listen 해서 즉시 반영. */
function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeToStorage(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // 용량 초과 등은 조용히 무시 — 즐겨찾기 ID 만이라 사실상 안 일어남
  }
  // 같은 탭의 다른 인스턴스에 알린다 (storage 이벤트는 다른 탭에만 발사됨)
  window.dispatchEvent(new CustomEvent('admin-favorites-changed'));
}

export function useFavoritePatients() {
  const [favorites, setFavorites] = useState<Set<string>>(() => readFromStorage());

  useEffect(() => {
    const refresh = () => setFavorites(readFromStorage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('admin-favorites-changed', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('admin-favorites-changed', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeToStorage(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggle };
}
