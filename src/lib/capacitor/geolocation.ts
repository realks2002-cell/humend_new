/**
 * Capacitor Geolocation — 권한 요청 + one-shot 위치 읽기
 */
import { Geolocation, type Position } from "@capacitor/geolocation";
import { isNative } from "./native";

export interface LatLng {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
}

/** 위치 권한 요청 → 현재 위치 반환 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNative()) return false;

  const status = await Geolocation.checkPermissions();
  if (status.location === "granted") return true;

  const result = await Geolocation.requestPermissions();
  return result.location === "granted";
}

/** 현재 위치 one-shot 읽기 */
export async function getCurrentPosition(): Promise<LatLng | null> {
  if (!isNative()) return null;

  try {
    const pos: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      speed: pos.coords.speed ?? undefined,
    };
  } catch {
    return null;
  }
}

/** 두 좌표 간 거리 계산 (미터, Haversine) */
export function calcDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
