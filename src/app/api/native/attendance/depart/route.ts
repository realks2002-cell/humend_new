import { createAdminClient } from "@/lib/supabase/server";
import { authenticateMember } from "@/lib/supabase/member-auth";
import { NextRequest, NextResponse } from "next/server";

const TRACKING_WINDOW_MS = 60 * 60 * 1000; // 출근 시간 후 1시간

export async function POST(req: NextRequest) {
  const memberId = await authenticateMember(req);
  if (!memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { shiftId, lat, lng } = (await req.json()) as {
    shiftId?: string;
    lat?: number;
    lng?: number;
  };

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  const { data: shift } = await admin
    .from("daily_shifts")
    .select("id, member_id, arrival_status, work_date, start_time")
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (shift.arrival_status !== "arrived") {
    return NextResponse.json({ error: "Not arrived yet" }, { status: 422 });
  }

  const shiftStartKst = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
  if (Date.now() > shiftStartKst.getTime() + TRACKING_WINDOW_MS) {
    return NextResponse.json({ success: false, status: "tracking_ended" });
  }

  const { data: existing } = await admin
    .from("departure_logs")
    .select("id")
    .eq("shift_id", shiftId)
    .is("returned_at", null)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, status: "already_departed" });
  }

  const { data: log, error } = await admin
    .from("departure_logs")
    .insert({
      shift_id: shiftId,
      member_id: memberId,
      departed_at: new Date().toISOString(),
      departed_lat: lat ?? null,
      departed_lng: lng ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[depart] insert error:", error.message);
    return NextResponse.json({ error: "이탈 기록 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true, departureId: log.id });
}
