import { lazy, Suspense } from 'react';
import { Navigate, createBrowserRouter, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/ProtectedRoute';

// ================================================
// Router - 187 성장케어 v4
//
// Route structure:
//   /              → 병원 홈페이지 (public)
//   /program/:slug → 프로그램 상세
//   /guide, /guide/:id → 성장 가이드
//   /diagnosis     → AI 진단 intake 폼
//   /banner-admin  → 홈페이지 배너 관리 (PIN)
//   /app/*         → 사용자 앱 (로그인 필수, 차트번호 + 비밀번호)
//   /admin/*       → 클리닉 관리자 (로그인 + 관리자)
//   /login         → 로그인
//   /website/*     → (deprecated) 구 경로, / 쪽으로 리다이렉트
// ================================================

// Lazy-loaded page components
const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() =>
  import('@/features/auth/components/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import('@/features/auth/components/AdminLoginPage').then((m) => ({
    default: m.AdminLoginPage,
  })),
);
const RoutinePage = lazy(() => import('@/pages/RoutinePage'));
const RecordsPage = lazy(() => import('@/pages/RecordsPage'));
const StatsPage = lazy(() => import('@/pages/StatsPage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const GuidesListPage = lazy(() => import('@/pages/GuidesListPage'));
const RecipesListPage = lazy(() => import('@/pages/RecipesListPage'));
const CasesListPage = lazy(() => import('@/pages/CasesListPage'));

// Website pages (public, no auth)
const WebsiteHomePage = lazy(() => import('@/features/website/pages/WebsiteHomePage'));
const ProgramDetailPage = lazy(() => import('@/features/website/pages/ProgramDetailPage'));
const IntakeDiagnosisPage = lazy(() => import('@/features/website/pages/IntakeDiagnosisPage'));
const AdminWebsitePage = lazy(() => import('@/features/website/pages/AdminWebsitePage'));
const AdminAnalyticsPage = lazy(() => import('@/features/website/pages/AdminAnalyticsPage'));
const GrowthGuidePage = lazy(() => import('@/features/guide/GrowthGuidePage'));
const GrowthGuideDetailPage = lazy(() => import('@/features/guide/GrowthGuideDetailPage'));

// Admin pages
const AdminLayout = lazy(() => import('@/features/admin/components/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminPatientsPage = lazy(() => import('@/pages/admin/AdminPatientsPage'));
const AdminPatientDetailPage = lazy(() => import('@/pages/admin/AdminPatientDetailPage'));
const AdminVisitNewPage = lazy(() => import('@/pages/admin/AdminVisitNewPage'));
const AdminVisitDetailPage = lazy(() => import('@/pages/admin/AdminVisitDetailPage'));
const AdminBoneAgePage = lazy(() => import('@/pages/admin/AdminBoneAgePage'));
const AdminImportPage = lazy(() => import('@/pages/admin/AdminImportPage'));
const AdminDiagramPreviewPage = lazy(() => import('@/pages/admin/AdminDiagramPreviewPage'));
const AdminMedicationsPage = lazy(() => import('@/pages/admin/AdminMedicationsPage'));
const AdminAppHomePage = lazy(() => import('@/pages/admin/AdminAppHomePage'));

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

// Redirect helpers for param-carrying legacy paths.
function RedirectProgram() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/program/${slug ?? ''}`} replace />;
}

function RedirectGuideDetail() {
  const { cardId } = useParams<{ cardId: string }>();
  return <Navigate to={`/guide/${cardId ?? ''}`} replace />;
}

export const router = createBrowserRouter([
  // Public website routes (root = hospital landing page)
  {
    path: '/',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <WebsiteHomePage />
      </Suspense>
    ),
  },
  {
    path: '/program/:slug',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <ProgramDetailPage />
      </Suspense>
    ),
  },
  {
    path: '/guide',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <GrowthGuidePage />
      </Suspense>
    ),
  },
  {
    path: '/guide/:cardId',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <GrowthGuideDetailPage />
      </Suspense>
    ),
  },
  {
    path: '/diagnosis',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <IntakeDiagnosisPage />
      </Suspense>
    ),
  },
  {
    path: '/banner-admin',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminWebsitePage />
      </Suspense>
    ),
  },
  {
    path: '/banner-admin/analytics',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminAnalyticsPage />
      </Suspense>
    ),
  },
  {
    // 앱 홈(/app) 섹션 콘텐츠 관리 — PIN 보호 (의사 admin과 분리)
    path: '/app-home-admin',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminAppHomePage />
      </Suspense>
    ),
  },

  // Legacy /website/* redirects (banner CTAs in R2, external bookmarks)
  { path: '/website', element: <Navigate to="/" replace /> },
  { path: '/website/admin', element: <Navigate to="/banner-admin" replace /> },
  { path: '/website/program/:slug', element: <RedirectProgram /> },
  { path: '/website/guide', element: <Navigate to="/guide" replace /> },
  { path: '/website/guide/:cardId', element: <RedirectGuideDetail /> },
  { path: '/website/diagnosis', element: <Navigate to="/diagnosis" replace /> },

  // Login (환자: 차트번호 / 관리자: 이메일)
  {
    path: '/login',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <AdminLoginPage />
      </Suspense>
    ),
  },

  // App routes (로그인 필수 — 환자 전용 공간, 차트번호 로그인)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: '/app/info',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <InfoPage />
          </Suspense>
        ),
      },
      {
        path: '/app/info/guides',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <GuidesListPage />
          </Suspense>
        ),
      },
      {
        path: '/app/info/recipes',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecipesListPage />
          </Suspense>
        ),
      },
      {
        path: '/app/info/cases',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <CasesListPage />
          </Suspense>
        ),
      },
      {
        path: '/app/routine',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RoutinePage />
          </Suspense>
        ),
      },
      {
        path: '/app/records',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <RecordsPage />
          </Suspense>
        ),
      },
      {
        path: '/app/stats',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <StatsPage />
          </Suspense>
        ),
      },
    ],
  },

  // Legacy app-route redirects (pre-restructure bookmarks)
  { path: '/routine', element: <Navigate to="/app/routine" replace /> },
  { path: '/body-analysis', element: <Navigate to="/app/routine" replace /> },
  { path: '/app/body-analysis', element: <Navigate to="/app/routine" replace /> },
  { path: '/info', element: <Navigate to="/app/info" replace /> },
  { path: '/info/guides', element: <Navigate to="/app/info/guides" replace /> },
  { path: '/info/recipes', element: <Navigate to="/app/info/recipes" replace /> },
  { path: '/info/cases', element: <Navigate to="/app/info/cases" replace /> },

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
            path: '/admin/patients/:id/visits/new',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminVisitNewPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/patients/:id/visits/:visitId',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminVisitDetailPage />
              </Suspense>
            ),
          },
          {
            path: '/admin/patients/:id/visits/:visitId/bone-age',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminBoneAgePage />
              </Suspense>
            ),
          },
          {
            path: '/admin/medications',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminMedicationsPage />
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
          {
            path: '/admin/diagram-preview',
            element: (
              <Suspense fallback={<SuspenseFallback />}>
                <AdminDiagramPreviewPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
