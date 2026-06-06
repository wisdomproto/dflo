// src/features/marketing/components/ChannelAnalyticsPage.tsx
import { ChannelTrafficTab } from './ChannelTrafficTab';

export function ChannelAnalyticsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 pt-4 pb-2 text-sm font-semibold text-gray-700">
        📈 유입 분석
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChannelTrafficTab />
      </div>
    </div>
  );
}
