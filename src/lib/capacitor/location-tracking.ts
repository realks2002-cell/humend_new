/**
 * 백그라운드 위치추적 — @capacitor-community/background-geolocation
 * Foreground Service + 200m 지오펜스 도착 감지
 * 도착 후 15분 간격 근무 중 위치추적
 */
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";
import { calcDistanceMeters } from "./geolocation";

// BackgroundGeolocation 플러그인 동적 로드
interface BGLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  bearing: number | null;
  speed: number | null;
  time: number;
  simulated: boolean;
}

interface BGError {
  code: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: WatcherOptions,
    callback: (location: BGLocation | null, error: BGError | null) => void
  ): Promise<string>;
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
let lastSentAt = 0;
let isStarting = false;
let trackingInterval: ReturnType<typeof setInterval> | null = null;
let postArrivalInterval: ReturnType<typeof setInterval> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (isStarting) return false; // 다른 호출이 시작 중
  isStarting = true;

  try {
    // 이전 추적 잔여물 정리 (defensive cleanup)
    clearTimers();

    const plugin = getPlugin();

    let arrived = false;
    lastSentAt = 0;

    async function getPosition() {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return pos;
    }

    function handleArrival() {
      if (arrived) return;
      arrived = true;
      // 30초 보조 폴링 중지
      if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
      }
      callbacks.onArrival();
      startPostArrivalTracking(callbacks, getPosition);
    }

    watcherId = await plugin.addWatcher(
      {
        backgroundMessage: "출근 위치를 확인하고 있습니다.",
        backgroundTitle: "Humend HR 출근 추적",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10,
      },
      (location, error) => {
        if (error || !location) return;
        const now = Date.now();
        if (now - lastSentAt < 20_000) return;
        lastSentAt = now;
        callbacks.onLocation(location.latitude, location.longitude, location.speed, location.accuracy);
        if (!arrived) {
          const dist = calcDistanceMeters(location.latitude, location.longitude, targetLat, targetLng);
          if (dist <= geofenceRadius) {
            handleArrival();
          }
        }
      }
    );

    // 보조 폴링 (30초) — 정지 상태에서 distanceFilter 미달 시에도 갱신
    trackingInterval = setInterval(async () => {
      try {
        const pos = await getPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 중복 방지: 네이티브 콜백과 20초 이내 중복이면 스킵
        const now = Date.now();
        if (now - lastSentAt < 20_000) return;
        lastSentAt = now;

        callbacks.onLocation(lat, lng, pos.coords.speed, pos.coords.accuracy);

        if (!arrived) {
          const dist = calcDistanceMeters(lat, lng, targetLat, targetLng);
          if (dist <= geofenceRadius) {
            handleArrival();
          }
        }
      } catch (err) {
        callbacks.onError?.(err);
      }
    }, 30_000);

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

    autoStopTimer = setTimeout(() => {
      stopTracking();
    }, autoStopMs);

    return true;
  } catch {
    return false;
  } finally {
    isStarting = false;
  }
}

function startPostArrivalTracking(
  callbacks: TrackingCallbacks,
  getPosition: () => Promise<{ coords: { latitude: number; longitude: number; speed: number | null; accuracy: number } }>,
) {
  postArrivalInterval = setInterval(async () => {
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
}

function clearTimers() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (postArrivalInterval) {
    clearInterval(postArrivalInterval);
    postArrivalInterval = null;
  }
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
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
  lastSentAt = 0;
  isStarting = false;

  clearTimers();
}

/** 추적 중인지 여부 */
export function isTracking(): boolean {
  return watcherId !== null;
}
