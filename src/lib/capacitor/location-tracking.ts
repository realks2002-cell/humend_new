/**
 * 백그라운드 위치추적 — @capacitor-community/background-geolocation
 * Foreground Service + 100m 지오펜스 도착 감지
 */
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";
import { calcDistanceMeters } from "./geolocation";

// BackgroundGeolocation 플러그인 동적 로드
interface BackgroundGeolocationPlugin {
  addWatcher(options: WatcherOptions): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

interface WatcherOptions {
  backgroundMessage: string;
  backgroundTitle: string;
  requestPermissions: boolean;
  stale: boolean;
  distanceFilter: number;
}

let BackgroundGeolocation: BackgroundGeolocationPlugin | null = null;

function getPlugin(): BackgroundGeolocationPlugin {
  if (!BackgroundGeolocation) {
    BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
      "BackgroundGeolocation"
    );
  }
  return BackgroundGeolocation;
}

let watcherId: string | null = null;

export interface TrackingCallbacks {
  onLocation: (lat: number, lng: number, speed: number | null, accuracy: number | null) => void;
  onArrival: () => void;
  onError?: (error: unknown) => void;
}

/**
 * 백그라운드 위치추적 시작
 * @param targetLat 목적지 위도
 * @param targetLng 목적지 경도
 * @param geofenceRadius 도착 판정 반경 (기본 250m)
 */
export async function startTracking(
  targetLat: number,
  targetLng: number,
  callbacks: TrackingCallbacks,
  geofenceRadius = 250
): Promise<boolean> {
  if (!isNative()) return false;
  if (watcherId) return true; // 이미 추적 중

  try {
    const plugin = getPlugin();

    watcherId = await plugin.addWatcher({
      backgroundMessage: "출근 위치를 확인하고 있습니다.",
      backgroundTitle: "Humend HR 출근 추적",
      requestPermissions: true,
      stale: false,
      distanceFilter: 50, // 50m 이동 시마다 콜백
    });

    // 위치 업데이트 콜백은 Capacitor plugin이 자체적으로 처리
    // 여기서는 watcher를 등록하고, 실제 위치 콜백은 native bridge를 통해 전달됨
    // 아래는 간소화된 폴링 방식 (background-geolocation 콜백 대체)
    const intervalId = setInterval(async () => {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed;
        const accuracy = pos.coords.accuracy;

        callbacks.onLocation(lat, lng, speed, accuracy);

        // 100m 지오펜스 체크
        const dist = calcDistanceMeters(lat, lng, targetLat, targetLng);
        if (dist <= geofenceRadius) {
          callbacks.onArrival();
          stopTracking();
          clearInterval(intervalId);
        }
      } catch (err) {
        callbacks.onError?.(err);
      }
    }, 60_000); // 1분 간격

    // intervalId를 전역에 저장해서 stopTracking 시 정리
    (globalThis as Record<string, unknown>).__trackingInterval = intervalId;

    // 2시간 자동 종료 타이머 (배터리 보호)
    const autoStopTimer = setTimeout(() => {
      stopTracking();
    }, 2 * 60 * 60 * 1000); // 2시간
    (globalThis as Record<string, unknown>).__trackingAutoStop = autoStopTimer;

    return true;
  } catch {
    return false;
  }
}

/** 추적 중지 */
export async function stopTracking(): Promise<void> {
  if (!isNative() || !watcherId) return;

  try {
    const plugin = getPlugin();
    await plugin.removeWatcher({ id: watcherId });
  } catch {
    // ignore
  }
  watcherId = null;

  // 폴링 인터벌 정리
  const intervalId = (globalThis as Record<string, unknown>).__trackingInterval;
  if (intervalId) {
    clearInterval(intervalId as ReturnType<typeof setInterval>);
    delete (globalThis as Record<string, unknown>).__trackingInterval;
  }

  // 자동 종료 타이머 정리
  const autoStop = (globalThis as Record<string, unknown>).__trackingAutoStop;
  if (autoStop) {
    clearTimeout(autoStop as ReturnType<typeof setTimeout>);
    delete (globalThis as Record<string, unknown>).__trackingAutoStop;
  }
}

/** 추적 중인지 여부 */
export function isTracking(): boolean {
  return watcherId !== null;
}
