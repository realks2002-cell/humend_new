import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** POST: 네이티브 앱용 FCM 토큰 등록/갱신 (Bearer 토큰 인증) */
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
  const { token: fcmToken, platform } = body as {
    token?: string;
    platform?: string;
  };

  if (!fcmToken) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // 기존 토큰 삭제 (재설치 시 옛 토큰 정리)
  await admin.from("device_tokens").delete().eq("member_id", user.id);

  // 새 토큰 등록
  const { error } = await admin.from("device_tokens").insert({
    member_id: user.id,
    fcm_token: fcmToken,
    platform: platform ?? "android",
  });

  if (error) {
    console.error("[native/push/register] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** DELETE: 네이티브 앱용 FCM 토큰 삭제 (Bearer 토큰 인증) */
export async function DELETE(req: NextRequest) {
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
  const { token: fcmToken } = body as { token?: string };

  if (!fcmToken) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  await admin
    .from("device_tokens")
    .delete()
    .eq("member_id", user.id)
    .eq("fcm_token", fcmToken);

  return NextResponse.json({ success: true });
}
