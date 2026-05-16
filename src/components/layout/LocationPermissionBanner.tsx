"use client";

import { useEffect, useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { isNative } from "@/lib/capacitor/native";

async function getPermissionStatus(): Promise<string | null> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") return null;

    const { getIosAuthorizationStatus, getAndroidLocationStatus } = await import(
      "@/lib/capacitor/native-geofence"
    );
    if (platform === "ios") {
      return await getIosAuthorizationStatus();
    }
    return await getAndroidLocationStatus();
  } catch {
    return null;
  }
}

export default function LocationPermissionBanner() {
  const [status, setStatus] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    if (!isNative()) return;

    let mounted = true;
    const check = async () => {
      const [s, { Capacitor }] = await Promise.all([
        getPermissionStatus(),
        import("@capacitor/core"),
      ]);
      if (!mounted) return;
      setStatus(s);
      setPlatform(Capacitor.getPlatform());
    };
    check();

    let removeListener: (() => void) | null = null;
    import("@capacitor/app").then(({ App }) => {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) check();
      }).then((h) => {
        removeListener = () => h.remove();
      });
    });

    return () => {
      mounted = false;
      removeListener?.();
    };
  }, []);

  const handleClick = async () => {
    try {
      const { openAppSettings } = await import("@/lib/capacitor/native-geofence");
      await openAppSettings();
    } catch (e) {
      console.error("[LocationPermissionBanner] 설정 열기 실패:", e);
    }
  };

  if (!status) return null;
  if (status === "always") return null;
  // notDetermined는 다른 플로우(BackgroundLocationDisclosure, useAttendance)에서 처리
  if (status === "notDetermined") return null;

  const label =
    status === "denied" || status === "restricted"
      ? "위치 권한이 거부되어 있습니다"
      : "위치 권한이 '항상 허용'으로 설정되어 있지 않습니다";

  const hint =
    platform === "ios"
      ? "설정 → 휴멘드 → 위치 → '항상' 선택"
      : "설정 → 앱 → 휴멘드 → 권한 → 위치 → '항상 허용'";

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left"
      type="button"
    >
      <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{label}</p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          백그라운드 출근 자동 확인을 위해 권한 변경이 필요합니다.
          <br />
          {hint}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
    </button>
  );
}
