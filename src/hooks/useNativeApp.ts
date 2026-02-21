'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNative, getPlatform } from '@/lib/capacitor/native';
import { createClient } from '@/lib/supabase/client';

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

      // OAuth 딥링크 처리: 시스템 브라우저에서 인증 후 토큰 전달받음
      const urlListener = await App.addListener('appUrlOpen', async (event) => {
        try {
          const url = new URL(event.url);
          if (url.hostname === 'auth' && url.pathname.startsWith('/callback')) {
            const accessToken = url.searchParams.get('access_token');
            const refreshToken = url.searchParams.get('refresh_token');
            const redirect = url.searchParams.get('redirect') || '/my';

            if (accessToken && refreshToken) {
              const supabase = createClient();
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              router.push(redirect);
              router.refresh();
            }
          }
        } catch (e) {
          console.error('[useNativeApp] OAuth deeplink error:', e);
        }
      });
      cleanups.push(() => urlListener.remove());

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
