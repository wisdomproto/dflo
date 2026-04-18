import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// ================================================
// AdminLayout - 187 성장케어 v4
// 사이드바 + 관리자 레이아웃
// ================================================

const NAV_ITEMS = [
  { to: '/admin', icon: '📊', label: '대시보드', end: true },
  { to: '/admin/patients', icon: '👥', label: '환자 관리', end: false },
  { to: '/admin/medications', icon: '💊', label: '약품 마스터', end: false },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
          <div>
            <h2 className="text-lg font-bold text-gray-900">187 성장케어</h2>
            <p className="text-xs text-gray-500 mt-0.5">관리자 대시보드</p>
          </div>
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
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-2 py-2' : 'px-4 py-2.5'
              } ${
                isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            onClick={() => setSidebarOpen(false)}
            title={collapsed ? item.label : undefined}
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
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
              to="/"
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
