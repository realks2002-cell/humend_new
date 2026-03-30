/**
 * 지오펜싱 — 2km 접근 감지 + 30m 출근 확인 + 500m 이탈 감지
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
let nearbyTriggered = false;
let arrivedTriggered = false;
let departedState = false;
let departDebounceCount = 0;

const NEARBY_RADIUS = 2000; // 2km
const ARRIVAL_RADIUS = 30; // 30m
const DEPARTURE_RADIUS = 500; // 500m
const DISTANCE_FILTER = 200; // 200m (이탈 감지를 위해 500→200으로 축소)
const MAX_ACCURACY = 100; // 100m 이하만 수용
const DEPART_DEBOUNCE = 2; // 연속 2회 이상 500m 초과 시 이탈 판정

export interface GeofenceCallbacks {
  onNearby: (lat: number, lng: number) => void;
  onArrived: (lat: number, lng: number) => void;
  onDeparted?: (lat: number, lng: number) => void;
  onReturned?: () => void;
  onError?: (error: string) => void;
}

export async function startGeofenceWatch(
  clientLat: number,
  clientLng: number,
  callbacks: GeofenceCallbacks
): Promise<boolean> {
  if (!isNative()) return false;
  if (watcherId) await stopGeofenceWatch();

  nearbyTriggered = false;
  arrivedTriggered = false;
  departedState = false;
  departDebounceCount = 0;

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
          callbacks.onError?.(error.code);
          return;
        }
        if (!location) return;

        // 정확도 필터
        if (location.accuracy > MAX_ACCURACY) return;

        const dist = haversineMeters(
          location.latitude,
          location.longitude,
          clientLat,
          clientLng
        );

        if (!arrivedTriggered) {
          // ─── 출근 전: 접근 + 도착 감지 ───

          // 30m 이내 → 출근 확인 (watch 계속 유지)
          if (dist <= ARRIVAL_RADIUS) {
            arrivedTriggered = true;
            departDebounceCount = 0;
            callbacks.onArrived(location.latitude, location.longitude);
            return;
          }

          // 2km 이내 → 접근 감지 (1회)
          if (!nearbyTriggered && dist <= NEARBY_RADIUS) {
            nearbyTriggered = true;
            callbacks.onNearby(location.latitude, location.longitude);
          }
        } else {
          // ─── 출근 후: 이탈/복귀 감지 ───

          if (!departedState) {
            // 근무 중 — 500m 이상 이탈 감지 (debounce)
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
            // 이탈 중 — 500m 이내 복귀 감지
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
  alreadyDeparted = false
): Promise<boolean> {
  if (!isNative()) return false;
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
        if (location.accuracy > MAX_ACCURACY) return;

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
    nearbyTriggered = false;
    arrivedTriggered = false;
    departedState = false;
    departDebounceCount = 0;
  }
}

export function isWatching(): boolean {
  return watcherId !== null;
}
