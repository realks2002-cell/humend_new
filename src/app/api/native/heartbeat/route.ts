import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/heartbeat
 * 앱 alive 신호 — GPS와 무관하게 last_heartbeat_at 갱신
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
  const { shiftId } = body as { shiftId?: string };

  if (!shiftId) {
    return NextResponse.json(
      { error: "shiftId is required" },
      { status: 400 }
    );
  }

  const { data: shift, error: shiftError } = await admin
    .from("daily_shifts")
    .select("id, member_id")
    .eq("id", shiftId)
    .single();

  if (shiftError || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  if (shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateError } = await admin
    .from("daily_shifts")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", shiftId);

  if (updateError) {
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
