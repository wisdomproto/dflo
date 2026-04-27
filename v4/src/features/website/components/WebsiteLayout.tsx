import type { ReactNode } from 'react';
import { WebsiteHeader } from './WebsiteHeader';
import { FloatingButtons } from './FloatingButtons';

interface Props {
  children: ReactNode;
}

export function WebsiteLayout({ children }: Props) {
  return (
    <div className="min-h-dvh flex flex-col bg-white md:bg-gray-50">
      <WebsiteHeader />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-20">
        {children}
      </main>
      <FloatingButtons />
    </div>
  );
}
