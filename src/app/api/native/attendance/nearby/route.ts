import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/attendance/nearby
 * 2km 접근 감지 — 최초 1회만 nearby_at 기록
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

  const { shiftId } = (await req.json()) as { shiftId?: string };
  if (!shiftId) {
    return NextResponse.json(
      { error: "shiftId is required" },
      { status: 400 }
    );
  }

  const { data: shift } = await admin
    .from("daily_shifts")
    .select("id, member_id, nearby_at")
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 최초 1회만 기록
  if (shift.nearby_at) {
    return NextResponse.json({ success: true, status: "already_recorded" });
  }

  await admin
    .from("daily_shifts")
    .update({ nearby_at: new Date().toISOString() })
    .eq("id", shiftId);

  return NextResponse.json({ success: true });
}
