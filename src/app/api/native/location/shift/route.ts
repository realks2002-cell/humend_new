import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/native/location/shift
 * 오늘 근무 배정 조회 (고객사 위치 포함)
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 한국 시간 기준 오늘 날짜
  const today = new Date()
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    .replace(/\. /g, "-")
    .replace(/\./g, "");

  // YYYY-MM-DD 형식으로 변환
  const parts = today.split("-");
  const dateStr = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;

  const { data: shift } = await admin
    .from("daily_shifts")
    .select(
      `
      id, client_id, member_id, work_date, start_time, end_time,
      arrival_status, risk_level, arrived_at,
      last_known_lat, last_known_lng, last_seen_at,
      location_consent, tracking_started_at,
      clients (
        company_name, location, latitude, longitude, contact_phone
      )
    `
    )
    .eq("member_id", user.id)
    .eq("work_date", dateStr)
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ shift: null });
  }

  return NextResponse.json({ shift });
}
