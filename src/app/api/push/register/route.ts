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
  const {
    token,
    platform,
    diag,
  } = body as {
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

  // 진단 정보도 함께 받아서 members 업데이트 (인증 통합)
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
    // 진단 미포함이면 last_active_at만 갱신
    await admin.from("members").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);
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
