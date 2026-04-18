"use client";

import { useEffect, useRef } from "react";
import { isNative } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";
import {
  startGeofenceWatch,
  startDepartureWatch,
  stopGeofenceWatch,
  isWatching,
  setArrivedState,
} from "@/lib/capacitor/geofence";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function callApi(
  path: string,
  body: Record<string, unknown>
) {
  const token = await getAccessToken();
  if (!token) return null;
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

export async function checkAndStartGeofence(overrideToken?: string) {
  console.log("[Attendance] 체크 시작");

  // 포그라운드 복귀 시 기존 watcher 중단 후 재시작
  if (isWatching()) {
    console.log("[Attendance] 기존 watch 중단 후 재시작");
    await stopGeofenceWatch();
  }

  const initToken = overrideToken ?? await getAccessToken();
  console.log("[Attendance] 토큰:", initToken ? "있음" : "없음");
  if (!initToken) return;

  const res = await fetch(`${API_BASE}/api/native/attendance/today`, {
    headers: { Authorization: `Bearer ${initToken}` },
  });
  const data = await res.json();
  const shift = data?.shift;
  const apiKey = data?.apiKey;
  console.log("[Attendance] shift:", shift ? `${shift.id} / ${shift.arrival_status}` : "없음");

  // 네이티브 저장소에 API Key 저장 (만료 없는 영구 인증)
  if (apiKey) {
    try {
      const { setNativeApiKey } = await import("@/lib/capacitor/native-geofence");
      await setNativeApiKey(apiKey);
    } catch {}
  }

  if (!shift) return;

  if (shift.arrival_status === "noshow") {
    console.log("[Attendance] noshow → 종료");
    return;
  }

  const client = shift.clients as {
    latitude: number | null;
    longitude: number | null;
  };
  console.log("[Attendance] 좌표:", client?.latitude, client?.longitude);
  if (!client?.latitude || !client?.longitude) {
    console.log("[Attendance] 좌표 없음 → 종료");
    return;
  }

  // 위치 권한 체크
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    console.log("[Attendance] 위치 권한:", JSON.stringify(perm));
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      const req = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (req.location !== "granted" && req.coarseLocation !== "granted") {
        console.log("[Attendance] 위치 권한 거부 → 설정 유도");
        const { Browser } = await import("@capacitor/browser");
        const confirmed = window.confirm(
          "출근 확인을 위해 위치 권한이 필요합니다.\n\n" +
          "설정 → 앱 → Humend HR → 권한 → 위치 → '항상 허용'으로 변경해주세요."
        );
        if (confirmed) {
          await Browser.open({ url: "app-settings:" });
        }
        return;
      }
    }
  } catch (e) {
    console.error("[Attendance] 권한 체크 에러:", e);
  }

  console.log("[Attendance] 지오펜싱 시작!");

  // 네이티브 저장소에 토큰 갱신 (백그라운드 nearby API 호출용)
  try {
    const { setNativeAuthToken } = await import("@/lib/capacitor/native-geofence");
    await setNativeAuthToken(initToken);
  } catch {}

  // OS 네이티브 지오펜스 등록 (앱 종료 후에도 2km 진입 감지)
  try {
    const { registerWorkplaceGeofence } = await import("@/lib/capacitor/native-geofence");
    await registerWorkplaceGeofence(client.latitude, client.longitude, shift.id);
  } catch (e) {
    console.warn("[Attendance] 네이티브 지오펜스 등록 실패:", e);
  }

  // WorkManager 주기 백업 시작 (15분, 앱 종료돼도 OS가 실행)
  try {
    const { startPeriodicLocationBackup } = await import("@/lib/capacitor/native-geofence");
    await startPeriodicLocationBackup();
  } catch {}

  // 출근 시간 ISO (KST) — 이탈 추적 1시간 제한용
  const shiftStartIso = shift.work_date && shift.start_time
    ? `${shift.work_date}T${shift.start_time}+09:00`
    : undefined;

  if (shift.arrival_status === "arrived") {
    const supabase = createClient();
    const { data: openDeparture } = await supabase
      .from("departure_logs")
      .select("id")
      .eq("shift_id", shift.id)
      .is("returned_at", null)
      .limit(1);

    const alreadyDeparted = (openDeparture?.length ?? 0) > 0;

    await startDepartureWatch(
      client.latitude,
      client.longitude,
      {
        onDeparted: (lat, lng) => {
          callApi("/api/native/attendance/depart", { shiftId: shift.id, lat, lng }).catch(console.error);
        },
        onReturned: () => {
          callApi("/api/native/attendance/return", { shiftId: shift.id }).catch(console.error);
        },
        onError: (code) => {
          console.error("[Attendance] departure watch error:", code);
        },
      },
      alreadyDeparted,
      shiftStartIso
    );
    return;
  }

  // pending/notified/confirmed → 출근 감지 + 이탈 감지 통합 watch
  await startGeofenceWatch(client.latitude, client.longitude, {
    onApproaching: (_lat, _lng) => {
      callApi("/api/native/attendance/approaching", { shiftId: shift.id }).catch(console.error);
    },
    onNearby: (_lat, _lng) => {
      callApi("/api/native/attendance/nearby", { shiftId: shift.id }).catch(console.error);
    },
    onArrived: (lat, lng) => {
      callApi("/api/native/attendance/arrive", { shiftId: shift.id, lat, lng })
        .then((result) => {
          if (result?.success) {
            setArrivedState();
            console.log("[Attendance] 출근 확인 성공 → 이탈 감지 모드 전환");
          } else {
            console.log("[Attendance] 출근 확인 실패 (거리 초과) → 재시도 대기");
          }
        })
        .catch(console.error);
    },
    onDeparted: (lat, lng) => {
      callApi("/api/native/attendance/depart", { shiftId: shift.id, lat, lng }).catch(console.error);
    },
    onReturned: () => {
      callApi("/api/native/attendance/return", { shiftId: shift.id }).catch(console.error);
    },
    onError: (code) => {
      console.error("[Attendance] geofence error:", code);
    },
  }, shiftStartIso);
}

export function useAttendance() {
  const listenerRef = useRef(false);

  useEffect(() => {
    if (!isNative()) return;

    // 앱 시작 시 1회 체크
    checkAndStartGeofence();

    if (!listenerRef.current) {
      listenerRef.current = true;

      // 앱이 포그라운드로 돌아올 때마다 재체크
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            checkAndStartGeofence();
          }
        });
      });

      // OS 네이티브 지오펜스 진입 시 JS 정밀 추적 시작
      import("@/lib/capacitor/native-geofence").then(({ onGeofenceEnter }) => {
        onGeofenceEnter(() => {
          console.log("[Attendance] 네이티브 지오펜스 진입 → JS 추적 시작");
          checkAndStartGeofence();
        });
      }).catch(() => {});
    }
  }, []);
}
