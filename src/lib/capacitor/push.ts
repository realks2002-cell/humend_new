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

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      console.log("[Push] FCM token:", token.value);
      resolve(token.value);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] 등록 실패:", err);
      resolve(null);
    });
  });
}

/** 알림 탭 리스너 — 출근 의사 확인 + URL 이동 */
export function setupPushListeners() {
  // 푸시 수신 시 (포그라운드/백그라운드) — 지오펜싱 재시작
  PushNotifications.addListener(
    "pushNotificationReceived",
    async () => {
      console.log("[Push] 알림 수신 → 지오펜싱 재시작");
      try {
        const { checkAndStartGeofence } = await import("@/hooks/useAttendance");
        await checkAndStartGeofence();
      } catch (e) {
        console.error("[Push] 지오펜싱 재시작 실패:", e);
      }
    }
  );

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    async (notification) => {
      const data = notification.notification.data;

      // 출근 의사 확인 알림 탭
      if (data?.action === "confirm_attendance" && data?.shiftId) {
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
      }

      // 지오펜싱 재시작 (알림 터치 시)
      try {
        const { checkAndStartGeofence } = await import("@/hooks/useAttendance");
        await checkAndStartGeofence();
      } catch {}

      // URL 이동
      const url = data?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
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
