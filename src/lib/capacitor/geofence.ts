/**
 * 지오펜싱 — 5km 접근 + 2km 근접 + 300m 출근 + 500m 이탈 감지
 * @capacitor-community/background-geolocation 플러그인 사용 (백그라운드 동작)
 */
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

// ─── 플러그인 인터페이스 ───

interface BGLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  time: number;
}

interface BGError {
  code: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: Record<string, unknown>,
    callback: (location: BGLocation | undefined, error: BGError | undefined) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

let plugin: BackgroundGeolocationPlugin | null = null;

function getPlugin(): BackgroundGeolocationPlugin {
  if (!plugin) {
    plugin = registerPlugin<BackgroundGeolocationPlugin>(
      "BackgroundGeolocation"
    );
  }
  return plugin;
}

// ─── Haversine 거리 계산 ───

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 상태 ───

let watcherId: string | null = null;
let approachingTriggered = false;
let nearbyTriggered = false;
let arrivedTriggered = false;
let departedState = false;
let departDebounceCount = 0;
let lastArrivedAttempt = 0;
const ARRIVED_DEBOUNCE_MS = 5000; // 5초 내 중복 arrive 호출 방지

const APPROACHING_RADIUS = 5000; // 5km
const NEARBY_RADIUS = 2000; // 2km
const ARRIVAL_RADIUS = 300; // 300m (서버 재검증 시 300m 기준)
const DEPARTURE_RADIUS = 500; // 500m
const DISTANCE_FILTER = 50; // 50m (정지 상태에서도 업데이트 빈도 증가)
const MAX_ACCURACY_FAR = 500; // 5km 접근: 500m 이하
const MAX_ACCURACY_MID = 400; // 2km 근접, 500m 이탈: 400m 이하
const MAX_ACCURACY_NEAR = 300; // 300m 출근: 300m 이하 (서버 이중 검증)
const DEPART_DEBOUNCE = 2; // 연속 2회 이상 500m 초과 시 이탈 판정
const DEPARTURE_TRACKING_MS = 60 * 60 * 1000; // 출근 시간 후 1시간만 이탈 추적

export interface GeofenceCallbacks {
  onApproaching?: (lat: number, lng: number) => void;
  onNearby: (lat: number, lng: number) => void;
  onArrived: (lat: number, lng: number) => void;
  onDeparted?: (lat: number, lng: number) => void;
  onReturned?: () => void;
  onError?: (error: string) => void;
}

/** 이탈 추적 종료 시간 (출근 시간 + 1시간). null이면 추적 계속 */
let departureTrackingEndMs: number | null = null;

export async function startGeofenceWatch(
  clientLat: number,
  clientLng: number,
  callbacks: GeofenceCallbacks,
  shiftStartIso?: string
): Promise<boolean> {
  if (!isNative()) return false;
  if (watcherId) await stopGeofenceWatch();

  approachingTriggered = false;
  nearbyTriggered = false;
  arrivedTriggered = false;
  departedState = false;
  departDebounceCount = 0;
  lastArrivedAttempt = 0;
  departureTrackingEndMs = shiftStartIso
    ? new Date(shiftStartIso).getTime() + DEPARTURE_TRACKING_MS
    : null;

  try {
    const bgPlugin = getPlugin();

    watcherId = await bgPlugin.addWatcher(
      {
        backgroundMessage: "출근 확인을 위해 위치를 사용 중입니다.",
        backgroundTitle: "휴멘드 출근확인",
        requestPermissions: true,
        stale: false,
        distanceFilter: DISTANCE_FILTER,
      },
      (location, error) => {
        if (error) {
          console.log("[Geofence] 에러:", error.code);
          callbacks.onError?.(error.code);
          return;
        }
        if (!location) return;

        console.log(`[Geofence] 위치: ${location.latitude.toFixed(4)},${location.longitude.toFixed(4)} acc=${location.accuracy.toFixed(0)}m`);

        const acc = location.accuracy;
        const dist = haversineMeters(
          location.latitude,
          location.longitude,
          clientLat,
          clientLng
        );

        console.log(`[Geofence] 거리: ${dist.toFixed(0)}m, 정확도: ${acc.toFixed(0)}m`);

        if (!arrivedTriggered) {
          // ─── 출근 전: 5km → 2km → 300m 순서로 체크 ───

          // 5km 이내 → 접근 감지 (1회, 정확도 500m 이하)
          if (!approachingTriggered && dist <= APPROACHING_RADIUS && acc <= MAX_ACCURACY_FAR) {
            approachingTriggered = true;
            callbacks.onApproaching?.(location.latitude, location.longitude);
          }

          // 2km 이내 → 근접 감지 (1회, 정확도 400m 이하)
          if (!nearbyTriggered && dist <= NEARBY_RADIUS && acc <= MAX_ACCURACY_MID) {
            nearbyTriggered = true;
            callbacks.onNearby(location.latitude, location.longitude);
          }

          // 300m 이내 → 출근 확인 (정확도 300m 이하, 서버 이중 검증)
          if (dist <= ARRIVAL_RADIUS && acc <= MAX_ACCURACY_NEAR) {
            const now = Date.now();
            if (now - lastArrivedAttempt > ARRIVED_DEBOUNCE_MS) {
              lastArrivedAttempt = now;
              departDebounceCount = 0;
              callbacks.onArrived(location.latitude, location.longitude);
            }
          }
        } else {
          // ─── 출근 후: 이탈/복귀 감지 (정확도 400m 이하) ───
          if (acc > MAX_ACCURACY_MID) return;

          // 출근 시간 후 1시간 경과 → watcher 자체 중단 (배터리 절약)
          if (departureTrackingEndMs !== null && Date.now() > departureTrackingEndMs) {
            console.log("[Geofence] 이탈 추적 시간 종료 → watcher 중단");
            stopGeofenceWatch();
            return;
          }

          if (!departedState) {
            if (dist > DEPARTURE_RADIUS) {
              departDebounceCount++;
              if (departDebounceCount >= DEPART_DEBOUNCE) {
                departedState = true;
                departDebounceCount = 0;
                callbacks.onDeparted?.(location.latitude, location.longitude);
              }
            } else {
              departDebounceCount = 0;
            }
          } else {
            if (dist <= DEPARTURE_RADIUS) {
              departedState = false;
              departDebounceCount = 0;
              callbacks.onReturned?.();
            }
          }
        }
      }
    );

    return true;
  } catch (e) {
    console.error("[Geofence] start error:", e);
    return false;
  }
}

/** arrived 상태에서 이탈 감지 watch 시작 (앱 재시작 시 사용) */
export async function startDepartureWatch(
  clientLat: number,
  clientLng: number,
  callbacks: Pick<GeofenceCallbacks, "onDeparted" | "onReturned" | "onError">,
  alreadyDeparted = false,
  shiftStartIso?: string
): Promise<boolean> {
  if (!isNative()) return false;

  // 출근 시간 후 1시간 경과면 이탈 추적 시작 안 함
  if (shiftStartIso) {
    const endMs = new Date(shiftStartIso).getTime() + DEPARTURE_TRACKING_MS;
    if (Date.now() > endMs) {
      console.log("[Geofence] 이탈 추적 시간 종료 → watch 시작 안 함");
      return false;
    }
    departureTrackingEndMs = endMs;
  } else {
    departureTrackingEndMs = null;
  }

  if (watcherId) await stopGeofenceWatch();

  nearbyTriggered = true;
  arrivedTriggered = true;
  departedState = alreadyDeparted;
  departDebounceCount = 0;

  try {
    const bgPlugin = getPlugin();

    watcherId = await bgPlugin.addWatcher(
      {
        backgroundMessage: "근무 중 위치를 확인하고 있습니다.",
        backgroundTitle: "휴멘드 근무확인",
        requestPermissions: true,
        stale: false,
        distanceFilter: DISTANCE_FILTER,
      },
      (location, error) => {
        if (error) {
          callbacks.onError?.(error.code);
          return;
        }
        if (!location) return;
        if (location.accuracy > MAX_ACCURACY_MID) return;

        // 출근 시간 후 1시간 경과 → watcher 자체 중단 (배터리 절약)
        if (departureTrackingEndMs !== null && Date.now() > departureTrackingEndMs) {
          console.log("[Geofence] 이탈 추적 시간 종료 → watcher 중단");
          stopGeofenceWatch();
          return;
        }

        const dist = haversineMeters(
          location.latitude,
          location.longitude,
          clientLat,
          clientLng
        );

        if (!departedState) {
          if (dist > DEPARTURE_RADIUS) {
            departDebounceCount++;
            if (departDebounceCount >= DEPART_DEBOUNCE) {
              departedState = true;
              departDebounceCount = 0;
              callbacks.onDeparted?.(location.latitude, location.longitude);
            }
          } else {
            departDebounceCount = 0;
          }
        } else {
          if (dist <= DEPARTURE_RADIUS) {
            departedState = false;
            departDebounceCount = 0;
            callbacks.onReturned?.();
          }
        }
      }
    );

    return true;
  } catch (e) {
    console.error("[Geofence] departure watch error:", e);
    return false;
  }
}

export async function stopGeofenceWatch(): Promise<void> {
  if (!watcherId) return;

  try {
    const bgPlugin = getPlugin();
    await bgPlugin.removeWatcher({ id: watcherId });
  } catch (e) {
    console.error("[Geofence] stop error:", e);
  } finally {
    watcherId = null;
    approachingTriggered = false;
    nearbyTriggered = false;
    arrivedTriggered = false;
    departedState = false;
    departDebounceCount = 0;
    lastArrivedAttempt = 0;
  }
}

export function isWatching(): boolean {
  return watcherId !== null;
}

/** arrive API 성공 시 호출 — 이탈 감지 모드로 전환 */
export function setArrivedState(): void {
  arrivedTriggered = true;
  departedState = false;
  departDebounceCount = 0;
}
