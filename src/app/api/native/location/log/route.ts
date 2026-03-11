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
 * 위치 로그 저장 + 자동 도착 판별 (100m 지오펜스)
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
    .select("id, member_id, client_id, arrival_status, start_time, work_date, last_known_lat, last_known_lng, first_in_range_at")
    .eq("id", shiftId)
    .single();

  if (shiftError || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  if (shift.member_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 이미 도착/노쇼 확정이면 스킵
  if (["arrived", "late", "noshow"].includes(shift.arrival_status)) {
    return NextResponse.json({ success: true, arrived: shift.arrival_status === "arrived" || shift.arrival_status === "late" });
  }

  // daily_shifts 캐시 업데이트 (location_logs INSERT 없음)
  const updateData: Record<string, unknown> = {
    last_known_lat: lat,
    last_known_lng: lng,
    last_seen_at: new Date().toISOString(),
    last_speed: speed ?? null,
  };

  // 추적 시작 시 tracking_start 위치 기록
  if (shift.arrival_status === "pending") {
    updateData.arrival_status = "tracking";
    updateData.tracking_started_at = new Date().toISOString();
    updateData.tracking_start_lat = lat;
    updateData.tracking_start_lng = lng;
  }

  // PostGIS 거리 계산으로 도착 판별 (250m)
  const { data: distResult } = await admin.rpc("check_arrival_distance", {
    p_shift_id: shiftId,
    p_lat: lat,
    p_lng: lng,
    p_radius: 250,
  }).maybeSingle() as { data: { is_arrived: boolean; distance_meters: number } | null };

  let arrived = false;

  if (distResult?.is_arrived) {
    // 최초 250m 진입 시각을 도착 시간으로 사용 (없으면 현재 시각)
    const firstInRangeAt = shift.first_in_range_at
      ? new Date(shift.first_in_range_at as string)
      : new Date();

    // 최초 진입이면 first_in_range_at 기록
    if (!shift.first_in_range_at) {
      updateData.first_in_range_at = firstInRangeAt.toISOString();
    }

    const shiftStart = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
    const isLate = firstInRangeAt > shiftStart;

    updateData.arrival_status = isLate ? "late" : "arrived";
    updateData.arrived_at = firstInRangeAt.toISOString();
    arrived = true;

    // 회원에게 출근 완료 FCM 발송
    const { data: clientInfo } = await admin
      .from("daily_shifts")
      .select("clients(company_name)")
      .eq("id", shiftId)
      .single();
    const companyName = (clientInfo as unknown as { clients: { company_name: string } | null })?.clients?.company_name ?? "근무지";
    await notifyArrivalConfirmed(user.id, companyName);
  } else if (distResult && distResult.distance_meters <= 250) {
    // 250m 이내 최초 진입 시 first_in_range_at 기록
    if (!shift.first_in_range_at) {
      updateData.first_in_range_at = new Date().toISOString();
    }
  }

  // 이동 판별 (도착 아닌 경우)
  if (!arrived && (shift.arrival_status === "pending" || shift.arrival_status === "tracking")) {
    const prevLat = shift.last_known_lat as number | null;
    const prevLng = shift.last_known_lng as number | null;
    if (prevLat != null && prevLng != null && haversineMeters(prevLat, prevLng, lat, lng) >= MOVING_THRESHOLD_METERS) {
      updateData.arrival_status = "moving";
    }
  }

  // moving/tracking 상태에서 출근시간 경과 시 late_risk 전환
  if (
    !arrived &&
    ["moving", "tracking"].includes(updateData.arrival_status as string ?? shift.arrival_status) &&
    shift.start_time && shift.work_date
  ) {
    const now = new Date();
    const shiftStart = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
    if (now > shiftStart) {
      updateData.arrival_status = "late_risk";
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
