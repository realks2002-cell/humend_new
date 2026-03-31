"use client";

import { useEffect } from "react";
import { isNative, getPlatform } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";

export function usePushNotifications() {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup = false;
    let authUnsub: (() => void) | undefined;

    async function registerAndSend() {
      if (cleanup) return;

      const { registerPush, setupPushListeners, sendTokenToServer } =
        await import("@/lib/capacitor/push");

      if (cleanup) return;

      const token = await registerPush();
      if (!token) return;

      const platform = getPlatform();
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      sendTokenToServer(token, platform, accessToken).then((result) => {
        if (result === true) {
          console.log("[Push] 토큰 등록 완료");
        } else {
          console.warn("[Push] 토큰 등록 실패:", result);
        }
      });

      if (!cleanup) {
        setupPushListeners();
      }
    }

    async function init() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          await registerAndSend();
        } else {
          const { data: { subscription } } =
            supabase.auth.onAuthStateChange((_event, newSession) => {
              if (newSession && !cleanup) {
                subscription.unsubscribe();
                authUnsub = undefined;
                registerAndSend();
              }
            });
          authUnsub = () => subscription.unsubscribe();
        }
      } catch (e) {
        console.error("[usePushNotifications] init error:", e);
      }
    }

    init();

    // 앱 포그라운드 복귀 시 토큰 재등록
    let appListener: { remove: () => void } | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        appListener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive && !cleanup) registerAndSend();
        });
      } catch {}
    })();

    return () => {
      cleanup = true;
      authUnsub?.();
      appListener?.remove();
    };
  }, []);
}
