"use client";

import { useEffect, useRef } from "react";
import { isNative } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";
import {
  startGeofenceWatch,
  startDepartureWatch,
  isWatching,
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

export function useAttendance() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isNative() || startedRef.current) return;
    startedRef.current = true;

    let mounted = true;

    (async () => {
      console.log("[Attendance] 시작");
      const initToken = await getAccessToken();
      console.log("[Attendance] 토큰:", initToken ? "있음" : "없음");
      if (!initToken || !mounted) return;

      // 오늘 근무 조회
      const res = await fetch(`${API_BASE}/api/native/attendance/today`, {
        headers: { Authorization: `Bearer ${initToken}` },
      });
      const data = await res.json();
      const shift = data?.shift;
      console.log("[Attendance] shift:", shift ? `${shift.id} / ${shift.arrival_status}` : "없음");

      if (!shift || !mounted) return;

      // 이미 도착했거나 노쇼면 지오펜스 불필요... 가 아니라
      // arrived면 이탈 감지 watch 시작
      if (shift.arrival_status === "noshow") { console.log("[Attendance] noshow → 종료"); return; }

      const client = shift.clients as {
        latitude: number | null;
        longitude: number | null;
      };
      console.log("[Attendance] 좌표:", client?.latitude, client?.longitude);
      if (!client?.latitude || !client?.longitude) { console.log("[Attendance] 좌표 없음 → 종료"); return; }
      if (isWatching()) { console.log("[Attendance] 이미 watch 중 → 종료"); return; }
      console.log("[Attendance] 지오펜싱 시작!");

      if (shift.arrival_status === "arrived") {
        // 이미 출근한 상태 → 이탈 감지 watch 시작
        // 현재 이탈 중인지 확인
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
              callApi(
                "/api/native/attendance/depart",
                { shiftId: shift.id, lat, lng }
              ).catch(console.error);
            },
            onReturned: () => {
              callApi(
                "/api/native/attendance/return",
                { shiftId: shift.id }
              ).catch(console.error);
            },
            onError: (code) => {
              console.error("[Attendance] departure watch error:", code);
            },
          },
          alreadyDeparted
        );
        return;
      }

      // pending/notified/confirmed → 출근 감지 + 이탈 감지 통합 watch
      await startGeofenceWatch(client.latitude, client.longitude, {
        onNearby: (_lat, _lng) => {
          callApi(
            "/api/native/attendance/nearby",
            { shiftId: shift.id }
          ).catch(console.error);
        },
        onArrived: (lat, lng) => {
          callApi(
            "/api/native/attendance/arrive",
            { shiftId: shift.id, lat, lng }
          ).catch(console.error);
          // arrived 후에도 watch가 계속 유지됨 (이탈 감지)
        },
        onDeparted: (lat, lng) => {
          callApi(
            "/api/native/attendance/depart",
            { shiftId: shift.id, lat, lng }
          ).catch(console.error);
        },
        onReturned: () => {
          callApi(
            "/api/native/attendance/return",
            { shiftId: shift.id }
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
