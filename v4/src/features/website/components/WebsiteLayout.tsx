import type { ReactNode } from 'react';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import { FloatingKakao } from './FloatingKakao';

interface Props {
  children: ReactNode;
}

export function WebsiteLayout({ children }: Props) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <WebsiteHeader />
      <main className="flex-1">{children}</main>
      <WebsiteFooter />
      <FloatingKakao />
    </div>
  );
}
