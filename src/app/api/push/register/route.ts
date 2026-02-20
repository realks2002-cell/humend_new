import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** POST: FCM 토큰 등록/갱신 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { token, platform } = body as { token?: string; platform?: string };

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("device_tokens").upsert(
    {
      member_id: user.id,
      fcm_token: token,
      platform: platform ?? "android",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,fcm_token" }
  );

  if (error) {
    console.error("[push/register] upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** DELETE: FCM 토큰 삭제 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { token } = body as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("device_tokens")
    .delete()
    .eq("member_id", user.id)
    .eq("fcm_token", token);

  return NextResponse.json({ success: true });
}
