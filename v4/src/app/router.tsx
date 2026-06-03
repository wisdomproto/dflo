import { lazy, Suspense, useEffect } from 'react';
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
const CasesEmbedPage = lazy(() => import('@/features/website/pages/CasesEmbedPage'));
const CalcEmbedPage = lazy(() => import('@/features/website/pages/CalcEmbedPage'));
const GrowthGuidePage = lazy(() => import('@/features/guide/GrowthGuidePage'));
const GrowthGuideDetailPage = lazy(() => import('@/features/guide/GrowthGuideDetailPage'));

// Blog pages
const BlogList = lazy(() => import('@/pages/Blog/BlogList'));
const BlogPost = lazy(() => import('@/pages/Blog/BlogPost'));

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

// Marketing hub (PIN-protected standalone section)
const MarketingLayout = lazy(() => import('@/features/marketing/components/MarketingLayout'));
const StrategyViewer = lazy(() =>
  import('@/features/marketing/components/StrategyViewer').then((m) => ({ default: m.StrategyViewer })),
);
const IdeasPage = lazy(() =>
  import('@/features/marketing/components/IdeasPage').then((m) => ({ default: m.IdeasPage })),
);
const TopicBoard = lazy(() =>
  import('@/features/marketing/components/TopicBoard').then((m) => ({ default: m.TopicBoard })),
);
const MarketingSettings = lazy(() =>
  import('@/features/marketing/components/MarketingSettings').then((m) => ({ default: m.MarketingSettings })),
);
const MarketingArticlesPage = lazy(() =>
  import('@/features/marketing/components/MarketingArticlesPage').then((m) => ({ default: m.MarketingArticlesPage })),
);
const SiteAnalysisPage = lazy(() =>
  import('@/features/marketing/components/SiteAnalysisPage').then((m) => ({ default: m.SiteAnalysisPage })),
);
const ChannelAnalyticsPage = lazy(() =>
  import('@/features/marketing/components/ChannelAnalyticsPage').then((m) => ({ default: m.ChannelAnalyticsPage })),
);
const CompetitorsPage = lazy(() =>
  import('@/features/marketing/components/CompetitorsPage').then((m) => ({ default: m.CompetitorsPage })),
);
const PublishQueuePage = lazy(() =>
  import('@/features/marketing/components/PublishQueuePage').then((m) => ({ default: m.PublishQueuePage })),
);
const MentionsPage = lazy(() =>
  import('@/features/marketing/components/MentionsPage').then((m) => ({ default: m.MentionsPage })),
);
const AdsManagerPage = lazy(() =>
  import('@/features/marketing/components/AdsManagerPage').then((m) => ({ default: m.AdsManagerPage })),
);

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

// Hard redirect to a static file (causes full page reload so Vite serves it directly).
function HardRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

const I18N_LANGS = ['ko', 'th', 'vi', 'en'] as const;
type I18nLang = (typeof I18N_LANGS)[number];
const isI18nLang = (v: string | undefined): v is I18nLang =>
  !!v && (I18N_LANGS as readonly string[]).includes(v);

// 301-style redirect from the legacy /test/* prototype URLs to the promoted /{lang}/ paths.
function TestLangRedirect() {
  const { lang } = useParams<{ lang: string }>();
  const safe = isI18nLang(lang) ? lang : 'ko';
  return <Navigate to={`/${safe}/`} replace />;
}

function TestLangBlogRedirect() {
  const { lang } = useParams<{ lang: string }>();
  const safe = isI18nLang(lang) ? lang : 'ko';
  return <Navigate to={`/${safe}/blog/`} replace />;
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
  // Root URL → Korean static i18n home. /ko/, /th/, /vi/, /en/ are the new entry points.
  // The old React WebsiteHomePage stays mounted at /home-legacy for emergency rollback.
  { path: '/', element: <HardRedirect to="/ko/index.html" /> },
  {
    path: '/home-legacy',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <WebsiteHomePage />
      </Suspense>
    ),
  },

  // Per-language entry — explicit per-lang routes to avoid colliding with /admin, /app, etc.
  // HardRedirect makes Vite serve the static {lang}/index.html directly.
  ...I18N_LANGS.flatMap((l) => [
    { path: `/${l}`, element: <HardRedirect to={`/${l}/index.html`} /> },
    { path: `/${l}/`, element: <HardRedirect to={`/${l}/index.html`} /> },
    { path: `/${l}/blog`, element: <HardRedirect to={`/${l}/blog/index.html`} /> },
    { path: `/${l}/blog/`, element: <HardRedirect to={`/${l}/blog/index.html`} /> },
  ]),
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
  {
    path: '/marketing',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <MarketingLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="/marketing/keywords" replace /> },
      {
        path: 'strategy',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <StrategyViewer />
          </Suspense>
        ),
      },
      {
        path: 'keywords',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <IdeasPage />
          </Suspense>
        ),
      },
      {
        path: 'topics',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TopicBoard />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingSettings />
          </Suspense>
        ),
      },
      {
        path: 'content',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingArticlesPage />
          </Suspense>
        ),
      },
      { path: 'articles', element: <Navigate to="/marketing/content" replace /> },
      {
        path: 'publish',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <PublishQueuePage />
          </Suspense>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MentionsPage />
          </Suspense>
        ),
      },
      {
        path: 'ads',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <AdsManagerPage />
          </Suspense>
        ),
      },
      {
        path: 'site-analysis',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <SiteAnalysisPage />
          </Suspense>
        ),
      },
      {
        path: 'channel-analytics',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ChannelAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: 'competitors',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <CompetitorsPage />
          </Suspense>
        ),
      },
    ],
  },

  // Legacy /test/* URLs — redirect to the promoted /{lang}/ paths so old bookmarks and
  // shared links keep working after Phase 6 promotion.
  { path: '/test', element: <Navigate to="/ko/" replace /> },
  { path: '/test/', element: <Navigate to="/ko/" replace /> },
  { path: '/test/:lang', element: <TestLangRedirect /> },
  { path: '/test/:lang/', element: <TestLangRedirect /> },
  { path: '/test/:lang/blog', element: <TestLangBlogRedirect /> },
  { path: '/test/:lang/blog/', element: <TestLangBlogRedirect /> },

  // /cases-embed — used as iframe target by /test/cases.html
  // /banner-admin 에서 만든 cases 슬라이드만 SectionCarousel 로 렌더한다.
  {
    path: '/cases-embed',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <CasesEmbedPage />
      </Suspense>
    ),
  },
  // /calc-embed — used as iframe target by /test/calculator.html
  // 메인 사이트의 HeightCalculator 모듈 (Chart.js 그래프 포함) 을 그대로 재사용.
  {
    path: '/calc-embed',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <CalcEmbedPage />
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

  // Blog routes — React SPA (list + detail) for ko and th
  {
    path: '/blog',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <BlogList lang="ko" />
      </Suspense>
    ),
  },
  {
    path: '/blog/:slug',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <BlogPost lang="ko" />
      </Suspense>
    ),
  },
  {
    path: '/th/blog',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <BlogList lang="th" />
      </Suspense>
    ),
  },
  {
    path: '/th/blog/:slug',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <BlogPost lang="th" />
      </Suspense>
    ),
  },
]);
