import { Capacitor } from "@capacitor/core";

/**
 * Android 배터리 최적화 예외 요청
 * REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 인텐트로 시스템 다이얼로그 표시
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const packageName = info.id;

    // 이미 제외 상태인지 확인 후, 아니면 시스템 다이얼로그 표시
    // Capacitor Browser 플러그인으로 설정 화면 열기
    const { Browser } = await import("@capacitor/browser");

    const confirmed = window.confirm(
      "출근 확인이 정상 작동하려면 배터리 최적화 예외 설정이 필요합니다.\n\n" +
      "다음 화면에서 '제한 없음'을 선택해주세요."
    );

    if (confirmed) {
      await Browser.open({
        url: `intent://settings/battery_saver_menu#Intent;scheme=android-app;package=com.android.settings;S.extra_args=com.humend.hr;end`,
      }).catch(async () => {
        // fallback: 앱 배터리 설정 직접 열기
        await Browser.open({
          url: `market://details?id=${packageName}`,
        }).catch(() => {
          window.alert(
            "설정 → 앱 → Humend HR → 배터리 → 제한 없음\n\n" +
            "위 경로에서 직접 설정해주세요."
          );
        });
      });
    }
  } catch {
    window.alert(
      "설정 → 앱 → Humend HR → 배터리 → 제한 없음\n\n" +
      "위 경로에서 배터리 최적화를 해제해주세요."
    );
  }
}
