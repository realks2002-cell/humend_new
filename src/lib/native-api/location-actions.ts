/**
 * Capacitor 네이티브 앱 전용 — 위치추적 API Bridge
 */
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

/** 오늘 근무 배정 조회 */
export async function fetchTodayShift() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/location/shift`, {
    method: "GET",
    headers,
  });
  return res.json();
}

/** 위치 로그 전송 */
export async function sendLocationLog(payload: {
  shiftId: string;
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/location/log`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** 수동 도착 확인 */
export async function confirmArrival(payload: {
  shiftId: string;
  lat?: number;
  lng?: number;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/location/arrive`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** 위치 수집 동의 업데이트 */
export async function updateLocationConsent(shiftId: string, consent: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_shifts")
    .update({ location_consent: consent })
    .eq("id", shiftId);

  if (error) return { error: error.message };
  return { success: true };
}
