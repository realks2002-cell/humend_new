import { createAdminClient } from "@/lib/supabase/server";
import { authenticateMember } from "@/lib/supabase/member-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/active/ping
 * 앱 실행 시 호출 — last_active_at 갱신
 */
export async function POST(req: NextRequest) {
  const memberId = await authenticateMember(req);
  if (!memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from("members")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", memberId);

  return NextResponse.json({ success: true });
}
