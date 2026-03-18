'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as { isNativePlatform?: () => boolean } | undefined;
    if (cap?.isNativePlatform?.()) setIsNative(true);
  }, []);

  useEffect(() => {
    document.body.classList.remove('loaded');

    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {});

    const timer = setTimeout(() => document.body.classList.add('loaded'), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isNative) {
    return (
      <>
        <header
          className="sticky top-0 z-50 border-b bg-white"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex h-12 items-center justify-center px-4">
            <Image src="/logo.png" alt="HUMAN:D" width={120} height={32} className="h-[16px] w-auto" priority />
          </div>
        </header>
        <main className="min-h-screen pb-28">
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
