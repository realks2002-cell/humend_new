import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    .select("id, member_id, arrival_status")
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (shift.arrival_status !== "arrived") {
    return NextResponse.json({ error: "Not arrived yet" }, { status: 422 });
  }

  // 이미 이탈 중인지 확인 (returned_at이 NULL인 레코드)
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
      member_id: user.id,
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
