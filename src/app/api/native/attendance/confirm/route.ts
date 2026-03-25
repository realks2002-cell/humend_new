import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/attendance/confirm
 * 출근 의사 확인 — FCM 알림 탭 시 호출
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

  // shift 소유권 확인
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
  if (shift.arrival_status === "arrived") {
    return NextResponse.json({ success: true, status: "already_arrived" });
  }
  if (shift.arrival_status === "noshow") {
    return NextResponse.json(
      { error: "Already marked as noshow" },
      { status: 409 }
    );
  }

  await admin
    .from("daily_shifts")
    .update({
      arrival_status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", shiftId);

  return NextResponse.json({ success: true });
}
