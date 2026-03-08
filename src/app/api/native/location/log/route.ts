import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyArrivalConfirmed } from "@/lib/push/location-notify";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MOVING_THRESHOLD_METERS = 50;

/**
 * POST /api/native/location/log
 * 위치 로그 저장 + 자동 도착 판별 (10m 지오펜스)
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
  const { shiftId, lat, lng, speed, accuracy } = body as {
    shiftId?: string;
    lat?: number;
    lng?: number;
    speed?: number;
    accuracy?: number;
  };

  if (!shiftId || lat == null || lng == null) {
    return NextResponse.json(
      { error: "shiftId, lat, lng are required" },
      { status: 400 }
    );
  }

  // shift 소유권 확인
  const { data: shift, error: shiftError } = await admin
    .from("daily_shifts")
    .select("id, member_id, client_id, arrival_status, last_known_lat, last_known_lng")
    .eq("id", shiftId)
    .single();

  if (shiftError || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  if (shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 이미 도착/노쇼 확정이면 로그만 기록
  if (["arrived", "late", "noshow"].includes(shift.arrival_status)) {
    return NextResponse.json({ success: true, arrived: shift.arrival_status === "arrived" || shift.arrival_status === "late" });
  }

  // 위치 로그 INSERT
  await admin.from("location_logs").insert({
    shift_id: shiftId,
    member_id: user.id,
    lat,
    lng,
    speed: speed ?? null,
    accuracy: accuracy ?? null,
  });

  // shift 최신 위치 캐시 업데이트
  const updateData: Record<string, unknown> = {
    last_known_lat: lat,
    last_known_lng: lng,
    last_seen_at: new Date().toISOString(),
  };

  // 추적 중이 아니면 tracking으로 변경
  if (shift.arrival_status === "pending") {
    updateData.arrival_status = "tracking";
    updateData.tracking_started_at = new Date().toISOString();
  }

  // PostGIS 거리 계산으로 도착 판별 (100m)
  const { data: distResult } = await admin.rpc("check_arrival_distance", {
    p_shift_id: shiftId,
    p_lat: lat,
    p_lng: lng,
    p_radius: 10,
  }).maybeSingle() as { data: { is_arrived: boolean; distance_meters: number } | null };

  let arrived = false;

  if (distResult?.is_arrived) {
    // 출근 시간 기준 지각 여부 판단
    const { data: shiftFull } = await admin
      .from("daily_shifts")
      .select("start_time, work_date")
      .eq("id", shiftId)
      .single();

    if (shiftFull) {
      const now = new Date();
      const shiftStart = new Date(`${shiftFull.work_date}T${shiftFull.start_time}+09:00`);
      const isLate = now > shiftStart;

      updateData.arrival_status = isLate ? "late" : "arrived";
      updateData.arrived_at = now.toISOString();
      arrived = true;

      // 회원에게 출근 완료 FCM 발송
      const { data: clientInfo } = await admin
        .from("daily_shifts")
        .select("clients(company_name)")
        .eq("id", shiftId)
        .single();
      const companyName = (clientInfo as unknown as { clients: { company_name: string } | null })?.clients?.company_name ?? "근무지";
      await notifyArrivalConfirmed(user.id, companyName);
    }
  } else if (shift.arrival_status === "pending" || shift.arrival_status === "tracking") {
    const prevLat = shift.last_known_lat as number | null;
    const prevLng = shift.last_known_lng as number | null;
    if (prevLat != null && prevLng != null && haversineMeters(prevLat, prevLng, lat, lng) >= MOVING_THRESHOLD_METERS) {
      updateData.arrival_status = "moving";
    }
  }

  await admin
    .from("daily_shifts")
    .update(updateData)
    .eq("id", shiftId);

  return NextResponse.json({
    success: true,
    arrived,
    distance: distResult?.distance_meters ?? null,
  });
}
