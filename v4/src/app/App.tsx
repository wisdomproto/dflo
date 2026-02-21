import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { useAuthStore } from '@/stores/authStore';
import Toast from '@/shared/components/Toast';

// ================================================
// App - 187 성장케어 v4
// ================================================

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
