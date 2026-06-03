// src/features/marketing/components/ChannelAnalyticsPage.tsx
import { useState } from 'react';
import { ChannelTrafficTab } from './ChannelTrafficTab';
import { ChannelRegistryTab } from './ChannelRegistryTab';

const TABS = [
  { id: 'traffic', label: '📈 유입 분석' },
  { id: 'registry', label: '🗂 채널 관리' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function ChannelAnalyticsPage() {
  const [tab, setTab] = useState<TabId>('traffic');

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 px-6 pt-4">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm ${
              tab === t.id ? 'bg-[#4A2D6B] text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'traffic' && <ChannelTrafficTab />}
        {tab === 'registry' && <ChannelRegistryTab />}
      </div>
    </div>
  );
}
