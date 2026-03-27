"use client";

import { useEffect } from "react";
import { isNative, getPlatform } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

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
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;

      // 토큰 전송은 페이지 전환(cleanup)과 무관하게 반드시 완료 (fire-and-forget)
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
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // 이미 로그인 상태 → 바로 등록
          await registerAndSend();
        } else {
          // 비로그인 → 로그인 이벤트 대기 후 등록
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, newSession) => {
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

    return () => {
      cleanup = true;
      authUnsub?.();
    };
  }, []);
}
