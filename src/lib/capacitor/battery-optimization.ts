import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Android 배터리 최적화 예외 설정 안내
 * 백그라운드 위치 추적이 정상 작동하려면 배터리 최적화 예외가 필요
 */
export async function showBatteryOptimizationGuide(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  // 네이티브 alert 사용 (별도 Dialog 플러그인 불필요)
  window.alert(
    "출근 위치 추적이 정상적으로 작동하려면 배터리 최적화 예외 설정이 필요합니다.\n\n" +
      "설정 > 앱 > 휴멘드HR > 배터리 > 제한 없음\n\n" +
      "위 경로에서 배터리 최적화를 해제해 주세요."
  );
}

/**
 * 배터리 최적화 상태 확인 (App 플러그인 사용)
 * @returns 앱 정보 (배터리 최적화 직접 확인 API 없으므로 앱 상태 반환)
 */
export async function checkBatteryOptimization(): Promise<{
  isNative: boolean;
  isAndroid: boolean;
}> {
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = Capacitor.getPlatform() === "android";

  if (isNative) {
    const appState = await App.getState();
    console.log("[battery-optimization] App active:", appState.isActive);
  }

  return { isNative, isAndroid };
}
