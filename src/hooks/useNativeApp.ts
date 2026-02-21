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

      // OAuth 딥링크 처리: com.humend.hr://auth/callback
      const urlListener = await App.addListener('appUrlOpen', async (event) => {
        try {
          const url = new URL(event.url);
          if (url.hostname === 'auth' && url.pathname.startsWith('/callback')) {
            const code = url.searchParams.get('code');
            if (code) {
              const supabase = createClient();
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error) {
                // members 존재 확인
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data: member } = await supabase
                    .from('members')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle();
                  router.push(member ? '/my' : '/signup/complete');
                  router.refresh();
                }
              }
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
