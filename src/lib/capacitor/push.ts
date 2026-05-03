import { PushNotifications } from "@capacitor/push-notifications";

/** 푸시 권한 확인 + FCM 토큰 반환 (이미 허용됐으면 재요청 안 함) */
export async function registerPush(): Promise<string | null> {
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    console.log("[Push] 권한 거부됨");
    return null;
  }

  // Android 8+ (API 26+): 기본 알림 채널 생성 (없으면 알림 무시됨)
  try {
    await PushNotifications.createChannel({
      id: "default",
      name: "기본 알림",
      importance: 5,
      sound: "default",
      vibration: true,
    });
  } catch {
    // iOS에서는 createChannel 미지원 — 무시
  }

  return new Promise<string | null>((resolve) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn("[Push] 토큰 등록 타임아웃 (10s)");
        resolve(null);
      }
    }, 10000);

    PushNotifications.addListener("registration", (token) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log("[Push] FCM token:", token.value);
        resolve(token.value);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error("[Push] 등록 실패:", err);
        resolve(null);
      }
    });

    PushNotifications.register();
  });
}

let listenersRegistered = false;

/** 알림 탭 리스너 — 출근 의사 확인 + URL 이동 (중복 등록 방지) */
export function setupPushListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;
  // 푸시 수신 시 — 배정 관련이면 지오펜싱 재시작
  PushNotifications.addListener(
    "pushNotificationReceived",
    async (notification) => {
      const data = notification.data;
      if (data?.type === "geofence_register" || data?.type === "location_check" || data?.action === "confirm_attendance") {
        console.log("[Push] 배정 알림 수신 → 지오펜싱 재시작");
        try {
          const { checkAndStartGeofence } = await import("@/hooks/useAttendance");
          await checkAndStartGeofence();
        } catch (e) {
          console.error("[Push] 지오펜싱 재시작 실패:", e);
        }
      }

      // 통합 진단 Silent Push — 권한 + 배터리 + 위치서비스 + GPS + 디바이스 정보 보고
      if (data?.type === "permission_check") {
        try {
          const { Capacitor } = await import("@capacitor/core");
          const { Device } = await import("@capacitor/device");
          const { Geolocation } = await import("@capacitor/geolocation");
          const {
            isBatteryOptimizationIgnored,
            getIosAuthorizationStatus,
            getAndroidLocationStatus,
            isLocationServicesEnabled,
          } = await import("@/lib/capacitor/native-geofence");

          const platform = Capacitor.getPlatform();
          let location_permission = "unknown";
          let battery_optimized: boolean | null = null;

          if (platform === "ios") {
            location_permission = (await getIosAuthorizationStatus()) || "unknown";
          } else if (platform === "android") {
            location_permission = (await getAndroidLocationStatus()) || "unknown";
            battery_optimized = await isBatteryOptimizationIgnored();
          }

          // 위치 서비스 (OS 차원)
          const location_services_enabled = await isLocationServicesEnabled();

          // 디바이스 정보
          let device_manufacturer: string | null = null;
          let device_model: string | null = null;
          let os_version: string | null = null;
          let disk_free_mb: number | null = null;
          try {
            const info = await Device.getInfo();
            device_manufacturer = info.manufacturer ?? null;
            device_model = info.model ?? null;
            os_version = info.osVersion ?? null;
            disk_free_mb = info.realDiskFree
              ? Math.round(info.realDiskFree / 1024 / 1024)
              : null;
          } catch {}

          // GPS 측정 (5초 타임아웃)
          let last_gps_accuracy: number | null = null;
          let last_gps_success = false;
          try {
            const pos = await Geolocation.getCurrentPosition({
              timeout: 5000,
              enableHighAccuracy: true,
              maximumAge: 0,
            });
            last_gps_accuracy = pos.coords.accuracy;
            last_gps_success = true;
          } catch {
            last_gps_success = false;
          }

          // 인증: localStorage API Key 우선
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

          if (headers["x-api-key"] || headers.Authorization) {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
            await fetch(`${API_BASE}/api/native/permissions/report`, {
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
            console.log("[Push] 통합 진단 보고 완료");
          }
        } catch (e) {
          console.error("[Push] 진단 실패:", e);
        }
      }
    }
  );

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    async (notification) => {
      const data = notification.notification.data;

      // 출근 의사 확인 알림 탭 — 모달 즉시 오픈, API는 백그라운드
      if (data?.action === "confirm_attendance" && data?.shiftId) {
        const { openAttendanceModal } = await import("@/lib/attendance-modal-store");
        openAttendanceModal();

        (async () => {
          try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (token) {
              const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
              await fetch(`${API_BASE}/api/native/attendance/confirm`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ shiftId: data.shiftId }),
              });
            }
          } catch (e) {
            console.error("[Push] 출근 확인 실패:", e);
          }
        })();
      }

      // 지오펜싱 재시작 (알림 터치 시)
      try {
        const { checkAndStartGeofence } = await import("@/hooks/useAttendance");
        await checkAndStartGeofence();
      } catch {}

      // URL 이동 — confirm_attendance 는 모달이 대체하므로 skip
      if (data?.action !== "confirm_attendance") {
        const url = data?.url;
        if (url && typeof url === "string") {
          window.location.href = url;
        }
      }
    }
  );
}

/** 알림 권한 상태 확인 */
export async function checkPushPermission(): Promise<string> {
  const result = await PushNotifications.checkPermissions();
  return result.receive as string;
}

/** 서버에 FCM 토큰 전송. 성공 시 true, 인증 실패 시 401, 그 외 실패 시 false 반환 */
export async function sendTokenToServer(
  token: string,
  platform: string,
  accessToken?: string
): Promise<true | 401 | false> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
    const isNativeBundle = !!API_BASE;

    const url = isNativeBundle
      ? `${API_BASE}/api/native/push/register`
      : "/api/push/register";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isNativeBundle && accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ token, platform }),
    });
    if (res.ok) return true;
    if (res.status === 401) return 401;
    return false;
  } catch (e) {
    console.error("[Push] 토큰 전송 실패:", e);
    return false;
  }
}
