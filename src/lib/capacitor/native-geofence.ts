import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

interface NativeGeofencePlugin {
  register(options: {
    latitude: number;
    longitude: number;
    radius: number;
    identifier: string;
  }): Promise<{ success: boolean }>;
  remove(options: { identifier: string }): Promise<{ success: boolean }>;
  removeAll(): Promise<{ success: boolean }>;
  setAuthToken(options: { token: string }): Promise<{ success: boolean }>;
  addListener(
    eventName: "geofenceEnter",
    callback: (data: { identifier: string }) => void
  ): Promise<{ remove: () => void }>;
}

let plugin: NativeGeofencePlugin | null = null;

function getPlugin(): NativeGeofencePlugin {
  if (!plugin) {
    plugin = registerPlugin<NativeGeofencePlugin>("NativeGeofence");
  }
  return plugin;
}

/**
 * 근무지에 OS 네이티브 지오펜스 등록 (2km 반경)
 * 앱이 종료돼도 OS가 진입을 감지함
 */
export async function registerWorkplaceGeofence(
  lat: number,
  lng: number,
  shiftId: string
): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const p = getPlugin();
    await p.register({
      latitude: lat,
      longitude: lng,
      radius: 2000, // 2km
      identifier: `shift_${shiftId}`,
    });
    console.log("[NativeGeofence] 등록:", shiftId);
    return true;
  } catch (e) {
    console.error("[NativeGeofence] 등록 실패:", e);
    return false;
  }
}

/**
 * 네이티브 저장소에 인증 토큰 저장 (백그라운드 API 호출용)
 */
export async function setNativeAuthToken(token: string): Promise<void> {
  if (!isNative()) return;
  try {
    await getPlugin().setAuthToken({ token });
  } catch (e) {
    console.error("[NativeGeofence] 토큰 저장 실패:", e);
  }
}

/**
 * 특정 근무지 지오펜스 제거
 */
export async function removeWorkplaceGeofence(shiftId: string): Promise<void> {
  if (!isNative()) return;
  try {
    await getPlugin().remove({ identifier: `shift_${shiftId}` });
  } catch {}
}

/**
 * 전체 근무지 지오펜스 제거
 */
export async function removeAllWorkplaceGeofences(): Promise<void> {
  if (!isNative()) return;
  try {
    await getPlugin().removeAll();
  } catch {}
}

/**
 * 지오펜스 진입 이벤트 리스너 등록
 * OS가 2km 진입을 감지하면 콜백 실행
 */
export async function onGeofenceEnter(
  callback: (shiftId: string) => void
): Promise<{ remove: () => void } | null> {
  if (!isNative()) return null;
  try {
    const p = getPlugin();
    return await p.addListener("geofenceEnter", (data) => {
      const shiftId = data.identifier.replace("shift_", "");
      console.log("[NativeGeofence] 진입 감지:", shiftId);
      callback(shiftId);
    });
  } catch {
    return null;
  }
}
