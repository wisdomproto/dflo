import type { ReactNode } from 'react';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import { FloatingButtons } from './FloatingButtons';

interface Props {
  children: ReactNode;
}

export function WebsiteLayout({ children }: Props) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F4F4F0]">
      <WebsiteHeader />
      <main className="flex-1">{children}</main>
      <WebsiteFooter />
      <FloatingButtons />
    </div>
  );
}
