import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/location/arrive
 * 수동 도착 확인 (GPS 불안정 시 회원이 직접 확인)
 */
export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { shiftId, lat, lng } = body as {
    shiftId?: string;
    lat?: number;
    lng?: number;
  };

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  // shift 소유권 확인
  const { data: shift } = await admin
    .from("daily_shifts")
    .select("id, member_id, arrival_status, start_time, work_date")
    .eq("id", shiftId)
    .single();

  if (!shift || shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (["arrived", "late", "noshow"].includes(shift.arrival_status)) {
    return NextResponse.json({ error: "이미 처리된 근무입니다." }, { status: 400 });
  }

  // 지각 여부 판단
  const now = new Date();
  const shiftStart = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
  const isLate = now > shiftStart;

  const updateData: Record<string, unknown> = {
    arrival_status: isLate ? "late" : "arrived",
    arrived_at: now.toISOString(),
  };

  if (lat != null && lng != null) {
    updateData.last_known_lat = lat;
    updateData.last_known_lng = lng;
    updateData.last_seen_at = now.toISOString();
  }

  await admin
    .from("daily_shifts")
    .update(updateData)
    .eq("id", shiftId);

  return NextResponse.json({
    success: true,
    status: isLate ? "late" : "arrived",
  });
}
