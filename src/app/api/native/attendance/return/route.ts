import { createAdminClient } from "@/lib/supabase/server";
import { authenticateMember } from "@/lib/supabase/member-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const memberId = await authenticateMember(req);
  if (!memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { shiftId } = (await req.json()) as { shiftId?: string };

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  const { data: shift } = await admin
    .from("daily_shifts")
    .select("id, member_id")
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: departure } = await admin
    .from("departure_logs")
    .select("id, departed_at")
    .eq("shift_id", shiftId)
    .is("returned_at", null)
    .order("departed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!departure) {
    return NextResponse.json({ success: true, status: "not_departed" });
  }

  const now = new Date();
  const departedAt = new Date(departure.departed_at);
  const durationMinutes = Math.round((now.getTime() - departedAt.getTime()) / 60000);

  const { error } = await admin
    .from("departure_logs")
    .update({
      returned_at: now.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", departure.id);

  if (error) {
    console.error("[return] update error:", error.message);
    return NextResponse.json({ error: "복귀 기록 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true, durationMinutes });
}
