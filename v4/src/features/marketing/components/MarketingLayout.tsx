// src/features/marketing/components/MarketingLayout.tsx
import { Outlet } from 'react-router-dom';
import { useMarketingAuth } from '../hooks/useMarketingAuth';
import { MarketingPinGate } from './MarketingPinGate';
import { MarketingSidebar } from './MarketingSidebar';

export default function MarketingLayout() {
  const { authed, submitPin } = useMarketingAuth();
  if (!authed) return <MarketingPinGate onSubmit={submitPin} />;
  return (
    <div className="flex h-screen bg-[#fafaf8]">
      <MarketingSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
