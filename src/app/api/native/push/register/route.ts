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
  const { token: fcmToken, platform, diag } = body as {
    token?: string;
    platform?: string;
    diag?: {
      location_permission?: string;
      battery_optimized?: boolean | null;
      location_services_enabled?: boolean | null;
      last_gps_accuracy?: number | null;
      last_gps_success?: boolean | null;
      device_manufacturer?: string | null;
      device_model?: string | null;
      os_version?: string | null;
      disk_free_mb?: number | null;
    };
  };

  console.log("[native/push/register]", JSON.stringify({
    user: user.id,
    has_token: !!fcmToken,
    platform,
    has_diag: !!diag,
    diag_keys: diag ? Object.keys(diag) : null,
  }));

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

  // 진단 정보가 함께 오면 members 업데이트
  if (diag) {
    const update: Record<string, unknown> = {
      last_active_at: new Date().toISOString(),
      platform: platform ?? null,
      last_permission_check: new Date().toISOString(),
    };
    if (diag.location_permission !== undefined) update.location_permission = diag.location_permission;
    if (diag.battery_optimized !== undefined) update.battery_optimized = diag.battery_optimized;
    if (diag.location_services_enabled !== undefined) update.location_services_enabled = diag.location_services_enabled;
    if (diag.last_gps_accuracy !== undefined) update.last_gps_accuracy = diag.last_gps_accuracy;
    if (diag.last_gps_success !== undefined) update.last_gps_success = diag.last_gps_success;
    if (diag.device_manufacturer !== undefined) update.device_manufacturer = diag.device_manufacturer;
    if (diag.device_model !== undefined) update.device_model = diag.device_model;
    if (diag.os_version !== undefined) update.os_version = diag.os_version;
    if (diag.disk_free_mb !== undefined) update.disk_free_mb = diag.disk_free_mb;
    await admin.from("members").update(update).eq("id", user.id);
  } else {
    await admin.from("members").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
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
