import { PushNotifications } from "@capacitor/push-notifications";

/** 푸시 권한 요청 + FCM 토큰 반환 */
export async function registerPush(): Promise<string | null> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    console.log("[Push] 권한 거부됨");
    return null;
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

/** 알림 탭 리스너 — data.url이 있으면 해당 페이지로 이동 */
export function setupPushListeners() {
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (notification) => {
      const url = notification.notification.data?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      }
    }
  );
}

/** 서버에 FCM 토큰 전송. 성공 시 true, 인증 실패 시 401, 그 외 실패 시 false 반환 */
export async function sendTokenToServer(
  token: string,
  platform: string
): Promise<true | 401 | false> {
  try {
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
