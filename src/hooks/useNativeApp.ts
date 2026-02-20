'use client';

import { useEffect } from 'react';
import { isNative, getPlatform } from '@/lib/capacitor/native';

export function useNativeApp() {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup: (() => void) | undefined;

    async function init() {
      const platform = getPlatform();

      // Android 뒤로가기 버튼 핸들링
      if (platform === 'android') {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanup = () => listener.remove();
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
      cleanup?.();
    };
  }, []);
}
