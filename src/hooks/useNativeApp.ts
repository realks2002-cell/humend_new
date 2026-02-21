'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNative, getPlatform } from '@/lib/capacitor/native';

export function useNativeApp() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;

    const cleanups: (() => void)[] = [];

    async function init() {
      const platform = getPlatform();
      const { App } = await import('@capacitor/app');

      // Android 뒤로가기 버튼 핸들링
      if (platform === 'android') {
        const backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanups.push(() => backListener.remove());
      }

      // 상태바 설정
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        }
      } catch {
        // StatusBar plugin not available
      }
    }

    init();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [router]);
}
