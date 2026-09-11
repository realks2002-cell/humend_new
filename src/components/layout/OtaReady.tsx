"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/capacitor/native";

export default function OtaReady() {
  useEffect(() => {
    if (!isNative()) return;
    (async () => {
      try {
        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
        await CapacitorUpdater.notifyAppReady();
      } catch (e) {
        console.warn("[ota] notifyAppReady failed", e);
      }
    })();
  }, []);

  return null;
}
