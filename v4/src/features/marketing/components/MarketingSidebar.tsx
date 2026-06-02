// src/features/marketing/components/MarketingSidebar.tsx
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/marketing', label: '대시보드', end: true },
  { to: '/marketing/strategy', label: '전략 문서', end: false },
  { to: '/marketing/keywords', label: '키워드 DB', end: false },
  { to: '/marketing/topics', label: '주제 백로그', end: false },
];

export function MarketingSidebar() {
  return (
    <aside className="flex w-52 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-5 py-5">
        <div className="text-base font-bold text-[#4A2D6B]">187 마케팅 센터</div>
        <div className="text-xs text-gray-400">연세새봄의원</div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-[#4A2D6B] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <a href="/" className="mt-auto px-5 py-4 text-xs text-gray-400 hover:text-gray-600">
        ← 홈으로
      </a>
    </aside>
  );
}
