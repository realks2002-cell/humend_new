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

/** 출근 사전 알림 스케줄 (출근 2.5시간 전 + 2시간 전) */
export async function scheduleShiftReminders(
  shiftId: string,
  companyName: string,
  startTime: Date
) {
  if (!isNative()) return;

  const twoHalfBefore = new Date(startTime.getTime() - 150 * 60 * 1000);
  const twoHoursBefore = new Date(startTime.getTime() - 120 * 60 * 1000);
  const now = Date.now();

  const notifications = [];

  // 2.5시간 전 사전 알림
  if (twoHalfBefore.getTime() > now) {
    notifications.push({
      id: parseInt(shiftId.replace(/-/g, "").slice(0, 8), 16) + 1,
      title: "출근 준비 알림",
      body: `${companyName} 출근까지 2시간 30분 남았습니다.`,
      schedule: { at: twoHalfBefore },
    });
  }

  // 2시간 전 추적 시작 알림
  if (twoHoursBefore.getTime() > now) {
    notifications.push({
      id: parseInt(shiftId.replace(/-/g, "").slice(0, 8), 16) + 2,
      title: "위치 추적 시작",
      body: `${companyName} 출근 확인을 위해 위치 추적이 시작됩니다.`,
      schedule: { at: twoHoursBefore },
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/** 특정 shift의 예약 알림 취소 */
export async function cancelShiftReminders(shiftId: string) {
  if (!isNative()) return;

  const baseId = parseInt(shiftId.replace(/-/g, "").slice(0, 8), 16);

  await LocalNotifications.cancel({
    notifications: [{ id: baseId + 1 }, { id: baseId + 2 }],
  });
}
