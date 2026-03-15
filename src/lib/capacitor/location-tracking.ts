/**
 * 백그라운드 위치추적 — @capacitor-community/background-geolocation
 * Foreground Service + 200m 지오펜스 도착 감지
 * 도착 후 15분 간격 근무 중 위치추적
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

const POST_ARRIVAL_INTERVAL_MS = 15 * 60 * 1000; // 15분

/**
 * 백그라운드 위치추적 시작
 * @param targetLat 목적지 위도
 * @param targetLng 목적지 경도
 * @param geofenceRadius 도착 판정 반경 (기본 200m)
 * @param endTime 퇴근 시간 (HH:MM 또는 HH:MM:SS), 이 시간 + 30분 후 자동 종료
 * @param workDate 근무 날짜 (YYYY-MM-DD)
 */
export async function startTracking(
  targetLat: number,
  targetLng: number,
  callbacks: TrackingCallbacks,
  geofenceRadius = 200,
  endTime?: string,
  workDate?: string,
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
      distanceFilter: 50,
    });

    let arrived = false;

    async function getPosition() {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return pos;
    }

    // 출근 전: 1분 간격 폴링
    const intervalId = setInterval(async () => {
      if (arrived) return; // 도착 후에는 별도 인터벌 사용
      try {
        const pos = await getPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        callbacks.onLocation(lat, lng, pos.coords.speed, pos.coords.accuracy);

        const dist = calcDistanceMeters(lat, lng, targetLat, targetLng);
        if (dist <= geofenceRadius) {
          arrived = true;
          clearInterval(intervalId);
          callbacks.onArrival();
          startPostArrivalTracking(callbacks, getPosition);
        }
      } catch (err) {
        callbacks.onError?.(err);
      }
    }, 60_000);

    (globalThis as Record<string, unknown>).__trackingInterval = intervalId;

    // 자동 종료 타이머: endTime + 30분 또는 fallback 2시간
    let autoStopMs = 2 * 60 * 60 * 1000;
    if (endTime && workDate) {
      const endTimeNorm = endTime.length === 5 ? endTime + ":00" : endTime;
      const endDate = new Date(`${workDate}T${endTimeNorm}+09:00`);
      const stopAt = endDate.getTime() + 30 * 60 * 1000; // end_time + 30분
      const remaining = stopAt - Date.now();
      if (remaining > 0) {
        autoStopMs = remaining;
      }
    }

    const autoStopTimer = setTimeout(() => {
      stopTracking();
    }, autoStopMs);
    (globalThis as Record<string, unknown>).__trackingAutoStop = autoStopTimer;

    return true;
  } catch {
    return false;
  }
}

function startPostArrivalTracking(
  callbacks: TrackingCallbacks,
  getPosition: () => Promise<{ coords: { latitude: number; longitude: number; speed: number | null; accuracy: number } }>,
) {
  const postInterval = setInterval(async () => {
    try {
      const pos = await getPosition();
      callbacks.onLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.speed,
        pos.coords.accuracy,
      );
    } catch (err) {
      callbacks.onError?.(err);
    }
  }, POST_ARRIVAL_INTERVAL_MS);

  (globalThis as Record<string, unknown>).__postArrivalInterval = postInterval;
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

  // 근무 중 위치추적 인터벌 정리
  const postInterval = (globalThis as Record<string, unknown>).__postArrivalInterval;
  if (postInterval) {
    clearInterval(postInterval as ReturnType<typeof setInterval>);
    delete (globalThis as Record<string, unknown>).__postArrivalInterval;
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
