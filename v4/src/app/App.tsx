import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { useAuthStore } from '@/stores/authStore';
import Toast from '@/shared/components/Toast';
import { trackPageView } from '@/shared/lib/analytics';

// ================================================
// App - 187 성장케어 v4
// ================================================

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // GA4 페이지뷰 — 첫 로드 + router 경로 변경 모두 캡쳐.
  // analytics 모듈에서 private route (/app, /admin 등) 는 자동 필터.
  useEffect(() => {
    trackPageView(window.location.pathname, window.location.search);
    const unsubscribe = router.subscribe((state) => {
      trackPageView(state.location.pathname, state.location.search);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
