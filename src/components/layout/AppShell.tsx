'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { createClient } from '@/lib/supabase/client';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as { isNativePlatform?: () => boolean } | undefined;
    if (cap?.isNativePlatform?.()) setIsNative(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
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
          <div className="relative flex h-12 items-center justify-between px-4">
            {!isLoggedIn ? (
              <Link href="/login" className="flex items-center gap-1 text-xs text-gray-600 active:text-gray-900">
                <LogIn className="h-4 w-4" />
                <span>로그인</span>
              </Link>
            ) : (
              <div className="w-[52px]" />
            )}
            <Image src="/logo.png" alt="HUMAN:D" width={120} height={32} className="absolute left-1/2 top-1/2 h-[16px] w-auto -translate-x-1/2 -translate-y-1/2" priority />
            <div className="w-[52px]" />
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
