import { createAdminClient } from "@/lib/supabase/server";
import { authenticateMember } from "@/lib/supabase/member-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/native/permissions/report
 * Silent Push 수신 시 앱이 통합 진단 정보를 보고
 */
export async function POST(req: NextRequest) {
  const memberId = await authenticateMember(req);
  if (!memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    location_permission?: string;
    battery_optimized?: boolean | null;
    platform?: string;
    location_services_enabled?: boolean | null;
    last_gps_accuracy?: number | null;
    last_gps_success?: boolean | null;
    device_manufacturer?: string | null;
    device_model?: string | null;
    os_version?: string | null;
    disk_free_mb?: number | null;
  };

  if (!body.location_permission || !body.platform) {
    return NextResponse.json(
      { error: "location_permission, platform required" },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    location_permission: body.location_permission,
    battery_optimized: body.battery_optimized ?? null,
    platform: body.platform,
    last_permission_check: new Date().toISOString(),
  };
  if (body.location_services_enabled !== undefined)
    update.location_services_enabled = body.location_services_enabled;
  if (body.last_gps_accuracy !== undefined) update.last_gps_accuracy = body.last_gps_accuracy;
  if (body.last_gps_success !== undefined) update.last_gps_success = body.last_gps_success;
  if (body.device_manufacturer !== undefined) update.device_manufacturer = body.device_manufacturer;
  if (body.device_model !== undefined) update.device_model = body.device_model;
  if (body.os_version !== undefined) update.os_version = body.os_version;
  if (body.disk_free_mb !== undefined) update.disk_free_mb = body.disk_free_mb;

  const admin = createAdminClient();
  const { error } = await admin.from("members").update(update).eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
