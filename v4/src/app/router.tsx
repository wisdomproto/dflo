import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/ProtectedRoute';

// ================================================
// Router - 187 성장케어 v4
// ================================================

// Lazy-loaded page components
const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() =>
  import('@/features/auth/components/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const RoutinePage = lazy(() => import('@/pages/RoutinePage'));
// GrowthPage removed: merged into RoutinePage
const BodyAnalysisPage = lazy(() => import('@/pages/BodyAnalysisPage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const GuidesListPage = lazy(() => import('@/pages/GuidesListPage'));
const RecipesListPage = lazy(() => import('@/pages/RecipesListPage'));
const CasesListPage = lazy(() => import('@/pages/CasesListPage'));

// Website pages (public, no auth)
const WebsiteHomePage = lazy(() => import('@/features/website/pages/WebsiteHomePage'));
const ProgramDetailPage = lazy(() => import('@/features/website/pages/ProgramDetailPage'));
const AdminWebsitePage = lazy(() => import('@/features/website/pages/AdminWebsitePage'));

// Admin pages
const AdminLayout = lazy(() => import('@/features/admin/components/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminPatientsPage = lazy(() => import('@/pages/admin/AdminPatientsPage'));
const AdminPatientDetailPage = lazy(() => import('@/pages/admin/AdminPatientDetailPage'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));
const AdminImportPage = lazy(() => import('@/pages/admin/AdminImportPage'));

function SuspenseFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-sm text-gray-500">페이지 로딩 중...</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public website routes (no auth)
  {
    path: '/website',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <WebsiteHomePage />
      </Suspense>
    ),
  },
  {
    path: '/website/admin',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminWebsitePage />
      </Suspense>
    ),
  },
  {
    path: '/website/admin/banners',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminWebsitePage />
      </Suspense>
    ),
  },
  {
    path: '/website/admin/sections',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminWebsitePage />
      </Suspense>
    ),
  },
  {
    path: '/website/program/:slug',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <ProgramDetailPage />
      </Suspense>
    ),
  },

  // Public routes
  {
    path: '/login',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },

  // Protected routes (login required)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: '/routine',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RoutinePage />
          </Suspense>
        ),
      },
      // /growth removed: merged into /routine
      {
        path: '/body-analysis',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <BodyAnalysisPage />
          </Suspense>
        ),
      },
      {
        path: '/info',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <InfoPage />
          </Suspense>
        ),
      },
      {
        path: '/info/guides',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <GuidesListPage />
          </Suspense>
        ),
      },
      {
        path: '/info/recipes',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecipesListPage />
          </Suspense>
        ),
      },
      {
        path: '/info/cases',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <CasesListPage />
          </Suspense>
        ),
      },
    ],
  },

  // Admin routes (login + admin role required)
  {
    element: <AdminRoute />,
    children: [
      {
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          {
            path: '/admin',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminDashboardPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/patients',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminPatientsPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/patients/:id',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminPatientDetailPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/content',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminContentPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/import',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminImportPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
