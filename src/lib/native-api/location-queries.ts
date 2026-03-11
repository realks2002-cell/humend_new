/**
 * Capacitor 네이티브 앱 전용 — 위치추적 Supabase 직접 쿼리
 */
import { createClient } from "@/lib/supabase/client";
import type { DailyShift, DailyShiftWithDetails } from "@/types/location";

/** 오늘 근무 배정 조회 (RLS 기반) */
export async function getTodayShift(): Promise<DailyShiftWithDetails | null> {
  const supabase = createClient();

  // 한국 시간 기준 오늘
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_shifts")
    .select(
      `
      *,
      clients (
        company_name, location, latitude, longitude, contact_phone
      ),
      members (
        name, phone
      )
    `
    )
    .eq("work_date", dateStr)
    .maybeSingle();

  return data as DailyShiftWithDetails | null;
}

/** 근무 배정 상태 업데이트 (RLS 허용 범위) */
export async function updateShiftStatus(
  shiftId: string,
  updates: Partial<Pick<DailyShift, "arrival_status" | "location_consent" | "tracking_started_at">>
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("daily_shifts")
    .update(updates)
    .eq("id", shiftId);

  return error ? { error: error.message } : { success: true };
}
