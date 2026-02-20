"use client";

import { useEffect } from "react";
import { isNative, getPlatform } from "@/lib/capacitor/native";

export function usePushNotifications() {
  useEffect(() => {
    // 웹에서는 절대 실행하지 않음
    if (!isNative()) return;

    let cleanup = false;

    async function init() {
      try {
        const { registerPush, setupPushListeners, sendTokenToServer } =
          await import("@/lib/capacitor/push");

        if (cleanup) return;

        const token = await registerPush();
        if (token && !cleanup) {
          await sendTokenToServer(token, getPlatform());
        }

        if (!cleanup) {
          setupPushListeners();
        }
      } catch (e) {
        console.error("[usePushNotifications] init error:", e);
      }
    }

    init();

    return () => {
      cleanup = true;
    };
  }, []);
}
