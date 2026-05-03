import { isNative } from "./native";

/**
 * 폰의 권한/배터리/위치서비스/GPS/디바이스 정보를 수집하여 서버에 보고.
 * Silent Push 핸들러 + 앱 실행 시(NativeAppProvider) 양쪽에서 호출됨.
 */
export async function collectAndReportDiagnostics(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    const { Device } = await import("@capacitor/device");
    const { Geolocation } = await import("@capacitor/geolocation");
    const {
      isBatteryOptimizationIgnored,
      getIosAuthorizationStatus,
      getAndroidLocationStatus,
      isLocationServicesEnabled,
    } = await import("./native-geofence");

    const platform = Capacitor.getPlatform();
    let location_permission = "unknown";
    let battery_optimized: boolean | null = null;

    if (platform === "ios") {
      location_permission = (await getIosAuthorizationStatus()) || "unknown";
    } else if (platform === "android") {
      location_permission = (await getAndroidLocationStatus()) || "unknown";
      battery_optimized = await isBatteryOptimizationIgnored();
    }

    const location_services_enabled = await isLocationServicesEnabled();

    let device_manufacturer: string | null = null;
    let device_model: string | null = null;
    let os_version: string | null = null;
    let disk_free_mb: number | null = null;
    try {
      const info = await Device.getInfo();
      device_manufacturer = info.manufacturer ?? null;
      device_model = info.model ?? null;
      os_version = info.osVersion ?? null;
      disk_free_mb = info.memUsed != null ? Math.round(info.memUsed / 1024 / 1024) : null;
    } catch {}

    let last_gps_accuracy: number | null = null;
    let last_gps_success = false;
    try {
      // Capacitor Geolocation timeout 옵션이 iOS에서 무시되는 경우 있음 → Promise.race로 강제
      const pos = await Promise.race([
        Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0 }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("gps_timeout")), 8000)),
      ]);
      last_gps_accuracy = pos.coords.accuracy;
      last_gps_success = true;
    } catch {
      last_gps_success = false;
    }

    // 인증
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let apiKey: string | null = null;
    try { apiKey = window.localStorage.getItem("humend_api_key"); } catch {}
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    } else {
      const { createClient } = await import("@/lib/supabase/client");
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    }

    if (!headers["x-api-key"] && !headers.Authorization) return false;

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
    const res = await fetch(`${API_BASE}/api/native/permissions/report`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        location_permission,
        battery_optimized,
        platform,
        location_services_enabled,
        last_gps_accuracy,
        last_gps_success,
        device_manufacturer,
        device_model,
        os_version,
        disk_free_mb,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[Diagnostics] 보고 실패:", e);
    return false;
  }
}
