// src/features/marketing/components/MarketingSidebar.tsx
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  soon?: boolean;
  external?: boolean; // static HTML (public/*.html) — 새 탭으로 열기 (React 라우트 아님)
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '설정',
    items: [
      { to: '/marketing/settings', icon: '⚙️', label: '프로젝트 설정' },
      { to: '/marketing/channels', icon: '🗂', label: '채널 설정' },
    ],
  },
  {
    label: '오가닉 마케팅',
    items: [
      { to: '/marketing/keywords', icon: '💡', label: '키워드 / 아이디어' },
      { to: '/marketing/content', icon: '📝', label: '콘텐츠 생성' },
      { to: '/marketing/publish', icon: '🚀', label: '발행' },
    ],
  },
  {
    label: '성장',
    items: [{ to: '/marketing/monitoring', icon: '💬', label: '모니터링 / 댓글' }],
  },
  {
    label: '유료 마케팅',
    items: [
      { to: '/marketing/ads', icon: '📢', label: '광고 관리' },
      { to: '/marketing/advisor', icon: '🤖', label: '광고 어드바이저' },
    ],
  },
  {
    label: '분석',
    items: [
      { to: '/marketing/site-analysis', icon: '📊', label: '사이트 분석' },
      { to: '/marketing/predictions', icon: '📈', label: '예측키 측정 로그' },
      { to: '/marketing/seo-audit', icon: '🔍', label: 'SEO 감사' },
      { to: '/marketing/channel-analytics', icon: '📱', label: '채널 분석' },
      { to: '/marketing/competitors', icon: '🎯', label: '경쟁사' },
    ],
  },
  {
    label: '전략',
    items: [{ to: '/marketing/strategy', icon: '💡', label: '마케팅 전략' }],
  },
  {
    label: '자료',
    items: [
      { to: '/marketing/leaflets', icon: '📄', label: '리플렛' },
      { to: '/growth-report-sample.html', icon: '🧾', label: '성장 리포트 (샘플)', external: true },
    ],
  },
  // 치료사례 후보(case-candidates.html)는 PHI 포함 로컬 전용 도구 → dev 에서만 노출(배포본엔 파일 없음)
  ...(import.meta.env.DEV
    ? [{ label: '치료사례', items: [{ to: '/marketing/cases', icon: '🩺', label: '치료사례 후보' }] as NavItem[] }]
    : []),
];

function Item({ item }: { item: NavItem }) {
  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
      >
        <span>{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        <span className="text-[10px] text-gray-400">↗</span>
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          isActive
            ? 'bg-[#4A2D6B] text-white'
            : `${item.soon ? 'text-gray-400' : 'text-gray-600'} hover:bg-gray-100`
        }`
      }
    >
      <span>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">준비 중</span>
      )}
    </NavLink>
  );
}

export function MarketingSidebar() {
  return (
    <aside className="flex w-52 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
      <div className="px-5 py-5">
        <div className="text-base font-bold text-[#4A2D6B]">187 마케팅 센터</div>
        <div className="text-xs text-gray-400">연세새봄의원</div>
      </div>
      <nav className="flex flex-col gap-3 px-3 pb-4">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {g.label}
            </div>
            {g.items.map((it) => (
              <Item key={it.to} item={it} />
            ))}
          </div>
        ))}
      </nav>
      <a href="/" className="mt-auto px-5 py-4 text-xs text-gray-400 hover:text-gray-600">
        ← 홈으로
      </a>
    </aside>
  );
}
