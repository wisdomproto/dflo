import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { pendingCount } from '@/features/admin/services/intakeSubmissionService';

// ================================================
// AdminLayout - 187 성장케어 v4
// 사이드바 + 관리자 레이아웃
// ================================================

// 의사용 항목 (대시보드 · 환자 · 약품).
const NAV_ITEMS = [
  { to: '/admin', icon: '📊', label: '대시보드', end: true },
  { to: '/admin/patients', icon: '👥', label: '환자 관리', end: false },
  { to: '/admin/medications', icon: '💊', label: '약품 관리', end: false },
  { to: '/admin/cases', icon: '🩺', label: '치료사례 후보', end: false },
];

// 마케팅 센터 — 사이드바 하단 별도 항목.
const MARKETING_ITEM = { to: '/marketing', icon: '📣', label: '마케팅', end: false };

// 상담 직원용 그룹 (설문 접수 + 상담 매뉴얼).
const CONSULT_ITEMS = [
  { to: '/admin/intake', icon: '📥', label: '설문 접수', end: false },
  { to: '/admin/consulting', icon: '💬', label: '상담 매뉴얼', end: false },
];

const BM_DOCS = [
  {
    href: '/ir/187_ir_v3_260509.html',
    label: '187 성장케어 IR · v3',
    sub: 'K-헬스케어 글로벌 표준 · 16장',
  },
  {
    href: '/ir/187_ir_v2_260506.html',
    label: '187 성장케어 IR · v2 (archive)',
    sub: 'Korean Growth Clinic OS · 24장',
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bmOpen, setBmOpen] = useState(false);
  // Desktop collapse state persists across page navigation via localStorage.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('admin.sidebar.collapsed') === '1';
  });
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('admin.sidebar.collapsed', next ? '1' : '0');
      } catch {
        /* noop */
      }
      return next;
    });
  };
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  // 설문 접수 대기 건수 배지.
  const [intakePending, setIntakePending] = useState(0);
  useEffect(() => {
    let cancelled = false;
    pendingCount()
      .then((n) => {
        if (!cancelled) setIntakePending(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const renderNavLink = (item: { to: string; icon: string; label: string; end: boolean }) => {
    const badge = item.to === '/admin/intake' && intakePending > 0 ? intakePending : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
            collapsed ? 'justify-center px-2 py-2' : 'px-4 py-2.5'
          } ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`
        }
        onClick={() => setSidebarOpen(false)}
        title={collapsed ? item.label : undefined}
      >
        <span className="text-lg">{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
        {badge > 0 &&
          (collapsed ? (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {badge}
            </span>
          ) : (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {badge}
            </span>
          ))}
      </NavLink>
    );
  };

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Logo / collapse header */}
      <div
        className={`flex items-center border-b border-gray-200 ${
          collapsed ? 'px-2 py-3 justify-center' : 'px-4 py-5 justify-between'
        }`}
      >
        {!collapsed && (
          <img src="/images/logo.jpg" alt="187 성장클리닉" className="h-9 w-auto" />
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* 의사용 그룹 — 라벨 */}
        {!collapsed && (
          <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            의사용
          </p>
        )}
        {NAV_ITEMS.map(renderNavLink)}

        {/* 초진 매칭 검토 — 정적 HTML 로컬 PHI 도구(gitignore). NavLink 아닌 새 탭 외부 링크, dev 전용 */}
        {import.meta.env.DEV && (
          <a
            href="/intake-review/match-review.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`relative flex items-center gap-3 rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 ${
              collapsed ? 'justify-center px-2 py-2' : 'px-4 py-2.5'
            }`}
            onClick={() => setSidebarOpen(false)}
            title={collapsed ? '초진 매칭 검토' : '초진기록지 ↔ 환자 매칭 검토 (개발 전용)'}
          >
            <span className="text-lg">🔗</span>
            {!collapsed && <span>초진 매칭 검토</span>}
          </a>
        )}

        {/* 상담 직원용 그룹 — 구분선 + 라벨 */}
        {collapsed ? (
          <div className="my-2 border-t border-gray-200" />
        ) : (
          <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            상담 직원용
          </p>
        )}

        {CONSULT_ITEMS.map(renderNavLink)}

        {/* 마케팅 센터 — 하단 별도 구역 */}
        {collapsed ? (
          <div className="my-2 border-t border-gray-200" />
        ) : (
          <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            마케팅
          </p>
        )}
        {renderNavLink(MARKETING_ITEM)}
      </div>

      {/* BM 자료 dropdown */}
      <div className={`border-t border-gray-200 ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        {collapsed ? (
          <a
            href={BM_DOCS[0].href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-amber-50 text-base hover:bg-amber-100"
            title="BM 자료"
            aria-label="BM 자료"
          >
            📄
          </a>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setBmOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                bmOpen ? 'bg-amber-50 text-amber-900' : 'text-gray-600 hover:bg-amber-50/60'
              }`}
              aria-expanded={bmOpen}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📄</span>
                <span>BM 자료</span>
              </span>
              <span className={`text-xs transition-transform ${bmOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {bmOpen && (
              <div className="mt-1 space-y-1 rounded-lg border border-amber-200 bg-amber-50/40 p-1">
                {BM_DOCS.map((doc) => (
                  <a
                    key={doc.href}
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md px-3 py-2 hover:bg-white"
                  >
                    <div className="text-sm font-semibold text-gray-900">{doc.label}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{doc.sub}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Info & Logout */}
      <div className={`border-t border-gray-200 ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary"
              title={user?.name ?? ''}
            >
              {user?.name?.[0] ?? 'A'}
            </div>
            <button
              onClick={handleSignOut}
              className="h-8 w-8 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200"
              title="로그아웃"
              aria-label="로그아웃"
            >
              ⎋
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {user?.name?.[0] ?? 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-3 w-full rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              로그아웃
            </button>
            <NavLink
              to="/app"
              className="mt-2 block w-full rounded-lg bg-primary/5 py-2 text-center text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              사용자 앱으로 이동
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200
                    transform transition-all duration-200 lg:translate-x-0 lg:static lg:z-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${collapsed ? 'lg:w-14 w-64' : 'w-64'}`}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
            aria-label="메뉴"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-base font-bold text-gray-900">187 성장케어 관리자</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
