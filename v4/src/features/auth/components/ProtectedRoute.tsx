import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// ================================================
// Protected Route - 187 성장케어 v4
// ================================================

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mx-auto" />
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { session, isLoading, isInitialized } = useAuthStore();
  const location = useLocation();

  if (isLoading || !isInitialized) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// ================================================
// Admin Route - role 기반 (admin/doctor만)
// ================================================

export function AdminRoute() {
  const { session, user, isLoading, isInitialized } = useAuthStore();
  const location = useLocation();

  if (isLoading || !isInitialized) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  if (role !== 'admin' && role !== 'doctor') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
