/**
 * Capacitor 네이티브 앱 전용 — 위치추적 API Bridge
 * Android 백그라운드 WebView throttling 방지를 위해 CapacitorHttp 사용
 */
import { CapacitorHttp } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAuthToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  return session.access_token;
}

/** 오늘 근무 배정 조회 */
export async function fetchTodayShift() {
  const token = await getAuthToken();
  const res = await CapacitorHttp.get({
    url: `${API_BASE}/api/native/location/shift`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

/** 위치 로그 전송 */
export async function sendLocationLog(payload: {
  shiftId: string;
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  recordedAt?: string;
}) {
  const token = await getAuthToken();
  const res = await CapacitorHttp.post({
    url: `${API_BASE}/api/native/location/log`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });
  return res.data;
}

/** 수동 도착 확인 */
export async function confirmArrival(payload: {
  shiftId: string;
  lat?: number;
  lng?: number;
}) {
  const token = await getAuthToken();
  const res = await CapacitorHttp.post({
    url: `${API_BASE}/api/native/location/arrive`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });
  return res.data;
}

/** 위치 수집 동의 업데이트 (Supabase 직접 호출이므로 fetch 그대로 사용) */
export async function updateLocationConsent(shiftId: string, consent: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_shifts")
    .update({ location_consent: consent })
    .eq("id", shiftId);

  if (error) return { error: error.message };
  return { success: true };
}
