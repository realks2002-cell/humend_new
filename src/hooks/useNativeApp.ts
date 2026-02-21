'use client';

import { useEffect } from 'react';

export function useNativeApp() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    async function init() {
      try {
        // Capacitor 동적 import - 웹 환경에서는 실패하므로 silently skip
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform();
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
      } catch {
        // Capacitor not available (web environment) - silently skip
      }
    }

    init();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);
}
