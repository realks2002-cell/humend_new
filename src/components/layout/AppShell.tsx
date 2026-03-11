'use client';

import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isNative] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const { Capacitor } = require('@capacitor/core');
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });

  if (isNative) {
    return (
      <>
        <main className="min-h-screen pb-16" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {children}
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      <Footer />
    </>
  );
}
