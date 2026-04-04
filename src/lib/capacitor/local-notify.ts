/**
 * 로컬 알림 — FCM 이중 안전장치
 * 백그라운드에서 FCM 미수신 시 로컬 알림으로 대체
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "./native";

/** 로컬 알림 권한 요청 */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;

  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

/** 즉시 로컬 알림 발송 */
export async function showLocalNotification(title: string, body: string) {
  if (!isNative()) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 1000) },
      },
    ],
  });
}

