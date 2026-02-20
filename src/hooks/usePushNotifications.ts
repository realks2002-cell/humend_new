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
      if (!token || cleanup) return;

      const platform = getPlatform();

      // 토큰 전송 — 401(인증 실패)이면 재시도
      let result = await sendTokenToServer(token, platform);
      let retries = 0;

      while (result === 401 && retries < MAX_RETRIES && !cleanup) {
        retries++;
        console.log(
          `[Push] 인증 실패, ${RETRY_DELAY_MS / 1000}초 후 재시도 (${retries}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        if (cleanup) return;
        result = await sendTokenToServer(token, platform);
      }

      if (result === true) {
        console.log("[Push] 토큰 등록 완료");
      } else {
        console.warn("[Push] 토큰 등록 실패:", result);
      }

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
