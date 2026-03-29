"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { isNative, getPlatform } from "@/lib/capacitor/native";

export default function NotificationBell({ className }: { className?: string }) {
  const [status, setStatus] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!isNative()) return;
    try {
      const { checkPushPermission } = await import("@/lib/capacitor/push");
      const result = await checkPushPermission();
      setStatus(result);
    } catch {}
  }, []);

  useEffect(() => {
    checkStatus();

    let cleanup: (() => void) | undefined;
    (async () => {
      if (!isNative()) return;
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) checkStatus();
        });
        cleanup = () => listener.remove();
      } catch {}
    })();

    return () => cleanup?.();
  }, [checkStatus]);

  if (!isNative() || status === null) return null;

  const denied = status !== "granted";

  const handleTap = async () => {
    if (!denied) {
      toast.info("알림이 활성화되어 있습니다");
      return;
    }

    const platform = getPlatform();
    if (platform === "ios") {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: "app-settings:" });
      } catch {}
    } else {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const result = await PushNotifications.requestPermissions();
        setStatus(result.receive as string);
        if (result.receive === "granted") {
          toast.success("알림이 활성화되었습니다");
        }
      } catch {}
    }
  };

  return (
    <button onClick={handleTap} className={className} aria-label="알림 설정">
      <div className="relative">
        {denied ? (
          <>
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          </>
        ) : (
          <Bell className="h-5 w-5 text-slate-600" />
        )}
      </div>
    </button>
  );
}
