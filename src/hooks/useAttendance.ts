"use client";

import { useEffect, useRef } from "react";
import { isNative } from "@/lib/capacitor/native";
import {
  startGeofenceWatch,
  stopGeofenceWatch,
  isWatching,
} from "@/lib/capacitor/geofence";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAccessToken(): Promise<string | null> {
  try {
    // @ts-expect-error — 네이티브 전용 모듈, 웹 빌드에서는 catch로 처리
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "access_token" });
    return value;
  } catch {
    return null;
  }
}

async function callApi(
  path: string,
  body: Record<string, unknown>,
  token: string
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function useAttendance() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isNative() || startedRef.current) return;
    startedRef.current = true;

    let mounted = true;

    (async () => {
      const token = await getAccessToken();
      if (!token || !mounted) return;

      // 오늘 근무 조회
      const res = await fetch(`${API_BASE}/api/native/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const shift = data?.shift;

      if (!shift || !mounted) return;

      // confirmed 상태일 때만 지오펜스 시작
      if (shift.arrival_status !== "confirmed") return;

      const client = shift.clients as {
        latitude: number | null;
        longitude: number | null;
      };
      if (!client?.latitude || !client?.longitude) return;
      if (isWatching()) return;

      await startGeofenceWatch(client.latitude, client.longitude, {
        onNearby: (_lat, _lng) => {
          callApi(
            "/api/native/attendance/nearby",
            { shiftId: shift.id },
            token
          ).catch(console.error);
        },
        onArrived: (lat, lng) => {
          callApi(
            "/api/native/attendance/arrive",
            { shiftId: shift.id, lat, lng },
            token
          ).catch(console.error);
        },
        onError: (code) => {
          console.error("[Attendance] geofence error:", code);
        },
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);
}
