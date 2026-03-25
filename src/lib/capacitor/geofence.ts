/**
 * 지오펜싱 — 2km 접근 감지 + 30m 출근 확인
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

const NEARBY_RADIUS = 2000; // 2km
const ARRIVAL_RADIUS = 30; // 30m
const DISTANCE_FILTER = 500; // 500m 고정
const MAX_ACCURACY = 100; // 100m 이하만 수용

export interface GeofenceCallbacks {
  onNearby: (lat: number, lng: number) => void;
  onArrived: (lat: number, lng: number) => void;
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

  try {
    const bgPlugin = getPlugin();

    watcherId = await bgPlugin.addWatcher(
      {
        backgroundMessage: "출근 확인을 위해 위치를 사용 중입니다.",
        backgroundTitle: "휴먼드 출근확인",
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

        // 30m 이내 → 출근 확인 + watch 중단
        if (dist <= ARRIVAL_RADIUS) {
          callbacks.onArrived(location.latitude, location.longitude);
          stopGeofenceWatch();
          return;
        }

        // 2km 이내 → 접근 감지 (1회)
        if (!nearbyTriggered && dist <= NEARBY_RADIUS) {
          nearbyTriggered = true;
          callbacks.onNearby(location.latitude, location.longitude);
        }
      }
    );

    return true;
  } catch (e) {
    console.error("[Geofence] start error:", e);
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
  }
}

export function isWatching(): boolean {
  return watcherId !== null;
}
