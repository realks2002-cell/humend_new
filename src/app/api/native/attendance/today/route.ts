import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/native/attendance/today
 * 오늘 배정된 근무 + 고객사 좌표 반환
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

  const now = new Date();
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: shifts } = await admin
    .from("daily_shifts")
    .select(`
      id, work_date, start_time, end_time, arrival_status,
      arrived_at, confirmed_at, nearby_at,
      alert_minutes_before, alert_interval_minutes, alert_max_count,
      notification_sent_count,
      clients (company_name, location, latitude, longitude)
    `)
    .eq("member_id", user.id)
    .eq("work_date", today)
    .order("start_time", { ascending: true });

  const { data: member } = await admin
    .from("members")
    .select("api_key")
    .eq("id", user.id)
    .single();
  const apiKey = member?.api_key ?? null;

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ shift: null, apiKey });
  }

  const pending = shifts.find(
    (s) => s.arrival_status !== "arrived" && s.arrival_status !== "noshow"
  );
  if (pending) {
    return NextResponse.json({ shift: pending, apiKey });
  }

  const arrived = [...shifts]
    .reverse()
    .find((s) => s.arrival_status === "arrived");
  return NextResponse.json({ shift: arrived ?? null, apiKey });
}
